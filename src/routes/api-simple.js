const express = require('express');
const router = express.Router();

// Simple health check first
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'XoptYmiZ Engine',
        timestamp: new Date().toISOString(),
        engines: {
            contentProcessor: 'ready',
            knowledgeGraph: 'ready',
            openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing'
        }
    });
});

// Simple process URL endpoint
router.post('/process-url', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        console.log('Processing:', url);

        // Demo response for now
        res.json({
            success: true,
            data: {
                url: url,
                entities: [
                    { text: 'XoptYmiZ', type: 'PRODUCT', importance: 10 },
                    { text: 'AI Optimization', type: 'CONCEPT', importance: 9 }
                ],
                relationships: [
                    { from: 'XoptYmiZ', to: 'AI Optimization', type: 'ENABLES' }
                ],
                processedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Simple beta signup
router.post('/beta-signup', (req, res) => {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    console.log('Beta signup:', email);
    
    res.json({
        success: true,
        message: 'Successfully joined XoptYmiZ beta!',
        email: email
    });
});

module.exports = router;
