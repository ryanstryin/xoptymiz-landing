const { createClient } = require('@supabase/supabase-js');
const neo4j = require('neo4j-driver');

class XoptYmiZDatabaseAdapter {
    constructor() {
        // Initialize Supabase
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Initialize Neo4j
        this.neo4jDriver = neo4j.driver(
            process.env.NEO4J_URI,
            neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
        );
    }

    // Store beta signup in Supabase
    async storeBetaSignup(email, metadata = {}) {
        try {
            const { data, error } = await this.supabase
                .from('beta_signups')
                .insert([{
                    email,
                    company: metadata.company,
                    use_case: metadata.useCase,
                    referral_source: metadata.referralSource,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            console.log('✅ Beta signup stored:', email);
            return data;
        } catch (error) {
            console.error('❌ Beta signup storage failed:', error.message);
            throw error;
        }
    }

    // Store processed content in Supabase
    async storeProcessedContent(contentData) {
        try {
            const { data, error } = await this.supabase
                .from('processed_content')
                .insert([{
                    url: contentData.url,
                    domain: this.extractDomain(contentData.url),
                    title: contentData.title || contentData.metadata?.title,
                    content_summary: contentData.content?.substring(0, 1000),
                    entities: contentData.entities,
                    relationships: contentData.relationships,
                    metadata: contentData.metadata,
                    processing_time_ms: contentData.processingTime,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            console.log('✅ Content stored in Supabase:', contentData.url);
            return data;
        } catch (error) {
            console.error('❌ Content storage failed:', error.message);
            throw error;
        }
    }

    // Store entities and relationships in Neo4j knowledge graph
    async storeInKnowledgeGraph(contentData) {
        const session = this.neo4jDriver.session();
        
        try {
            // Create page node
            await session.run(
                'MERGE (p:Page {url: }) SET p.title = , p.domain = , p.processedAt = datetime()',
                {
                    url: contentData.url,
                    title: contentData.title || 'Untitled',
                    domain: this.extractDomain(contentData.url)
                }
            );

            // Create entity nodes and relationships
            if (contentData.entities) {
                for (const entity of contentData.entities) {
                    await session.run(
                        'MERGE (e:Entity {text: , type: }) SET e.importance = , e.description = ',
                        {
                            text: entity.text,
                            type: entity.type,
                            importance: entity.importance || 5,
                            description: entity.description || ''
                        }
                    );

                    // Connect entity to page
                    await session.run(
                        'MATCH (p:Page {url: }), (e:Entity {text: }) MERGE (p)-[:CONTAINS]->(e)',
                        { url: contentData.url, entityText: entity.text }
                    );
                }
            }

            // Create semantic relationships
            if (contentData.relationships) {
                for (const rel of contentData.relationships) {
                    await session.run(
                        'MATCH (e1:Entity {text: }), (e2:Entity {text: }) MERGE (e1)-[r:RELATED {type: , confidence: }]->(e2)',
                        {
                            from: rel.from,
                            to: rel.to,
                            type: rel.type,
                            confidence: rel.confidence || 0.5
                        }
                    );
                }
            }

            console.log('✅ Knowledge graph updated:', contentData.url);
        } catch (error) {
            console.error('❌ Knowledge graph storage failed:', error.message);
            throw error;
        } finally {
            await session.close();
        }
    }

    // Generate LLMs.txt from knowledge graph
    async generateLLMsTxt(domain, options = {}) {
        const session = this.neo4jDriver.session();
        
        try {
            const result = await session.run(
                'MATCH (p:Page)-[:CONTAINS]->(e:Entity) WHERE p.domain =  RETURN p.url as url, p.title as title, collect({text: e.text, type: e.type, importance: e.importance}) as entities ORDER BY size(entities) DESC LIMIT ',
                { 
                    domain, 
                    maxPages: options.maxPages || 50 
                }
            );

            let llmsTxt = '# LLMs.txt for ' + domain + '\n';
            llmsTxt += '# Generated by XoptYmiZ - Optimization in Every Dimension\n\n';
            llmsTxt += '## Domain Overview\n';
            llmsTxt += 'Content optimized for AI discovery and traditional search engines.\n\n';
            
            llmsTxt += '## Pages and Entities\n';
            for (const record of result.records) {
                const url = record.get('url');
                const title = record.get('title');
                const entities = record.get('entities');
                
                llmsTxt += '### ' + title + '\n';
                llmsTxt += 'URL: ' + url + '\n';
                llmsTxt += 'Entities: ' + entities.map(e => e.text).join(', ') + '\n\n';
            }
            
            llmsTxt += '## Generated\n';
            llmsTxt += 'Timestamp: ' + new Date().toISOString() + '\n';
            llmsTxt += 'Tool: XoptYmiZ Knowledge Graph Engine v1.0.0\n';
            llmsTxt += 'Format: LLMs.txt standard for AI consumption\n';

            return llmsTxt;
        } catch (error) {
            console.error('❌ LLMs.txt generation failed:', error.message);
            // Return fallback
            return '# LLMs.txt for ' + domain + '\n# Generated by XoptYmiZ (fallback mode)\n# Error: ' + error.message;
        } finally {
            await session.close();
        }
    }

    // Helper method to extract domain from URL
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    // Test database connections
    async testConnections() {
        const status = {};
        
        // Test Supabase
        try {
            const { data, error } = await this.supabase.from('beta_signups').select('count').limit(1);
            status.supabase = !error;
        } catch (error) {
            status.supabase = false;
        }

        // Test Neo4j
        try {
            const session = this.neo4jDriver.session();
            await session.run('RETURN 1');
            await session.close();
            status.neo4j = true;
        } catch (error) {
            status.neo4j = false;
        }

        return status;
    }

    // Cleanup connections
    async close() {
        try {
            await this.neo4jDriver.close();
        } catch (error) {
            console.error('Error closing database connections:', error.message);
        }
    }
}

module.exports = XoptYmiZDatabaseAdapter;
