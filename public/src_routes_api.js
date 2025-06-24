const express = require('express');
const router = express.Router();

// Import your engine files
const ContentProcessor = require('../engines/ContentProcessor');
const KnowledgeGraphEngine = require('../engines/KnowledgeGraphEngine');

// Initialize engines
const contentProcessor = new ContentProcessor();
const knowledgeGraph = new KnowledgeGraphEngine();

// API Routes
router.get('/health', (req, res) => {
  res.json({ status: 'XoptYmiZ API is healthy!' });
});

// Process URL endpoint
router.post('/process-url', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Processing URL: ${url}`);
    const result = await contentProcessor.processURL(url);
    
    res.json({
      success: true,
      data: result,
      message: 'URL processed successfully'
    });
  } catch (error) {
    console.error('Error processing URL:', error);
    res.status(500).json({ 
      error: 'Failed to process URL',
      message: error.message 
    });
  }
});

// Knowledge graph endpoint
router.get('/knowledge-graph/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const result = await knowledgeGraph.getGraphForDomain(domain);
    
    res.json({
      success: true,
      data: result,
      domain: domain
    });
  } catch (error) {
    console.error('Error getting knowledge graph:', error);
    res.status(500).json({ 
      error: 'Failed to get knowledge graph',
      message: error.message 
    });
  }
});

// Generate LLMs.txt endpoint
router.get('/llms-txt/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const options = req.query;
    
    const llmsTxt = await knowledgeGraph.generateLLMsTxt(domain, options);
    
    res.type('text/plain');
    res.send(llmsTxt);
  } catch (error) {
    console.error('Error generating LLMs.txt:', error);
    res.status(500).json({ 
      error: 'Failed to generate LLMs.txt',
      message: error.message 
    });
  }
});

// Beta signup endpoint (for your landing page form)
router.post('/beta-signup', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // TODO: Save to database
    console.log(`New beta signup: ${email}`);
    
    res.json({
      success: true,
      message: 'Successfully joined beta waitlist!',
      email: email
    });
  } catch (error) {
    console.error('Beta signup error:', error);
    res.status(500).json({ 
      error: 'Failed to process signup',
      message: error.message 
    });
  }
});

module.exports = router;