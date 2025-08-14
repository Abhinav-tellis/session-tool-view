import { VectorStore } from '../../services/vectorStore';
import fetch from 'node-fetch';

export class ChatService {
  private vectorStore: VectorStore;
  private isInitialized: boolean = false;

  constructor() {
    this.vectorStore = new VectorStore();
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.vectorStore.initialize();
      this.isInitialized = true;
      console.log('ChatService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ChatService:', error);
      throw error;
    }
  }

  async processQuery(userQuery: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Step 1: Get relevant context from vector store
      const relevantDocs = await this.vectorStore.similaritySearchWithScore(userQuery, 5);
      
      if (relevantDocs.length === 0) {
        return "I couldn't find any relevant information in the database to answer your question. Could you try rephrasing or asking about something more specific?";
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
      return "I encountered an error while processing your request. Please try again.";
    }
  }

  private formatContext(docs: Array<[any, number]>): string {
    let context = "Relevant information from the database:\n\n";
    
    docs.forEach(([doc, score], index) => {
      context += `Document ${index + 1} (relevance: ${score.toFixed(3)}):\n`;
      context += `Source: ${doc.metadata?.source || 'Unknown'}\n`;
      context += `Content: ${doc.pageContent}\n`;
      context += "---\n\n";
    });

    return context;
  }

  private createRAGPrompt(userQuery: string, context: string): string {
    return `You are a helpful assistant that answers questions based on the provided context from a database. 

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
          model: 'llama3.1:8b', // You can change this to whatever model you have installed
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
      return this.createFallbackResponse();
    }
  }

  private createFallbackResponse(): string {
    return "I found some relevant information in the database, but I'm having trouble connecting to the language model to provide a detailed response. The search results are displayed above with their relevance scores.";
  }

  async getDocumentCount(): Promise<number> {
    // This would require adding the method to VectorStore class
    // For now, return a placeholder
    return 0;
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
          initialized: this.isInitialized
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
}