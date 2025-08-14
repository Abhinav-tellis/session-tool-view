import { VectorStore } from './services/vectorStore';
import { processSessionData } from './services/processSessionEmbeddings';

async function initializeData() {
  console.log('🚀 Starting vector store initialization...');
  
  try {
    const vectorStore = new VectorStore();
    await vectorStore.initialize();
    console.log('✅ Vector store initialized');
    
    console.log('📂 Processing session data from ./sessions directory...');
    const chunks = await processSessionData('./sessions');
    console.log(`📊 Found ${chunks.length} session chunks to process`);
    
    if (chunks.length > 0) {
      console.log('💾 Adding session documents to vector store...');
      const result = await vectorStore.addSessionDocuments(chunks);
      console.log(`✅ Successfully added ${result} documents to vector store`);
    } else {
      console.log('⚠️ No session chunks found to add');
    }
    
    const count = await vectorStore.getDocumentCount();
    console.log(`📈 Total documents in vector store: ${count}`);
    
    await vectorStore.close();
    console.log('🎉 Vector store initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initializeData().catch(console.error);
}