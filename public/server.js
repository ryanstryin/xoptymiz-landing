
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (your landing page)
app.use(express.static('public'));

// Health check with database status
app.get('/api/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            service: 'XoptYmiZ Cloud Engine',
            engines: {}
        };

        // Test Supabase connection
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
            
            const { data, error } = await supabase
                .from('beta_signups')
                .select('count')
                .limit(1);
                
            health.engines.supabase = !error ? 'connected' : 'error';
        } catch (err) {
            health.engines.supabase = 'not_configured';
        }

        // Test Neo4j connection
        try {
            const neo4j = require('neo4j-driver');
            const driver = neo4j.driver(
                process.env.NEO4J_URI,
                neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
            );
            
            const session = driver.session();
            await session.run('RETURN 1');
            await session.close();
            await driver.close();
            
            health.engines.neo4j = 'connected';
        } catch (err) {
            health.engines.neo4j = 'not_configured';
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

// Basic API routes
app.post('/api/process-url', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // For now, return a demo response
        res.json({
            success: true,
            message: 'XoptYmiZ processing demo',
            data: {
                url,
                entities: ['XoptYmiZ', 'AI Optimization', 'Knowledge Graph'],
                relationships: [
                    { from: 'XoptYmiZ', to: 'AI Optimization', type: 'ENABLES' },
                    { from: 'XoptYmiZ', to: 'Knowledge Graph', type: 'USES' }
                ],
                status: 'Demo mode - install engines for full processing'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Beta signup endpoint
app.post('/api/beta-signup', async (req, res) => {
    try {
        const { email, company, useCase } = req.body;
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        // Try to save to Supabase if configured
        try {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
            
            const { data, error } = await supabase
                .from('beta_signups')
                .insert([{ email, company, use_case: useCase }]);

            if (error) throw error;
            
            console.log('✅ Beta signup saved to Supabase:', email);
        } catch (dbError) {
            console.log('📝 Beta signup (DB not configured):', email, { company, useCase });
        }

        res.json({
            success: true,
            message: 'Successfully joined XoptYmiZ beta waitlist!',
            email,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve landing page for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'XoptYmiZ Route not found',
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'POST /api/process-url',
            'POST /api/beta-signup'
        ]
    });
});

app.listen(PORT, () => {
    console.log('🚀 ===============================================');
    console.log('🚀 XoptYmiZ Engine Started!');
    console.log('🚀 ===============================================');
    console.log(`🌐 Landing Page: http://localhost:`+PORT);
    console.log(`🔧 API Health: http://localhost:`+PORT+`/api/health`);
    console.log(`📊 Process URL: POST /api/process-url`);
    console.log(`✉️ Beta Signup: POST /api/beta-signup`);
    console.log('🚀 ===============================================');
});

module.exports = app;


