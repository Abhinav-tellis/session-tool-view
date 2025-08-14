import { Document } from "@langchain/core/documents";
import { VectorStore } from './vectorStore.js';
import { processSessionData } from './processSessionEmbeddings.js';
import dotenv from 'dotenv';

dotenv.config();

export class SessionQueryManager {
  private vectorStore: VectorStore;
  private isInitialized: boolean = false;

  constructor() {
    this.vectorStore = new VectorStore();
  }

  async initialize(useChroma: boolean = true): Promise<void> {
    try {
      await this.vectorStore.initialize();
      console.log('Initialized MongoDB vector store');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  async loadSessionData(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    console.log('Processing session data...');
    const sessionsDir = process.env.SESSIONS_DIR || './session-mcp/sessions';
    const chunks = await processSessionData(sessionsDir);

    if (chunks.length === 0) {
      console.log('No session data found to process.');
      return;
    }

    // The existing VectorStore expects to process files directly
    // We'll modify it to accept our processed chunks
    console.log(`Processing ${chunks.length} chunks for vector storage...`);
    
    // For now, we'll use the existing addDocuments method with a dummy path
    // This needs to be updated to work with our processed data
    console.log('Session data processing completed!');
  }

  async searchSessions(query: string, limit: number = 5): Promise<{
    documents: Document[],
    scores?: number[]
  }> {
    if (!this.isInitialized) {
      throw new Error('Vector store not initialized. Call initialize() first.');
    }

    console.log(`Searching for: "${query}"`);
    const resultsWithScores = await this.vectorStore.similaritySearchWithScore(query, limit);
    
    const documents = resultsWithScores.map(([doc]) => doc);
    const scores = resultsWithScores.map(([, score]) => score);

    return { documents, scores };
  }

  async findRelatedSessions(sessionId: string, limit: number = 3): Promise<Document[]> {
    const sessionDoc = await this.vectorStore.similaritySearch(`sessionId:${sessionId}`, 1);
    if (sessionDoc.length === 0) {
      return [];
    }

    const results = await this.vectorStore.similaritySearch(sessionDoc[0].pageContent, limit + 1);
    return results.filter(doc => doc.metadata.sessionId !== sessionId);
  }

  formatSearchResults(documents: Document[], scores?: number[]): string {
    let output = `Found ${documents.length} relevant results:\n\n`;
    
    documents.forEach((doc, index) => {
      const score = scores ? ` (similarity: ${scores[index].toFixed(3)})` : '';
      output += `## Result ${index + 1}${score}\n`;
      output += `**Session:** ${doc.metadata.sessionId}\n`;
      output += `**File:** ${doc.metadata.filePath}\n`;
      output += `**Timestamp:** ${doc.metadata.timestamp}\n\n`;
      output += `**Content:**\n${doc.pageContent}\n\n`;
      output += '---\n\n';
    });

    return output;
  }
}

// CLI interface
export async function main() {
  const queryManager = new SessionQueryManager();
  
  try {
    // Initialize vector store (default to Chroma)
    const useChroma = process.env.VECTOR_STORE_TYPE !== 'mongodb';
    await queryManager.initialize(useChroma);
    
    // Load session data
    await queryManager.loadSessionData();
    
    // Example queries
    console.log('\n=== Example Queries ===\n');
    
    const queries = [
      'embedding process',
      'session data structure',
      'typescript implementation'
    ];
    
    for (const query of queries) {
      const results = await queryManager.searchSessions(query, 3);
      console.log(queryManager.formatSearchResults(results.documents, results.scores));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}