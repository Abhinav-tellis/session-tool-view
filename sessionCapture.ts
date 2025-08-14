#!/usr/bin/env node

import { VectorStore } from './services/vectorStore.js';
import { getEmbedding } from './services/embedData.js';
import dotenv from 'dotenv';

dotenv.config();

interface CaptureResult {
  success: boolean;
  message: string;
  data?: any;
}

class SessionCaptureManager {
  private vectorStore: VectorStore;
  private startTime: Date;
  private sessionId: string;

  constructor(sessionId?: string) {
    this.vectorStore = new VectorStore();
    this.startTime = new Date();
    this.sessionId = sessionId || `session_${Date.now()}`;
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '🔵',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async captureExchange(userPrompt: string, assistantResponse: string, forceNew: boolean = true): Promise<CaptureResult> {
    try {
      this.log('Capturing conversation exchange...', 'info');
      
      // Create interaction data in the format expected by auto_capture
      const interactionData = {
        user_prompt: userPrompt,
        assistant_response: assistantResponse,
        force_new: forceNew,
        interaction_id: `${this.sessionId}_${Date.now()}`
      };

      // Process the exchange for embedding storage
      const processedChunks = await this.processExchangeForStorage(userPrompt, assistantResponse);
      
      if (processedChunks.length > 0) {
        await this.vectorStore.initialize();
        const addedCount = await this.vectorStore.addSessionDocuments(processedChunks);
        this.log(`Successfully captured and stored ${addedCount} chunks from exchange`, 'success');
        
        return {
          success: true,
          message: `Exchange captured successfully with ${addedCount} chunks`,
          data: interactionData
        };
      }

      return {
        success: true,
        message: 'Exchange captured but no chunks generated',
        data: interactionData
      };

    } catch (error) {
      this.log(`Failed to capture exchange: ${error.message}`, 'error');
      return {
        success: false,
        message: error.message
      };
    }
  }

  private async processExchangeForStorage(userPrompt: string, assistantResponse: string): Promise<any[]> {
    const chunks = [];
    const timestamp = new Date().toISOString();
    
    // Create chunk for user prompt
    if (userPrompt.trim()) {
      chunks.push({
        id: `${this.sessionId}_user_${Date.now()}`,
        sessionId: this.sessionId,
        content: `USER: ${userPrompt}`,
        metadata: {
          type: 'user_prompt',
          sessionId: this.sessionId,
          timestamp,
          chunkIndex: 0,
          filePath: 'auto_capture'
        }
      });
    }

    // Create chunk for assistant response
    if (assistantResponse.trim()) {
      chunks.push({
        id: `${this.sessionId}_assistant_${Date.now()}`,
        sessionId: this.sessionId,
        content: `ASSISTANT: ${assistantResponse}`,
        metadata: {
          type: 'assistant_response',
          sessionId: this.sessionId,
          timestamp,
          chunkIndex: 1,
          filePath: 'auto_capture'
        }
      });
    }

    // Create combined conversation chunk
    const combinedContent = `CONVERSATION:\nUSER: ${userPrompt}\n\nASSISTANT: ${assistantResponse}`;
    chunks.push({
      id: `${this.sessionId}_conversation_${Date.now()}`,
      sessionId: this.sessionId,
      content: combinedContent,
      metadata: {
        type: 'conversation',
        sessionId: this.sessionId,
        timestamp,
        chunkIndex: 2,
        filePath: 'auto_capture'
      }
    });

    return chunks;
  }

  async testConnectionsAndSetup(): Promise<{ [key: string]: boolean }> {
    this.log('Testing system connections and setup...', 'info');
    
    const results = {
      environment: false,
      ollama: false,
      mongodb: false,
      vectorStore: false
    };

    // Test environment
    try {
      const requiredEnvVars = ['MONGODB_URI'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        this.log(`Missing environment variables: ${missingVars.join(', ')}`, 'error');
      } else {
        this.log('Environment configuration validated', 'success');
        results.environment = true;
      }
    } catch (error) {
      this.log(`Environment check failed: ${error.message}`, 'error');
    }

    // Test Ollama connection
    try {
      const testResult = await getEmbedding('test connection');
      if (testResult.embedding && testResult.embedding.length > 0) {
        this.log(`Ollama API working! Embedding dimension: ${testResult.embedding.length}`, 'success');
        results.ollama = true;
      }
    } catch (error) {
      this.log(`Ollama API connection failed: ${error.message}`, 'error');
    }

    // Test MongoDB connection
    try {
      await this.vectorStore.initialize();
      this.log('MongoDB connection successful!', 'success');
      results.mongodb = true;
    } catch (error) {
      this.log(`MongoDB connection failed: ${error.message}`, 'error');
    }

    // Test vector store operations
    if (results.mongodb && results.ollama) {
      try {
        const docCount = await this.vectorStore.getDocumentCount();
        this.log(`Vector store operational with ${docCount} documents`, 'success');
        results.vectorStore = true;
      } catch (error) {
        this.log(`Vector store test failed: ${error.message}`, 'error');
      }
    }

    return results;
  }

  async searchSessions(query: string, limit: number = 5): Promise<any[]> {
    try {
      this.log(`Searching sessions for: "${query}"`, 'info');
      
      await this.vectorStore.initialize();
      const results = await this.vectorStore.similaritySearchWithScore(query, limit);
      
      this.log(`Found ${results.length} relevant session chunks`, 'success');
      return results;
    } catch (error) {
      this.log(`Session search failed: ${error.message}`, 'error');
      return [];
    }
  }

  async demonstrateCapture(): Promise<void> {
    this.log('Demonstrating auto-capture functionality...', 'info');
    
    const sampleExchanges = [
      {
        user: "Help me understand how session tracking works",
        assistant: "Session tracking allows you to capture and store conversation exchanges for later retrieval and analysis. It uses vector embeddings to enable semantic search across conversation history."
      },
      {
        user: "What are the benefits of using MongoDB for vector storage?",
        assistant: "MongoDB Atlas provides native vector search capabilities, making it ideal for storing and querying embeddings. It offers scalability, performance, and integration with existing data infrastructure."
      }
    ];

    for (const exchange of sampleExchanges) {
      const result = await this.captureExchange(exchange.user, exchange.assistant);
      if (result.success) {
        this.log(`Sample exchange captured: ${result.message}`, 'success');
      } else {
        this.log(`Sample exchange failed: ${result.message}`, 'error');
      }
    }

    // Demonstrate search
    const searchResults = await this.searchSessions('session tracking benefits', 3);
    if (searchResults.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('🔍 SEARCH DEMONSTRATION RESULTS');
      console.log('='.repeat(60));
      
      searchResults.forEach(([doc, score], index) => {
        console.log(`\n${index + 1}. Score: ${score.toFixed(4)}`);
        console.log(`Content: ${doc.pageContent.substring(0, 150)}...`);
        console.log(`Session ID: ${doc.metadata.sessionId || 'N/A'}`);
        console.log(`Type: ${doc.metadata.type || 'N/A'}`);
      });
    }
  }

  async getSessionStats(): Promise<any> {
    try {
      await this.vectorStore.initialize();
      const totalDocs = await this.vectorStore.getDocumentCount();
      
      return {
        totalDocuments: totalDocs,
        currentSessionId: this.sessionId,
        uptime: Date.now() - this.startTime.getTime()
      };
    } catch (error) {
      this.log(`Failed to get session stats: ${error.message}`, 'error');
      return null;
    }
  }

  async close(): Promise<void> {
    try {
      await this.vectorStore.close();
      this.log('Session capture manager closed successfully', 'info');
    } catch (error) {
      this.log(`Error closing session manager: ${error.message}`, 'error');
    }
  }
}

// Main demonstration function
async function demonstrateAutoCapture() {
  const sessionManager = new SessionCaptureManager();
  
  try {
    console.log('🚀 Session Auto-Capture Demonstration');
    console.log('='.repeat(60));

    // Test connections
    const connectionResults = await sessionManager.testConnectionsAndSetup();
    const allConnected = Object.values(connectionResults).every(result => result);
    
    if (!allConnected) {
      console.log('⚠️  Some connections failed. Check configuration.');
      return;
    }

    // Demonstrate capture functionality
    await sessionManager.demonstrateCapture();
    
    // Show stats
    const stats = await sessionManager.getSessionStats();
    if (stats) {
      console.log('\n' + '='.repeat(60));
      console.log('📊 SESSION STATISTICS');
      console.log('='.repeat(60));
      console.log(`Total Documents: ${stats.totalDocuments}`);
      console.log(`Current Session: ${stats.currentSessionId}`);
      console.log(`Uptime: ${(stats.uptime / 1000).toFixed(2)}s`);
    }

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  } finally {
    await sessionManager.close();
  }
}

// Export for use in other modules
export { SessionCaptureManager, demonstrateAutoCapture };

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateAutoCapture().catch(console.error);
}