// XoptYmiZ Knowledge Graph Engine - Neo4j Integration
// This is where content becomes intelligent knowledge graphs

const neo4j = require('neo4j-driver');
const crypto = require('crypto');

class XoptYmiZKnowledgeGraph {
    constructor(config = {}) {
        this.driver = neo4j.driver(
            config.uri || process.env.NEO4J_URI || 'bolt://localhost:7687',
            neo4j.auth.basic(
                config.username || process.env.NEO4J_USER || 'neo4j',
                config.password || process.env.NEO4J_PASSWORD || 'password'
            ),
            {
                maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 2 * 60 * 1000, // 120 seconds
                disableLosslessIntegers: true
            }
        );
        
        this.config = {
            batchSize: config.batchSize || 100,
            maxRetries: config.maxRetries || 3,
            defaultRelationshipThreshold: config.defaultRelationshipThreshold || 0.3,
            ...config
        };
        
        console.log('🗃️ XoptYmiZ Knowledge Graph Engine initialized');
        console.log('💎 Ready to build intelligent knowledge graphs');
        
        // Initialize database schema
        this.initializeSchema();
    }

    // Initialize Neo4j constraints and indexes for optimal performance
    async initializeSchema() {
        const session = this.driver.session();
        
        try {
            console.log('🔧 Setting up Neo4j schema...');
            
            // Create constraints for unique identifiers
            const constraints = [
                'CREATE CONSTRAINT entity_id_unique IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE',
                'CREATE CONSTRAINT page_url_unique IF NOT EXISTS FOR (p:Page) REQUIRE p.url IS UNIQUE',
                'CREATE CONSTRAINT domain_name_unique IF NOT EXISTS FOR (d:Domain) REQUIRE d.name IS UNIQUE'
            ];
            
            // Create indexes for performance
            const indexes = [
                'CREATE INDEX entity_text_index IF NOT EXISTS FOR (e:Entity) ON (e.text)',
                'CREATE INDEX entity_type_index IF NOT EXISTS FOR (e:Entity) ON (e.type)',
                'CREATE INDEX entity_importance_index IF NOT EXISTS FOR (e:Entity) ON (e.importance)',
                'CREATE INDEX page_title_index IF NOT EXISTS FOR (p:Page) ON (p.title)',
                'CREATE INDEX page_processed_index IF NOT EXISTS FOR (p:Page) ON (p.processedAt)',
                'CREATE INDEX relationship_strength_index IF NOT EXISTS FOR ()-[r:RELATED_TO]-() ON (r.strength)'
            ];
            
            // Execute constraints
            for (const constraint of constraints) {
                try {
                    await session.run(constraint);
                } catch (error) {
                    if (!error.message.includes('already exists')) {
                        console.warn(`⚠️ Constraint creation warning: ${error.message}`);
                    }
                }
            }
            
            // Execute indexes
            for (const index of indexes) {
                try {
                    await session.run(index);
                } catch (error) {
                    if (!error.message.includes('already exists')) {
                        console.warn(`⚠️ Index creation warning: ${error.message}`);
                    }
                }
            }
            
            console.log('✅ Neo4j schema initialized successfully');
            
        } catch (error) {
            console.error('❌ Schema initialization failed:', error.message);
        } finally {
            await session.close();
        }
    }

    // Store processed content in knowledge graph
    async storeProcessedContent(processedContent) {
        const session = this.driver.session();
        const startTime = Date.now();
        
        try {
            console.log(`📊 Storing knowledge graph for: ${processedContent.url || processedContent.title}`);
            
            // Begin transaction for data consistency
            const txc = session.beginTransaction();
            
            try {
                // 1. Create/update domain node
                const domain = this.extractDomain(processedContent.url);
                if (domain) {
                    await this.createDomainNode(txc, domain, processedContent);
                }
                
                // 2. Create/update page node
                const pageNode = await this.createPageNode(txc, processedContent);
                
                // 3. Create entity nodes and relationships
                const entityNodes = await this.createEntityNodes(txc, processedContent.entities, pageNode.id);
                
                // 4. Create relationships between entities
                await this.createEntityRelationships(txc, processedContent.relationships, entityNodes);
                
                // 5. Store semantic metadata
                await this.storeSemanticMetadata(txc, processedContent.semanticData, pageNode.id);
                
                // 6. Update domain-level statistics
                if (domain) {
                    await this.updateDomainStatistics(txc, domain);
                }
                
                // Commit transaction
                await txc.commit();
                
                const processingTime = Date.now() - startTime;
                console.log(`✅ Knowledge graph stored successfully in ${processingTime}ms`);
                
                return {
                    success: true,
                    pageId: pageNode.id,
                    entitiesStored: processedContent.entities.length,
                    relationshipsStored: processedContent.relationships.length,
                    processingTimeMs: processingTime
                };
                
            } catch (error) {
                await txc.rollback();
                throw error;
            }
            
        } catch (error) {
            console.error('❌ Failed to store knowledge graph:', error.message);
            throw new KnowledgeGraphError(`Storage failed: ${error.message}`, error);
        } finally {
            await session.close();
        }
    }

    // Create or update domain node
    async createDomainNode(txc, domain, processedContent) {
        const query = `
            MERGE (d:Domain {name: $domain})
            ON CREATE SET 
                d.id = $domainId,
                d.createdAt = datetime(),
                d.pageCount = 1,
                d.entityCount = 0,
                d.lastProcessed = datetime()
            ON MATCH SET 
                d.lastProcessed = datetime()
            RETURN d
        `;
        
        const result = await txc.run(query, {
            domain: domain,
            domainId: this.generateId(domain)
        });
        
        return result.records[0]?.get('d').properties;
    }

    // Create or update page node
    async createPageNode(txc, processedContent) {
        const pageId = processedContent.id || this.generateId(processedContent.url || processedContent.title);
        
        const query = `
            MERGE (p:Page {url: $url})
            ON CREATE SET 
                p.id = $pageId,
                p.title = $title,
                p.wordCount = $wordCount,
                p.readability = $readability,
                p.contentHash = $contentHash,
                p.createdAt = datetime(),
                p.version = 1
            ON MATCH SET 
                p.title = $title,
                p.wordCount = $wordCount,
                p.readability = $readability,
                p.contentHash = $contentHash,
                p.updatedAt = datetime(),
                p.version = p.version + 1
            SET p.processedAt = datetime()
            RETURN p
        `;
        
        const contentHash = this.generateContentHash(processedContent.content.original);
        
        const result = await txc.run(query, {
            url: processedContent.url || `content://${pageId}`,
            pageId: pageId,
            title: processedContent.title || 'Untitled',
            wordCount: processedContent.content.wordCount || 0,
            readability: processedContent.content.readability || 0,
            contentHash: contentHash
        });
        
        const pageNode = result.records[0]?.get('p').properties;
        
        // Link to domain if available
        const domain = this.extractDomain(processedContent.url);
        if (domain) {
            await txc.run(`
                MATCH (d:Domain {name: $domain}), (p:Page {id: $pageId})
                MERGE (d)-[:CONTAINS]->(p)
            `, { domain, pageId });
        }
        
        return pageNode;
    }

    // Create entity nodes and link to page
    async createEntityNodes(txc, entities, pageId) {
        const entityNodes = new Map();
        
        for (const entity of entities) {
            const entityId = this.generateId(entity.text);
            
            const query = `
                MERGE (e:Entity {id: $entityId})
                ON CREATE SET 
                    e.text = $text,
                    e.type = $type,
                    e.importance = $importance,
                    e.description = $description,
                    e.aliases = $aliases,
                    e.confidence = $confidence,
                    e.createdAt = datetime(),
                    e.mentionCount = 1,
                    e.pageCount = 1
                ON MATCH SET 
                    e.importance = CASE 
                        WHEN $importance > e.importance THEN $importance 
                        ELSE e.importance 
                    END,
                    e.confidence = ($confidence + e.confidence) / 2,
                    e.mentionCount = e.mentionCount + 1,
                    e.updatedAt = datetime()
                RETURN e
            `;
            
            const result = await txc.run(query, {
                entityId: entityId,
                text: entity.text,
                type: entity.type || 'OTHER',
                importance: entity.importance || 5,
                description: entity.description || '',
                aliases: entity.aliases || [],
                confidence: entity.confidence || 0.8
            });
            
            const entityNode = result.records[0]?.get('e').properties;
            entityNodes.set(entity.text, entityNode);
            
            // Create relationship between page and entity
            await txc.run(`
                MATCH (p:Page {id: $pageId}), (e:Entity {id: $entityId})
                MERGE (p)-[r:CONTAINS]->(e)
                ON CREATE SET 
                    r.createdAt = datetime(),
                    r.importance = $importance,
                    r.confidence = $confidence
                ON MATCH SET 
                    r.importance = CASE 
                        WHEN $importance > r.importance THEN $importance 
                        ELSE r.importance 
                    END,
                    r.updatedAt = datetime()
            `, {
                pageId: pageId,
                entityId: entityId,
                importance: entity.importance || 5,
                confidence: entity.confidence || 0.8
            });
        }
        
        return entityNodes;
    }

    // Create relationships between entities
    async createEntityRelationships(txc, relationships, entityNodes) {
        for (const relationship of relationships) {
            const fromEntity = entityNodes.get(relationship.from);
            const toEntity = entityNodes.get(relationship.to);
            
            if (!fromEntity || !toEntity) {
                console.warn(`⚠️ Skipping relationship: entities not found (${relationship.from} -> ${relationship.to})`);
                continue;
            }
            
            // Determine relationship type or use generic RELATED_TO
            const relType = this.normalizeRelationshipType(relationship.type || 'RELATED_TO');
            
            const query = `
                MATCH (e1:Entity {id: $fromId}), (e2:Entity {id: $toId})
                MERGE (e1)-[r:${relType}]->(e2)
                ON CREATE SET 
                    r.strength = $strength,
                    r.confidence = $confidence,
                    r.description = $description,
                    r.evidence = $evidence,
                    r.createdAt = datetime()
                ON MATCH SET 
                    r.strength = (r.strength + $strength) / 2,
                    r.confidence = (r.confidence + $confidence) / 2,
                    r.updatedAt = datetime()
                RETURN r
            `;
            
            await txc.run(query, {
                fromId: fromEntity.id,
                toId: toEntity.id,
                strength: relationship.strength || 0.5,
                confidence: relationship.confidence || 0.7,
                description: relationship.description || '',
                evidence: relationship.evidence || []
            });
        }
    }

    // Store semantic metadata
    async storeSemanticMetadata(txc, semanticData, pageId) {
        if (!semanticData) return;
        
        const query = `
            MATCH (p:Page {id: $pageId})
            SET p.categories = $categories,
                p.keywords = $keywords,
                p.sentiment = $sentiment,
                p.language = $language,
                p.contentType = $contentType,
                p.expertiseLevel = $expertiseLevel,
                p.topicalAuthority = $topicalAuthority
        `;
        
        await txc.run(query, {
            pageId: pageId,
            categories: semanticData.categories || [],
            keywords: semanticData.keywords || [],
            sentiment: semanticData.sentiment?.polarity || 0,
            language: semanticData.language || 'en',
            contentType: semanticData.contentType || 'article',
            expertiseLevel: semanticData.expertiseLevel || 'intermediate',
            topicalAuthority: semanticData.topicalAuthority || 0.5
        });
    }

    // Update domain-level statistics
    async updateDomainStatistics(txc, domain) {
        const query = `
            MATCH (d:Domain {name: $domain})
            OPTIONAL MATCH (d)-[:CONTAINS]->(p:Page)
            OPTIONAL MATCH (p)-[:CONTAINS]->(e:Entity)
            WITH d, count(DISTINCT p) as pageCount, count(DISTINCT e) as entityCount
            SET d.pageCount = pageCount,
                d.entityCount = entityCount,
                d.lastUpdated = datetime()
            RETURN d
        `;
        
        await txc.run(query, { domain });
    }

    // Generate LLMs.txt file from knowledge graph
    async generateLLMsTxt(domain, options = {}) {
        const session = this.driver.session();
        
        try {
            console.log(`📝 Generating LLMs.txt for domain: ${domain}`);
            
            const {
                maxPages = 50,
                maxTokens = 8000,
                includeMetadata = true,
                sortBy = 'importance'
            } = options;
            
            // Query to get pages and their entities, sorted by relevance
            const query = `
                MATCH (d:Domain {name: $domain})-[:CONTAINS]->(p:Page)-[pc:CONTAINS]->(e:Entity)
                WITH p, 
                     collect({
                         text: e.text, 
                         type: e.type, 
                         importance: e.importance,
                         confidence: e.confidence
                     }) as entities,
                     avg(pc.importance) as avgImportance,
                     count(e) as entityCount
                ORDER BY 
                    CASE $sortBy
                        WHEN 'importance' THEN avgImportance
                        WHEN 'entities' THEN entityCount
                        WHEN 'date' THEN p.processedAt
                        ELSE avgImportance
                    END DESC
                LIMIT $maxPages
                RETURN p.url as url, 
                       p.title as title,
                       p.wordCount as wordCount,
                       p.readability as readability,
                       entities,
                       avgImportance,
                       entityCount
            `;
            
            const result = await session.run(query, {
                domain: domain,
                maxPages: maxPages,
                sortBy: sortBy
            });
            
            if (result.records.length === 0) {
                throw new Error(`No content found for domain: ${domain}`);
            }
            
            // Generate the LLMs.txt content
            const llmsTxt = this.formatLLMsTxt(result.records, domain, options);
            
            console.log(`✅ Generated LLMs.txt with ${result.records.length} pages`);
            
            return {
                content: llmsTxt,
                metadata: {
                    domain: domain,
                    pageCount: result.records.length,
                    generatedAt: new Date().toISOString(),
                    estimatedTokens: this.estimateTokens(llmsTxt),
                    options: options
                }
            };
            
        } catch (error) {
            console.error('❌ LLMs.txt generation failed:', error.message);
            throw new KnowledgeGraphError(`LLMs.txt generation failed: ${error.message}`, error);
        } finally {
            await session.close();
        }
    }

    // Format content as LLMs.txt
    formatLLMsTxt(records, domain, options) {
        const { includeMetadata = true } = options;
        
        let llmsTxt = `# ${domain}\n\n`;
        llmsTxt += `> AI-optimized knowledge graph for ${domain}. Generated by XoptYmiZ.\n\n`;
        
        if (includeMetadata) {
            llmsTxt += `## Metadata\n\n`;
            llmsTxt += `- Domain: ${domain}\n`;
            llmsTxt += `- Pages: ${records.length}\n`;
            llmsTxt += `- Generated: ${new Date().toISOString()}\n`;
            llmsTxt += `- Optimization: Three-dimensional (SEO + AI + Knowledge Graph)\n\n`;
        }
        
        llmsTxt += `## Navigation\n\n`;
        
        // Add table of contents
        records.forEach((record, index) => {
            const title = record.get('title') || 'Untitled';
            const url = record.get('url');
            llmsTxt += `${index + 1}. [${title}](#page-${index + 1})\n`;
        });
        
        llmsTxt += '\n## Content\n\n';
        
        // Add detailed content for each page
        records.forEach((record, index) => {
            const title = record.get('title') || 'Untitled';
            const url = record.get('url');
            const entities = record.get('entities') || [];
            const wordCount = record.get('wordCount') || 0;
            const avgImportance = record.get('avgImportance') || 0;
            
            llmsTxt += `### Page ${index + 1}: ${title} {#page-${index + 1}}\n\n`;
            
            if (url && url !== `content://${this.generateId(title)}`) {
                llmsTxt += `**URL:** ${url}\n\n`;
            }
            
            if (includeMetadata) {
                llmsTxt += `**Statistics:** ${wordCount} words, ${entities.length} entities, importance ${avgImportance.toFixed(2)}\n\n`;
            }
            
            if (entities.length > 0) {
                llmsTxt += `**Key Entities:**\n`;
                
                // Sort entities by importance and show top ones
                entities
                    .sort((a, b) => b.importance - a.importance)
                    .slice(0, 10)
                    .forEach(entity => {
                        llmsTxt += `- **${entity.text}** (${entity.type})`;
                        if (includeMetadata) {
                            llmsTxt += ` - Importance: ${entity.importance}, Confidence: ${entity.confidence.toFixed(2)}`;
                        }
                        llmsTxt += '\n';
                    });
                
                llmsTxt += '\n';
            }
        });
        
        // Add footer
        llmsTxt += '---\n\n';
        llmsTxt += '*Generated by XoptYmiZ - Optimization in Every Dimension*\n';
        llmsTxt += '*Learn more at https://xoptymiz.com*\n';
        
        return llmsTxt;
    }

    // Get knowledge graph analytics for a domain
    async getKnowledgeGraphAnalytics(domain) {
        const session = this.driver.session();
        
        try {
            const queries = {
                overview: `
                    MATCH (d:Domain {name: $domain})
                    OPTIONAL MATCH (d)-[:CONTAINS]->(p:Page)
                    OPTIONAL MATCH (p)-[:CONTAINS]->(e:Entity)
                    OPTIONAL MATCH ()-[r:RELATED_TO]->()
                    RETURN d.pageCount as pageCount,
                           d.entityCount as entityCount,
                           count(DISTINCT r) as relationshipCount,
                           d.lastProcessed as lastProcessed
                `,
                
                topEntities: `
                    MATCH (d:Domain {name: $domain})-[:CONTAINS]->(p:Page)-[:CONTAINS]->(e:Entity)
                    RETURN e.text as text, 
                           e.type as type, 
                           e.importance as importance,
                           e.mentionCount as mentions,
                           count(DISTINCT p) as pageCount
                    ORDER BY e.importance DESC, e.mentionCount DESC
                    LIMIT 20
                `,
                
                entityTypes: `
                    MATCH (d:Domain {name: $domain})-[:CONTAINS]->(p:Page)-[:CONTAINS]->(e:Entity)
                    RETURN e.type as type, count(e) as count
                    ORDER BY count DESC
                `,
                
                contentGaps: `
                    MATCH (d:Domain {name: $domain})-[:CONTAINS]->(p:Page)-[:CONTAINS]->(e:Entity)
                    WHERE e.importance > 7
                    WITH e, count(DISTINCT p) as pageCount
                    WHERE pageCount = 1
                    RETURN e.text as entity, e.type as type, e.importance as importance
                    ORDER BY e.importance DESC
                    LIMIT 10
                `
            };
            
            const results = {};
            
            for (const [key, query] of Object.entries(queries)) {
                const result = await session.run(query, { domain });
                results[key] = result.records.map(record => record.toObject());
            }
            
            return {
                domain: domain,
                overview: results.overview[0] || {},
                topEntities: results.topEntities,
                entityTypes: results.entityTypes,
                contentGaps: results.contentGaps,
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Analytics generation failed:', error.message);
            throw new KnowledgeGraphError(`Analytics failed: ${error.message}`, error);
        } finally {
            await session.close();
        }
    }

    // Get knowledge graph data for visualization
    async getKnowledgeGraphVisualization(domain, options = {}) {
        const session = this.driver.session();
        
        try {
            const { 
                maxNodes = 50, 
                minImportance = 5,
                includeRelationships = true 
            } = options;
            
            // Get nodes (entities)
            const nodeQuery = `
                MATCH (d:Domain {name: $domain})-[:CONTAINS]->(p:Page)-[:CONTAINS]->(e:Entity)
                WHERE e.importance >= $minImportance
                RETURN DISTINCT e.id as id,
                                e.text as label,
                                e.type as type,
                                e.importance as importance,
                                e.confidence as confidence,
                                count(DISTINCT p) as pageCount
                ORDER BY e.importance DESC, count(DISTINCT p) DESC
                LIMIT $maxNodes
            `;
            
            const nodeResult = await session.run(nodeQuery, {
                domain: domain,
                minImportance: minImportance,
                maxNodes: maxNodes
            });
            
            const nodes = nodeResult.records.map(record => ({
                id: record.get('id'),
                label: record.get('label'),
                type: record.get('type'),
                importance: record.get('importance'),
                confidence: record.get('confidence'),
                pageCount: record.get('pageCount').toNumber(),
                size: Math.max(10, record.get('importance') * 3)
            }));
            
            let edges = [];
            
            if (includeRelationships && nodes.length > 0) {
                const nodeIds = nodes.map(n => n.id);
                
                const edgeQuery = `
                    MATCH (e1:Entity)-[r]->(e2:Entity)
                    WHERE e1.id IN $nodeIds AND e2.id IN $nodeIds
                    RETURN e1.id as from,
                           e2.id as to,
                           type(r) as type,
                           r.strength as strength,
                           r.confidence as confidence
                    ORDER BY r.strength DESC
                `;
                
                const edgeResult = await session.run(edgeQuery, { nodeIds });
                
                edges = edgeResult.records.map(record => ({
                    from: record.get('from'),
                    to: record.get('to'),
                    type: record.get('type'),
                    strength: record.get('strength'),
                    confidence: record.get('confidence'),
                    width: Math.max(1, record.get('strength') * 5)
                }));
            }
            
            return {
                nodes: nodes,
                edges: edges,
                metadata: {
                    domain: domain,
                    nodeCount: nodes.length,
                    edgeCount: edges.length,
                    generatedAt: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('❌ Visualization data generation failed:', error.message);
            throw new KnowledgeGraphError(`Visualization failed: ${error.message}`, error);
        } finally {
            await session.close();
        }
    }

    // Utility methods
    extractDomain(url) {
        if (!url || !url.includes('://')) return null;
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return null;
        }
    }

    generateId(text) {
        return crypto.createHash('md5').update(text.toLowerCase().trim()).digest('hex');
    }

    generateContentHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    normalizeRelationshipType(type) {
        // Ensure relationship type is valid for Neo4j (no spaces, special chars)
        return type.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    }

    estimateTokens(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }

    // Close driver connection
    async close() {
        await this.driver.close();
        console.log('🔒 Knowledge Graph connection closed');
    }

    // Health check
    async healthCheck() {
        const session = this.driver.session();
        try {
            await session.run('RETURN 1');
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
        } finally {
            await session.close();
        }
    }
}

// Custom error class
class KnowledgeGraphError extends Error {
    constructor(message, originalError) {
        super(message);
        this.name = 'KnowledgeGraphError';
        this.originalError = originalError;
    }
}

// Demo function
async function demonstrateKnowledgeGraph() {
    console.log('🚀 XoptYmiZ Knowledge Graph Demo');
    console.log('=================================');
    
    const kg = new XoptYmiZKnowledgeGraph({
        uri: process.env.NEO4J_URI,
        username: process.env.NEO4J_USER,
        password: process.env.NEO4J_PASSWORD
    });
    
    // Sample processed content (would come from ContentProcessor)
    const sampleProcessedContent = {
        id: 'sample_content_123',
        url: 'https://xoptymiz.com/about',
        title: 'About XoptYmiZ - AI Content Optimization',
        content: {
            original: 'XoptYmiZ revolutionizes content optimization...',
            wordCount: 500,
            readability: 75
        },
        entities: [
            {
                text: 'XoptYmiZ',
                type: 'ORGANIZATION',
                importance: 10,
                description: 'AI content optimization platform',
                aliases: [],
                confidence: 0.95
            },
            {
                text: 'Ryan Pitcheralle',
                type: 'PERSON',
                importance: 8,
                description: 'Founder of XoptYmiZ',
                aliases: [],
                confidence: 0.9
            },
            {
                text: 'AI Optimization',
                type: 'CONCEPT',
                importance: 9,
                description: 'Core technology concept',
                aliases: ['AIO'],
                confidence: 0.85
            }
        ],
        relationships: [
            {
                from: 'Ryan Pitcheralle',
                to: 'XoptYmiZ',
                type: 'FOUNDED',
                strength: 0.9,
                confidence: 0.95,
                description: 'Ryan Pitcheralle founded XoptYmiZ'
            },
            {
                from: 'XoptYmiZ',
                to: 'AI Optimization',
                type: 'SPECIALIZES_IN',
                strength: 0.85,
                confidence: 0.9,
                description: 'XoptYmiZ specializes in AI Optimization'
            }
        ],
        semanticData: {
            categories: ['Technology', 'AI', 'SEO'],
            keywords: ['optimization', 'AI', 'content', 'SEO'],
            sentiment: { polarity: 0.8 },
            language: 'en',
            contentType: 'article',
            expertiseLevel: 'expert',
            topicalAuthority: 0.9
        }
    };
    
    try {
        // Test health check
        const health = await kg.healthCheck();
        console.log('🏥 Health check:', health.status);
        
        if (health.status !== 'healthy') {
            console.error('❌ Neo4j is not healthy, skipping demo');
            return;
        }
        
        // Store sample content
        console.log('\n📊 Storing sample content...');
        const storeResult = await kg.storeProcessedContent(sampleProcessedContent);
        console.log('✅ Storage result:', storeResult);
        
        // Generate LLMs.txt
        console.log('\n📝 Generating LLMs.txt...');
        const llmsResult = await kg.generateLLMsTxt('xoptymiz.com', {
            maxPages: 10,
            includeMetadata: true,
            sortBy: 'importance'
        });
        
        console.log('✅ LLMs.txt generated:');
        console.log(`   - Pages: ${llmsResult.metadata.pageCount}`);
        console.log(`   - Tokens: ${llmsResult.metadata.estimatedTokens}`);
        console.log(`   - Size: ${llmsResult.content.length} characters`);
        
        // Get analytics
        console.log('\n📈 Getting knowledge graph analytics...');
        const analytics = await kg.getKnowledgeGraphAnalytics('xoptymiz.com');
        console.log('✅ Analytics:', {
            pages: analytics.overview.pageCount,
            entities: analytics.overview.entityCount,
            relationships: analytics.overview.relationshipCount,
            topEntity: analytics.topEntities[0]?.text
        });
        
        // Get visualization data
        console.log('\n🎨 Getting visualization data...');
        const vizData = await kg.getKnowledgeGraphVisualization('xoptymiz.com', {
            maxNodes: 20,
            minImportance: 5
        });
        console.log('✅ Visualization data:', {
            nodes: vizData.nodes.length,
            edges: vizData.edges.length
        });
        
        // Show sample LLMs.txt content
        console.log('\n📄 Sample LLMs.txt content:');
        console.log('─'.repeat(50));
        console.log(llmsResult.content.substring(0, 500) + '...');
        console.log('─'.repeat(50));
        
        return {
            storeResult,
            llmsResult,
            analytics,
            vizData
        };
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        throw error;
    } finally {
        await kg.close();
    }
}

// Integration with Content Processor
class XoptYmiZPipeline {
    constructor(config = {}) {
        this.contentProcessor = new (require('./content-processor')).XoptYmiZContentProcessor(config);
        this.knowledgeGraph = new XoptYmiZKnowledgeGraph(config);
        
        console.log('🔄 XoptYmiZ Complete Pipeline initialized');
    }
    
    // Complete processing pipeline: URL → Content Analysis → Knowledge Graph → LLMs.txt
    async processAndStore(input) {
        console.log('🚀 Starting complete XoptYmiZ pipeline...');
        const startTime = Date.now();
        
        try {
            // Step 1: Process content
            console.log('1️⃣ Processing content...');
            const processedContent = await this.contentProcessor.processContent(input);
            
            // Step 2: Store in knowledge graph
            console.log('2️⃣ Storing in knowledge graph...');
            const storeResult = await this.knowledgeGraph.storeProcessedContent(processedContent);
            
            // Step 3: Generate LLMs.txt
            console.log('3️⃣ Generating LLMs.txt...');
            const domain = this.knowledgeGraph.extractDomain(input.url);
            let llmsResult = null;
            
            if (domain) {
                llmsResult = await this.knowledgeGraph.generateLLMsTxt(domain);
            }
            
            const totalTime = Date.now() - startTime;
            
            console.log(`✅ Pipeline completed in ${totalTime}ms`);
            
            return {
                success: true,
                processedContent: {
                    id: processedContent.id,
                    title: processedContent.title,
                    entities: processedContent.entities.length,
                    relationships: processedContent.relationships.length
                },
                storeResult,
                llmsResult: llmsResult ? {
                    domain: domain,
                    size: llmsResult.content.length,
                    tokens: llmsResult.metadata.estimatedTokens
                } : null,
                metadata: {
                    totalProcessingTime: totalTime,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('❌ Pipeline failed:', error.message);
            throw new XoptYmiZPipelineError(`Pipeline failed: ${error.message}`, error);
        }
    }
    
    // Process multiple URLs in batch
    async processBatch(urls, options = {}) {
        const { batchSize = 5, delayMs = 1000 } = options;
        const results = [];
        
        console.log(`📦 Processing batch of ${urls.length} URLs...`);
        
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            
            console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(urls.length/batchSize)}`);
            
            const batchPromises = batch.map(async (url) => {
                try {
                    const result = await this.processAndStore({ url });
                    return { url, success: true, result };
                } catch (error) {
                    console.error(`❌ Failed to process ${url}:`, error.message);
                    return { url, success: false, error: error.message };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Delay between batches to be respectful
            if (i + batchSize < urls.length && delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;
        
        console.log(`✅ Batch processing complete: ${successful} successful, ${failed} failed`);
        
        return {
            total: results.length,
            successful,
            failed,
            results
        };
    }
    
    // Get complete domain analysis
    async getDomainAnalysis(domain) {
        const analytics = await this.knowledgeGraph.getKnowledgeGraphAnalytics(domain);
        const visualization = await this.knowledgeGraph.getKnowledgeGraphVisualization(domain);
        const llmsResult = await this.knowledgeGraph.generateLLMsTxt(domain);
        
        return {
            domain,
            analytics,
            visualization,
            llmsTxt: {
                content: llmsResult.content,
                metadata: llmsResult.metadata
            },
            generatedAt: new Date().toISOString()
        };
    }
    
    // Cleanup resources
    async close() {
        await this.knowledgeGraph.close();
        console.log('🔒 XoptYmiZ Pipeline closed');
    }
}

// Error classes
class XoptYmiZPipelineError extends Error {
    constructor(message, originalError) {
        super(message);
        this.name = 'XoptYmiZPipelineError';
        this.originalError = originalError;
    }
}

// WordPress-specific integration helpers
class WordPressIntegration {
    constructor(wpConfig) {
        this.baseUrl = wpConfig.baseUrl;
        this.username = wpConfig.username;
        this.password = wpConfig.password;
        this.pipeline = new XoptYmiZPipeline(wpConfig);
    }
    
    // Get all published posts from WordPress
    async getAllPosts(options = {}) {
        const { perPage = 100, maxPages = 10 } = options;
        const posts = [];
        
        for (let page = 1; page <= maxPages; page++) {
            const url = `${this.baseUrl}/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&status=publish`;
            
            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`
                    }
                });
                
                if (!response.ok) break;
                
                const pagePosts = await response.json();
                if (pagePosts.length === 0) break;
                
                posts.push(...pagePosts);
                
                if (pagePosts.length < perPage) break; // Last page
                
            } catch (error) {
                console.error(`Failed to fetch page ${page}:`, error.message);
                break;
            }
        }
        
        return posts;
    }
    
    // Process all WordPress posts
    async processAllPosts(options = {}) {
        console.log('🔄 Processing all WordPress posts...');
        
        const posts = await this.getAllPosts(options);
        const urls = posts.map(post => post.link);
        
        console.log(`📦 Found ${posts.length} posts to process`);
        
        return await this.pipeline.processBatch(urls, options);
    }
    
    // Generate WordPress-specific LLMs.txt
    async generateWordPressLLMsTxt(domain) {
        const analysis = await this.pipeline.getDomainAnalysis(domain);
        
        // Customize LLMs.txt for WordPress structure
        let wpLLMsTxt = analysis.llmsTxt.content;
        
        // Add WordPress-specific metadata
        wpLLMsTxt = wpLLMsTxt.replace(
            '> AI-optimized knowledge graph',
            '> AI-optimized WordPress knowledge graph'
        );
        
        wpLLMsTxt += '\n\n## WordPress Information\n\n';
        wpLLMsTxt += `- CMS: WordPress\n`;
        wpLLMsTxt += `- Posts Processed: ${analysis.analytics.overview.pageCount}\n`;
        wpLLMsTxt += `- Entities Discovered: ${analysis.analytics.overview.entityCount}\n`;
        wpLLMsTxt += `- Knowledge Graph Relationships: ${analysis.analytics.overview.relationshipCount}\n`;
        wpLLMsTxt += `- Optimization Level: Three-Dimensional (SEO + AI + Knowledge Graph)\n`;
        
        return wpLLMsTxt;
    }
    
    async close() {
        await this.pipeline.close();
    }
}

// Export everything
module.exports = {
    XoptYmiZKnowledgeGraph,
    XoptYmiZPipeline,
    WordPressIntegration,
    KnowledgeGraphError,
    XoptYmiZPipelineError,
    demonstrateKnowledgeGraph
};

// Demo execution
if (require.main === module) {
    demonstrateKnowledgeGraph().catch(console.error);
}

/*
USAGE EXAMPLES:

// Basic knowledge graph operations
const kg = new XoptYmiZKnowledgeGraph();
await kg.storeProcessedContent(processedContent);
const llmsTxt = await kg.generateLLMsTxt('example.com');

// Complete pipeline (Content → Knowledge Graph → LLMs.txt)
const pipeline = new XoptYmiZPipeline();
const result = await pipeline.processAndStore({ url: 'https://example.com' });

// WordPress integration
const wp = new WordPressIntegration({
    baseUrl: 'https://your-wordpress-site.com',
    username: 'admin',
    password: 'your-password'
});
await wp.processAllPosts();
const wpLLMsTxt = await wp.generateWordPressLLMsTxt('your-domain.com');

// Batch processing
const urls = ['https://site1.com', 'https://site2.com'];
const batchResult = await pipeline.processBatch(urls);

// Analytics and visualization
const analytics = await kg.getKnowledgeGraphAnalytics('domain.com');
const vizData = await kg.getKnowledgeGraphVisualization('domain.com');

*/