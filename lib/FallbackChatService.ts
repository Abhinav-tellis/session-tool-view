import { MongoClient } from 'mongodb';
import fetch from 'node-fetch';

export class FallbackChatService {
  private client: MongoClient | null = null;
  private isInitialized: boolean = false;

  constructor(
    private connectionString: string = process.env.MONGODB_URI || '',
    private dbName: string = 'rag_database',
    private collectionName: string = 'embeddings'
  ) {}

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.client = new MongoClient(this.connectionString);
      await this.client.connect();
      this.isInitialized = true;
      console.log('FallbackChatService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FallbackChatService:', error);
      throw error;
    }
  }

  async processQuery(userQuery: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Step 1: Use text search as fallback until vector index is created
      const relevantDocs = await this.textSearch(userQuery, 5);
      
      if (relevantDocs.length === 0) {
        return "I couldn't find any relevant information in the database to answer your question. The vector search index may need to be configured in MongoDB Atlas.";
      }

      // Step 2: Format context for the LLM
      const context = this.formatContext(relevantDocs);
      
      // Step 3: Create prompt for the LLM
      const prompt = this.createRAGPrompt(userQuery, context);
      
      // Step 4: Query Ollama for response
      const response = await this.queryOllama(prompt);
      
      return response;

    } catch (error) {
      console.error('Error processing query:', error);
      return "I encountered an error while processing your request. Please ensure Ollama is running and try again.";
    }
  }

  private async textSearch(query: string, limit: number = 5) {
    if (!this.client) {
      throw new Error('MongoDB client not initialized');
    }

    const collection = this.client.db(this.dbName).collection(this.collectionName);
    
    // Create text index if it doesn't exist
    try {
      await collection.createIndex({ text: "text" });
    } catch (error) {
      // Index might already exist, ignore error
    }

    // Perform text search
    const results = await collection.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .toArray();

    return results;
  }

  private formatContext(docs: any[]): string {
    let context = "Relevant information from the database:\n\n";
    
    docs.forEach((doc, index) => {
      const score = doc.score ? ` (relevance: ${doc.score.toFixed(3)})` : '';
      context += `Document ${index + 1}${score}:\n`;
      context += `Source: ${doc.source || 'Unknown'}\n`;
      context += `Content: ${doc.text}\n`;
      context += "---\n\n";
    });

    return context;
  }

  private createRAGPrompt(userQuery: string, context: string): string {
    return `You are a helpful assistant that answers questions based on the provided context from a session database. 

Context:
${context}

User Question: ${userQuery}

Instructions:
- Answer the question based primarily on the provided context
- If the context doesn't contain enough information, say so clearly
- Be concise and accurate
- If you notice patterns or connections in the data, mention them
- Format your response in a clear, readable way

Answer:`;
  }

  private async queryOllama(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${process.env.OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.1:8b', // Adjust based on your installed model
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 500
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.response || 'Sorry, I could not generate a response.';

    } catch (error) {
      console.error('Error querying Ollama:', error);
      
      // Fallback: return a formatted response based on context only
      return "I found some relevant information in the database, but I'm having trouble connecting to the language model. Here's what I found based on your query - please review the context above.";
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const ollamaHealth = await this.checkOllamaHealth();
      const mongoHealth = this.isInitialized;

      return {
        status: ollamaHealth && mongoHealth ? 'healthy' : 'degraded',
        details: {
          ollama: ollamaHealth,
          mongodb: mongoHealth,
          initialized: this.isInitialized,
          note: 'Using text search fallback - vector search index needed'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }

  private async checkOllamaHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.OLLAMA_URL}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async close() {
    try {
      if (this.client) {
        await this.client.close();
        console.log('MongoDB connection closed');
        this.isInitialized = false;
      }
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
    }
  }
}