import dotenv from 'dotenv';
import { GeminiChatService } from '../lib/GeminiChatService';

dotenv.config({ path: '.env.local' });

async function testGemini() {
  console.log('🤖 Testing Gemini chat service...');
  console.log('Environment check:');
  console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `Set (${process.env.GEMINI_API_KEY.substring(0, 10)}...)` : 'Not set');
  console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
  
  try {
    const chatService = new GeminiChatService();
    console.log('\n🔄 Initializing Gemini service...');
    await chatService.initialize();
    
    console.log('\n🏥 Running health check...');
    const health = await chatService.healthCheck();
    console.log('Health status:', health);
    
    if (health.status !== 'healthy') {
      console.log('⚠️ Service not fully healthy, but proceeding with tests...');
    }
    
    console.log('\n📝 Testing queries with Gemini 2.5 Flash...');
    
    const testQueries = [
      "What sessions are available in the database?",
      "Tell me about any frontend or UI development discussions",
      "What information about MongoDB or databases was discussed?",
      "Summarize the main topics covered in the conversations"
    ];
    
    for (const query of testQueries) {
      console.log(`\n💭 Query: "${query}"`);
      console.log('⏳ Processing with Gemini...');
      
      const startTime = Date.now();
      const response = await chatService.processQuery(query);
      const duration = Date.now() - startTime;
      
      console.log(`🤖 Response (${duration}ms):`);
      console.log(response);
      console.log('---'.repeat(20));
    }
    
    await chatService.close();
    console.log('\n✅ Gemini test completed successfully!');
    
  } catch (error) {
    console.error('❌ Gemini test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

if (require.main === module) {
  testGemini().catch(console.error);
}