// Content Processor Adapter for XoptYmiZ
const XoptYmiZContentProcessor = require('./ContentProcessor');

class ContentProcessorAdapter {
    constructor() {
        this.processor = new XoptYmiZContentProcessor({
            openaiKey: process.env.OPENAI_API_KEY,
            // Add other config options your processor needs
            maxContentLength: process.env.MAX_CONTENT_LENGTH || 100000,
            timeout: process.env.ENTITY_EXTRACTION_TIMEOUT || 30000
        });
    }

    async processURL(url, options = {}) {
        try {
            console.log('🔄 XoptYmiZ Processing:', url);
            
            // Call your sophisticated processor
            const result = await this.processor.processURL(url, options);
            
            console.log('✅ Processing complete:', {
                entities: result.entities?.length || 0,
                relationships: result.relationships?.length || 0
            });
            
            return result;
        } catch (error) {
            console.error('❌ Processing error:', error.message);
            throw error;
        }
    }

    async health() {
        try {
            // Test if the processor is working
            return await this.processor.health ? this.processor.health() : 'ready';
        } catch (error) {
            return 'error: ' + error.message;
        }
    }
}

module.exports = ContentProcessorAdapter;
