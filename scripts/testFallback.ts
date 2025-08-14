import dotenv from 'dotenv';
import { FallbackChatService } from '../lib/FallbackChatService';

dotenv.config({ path: '.env.local' });

async function testFallback() {
  console.log('🔍 Testing fallback chat service...');
  
  try {
    const chatService = new FallbackChatService();
    console.log('\nInitializing fallback service...');
    await chatService.initialize();
    
    console.log('\nRunning health check...');
    const health = await chatService.healthCheck();
    console.log('Health status:', health);
    
    console.log('\nTesting queries...');
    
    const testQueries = [
      "What sessions do you have available?",
      "Tell me about autocapture",
      "What information about frontend was discussed?"
    ];
    
    for (const query of testQueries) {
      console.log(`\n📝 Query: "${query}"`);
      console.log('⏳ Processing...');
      
      const response = await chatService.processQuery(query);
      console.log('🤖 Response:', response);
      console.log('---');
    }
    
    await chatService.close();
    console.log('\n✅ Fallback test completed successfully!');
    
  } catch (error) {
    console.error('❌ Fallback test failed:', error);
  }
}

if (require.main === module) {
  testFallback().catch(console.error);
}