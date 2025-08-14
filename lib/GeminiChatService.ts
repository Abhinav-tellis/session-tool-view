import { GoogleGenerativeAI } from '@google/generative-ai';
import { MongoClient } from 'mongodb';

export class GeminiChatService {
  private client: MongoClient | null = null;
  private genAI: GoogleGenerativeAI;
  private model: any;
  private isInitialized: boolean = false;

  constructor(
    private connectionString: string = process.env.MONGODB_URI || '',
    private dbName: string = 'rag_database',
    private collectionName: string = 'embeddings'
  ) {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      this.client = new MongoClient(this.connectionString);
      await this.client.connect();
      this.isInitialized = true;
      console.log('GeminiChatService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GeminiChatService:', error);
      throw error;
    }
  }

  async processQuery(userQuery: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Step 1: Search for relevant documents using text search
      const relevantDocs = await this.textSearch(userQuery, 5);
      
      if (relevantDocs.length === 0) {
        return "I couldn't find any relevant information in the database to answer your question. Could you try rephrasing or asking about something more specific?";
      }

      // Step 2: Format context for Gemini
      const context = this.formatContext(relevantDocs);
      
      // Step 3: Create prompt for Gemini
      const prompt = this.createRAGPrompt(userQuery, context);
      
      // Step 4: Query Gemini for response
      const response = await this.queryGemini(prompt);
      
      return response;

    } catch (error) {
      console.error('Error processing query:', error);
      return `I encountered an error while processing your request: ${error.message}. Please try again.`;
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
      console.log('Text search index created/verified');
    } catch (error) {
      // Index might already exist, ignore error
      console.log('Text index already exists or creation skipped');
    }

    try {
      // Perform text search
      const results = await collection.find(
        { $text: { $search: query } },
        { score: { $meta: "textScore" } }
      )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .toArray();

      console.log(`Found ${results.length} documents with text search for: "${query}"`);
      return results;
    } catch (textSearchError) {
      console.log('Text search failed, falling back to regex search:', textSearchError.message);
      
      // Fallback: Use regex search if text search fails
      const regexResults = await collection.find(
        { text: { $regex: query, $options: 'i' } }
      )
      .limit(limit)
      .toArray();

      console.log(`Found ${regexResults.length} documents with regex search for: "${query}"`);
      return regexResults;
    }
  }

  private formatContext(docs: any[]): string {
    let context = "Here is the relevant information from the database:\n\n";
    
    docs.forEach((doc, index) => {
      const score = doc.score ? ` (relevance score: ${doc.score.toFixed(3)})` : '';
      context += `--- Document ${index + 1}${score} ---\n`;
      
      // Add metadata if available
      if (doc.sessionId) {
        context += `Session: ${doc.sessionId}\n`;
      }
      if (doc.source) {
        context += `Source: ${doc.source}\n`;
      }
      if (doc.timestamp) {
        context += `Timestamp: ${doc.timestamp}\n`;
      }
      
      context += `Content:\n${doc.text}\n\n`;
    });

    return context;
  }

  private createRAGPrompt(userQuery: string, context: string): string {
    return `You are a helpful AI assistant that answers questions based on session data and conversation logs. You have access to various session files containing conversations, code discussions, and project information.

CONTEXT FROM DATABASE:
${context}

USER QUESTION: ${userQuery}

INSTRUCTIONS:
- Answer the question based primarily on the provided context from the database
- If the context contains relevant information, provide a comprehensive and helpful answer
- If the context doesn't contain enough information to fully answer the question, say so clearly
- Be concise but informative
- If you see patterns across multiple sessions or documents, feel free to mention them
- Format your response in a clear, readable way
- If discussing code or technical topics, be specific and accurate

Please provide a helpful response based on the available information:`;
  }

  private async queryGemini(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text || text.trim().length === 0) {
        return "I received an empty response from Gemini. Please try rephrasing your question.";
      }
      
      return text;

    } catch (error) {
      console.error('Error querying Gemini:', error);
      
      if (error.message.includes('API_KEY')) {
        return "There's an issue with the Gemini API key. Please check the configuration.";
      }
      
      if (error.message.includes('SAFETY')) {
        return "The response was blocked due to safety filters. Please try rephrasing your question.";
      }
      
      return `I encountered an error while generating a response: ${error.message}. Please try again.`;
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const mongoHealth = this.isInitialized;
      
      // Test Gemini API
      let geminiHealth = false;
      try {
        const testResult = await this.model.generateContent("Test");
        geminiHealth = true;
      } catch (error) {
        console.error('Gemini health check failed:', error.message);
      }

      return {
        status: geminiHealth && mongoHealth ? 'healthy' : 'degraded',
        details: {
          gemini: geminiHealth,
          mongodb: mongoHealth,
          initialized: this.isInitialized,
          searchMethod: 'text_search_fallback'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
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