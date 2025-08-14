import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config({ path: '.env.local' });

async function checkRawData() {
  console.log('🔍 Checking raw MongoDB data...');
  
  const client = new MongoClient(process.env.MONGODB_URI!);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('rag_database');
    const collection = db.collection('embeddings');
    
    // Count documents
    const count = await collection.countDocuments();
    console.log(`📊 Total documents: ${count}`);
    
    if (count > 0) {
      // Get a sample document to see the structure
      const sampleDoc = await collection.findOne();
      console.log('🗂️ Sample document structure:');
      console.log('Keys:', Object.keys(sampleDoc || {}));
      
      if (sampleDoc) {
        console.log('Text field exists:', 'text' in sampleDoc);
        console.log('Embedding field exists:', 'embedding' in sampleDoc);
        console.log('Text sample:', typeof sampleDoc.text === 'string' ? sampleDoc.text.substring(0, 100) : 'Not a string');
        console.log('Embedding sample:', Array.isArray(sampleDoc.embedding) ? `Array of ${sampleDoc.embedding.length} numbers` : 'Not an array');
      }
      
      // Get all documents to see their structure
      const allDocs = await collection.find({}).limit(3).toArray();
      console.log('\n📋 First 3 documents:');
      allDocs.forEach((doc, index) => {
        console.log(`\nDoc ${index + 1}:`);
        console.log('- _id:', doc._id);
        console.log('- text:', typeof doc.text === 'string' ? `"${doc.text.substring(0, 50)}..."` : `Type: ${typeof doc.text}`);
        console.log('- embedding:', Array.isArray(doc.embedding) ? `[${doc.embedding.length} numbers]` : `Type: ${typeof doc.embedding}`);
        console.log('- metadata:', doc.metadata ? Object.keys(doc.metadata) : 'No metadata');
      });
    }
    
    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const indexes = await collection.indexes();
    console.log('Available indexes:', indexes.map(idx => idx.name));
    
    const vectorIndex = indexes.find(idx => idx.name === 'vector_index');
    if (vectorIndex) {
      console.log('✅ Vector index found:', vectorIndex);
    } else {
      console.log('❌ Vector index "vector_index" not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🎉 Raw data check complete');
  }
}

if (require.main === module) {
  checkRawData().catch(console.error);
}