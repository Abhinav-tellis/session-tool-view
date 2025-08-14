import path from 'path';
import fs from 'fs';

// We'll import from the root services directory
const servicesPath = path.join(process.cwd(), '..', 'services');

async function initializeVectorData() {
  console.log('Starting vector data initialization...');
  
  try {
    // Import your existing VectorStore class
    const { VectorStore } = await import(path.join(servicesPath, 'vectorStore.js'));
    const { processSessionData } = await import(path.join(servicesPath, 'processSessionEmbeddings.js'));
    
    const vectorStore = new VectorStore();
    await vectorStore.initialize();
    
    console.log('Vector store initialized');
    
    // Check if we have session data to process
    const sessionsDir = path.join(process.cwd(), '..', 'sessions');
    
    if (fs.existsSync(sessionsDir)) {
      console.log('Processing session data...');
      const chunks = await processSessionData(sessionsDir);
      
      if (chunks && chunks.length > 0) {
        console.log(`Found ${chunks.length} session chunks to index`);
        const result = await vectorStore.addSessionDocuments(chunks);
        console.log(`Added ${result} session documents to vector store`);
      } else {
        console.log('No session chunks found to process');
      }
    } else {
      console.log('Sessions directory not found, skipping session data processing');
    }
    
    // Get document count
    const docCount = await vectorStore.getDocumentCount();
    console.log(`Total documents in vector store: ${docCount}`);
    
    await vectorStore.close();
    console.log('Vector data initialization completed successfully!');
    
  } catch (error) {
    console.error('Error during vector data initialization:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeVectorData().catch(console.error);
}

export { initializeVectorData };