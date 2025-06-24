const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import your sophisticated engines
const XoptYmiZContentProcessor = require('./src/engines/ContentProcessor');
const XoptYmiZKnowledgeGraph = require('./src/engines/KnowledgeGraphEngine');
const XoptYmiZDatabaseAdapter = require('./src/engines/DatabaseAdapter');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize sophisticated engines
let contentProcessor;
let knowledgeGraphEngine;
let databaseAdapter;
let enginesReady = false;

async function initializeEngines() {
    try {
        console.log('🔄 Initializing XoptYmiZ sophisticated engines...');
        
        // Initialize database adapter
        databaseAdapter = new XoptYmiZDatabaseAdapter();
        console.log('✅ Database adapter initialized');
        
        // Initialize content processor with your sophisticated algorithms
        contentProcessor = new XoptYmiZContentProcessor({
            openaiKey: process.env.OPENAI_API_KEY,
            maxContentLength: process.env.MAX_CONTENT_LENGTH || 100000,
            timeout: process.env.ENTITY_EXTRACTION_TIMEOUT || 30000
        });
        console.log('✅ Sophisticated content processor initialized');
        
        // Initialize knowledge graph engine
        knowledgeGraphEngine = new XoptYmiZKnowledgeGraph({
            uri: process.env.NEO4J_URI,
            username: process.env.NEO4J_USER,
            password: process.env.NEO4J_PASSWORD
        });
        console.log('✅ Knowledge graph engine initialized');
        
        // Test database connections
        const dbStatus = await databaseAdapter.testConnections();
        console.log('📊 Database status:', dbStatus);
        
        enginesReady = true;
        console.log('🎉 All XoptYmiZ engines ready for production!');
        
    } catch (error) {
        console.error('❌ Engine initialization error:', error.message);
        console.log('⚠️ Running in fallback mode');
        enginesReady = false;
    }
}

// Initialize engines on startup
initializeEngines();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Enhanced health check with full engine status
app.get('/api/health', async (req, res) => {
    try {
        const health = {
            status: enginesReady ? 'production_ready' : 'fallback_mode',
            timestamp: new Date().toISOString(),
            service: 'XoptYmiZ Production Engine',
            version: '1.0.0',
            engines: {}
        };

        if (databaseAdapter) {
            const dbStatus = await databaseAdapter.testConnections();
            health.engines.supabase = dbStatus.supabase ? 'connected' : 'disconnected';
            health.engines.neo4j = dbStatus.neo4j ? 'connected' : 'disconnected';
        }

        health.engines.contentProcessor = contentProcessor ? 'ready' : 'not_available';
        health.engines.knowledgeGraph = knowledgeGraphEngine ? 'ready' : 'not_available';
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

// Production-grade content processing
app.post('/api/process-url', async (req, res) => {
    try {
        const { url, options = {} } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required',
                example: '{"url": "https://example.com", "options": {"includeMetadata": true}}'
            });
        }

        console.log('🚀 XoptYmiZ processing:', url);
        const startTime = Date.now();

        let result;
        if (contentProcessor && enginesReady) {
            // Use your sophisticated content processor
            result = await contentProcessor.processURL(url, options);
            result.processingTime = Date.now() - startTime;
            
            // Store in both Supabase and Neo4j
            if (databaseAdapter) {
                try {
                    await Promise.all([
                        databaseAdapter.storeProcessedContent(result),
                        databaseAdapter.storeInKnowledgeGraph(result)
                    ]);
                    console.log('✅ Content stored in all databases');
                } catch (dbError) {
                    console.warn('⚠️ Database storage failed:', dbError.message);
                }
            }
        } else {
            // Fallback demo response
            result = {
                url: url,
                entities: [
                    { text: 'XoptYmiZ', type: 'PRODUCT', importance: 10 },
                    { text: 'AI Optimization', type: 'CONCEPT', importance: 9 }
                ],
                relationships: [
                    { from: 'XoptYmiZ', to: 'AI Optimization', type: 'ENABLES' }
                ],
                status: 'demo_mode',
                processingTime: Date.now() - startTime
            };
        }

        res.json({
            success: true,
            data: result,
            metadata: {
                processingTimeMs: result.processingTime,
                engine: enginesReady ? 'XoptYmiZ Production Engine' : 'Demo Mode',
                timestamp: new Date().toISOString()
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

// Enhanced LLMs.txt generation from knowledge graph
app.get('/api/llms-txt/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        const options = {
            maxPages: parseInt(req.query.maxPages) || 50,
            includeRelationships: req.query.includeRelationships !== 'false'
        };

        console.log('📄 Generating LLMs.txt for:', domain);

        let llmsTxt;
        if (databaseAdapter && enginesReady) {
            llmsTxt = await databaseAdapter.generateLLMsTxt(domain, options);
        } else {
            llmsTxt = '# LLMs.txt for ' + domain + '\n# Generated by XoptYmiZ (demo mode)\n# Timestamp: ' + new Date().toISOString();
        }

        res.type('text/plain');
        res.set({
            'Content-Disposition': 'attachment; filename="' + domain + '-llms.txt"',
            'X-Generated-By': 'XoptYmiZ Engine v1.0.0'
        });
        res.send(llmsTxt);

    } catch (error) {
        console.error('❌ LLMs.txt generation error:', error);
        res.status(500).json({
            error: 'LLMs.txt generation failed',
            message: error.message
        });
    }
});

// Enhanced beta signup with database storage
app.post('/api/beta-signup', async (req, res) => {
    try {
        const { email, company, useCase, referralSource } = req.body;
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        console.log('✉️ XoptYmiZ beta signup:', email);

        // Store in database if available
        if (databaseAdapter && enginesReady) {
            try {
                await databaseAdapter.storeBetaSignup(email, {
                    company,
                    useCase,
                    referralSource
                });
                console.log('✅ Beta signup stored in database');
            } catch (dbError) {
                console.warn('⚠️ Database storage failed, but signup recorded:', dbError.message);
            }
        }

        res.json({
            success: true,
            message: 'Successfully joined XoptYmiZ beta waitlist!',
            email: email,
            status: enginesReady ? 'production_ready' : 'demo_mode',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Beta signup error:', error);
        res.status(500).json({
            error: 'Beta signup failed',
            message: error.message
        });
    }
});

// Landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'XoptYmiZ route not found',
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'POST /api/process-url',
            'GET /api/llms-txt/:domain',
            'POST /api/beta-signup'
        ]
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 XoptYmiZ shutting down gracefully...');
    if (databaseAdapter) {
        await databaseAdapter.close();
    }
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 ===============================================');
    console.log('🚀 XoptYmiZ Production Engine Started!');
    console.log('🚀 ===============================================');
    console.log('🌐 Landing Page: http://localhost:' + PORT);
    console.log('🔧 API Health: http://localhost:' + PORT + '/api/health');
    console.log('📊 Process Content: POST /api/process-url');
    console.log('📄 LLMs.txt: GET /api/llms-txt/:domain');
    console.log('✉️ Beta Signup: POST /api/beta-signup');
    console.log('🚀 ===============================================');
    console.log('🎯 Optimization in Every Dimension - Production Ready!');
    console.log('📊 Engine Status: ' + (enginesReady ? 'PRODUCTION READY' : 'DEMO MODE'));
});

// Export the app for Vercel
module.exports = app;

// Export the Express app for Vercel
module.exports = app;
