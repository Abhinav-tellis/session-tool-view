import dotenv from 'dotenv';
import { ChatService } from '../lib/ChatService';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing chat service connection...');
  console.log('Environment variables:');
  console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
  console.log('- OLLAMA_URL:', process.env.OLLAMA_URL ? 'Set' : 'Not set');
  console.log('- EMBED_MODEL:', process.env.EMBED_MODEL ? 'Set' : 'Not set');
  
  try {
    const chatService = new ChatService();
    console.log('\nInitializing chat service...');
    await chatService.initialize();
    
    console.log('\nRunning health check...');
    const health = await chatService.healthCheck();
    console.log('Health status:', health);
    
    console.log('\nTesting basic query...');
    const testQuery = "What information do you have available?";
    console.log(`Query: "${testQuery}"`);
    
    const response = await chatService.processQuery(testQuery);
    console.log('\nResponse:', response);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testConnection().catch(console.error);
}

export { testConnection };