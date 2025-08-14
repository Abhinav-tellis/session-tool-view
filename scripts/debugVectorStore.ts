import dotenv from 'dotenv';
import { VectorStore } from '../../services/vectorStore';

dotenv.config({ path: '.env.local' });

async function debugVectorStore() {
  console.log('🔍 Debugging vector store...');
  
  try {
    const vectorStore = new VectorStore();
    await vectorStore.initialize();
    
    console.log('✅ Vector store initialized');
    
    // Check document count
    const count = await vectorStore.getDocumentCount();
    console.log(`📊 Total documents: ${count}`);
    
    if (count > 0) {
      console.log('🔍 Trying different search approaches...');
      
      // Try basic search without scores first
      try {
        console.log('1. Testing simple similarity search...');
        const basicResults = await vectorStore.similaritySearch('session', 3);
        console.log(`Found ${basicResults.length} results with basic search`);
        
        if (basicResults.length > 0) {
          console.log('Sample result:');
          console.log('Content:', basicResults[0].pageContent.substring(0, 200));
          console.log('Metadata:', basicResults[0].metadata);
        }
      } catch (error) {
        console.error('Basic search failed:', error.message);
      }
      
      // Try search with scores
      try {
        console.log('2. Testing similarity search with scores...');
        const scoreResults = await vectorStore.similaritySearchWithScore('data', 3);
        console.log(`Found ${scoreResults.length} results with score search`);
        
        if (scoreResults.length > 0) {
          const [doc, score] = scoreResults[0];
          console.log(`Sample result (score: ${score}):`);
          console.log('Content:', doc.pageContent.substring(0, 200));
        }
      } catch (error) {
        console.error('Score search failed:', error.message);
      }
    }
    
    await vectorStore.close();
    console.log('🎉 Debug complete');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

if (require.main === module) {
  debugVectorStore().catch(console.error);
}