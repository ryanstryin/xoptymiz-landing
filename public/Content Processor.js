// XoptYmiZ Content Processor - The Brain of Your $200K MRR Business
// This engine transforms any website content into AI-ready knowledge graphs

const express = require('express');
const cheerio = require('cheerio');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const OpenAI = require('openai');
const natural = require('natural');
const compromise = require('compromise');
const crypto = require('crypto');
const fs = require('fs').promises;

class XoptYmiZContentProcessor {
    constructor(config = {}) {
        this.openai = new OpenAI({ 
            apiKey: config.openaiKey || process.env.OPENAI_API_KEY 
        });
        
        this.config = {
            maxTokens: config.maxTokens || 8000,
            minEntityImportance: config.minEntityImportance || 6,
            processingTimeout: config.processingTimeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            ...config
        };
        
        // Initialize NLP tools
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;
        
        console.log('🚀 XoptYmiZ Content Processor initialized');
        console.log('💎 Ready to transform content into AI-ready knowledge graphs');
    }

    // Main processing pipeline - this is where the magic happens
    async processContent(input) {
        const startTime = Date.now();
        console.log(`🔄 Processing: ${input.url || 'Raw content'}`);

        try {
            // Step 1: Extract and clean content
            const cleanContent = await this.extractCleanContent(input);
            
            // Step 2: Analyze content structure and metadata
            const contentAnalysis = await this.analyzeContentStructure(cleanContent);
            
            // Step 3: Extract entities using multiple methods
            const entities = await this.extractEntities(cleanContent.text, contentAnalysis);
            
            // Step 4: Find relationships between entities
            const relationships = await this.findRelationships(entities, cleanContent.text);
            
            // Step 5: Generate semantic metadata
            const semanticData = await this.generateSemanticMetadata(cleanContent, entities);
            
            // Step 6: Create knowledge graph structure
            const knowledgeGraph = await this.buildKnowledgeGraph(entities, relationships);
            
            // Step 7: Generate optimization suggestions
            const optimizations = await this.generateOptimizations(cleanContent, entities, relationships);

            const processingTime = Date.now() - startTime;
            
            const result = {
                id: this.generateContentId(input.url || cleanContent.title),
                url: input.url,
                title: cleanContent.title,
                content: {
                    original: cleanContent.text,
                    cleaned: cleanContent.cleaned,
                    wordCount: cleanContent.wordCount,
                    readability: cleanContent.readability
                },
                entities: entities,
                relationships: relationships,
                semanticData: semanticData,
                knowledgeGraph: knowledgeGraph,
                optimizations: optimizations,
                metadata: {
                    processedAt: new Date().toISOString(),
                    processingTimeMs: processingTime,
                    version: '1.0.0',
                    confidence: this.calculateOverallConfidence(entities, relationships)
                }
            };

            console.log(`✅ Processed successfully in ${processingTime}ms`);
            console.log(`📊 Found ${entities.length} entities, ${relationships.length} relationships`);
            
            return result;

        } catch (error) {
            console.error('❌ Processing failed:', error.message);
            throw new XoptYmiZProcessingError(`Content processing failed: ${error.message}`, error);
        }
    }

    // Extract clean, readable content from various sources
    async extractCleanContent(input) {
        if (input.url) {
            return await this.extractFromURL(input.url);
        } else if (input.html) {
            return await this.extractFromHTML(input.html);
        } else if (input.text) {
            return this.processRawText(input.text, input.title || 'Untitled');
        }
        
        throw new Error('Invalid input: must provide url, html, or text');
    }

    // Fetch and clean content from URL
    async extractFromURL(url) {
        try {
            console.log(`🌐 Fetching content from: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'XoptYmiZ Content Processor 1.0 (AI Optimization Bot)'
                },
                timeout: this.config.processingTimeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            return await this.extractFromHTML(html, url);

        } catch (error) {
            throw new Error(`Failed to fetch URL: ${error.message}`);
        }
    }

    // Extract clean content from HTML using Mozilla Readability
    async extractFromHTML(html, url = null) {
        try {
            const dom = new JSDOM(html, { url });
            const document = dom.window.document;

            // Use Mozilla Readability for content extraction
            const reader = new Readability(document);
            const article = reader.parse();

            if (!article) {
                throw new Error('Could not extract readable content from HTML');
            }

            // Additional cleaning with Cheerio
            const $ = cheerio.load(article.content);
            
            // Remove unwanted elements
            $('script, style, nav, footer, aside, .advertisement, .ads').remove();
            
            // Extract clean text
            const cleanText = $.text().replace(/\s+/g, ' ').trim();
            
            // Calculate readability metrics
            const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
            const words = this.tokenizer.tokenize(cleanText) || [];
            
            return {
                title: article.title || this.extractTitleFromHTML($),
                text: cleanText,
                cleaned: this.preprocessText(cleanText),
                excerpt: article.excerpt || cleanText.substring(0, 200) + '...',
                wordCount: words.length,
                sentenceCount: sentences.length,
                readability: this.calculateReadabilityScore(words, sentences),
                extractedAt: new Date().toISOString()
            };

        } catch (error) {
            throw new Error(`HTML extraction failed: ${error.message}`);
        }
    }

    // Process raw text input
    processRawText(text, title) {
        const cleaned = this.preprocessText(text);
        const words = this.tokenizer.tokenize(cleaned) || [];
        const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);

        return {
            title: title,
            text: text,
            cleaned: cleaned,
            excerpt: text.substring(0, 200) + '...',
            wordCount: words.length,
            sentenceCount: sentences.length,
            readability: this.calculateReadabilityScore(words, sentences),
            extractedAt: new Date().toISOString()
        };
    }

    // Analyze content structure for better entity extraction
    async analyzeContentStructure(content) {
        const doc = compromise(content.text);
        
        return {
            topics: doc.topics().out('array'),
            people: doc.people().out('array'),
            places: doc.places().out('array'),
            organizations: doc.organizations().out('array'),
            sentences: doc.sentences().out('array'),
            nouns: doc.nouns().out('array'),
            verbs: doc.verbs().out('array'),
            adjectives: doc.adjectives().out('array')
        };
    }

    // Multi-method entity extraction for maximum accuracy
    async extractEntities(text, analysis) {
        console.log('🧠 Extracting entities with AI analysis...');
        
        try {
            // Method 1: AI-powered extraction (primary)
            const aiEntities = await this.extractEntitiesWithAI(text);
            
            // Method 2: NLP-based extraction (backup/validation)
            const nlpEntities = await this.extractEntitiesWithNLP(analysis);
            
            // Method 3: Pattern-based extraction (supplementary)
            const patternEntities = await this.extractEntitiesWithPatterns(text);
            
            // Merge and deduplicate
            const mergedEntities = this.mergeAndDeduplicateEntities([
                ...aiEntities,
                ...nlpEntities,
                ...patternEntities
            ]);
            
            // Filter by importance threshold
            return mergedEntities.filter(entity => 
                entity.importance >= this.config.minEntityImportance
            );

        } catch (error) {
            console.warn('⚠️ AI extraction failed, falling back to NLP methods');
            return this.extractEntitiesFallback(analysis);
        }
    }

    // AI-powered entity extraction using OpenAI
    async extractEntitiesWithAI(text) {
        const prompt = `
You are an expert content analyst. Extract named entities from this text and return ONLY valid JSON.

For each entity, determine:
- text: exact entity name
- type: PERSON, ORGANIZATION, LOCATION, CONCEPT, TECHNOLOGY, PRODUCT, EVENT, or OTHER
- importance: score 1-10 (10 = critical to understanding content)
- description: brief explanation of significance
- aliases: alternative names or variations
- confidence: 0.0-1.0 confidence in classification

Return format:
{
  "entities": [
    {
      "text": "Entity Name",
      "type": "ORGANIZATION",
      "importance": 8,
      "description": "Why this entity matters",
      "aliases": ["Alternative Name"],
      "confidence": 0.95
    }
  ]
}

Text to analyze:
${text.substring(0, 4000)}
`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
            temperature: 0.1
        });

        const result = JSON.parse(response.choices[0].message.content);
        return result.entities || [];
    }

    // NLP-based entity extraction using Compromise
    async extractEntitiesWithNLP(analysis) {
        const entities = [];
        
        // Extract people
        analysis.people.forEach(person => {
            entities.push({
                text: person,
                type: 'PERSON',
                importance: 7,
                description: `Person mentioned in content: ${person}`,
                aliases: [],
                confidence: 0.8,
                source: 'nlp'
            });
        });
        
        // Extract organizations
        analysis.organizations.forEach(org => {
            entities.push({
                text: org,
                type: 'ORGANIZATION',
                importance: 7,
                description: `Organization mentioned: ${org}`,
                aliases: [],
                confidence: 0.8,
                source: 'nlp'
            });
        });
        
        // Extract places
        analysis.places.forEach(place => {
            entities.push({
                text: place,
                type: 'LOCATION',
                importance: 6,
                description: `Location mentioned: ${place}`,
                aliases: [],
                confidence: 0.75,
                source: 'nlp'
            });
        });
        
        // Extract key concepts from topics
        analysis.topics.forEach(topic => {
            entities.push({
                text: topic,
                type: 'CONCEPT',
                importance: 6,
                description: `Key topic: ${topic}`,
                aliases: [],
                confidence: 0.7,
                source: 'nlp'
            });
        });
        
        return entities;
    }

    // Pattern-based entity extraction
    async extractEntitiesWithPatterns(text) {
        const entities = [];
        
        // Email patterns
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = text.match(emailRegex) || [];
        emails.forEach(email => {
            entities.push({
                text: email,
                type: 'OTHER',
                importance: 5,
                description: `Contact email: ${email}`,
                aliases: [],
                confidence: 1.0,
                source: 'pattern'
            });
        });
        
        // URL patterns
        const urlRegex = /https?:\/\/[^\s<>"]+/g;
        const urls = text.match(urlRegex) || [];
        urls.forEach(url => {
            const domain = url.match(/https?:\/\/([^\/]+)/)?.[1];
            if (domain) {
                entities.push({
                    text: domain,
                    type: 'ORGANIZATION',
                    importance: 5,
                    description: `Referenced website: ${domain}`,
                    aliases: [url],
                    confidence: 0.9,
                    source: 'pattern'
                });
            }
        });
        
        // Technology terms (basic patterns)
        const techTerms = ['API', 'REST', 'GraphQL', 'JavaScript', 'Python', 'React', 'Vue', 'Angular', 'Node.js', 'MongoDB', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes'];
        techTerms.forEach(term => {
            if (text.toLowerCase().includes(term.toLowerCase())) {
                entities.push({
                    text: term,
                    type: 'TECHNOLOGY',
                    importance: 6,
                    description: `Technology mentioned: ${term}`,
                    aliases: [],
                    confidence: 0.8,
                    source: 'pattern'
                });
            }
        });
        
        return entities;
    }

    // Find relationships between entities
    async findRelationships(entities, text) {
        console.log('🔗 Analyzing entity relationships...');
        
        const relationships = [];
        
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entity1 = entities[i];
                const entity2 = entities[j];
                
                const relationship = await this.analyzeEntityRelationship(entity1, entity2, text);
                
                if (relationship && relationship.strength > 0.3) {
                    relationships.push(relationship);
                }
            }
        }
        
        return relationships.sort((a, b) => b.strength - a.strength);
    }

    // Analyze relationship between two entities
    async analyzeEntityRelationship(entity1, entity2, text) {
        // Calculate co-occurrence strength
        const entity1Mentions = this.findEntityMentions(entity1, text);
        const entity2Mentions = this.findEntityMentions(entity2, text);
        
        // Find proximity of mentions
        let proximityScore = 0;
        let relationshipType = 'RELATED_TO';
        
        entity1Mentions.forEach(pos1 => {
            entity2Mentions.forEach(pos2 => {
                const distance = Math.abs(pos1 - pos2);
                if (distance < 100) { // Within 100 characters
                    proximityScore += 1 / (distance + 1);
                }
            });
        });
        
        // Determine relationship type based on entity types
        if (entity1.type === 'PERSON' && entity2.type === 'ORGANIZATION') {
            relationshipType = 'WORKS_FOR';
        } else if (entity1.type === 'ORGANIZATION' && entity2.type === 'LOCATION') {
            relationshipType = 'LOCATED_IN';
        } else if (entity1.type === 'PERSON' && entity2.type === 'PERSON') {
            relationshipType = 'ASSOCIATED_WITH';
        } else if (entity1.type === 'CONCEPT' && entity2.type === 'TECHNOLOGY') {
            relationshipType = 'IMPLEMENTS';
        }
        
        const strength = Math.min(proximityScore / 10, 1.0);
        
        if (strength > 0.1) {
            return {
                from: entity1.text,
                to: entity2.text,
                type: relationshipType,
                strength: strength,
                confidence: Math.min(entity1.confidence * entity2.confidence * strength, 1.0),
                description: `${entity1.text} is ${relationshipType.toLowerCase().replace('_', ' ')} ${entity2.text}`,
                evidence: this.extractRelationshipEvidence(entity1, entity2, text)
            };
        }
        
        return null;
    }

    // Generate semantic metadata for enhanced understanding
    async generateSemanticMetadata(content, entities) {
        const categories = this.categorizeContent(content.text, entities);
        const keywords = this.extractKeywords(content.text);
        const sentiment = this.analyzeSentiment(content.text);
        
        return {
            categories: categories,
            keywords: keywords,
            sentiment: sentiment,
            language: 'en', // TODO: Add language detection
            contentType: this.detectContentType(content),
            expertiseLevel: this.assessExpertiseLevel(content, entities),
            topicalAuthority: this.calculateTopicalAuthority(entities)
        };
    }

    // Build knowledge graph structure
    async buildKnowledgeGraph(entities, relationships) {
        const nodes = entities.map(entity => ({
            id: this.sanitizeId(entity.text),
            label: entity.text,
            type: entity.type,
            importance: entity.importance,
            description: entity.description,
            confidence: entity.confidence
        }));
        
        const edges = relationships.map(rel => ({
            from: this.sanitizeId(rel.from),
            to: this.sanitizeId(rel.to),
            type: rel.type,
            strength: rel.strength,
            description: rel.description
        }));
        
        return {
            nodes: nodes,
            edges: edges,
            metrics: {
                nodeCount: nodes.length,
                edgeCount: edges.length,
                density: edges.length / (nodes.length * (nodes.length - 1) / 2),
                avgImportance: nodes.reduce((sum, n) => sum + n.importance, 0) / nodes.length
            }
        };
    }

    // Generate content optimization suggestions
    async generateOptimizations(content, entities, relationships) {
        return {
            contentGaps: this.identifyContentGaps(entities),
            entityEnhancements: this.suggestEntityEnhancements(entities),
            relationshipOpportunities: this.suggestRelationshipImprovements(relationships),
            aiOptimization: this.generateAIOptimizationTips(content, entities),
            seoSynergies: this.identifySEOSynergies(content, entities)
        };
    }

    // Utility Methods
    generateContentId(input) {
        return crypto.createHash('md5').update(input || Date.now().toString()).digest('hex');
    }

    preprocessText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-.,!?;:]/g, '')
            .trim();
    }

    calculateReadabilityScore(words, sentences) {
        if (sentences.length === 0) return 0;
        const avgWordsPerSentence = words.length / sentences.length;
        return Math.max(0, 100 - (avgWordsPerSentence * 2));
    }

    mergeAndDeduplicateEntities(entityArrays) {
        const entityMap = new Map();
        
        entityArrays.forEach(entity => {
            const key = entity.text.toLowerCase().trim();
            
            if (entityMap.has(key)) {
                const existing = entityMap.get(key);
                // Keep the entity with higher confidence
                if (entity.confidence > existing.confidence) {
                    entityMap.set(key, entity);
                }
            } else {
                entityMap.set(key, entity);
            }
        });
        
        return Array.from(entityMap.values());
    }

    findEntityMentions(entity, text) {
        const mentions = [];
        const searchText = text.toLowerCase();
        const entityText = entity.text.toLowerCase();
        
        let index = searchText.indexOf(entityText);
        while (index !== -1) {
            mentions.push(index);
            index = searchText.indexOf(entityText, index + 1);
        }
        
        return mentions;
    }

    calculateOverallConfidence(entities, relationships) {
        const entityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
        const relationshipConfidence = relationships.reduce((sum, r) => sum + r.confidence, 0) / (relationships.length || 1);
        
        return (entityConfidence + relationshipConfidence) / 2;
    }

    sanitizeId(text) {
        return text.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    // Error handling
    extractEntitiesFallback(analysis) {
        console.log('🔄 Using fallback entity extraction...');
        return this.extractEntitiesWithNLP(analysis);
    }

    // Placeholder methods for future implementation
    extractTitleFromHTML($) { return $('title').text() || 'Untitled'; }
    categorizeContent(text, entities) { return ['general']; }
    extractKeywords(text) { return this.tokenizer.tokenize(text).slice(0, 10); }
    analyzeSentiment(text) { return { polarity: 0, subjectivity: 0.5 }; }
    detectContentType(content) { return 'article'; }
    assessExpertiseLevel(content, entities) { return 'intermediate'; }
    calculateTopicalAuthority(entities) { return 0.7; }
    identifyContentGaps(entities) { return []; }
    suggestEntityEnhancements(entities) { return []; }
    suggestRelationshipImprovements(relationships) { return []; }
    generateAIOptimizationTips(content, entities) { return []; }
    identifySEOSynergies(content, entities) { return []; }
    extractRelationshipEvidence(entity1, entity2, text) { return []; }
}

// Custom error class
class XoptYmiZProcessingError extends Error {
    constructor(message, originalError) {
        super(message);
        this.name = 'XoptYmiZProcessingError';
        this.originalError = originalError;
    }
}

// Example usage and testing
async function demonstrateProcessor() {
    console.log('🚀 XoptYmiZ Content Processor Demo');
    console.log('===============================');
    
    const processor = new XoptYmiZContentProcessor({
        openaiKey: process.env.OPENAI_API_KEY,
        maxTokens: 8000,
        minEntityImportance: 5
    });
    
    // Test with sample content
    const sampleContent = {
        text: `
        XoptYmiZ is a revolutionary platform that transforms website content for AI discovery. 
        Built by Ryan Pitcheralle, the platform uses advanced knowledge graph technology to 
        bridge traditional SEO with AI optimization. The company is based in New York and 
        works with technologies like OpenAI, Neo4j, and WordPress to create semantic 
        relationships between content entities. This innovation helps businesses maintain 
        visibility in both Google search and AI-powered platforms like ChatGPT and Claude.
        `,
        title: 'XoptYmiZ: Bridging SEO and AI Optimization'
    };
    
    try {
        const result = await processor.processContent(sampleContent);
        
        console.log('\n📊 Processing Results:');
        console.log(`Title: ${result.title}`);
        console.log(`Entities found: ${result.entities.length}`);
        console.log(`Relationships: ${result.relationships.length}`);
        console.log(`Processing time: ${result.metadata.processingTimeMs}ms`);
        console.log(`Confidence: ${(result.metadata.confidence * 100).toFixed(1)}%`);
        
        console.log('\n🧠 Top Entities:');
        result.entities
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 5)
            .forEach(entity => {
                console.log(`  ${entity.text} (${entity.type}) - Importance: ${entity.importance}`);
            });
        
        console.log('\n🔗 Top Relationships:');
        result.relationships
            .slice(0, 3)
            .forEach(rel => {
                console.log(`  ${rel.from} → ${rel.to} (${rel.type}) - Strength: ${rel.strength.toFixed(2)}`);
            });
        
        return result;
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
}

// Export for use in other modules
module.exports = {
    XoptYmiZContentProcessor,
    XoptYmiZProcessingError,
    demonstrateProcessor
};

// Run demo if called directly
if (require.main === module) {
    demonstrateProcessor();
}

/* 
USAGE EXAMPLES:

// Basic content processing
const processor = new XoptYmiZContentProcessor();
const result = await processor.processContent({
    url: 'https://example.com/article'
});

// Process HTML directly
const result = await processor.processContent({
    html: '<html>...</html>'
});

// Process raw text
const result = await processor.processContent({
    text: 'Your content here...',
    title: 'Content Title'
});

// Custom configuration
const processor = new XoptYmiZContentProcessor({
    openaiKey: 'your-key',
    maxTokens: 4000,
    minEntityImportance: 7
});

*/