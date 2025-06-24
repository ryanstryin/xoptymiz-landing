const { OpenAI } = require('openai');
const cheerio = require('cheerio');
const natural = require('natural');

class ContentProcessor {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async processURL(url) {
    try {
      console.log(`Starting processing for URL: ${url}`);
      
      // 1. Fetch and clean content
      const cleanContent = await this.extractCleanContent(url);
      
      // 2. Extract entities
      const entities = await this.extractEntities(cleanContent);
      
      // 3. Find relationships
      const relationships = await this.findRelationships(entities, cleanContent);
      
      // 4. Generate metadata
      const metadata = await this.generateMetadata(cleanContent, entities);
      
      return {
        url,
        content: cleanContent.substring(0, 1000) + '...', // Truncate for response
        entities,
        relationships,
        metadata,
        processedAt: new Date(),
        stats: {
          entitiesFound: entities.length,
          relationshipsFound: relationships.length,
          contentLength: cleanContent.length
        }
      };
    } catch (error) {
      console.error('Error in processURL:', error);
      throw new Error(`Failed to process URL: ${error.message}`);
    }
  }

  async extractCleanContent(url) {
    try {
      // For demo purposes, return sample content
      // In production, you'd fetch the actual URL
      return `Sample content from ${url}. This is where XoptYmiZ would extract and clean the actual content from the webpage, removing HTML tags, scripts, and other noise to get pure, meaningful text that can be processed by AI systems.`;
    } catch (error) {
      throw new Error(`Failed to extract content: ${error.message}`);
    }
  }

  async extractEntities(content) {
    try {
      const prompt = `
      Analyze this content and extract named entities. Return JSON:
      {
        "entities": [
          {
            "text": "entity name",
            "type": "PERSON|ORGANIZATION|LOCATION|CONCEPT|TECHNOLOGY|PRODUCT",
            "importance": 1-10,
            "description": "brief description",
            "aliases": ["alternative names"]
          }
        ]
      }
      
      Content: ${content.substring(0, 2000)}
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result.entities || [];
    } catch (error) {
      console.error('Error extracting entities:', error);
      // Return sample entities for demo
      return [
        {
          text: "XoptYmiZ",
          type: "PRODUCT",
          importance: 10,
          description: "AI content optimization platform",
          aliases: ["XoptYmiZ Platform", "XoptYmiZ Engine"]
        },
        {
          text: "Content Optimization",
          type: "CONCEPT",
          importance: 8,
          description: "Process of improving content for AI discovery",
          aliases: ["SEO", "AI Optimization"]
        }
      ];
    }
  }

  async findRelationships(entities, content) {
    // Simple relationship detection for demo
    const relationships = [];
    
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        relationships.push({
          from: entities[i].text,
          to: entities[j].text,
          type: "RELATED_TO",
          confidence: 0.8,
          source: "content_analysis"
        });
      }
    }
    
    return relationships.slice(0, 5); // Limit for demo
  }

  async generateMetadata(content, entities) {
    return {
      wordCount: content.split(' ').length,
      readabilityScore: 75,
      keyTopics: entities.slice(0, 3).map(e => e.text),
      summary: content.substring(0, 200) + '...',
      language: 'en',
      generatedAt: new Date()
    };
  }
}

module.exports = ContentProcessor;