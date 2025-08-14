#!/usr/bin/env node

import { VectorStore } from './services/vectorStore.js';
import { processSessionData } from './services/processSessionEmbeddings.js';
import { getEmbedding } from './services/embedData.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class SessionTestSuite {
  private vectorStore: VectorStore;
  private startTime: Date;

  constructor() {
    this.vectorStore = new VectorStore();
    this.startTime = new Date();
  }

  private log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    if (type === 'error' || type === 'warning') {
      console.log(message);
    }
  }

  private async checkEnvironment(): Promise<boolean> {
    const requiredEnvVars = ['MONGODB_URI'];
    const missingVars: string[] = [];

    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      this.log(`Missing environment variables: ${missingVars.join(', ')}`, 'error');
      return false;
    }

    return true;
  }

  private async testOllamaConnection(): Promise<boolean> {
    try {
      const testResult = await getEmbedding('test connection');
      if (testResult.embedding && testResult.embedding.length > 0) {
        return true;
      } else {
        this.log('Ollama API returned empty embedding', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Ollama API connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  private async testMongoDBConnection(): Promise<boolean> {
    try {
      await this.vectorStore.initialize();
      return true;
    } catch (error) {
      this.log(`MongoDB connection failed: ${error.message}`, 'error');
      return false;
    }
  }

  private async testSessionDataProcessing(): Promise<number> {
    try {
      const sessionsDir = process.env.SESSIONS_DIR || './sessions';
      const chunks = await processSessionData(sessionsDir);
      
      if (chunks.length === 0) {
        this.log('No session data found to process', 'warning');
        return 0;
      }

      return chunks.length;
    } catch (error) {
      this.log(`Session data processing failed: ${error.message}`, 'error');
      return 0;
    }
  }

  private async testVectorStoreOperations(chunkCount: number): Promise<boolean> {
    if (chunkCount === 0) {
      return false;
    }

    try {
      const sessionsDir = process.env.SESSIONS_DIR || './sessions';
      const chunks = await processSessionData(sessionsDir);
      
      if (chunks.length > 0) {
        const addedCount = await this.vectorStore.addSessionDocuments(chunks);
        console.log(`Successfully added ${addedCount} documents to vector store`);
      }

      const docCount = await this.vectorStore.getDocumentCount();
      console.log(`Total documents in store: ${docCount}`);

      const testQueries = ['session', 'conversation', 'tracking', 'MCP'];
      for (const query of testQueries) {
        try {
          await this.vectorStore.similaritySearchWithScore(query, 3);
        } catch (error) {
          this.log(`Search query "${query}" failed: ${error.message}`, 'error');
        }
      }

      return true;
    } catch (error) {
      this.log(`Vector store operations failed: ${error.message}`, 'error');
      return false;
    }
  }

  private async demonstrateSearch(): Promise<void> {
    try {
      await this.vectorStore.similaritySearchWithScore('session tracking', 5);
    } catch (error) {
      this.log(`Demo search failed: ${error.message}`, 'error');
    }
  }

  private printSummary(results: { [key: string]: boolean }): void {
    const elapsed = Date.now() - this.startTime.getTime();
    const elapsedSeconds = (elapsed / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total time: ${elapsedSeconds}s`);
    console.log('');

    const testResults = [
      { name: 'Environment Check', passed: results.environment },
      { name: 'Ollama Connection', passed: results.ollama },
      { name: 'MongoDB Connection', passed: results.mongodb },
      { name: 'Session Processing', passed: results.processing },
      { name: 'Vector Operations', passed: results.vectorOps }
    ];

    testResults.forEach(test => {
      const status = test.passed ? 'PASS' : 'FAIL';
      console.log(`${status} - ${test.name}`);
    });

    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;
    
    console.log('');
    console.log(`Overall: ${passedTests}/${totalTests} tests passed`);
    console.log('='.repeat(60));
  }

  async runFullTest(): Promise<void> {
    const results = {
      environment: false,
      ollama: false,
      mongodb: false,
      processing: false,
      vectorOps: false
    };

    results.environment = await this.checkEnvironment();
    if (!results.environment) {
      this.printSummary(results);
      return;
    }

    results.ollama = await this.testOllamaConnection();
    if (!results.ollama) {
      this.printSummary(results);
      return;
    }

    results.mongodb = await this.testMongoDBConnection();
    if (!results.mongodb) {
      this.printSummary(results);
      return;
    }

    const chunkCount = await this.testSessionDataProcessing();
    results.processing = chunkCount > 0;

    if (results.processing) {
      results.vectorOps = await this.testVectorStoreOperations(chunkCount);
      
      if (results.vectorOps) {
        await this.demonstrateSearch();
      }
    }

    this.printSummary(results);
    
    try {
      await this.vectorStore.close();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Main execution
async function main() {
  const testSuite = new SessionTestSuite();
  
  try {
    await testSuite.runFullTest();
  } catch (error) {
    console.error('Test suite crashed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { SessionTestSuite };