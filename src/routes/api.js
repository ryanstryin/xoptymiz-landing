const express = require('express');
const router = express.Router();

// Import your engine adapters
const ContentProcessorAdapter = require('../engines/ContentProcessorAdapter');
const KnowledgeGraphAdapter = require('../engines/KnowledgeGraphAdapter');

// Initialize engines
let contentProcessor;
let knowledgeGraph;

try {
    contentProcessor = new ContentProcessorAdapter();
    knowledgeGraph = new KnowledgeGraphAdapter();
    console.log('✅ XoptYmiZ engines initialized successfully');
} catch (error) {
    console.error('❌ Engine initialization error:', error.message);
    console.log('⚠️ Running in fallback mode');
}

// Enhanced health check
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'XoptYmiZ Production Engine',
            version: '1.0.0',
            engines: {}
        };

        // Test Content Processor
        if (contentProcessor) {
            try {
                health.engines.contentProcessor = await contentProcessor.health();
            } catch (error) {
                health.engines.contentProcessor = 'error: ' + error.message;
            }
        } else {
            health.engines.contentProcessor = 'not_initialized';
        }

        // Test Knowledge Graph
        if (knowledgeGraph) {
            try {
                const connected = await knowledgeGraph.testConnection();
                health.engines.knowledgeGraph = connected ? 'connected' : 'disconnected';
            } catch (error) {
                health.engines.knowledgeGraph = 'error: ' + error.message;
            }
        } else {
            health.engines.knowledgeGraph = 'not_initialized';
        }

        // Test OpenAI
        health.engines.openai = process.env.OPENAI_API_KEY ? 'configured' : 'missing';

        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Enhanced URL processing with your sophisticated engine
router.post('/process-url', async (req, res) => {
    try {
        const { url, options = {} } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required',
                example: '{"url": "https://example.com", "options": {}}'
            });
        }

        console.log('🚀 XoptYmiZ processing request:', url);

        if (!contentProcessor) {
            return res.status(503).json({
                error: 'Content processor not available',
                message: 'Engine initialization failed'
            });
        }

        // Use your sophisticated content processor
        const startTime = Date.now();
        const result = await contentProcessor.processURL(url, options);
        const processingTime = Date.now() - startTime;

        // Store in knowledge graph if available
        if (knowledgeGraph && result) {
            try {
                await knowledgeGraph.storeContent(result);
            } catch (kgError) {
                console.warn('Knowledge graph storage failed:', kgError.message);
                // Continue without failing the request
            }
        }

        res.json({
            success: true,
            data: result,
            metadata: {
                processingTimeMs: processingTime,
                timestamp: new Date().toISOString(),
                engine: 'XoptYmiZ Production Engine v1.0.0'
            }
        });

    } catch (error) {
        console.error('❌ Processing error:', error);
        res.status(500).json({
            error: 'Processing failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Enhanced knowledge graph endpoint
router.get('/knowledge-graph/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        const options = {
            limit: parseInt(req.query.limit) || 100,
            format: req.query.format || 'json',
            includeMetadata: req.query.includeMetadata !== 'false'
        };

        if (!knowledgeGraph) {
            return res.status(503).json({
                error: 'Knowledge graph not available',
                message: 'Engine initialization failed'
            });
        }

        console.log('🔍 Getting knowledge graph for:', domain);

        const result = await knowledgeGraph.getGraphForDomain(domain, options);

        res.json({
            success: true,
            domain: domain,
            data: result,
            metadata: {
                timestamp: new Date().toISOString(),
                options: options
            }
        });

    } catch (error) {
        console.error('❌ Knowledge graph error:', error);
        res.status(500).json({
            error: 'Knowledge graph retrieval failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Enhanced LLMs.txt generation with your sophisticated engine
router.get('/llms-txt/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        const options = {
            maxPages: parseInt(req.query.maxPages) || 50,
            format: req.query.format || 'standard',
            includeRelationships: req.query.includeRelationships !== 'false',
            includeMetadata: req.query.includeMetadata !== 'false'
        };

        console.log('📄 Generating LLMs.txt for:', domain);

        let llmsTxt;
        if (knowledgeGraph) {
            llmsTxt = await knowledgeGraph.generateLLMsTxt(domain, options);
        } else {
            // Fallback generation
            llmsTxt = '# LLMs.txt for ' + domain + '\n' +
                     '# Generated by XoptYmiZ Engine (fallback mode)\n\n' +
                     '## Status\n' +
                     'Knowledge graph not available\n\n' +
                     '## Generated\n' +
                     'Timestamp: ' + new Date().toISOString() + '\n';
        }

        res.type('text/plain');
        res.set({
            'Content-Disposition': 'attachment; filename="' + domain + '-llms.txt"',
            'X-Generated-By': 'XoptYmiZ Engine v1.0.0',
            'X-Generation-Time': new Date().toISOString()
        });
        res.send(llmsTxt);

    } catch (error) {
        console.error('❌ LLMs.txt generation error:', error);
        res.status(500).json({
            error: 'LLMs.txt generation failed',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Beta signup (unchanged)
router.post('/beta-signup', async (req, res) => {
    try {
        const { email, company, useCase } = req.body;
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        console.log('✉️ XoptYmiZ beta signup:', { email, company, useCase });

        res.json({
            success: true,
            message: 'Successfully joined XoptYmiZ beta waitlist!',
            email: email,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Beta signup failed',
            message: error.message
        });
    }
});

module.exports = router;
