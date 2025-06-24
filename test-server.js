const express = require('express');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

console.log('🔍 Testing XoptYmiZ engine loading...');

// Test loading engines individually
try {
    console.log('1. Testing ContentProcessor...');
    const ContentProcessor = require('./src/engines/ContentProcessor');
    console.log('✅ ContentProcessor loaded successfully');
    
    console.log('2. Testing KnowledgeGraphEngine...');
    const KnowledgeGraph = require('./src/engines/KnowledgeGraphEngine');
    console.log('✅ KnowledgeGraphEngine loaded successfully');
    
    console.log('3. All engines loaded successfully!');
} catch (error) {
    console.error('❌ Engine loading error:', error.message);
    console.error('📍 Error location:', error.stack.split('\n')[1]);
}

// Basic routes without adapters for now
app.get('/api/health', (req, res) => {
    res.json({
        status: 'testing',
        engines: 'loaded successfully',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log('🚀 XoptYmiZ Test Server: http://localhost:' + PORT);
});
