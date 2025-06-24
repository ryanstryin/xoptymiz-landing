require('dotenv').config();

async function testCloudConnections() {
    console.log('🌐 Testing XoptYmiZ Cloud Database Connections...\n');

    // Test Supabase
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
            
        if (!error) {
            console.log('✅ Supabase: Connected successfully');
            console.log('   📊 Tables ready for XoptYmiZ data');
        } else {
            console.log('❌ Supabase:', error.message);
        }
    } catch (error) {
        console.log('❌ Supabase: Connection failed -', error.message);
    }

    // Test Neo4j Aura
    try {
        const neo4j = require('neo4j-driver');
        const driver = neo4j.driver(
            process.env.NEO4J_URI,
            neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
        );
        
        const session = driver.session();
        const result = await session.run('RETURN \"XoptYmiZ Knowledge Graph Connected!\" as message, datetime() as timestamp');
        console.log('✅ Neo4j Aura:', result.records[0].get('message'));
        console.log('   🧠 Knowledge graph ready for entities and relationships');
        
        await session.close();
        await driver.close();
    } catch (error) {
        console.log('❌ Neo4j Aura: Connection failed -', error.message);
        console.log('   💡 Check your NEO4J_URI and password in .env');
    }

    // Test OpenAI
    try {
        const { OpenAI } = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const models = await openai.models.list();
        console.log('✅ OpenAI: Connected successfully');
        console.log('   🤖 Ready for sophisticated content processing');
    } catch (error) {
        console.log('❌ OpenAI: Connection failed -', error.message);
    }

    console.log('\n🎉 XoptYmiZ Cloud Database Test Complete!');
    console.log('🚀 Ready for production-grade content optimization!');
}

testCloudConnections().catch(console.error);
