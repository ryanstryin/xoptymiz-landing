require('dotenv').config();

async function testXoptYmiZConnections() {
    console.log('🔍 Testing XoptYmiZ Engine Connections...\n');

    // Test OpenAI
    try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        await openai.models.list();
        console.log('✅ OpenAI: Connected and ready');
    } catch (error) {
        console.log('❌ OpenAI: Connection failed -', error.message);
    }

    // Test Neo4j
    try {
        const neo4j = require('neo4j-driver');
        const driver = neo4j.driver(
            process.env.NEO4J_URI,
            neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
        );
        const session = driver.session();
        await session.run('RETURN "XoptYmiZ Neo4j Connected!" as message');
        await session.close();
        await driver.close();
        console.log('✅ Neo4j: Connected and ready');
    } catch (error) {
        console.log('❌ Neo4j: Connection failed -', error.message);
    }

    // Test your engines
    try {
        const XoptYmiZContentProcessor = require('./src/engines/ContentProcessor');
        const processor = new XoptYmiZContentProcessor({
            openaiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ XoptYmiZ Content Processor: Loaded successfully');
    } catch (error) {
        console.log('❌ Content Processor: Load failed -', error.message);
    }

    try {
        const XoptYmiZKnowledgeGraph = require('./src/engines/KnowledgeGraphEngine');
        const kg = new XoptYmiZKnowledgeGraph({
            uri: process.env.NEO4J_URI,
            username: process.env.NEO4J_USER,
            password: process.env.NEO4J_PASSWORD
        });
        console.log('✅ XoptYmiZ Knowledge Graph: Loaded successfully');
        await kg.close();
    } catch (error) {
        console.log('❌ Knowledge Graph: Load failed -', error.message);
    }

    console.log('\n🎉 XoptYmiZ Engine Connection Test Complete!');
    console.log('🚀 Ready to start your $200K MRR business engine!');
}

testXoptYmiZConnections().catch(console.error);