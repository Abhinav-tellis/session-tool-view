import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";
import { textSplitter } from './text_splitter';
import { getEmbedding } from './embedData';
import dotenv from 'dotenv';

dotenv.config();

// Custom embeddings class for your Ollama setup
class OllamaEmbeddings {
  async embedDocuments(texts: string[]) {
    const embeddings = [];
    for (const text of texts) {
      const { embedding } = await getEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  async embedQuery(text: string) {
    const { embedding } = await getEmbedding(text);
    return embedding;
  }
}

export class VectorStore {
  private client: MongoClient;
  private vectorStore: MongoDBAtlasVectorSearch;
  private embeddings: OllamaEmbeddings;

  constructor(
    private connectionString: string = process.env.MONGODB_URI || '',
    private dbName: string = 'rag_database',
    private collectionName: string = 'embeddings'
  ) {
    this.embeddings = new OllamaEmbeddings();
  }

  async initialize() {
    try {
      this.client = new MongoClient(this.connectionString);
      await this.client.connect();
      
      const collection = this.client.db(this.dbName).collection(this.collectionName);
      
      this.vectorStore = new MongoDBAtlasVectorSearch(this.embeddings, {
        collection,
        indexName: "vector_index",
        textKey: "text",
        embeddingKey: "embedding",
      });

      // Create the search index (run once)
      await this.createVectorIndex(collection);
    } catch (error) {
      console.error('Error initializing vector store:', error);
      throw error;
    }
  }

  private async createVectorIndex(collection: any) {
    try {
      await collection.createSearchIndex({
        name: "vector_index",
        definition: {
          "fields": [
            {
              "type": "vector",
              "path": "embedding",
              "numDimensions": 768, // nomic-embed-text dimensions
              "similarity": "cosine"
            }
          ]
        }
      });
    } catch (error) {
      // Index creation is optional - vector operations work without explicit index
    }
  }

  async addDocuments(filePath: string) {
    try {
      
      // Use your existing text splitter
      const docs = await textSplitter();
      
      if (docs.length === 0) {
        return;
      }

      // Add metadata to documents
      const docsWithMetadata = docs.map((doc, index) => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          source: filePath,
          chunkIndex: index,
          timestamp: new Date().toISOString()
        }
      }));

      await this.vectorStore.addDocuments(docsWithMetadata);
      
      return docs.length;
    } catch (error) {
      console.error('Error adding documents:', error);
      throw error;
    }
  }

  async addSessionDocuments(sessionChunks: any[]) {
    try {
      
      if (sessionChunks.length === 0) {
        return 0;
      }

      // Convert session chunks to LangChain Document format
      const documents = sessionChunks.map((chunk) => ({
        pageContent: chunk.content,
        metadata: {
          id: chunk.id,
          sessionId: chunk.sessionId,
          source: chunk.metadata.filePath,
          chunkIndex: chunk.metadata.chunkIndex,
          timestamp: chunk.metadata.timestamp,
          type: 'session'
        }
      }));

      await this.vectorStore.addDocuments(documents);
      console.log(`Successfully added ${documents.length} documents to vector store`);
      
      return documents.length;
    } catch (error) {
      console.error('Error adding session documents:', error);
      throw error;
    }
  }

  async similaritySearch(query: string, k: number = 5) {
    try {
      const results = await this.vectorStore.similaritySearch(query, k);
      return results;
    } catch (error) {
      console.error('Error during similarity search:', error);
      throw error;
    }
  }

  async similaritySearchWithScore(query: string, k: number = 5) {
    try {
      const results = await this.vectorStore.similaritySearchWithScore(query, k);
      return results;
    } catch (error) {
      console.error('Error during similarity search with scores:', error);
      throw error;
    }
  }

  async getDocumentCount() {
    try {
      const collection = this.client.db(this.dbName).collection(this.collectionName);
      const count = await collection.countDocuments();
      return count;
    } catch (error) {
      console.error('Error getting document count:', error);
      return 0;
    }
  }

  async clearAll() {
    try {
      const collection = this.client.db(this.dbName).collection(this.collectionName);
      const result = await collection.deleteMany({});
      return result.deletedCount;
    } catch (error) {
      console.error('Error clearing documents:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.close();
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }
}

// Usage example
export async function indexDocument(filePath: string) {
  const vectorStore = new VectorStore();
  
  try {
    await vectorStore.initialize();
    const docCount = await vectorStore.addDocuments(filePath);
    console.log(`Indexing complete! Added ${docCount} document chunks.`);
    
    // Optional: Show total document count
    const totalDocs = await vectorStore.getDocumentCount();
    console.log(`Total documents in store: ${totalDocs}`);
    
  } catch (error) {
    console.error('Error during indexing:', error);
  } finally {
    await vectorStore.close();
  }
}

// Query example
export async function queryDocuments(query: string, topK: number = 5) {
  const vectorStore = new VectorStore();
  
  try {
    await vectorStore.initialize();
    const results = await vectorStore.similaritySearchWithScore(query, topK);
    
    console.log('\n--- Search Results ---');
    results.forEach(([doc, score], index) => {
      console.log(`\n${index + 1}. Score: ${score.toFixed(4)}`);
      console.log(`Source: ${doc.metadata.source}`);
      console.log(`Content: ${doc.pageContent.substring(0, 200)}...`);
    });
    
    return results;
  } catch (error) {
    console.error('Error during querying:', error);
    return [];
  } finally {
    await vectorStore.close();
  }
}