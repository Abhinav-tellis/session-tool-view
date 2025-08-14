import { NextRequest, NextResponse } from 'next/server';
import { GeminiChatService } from '../../../lib/GeminiChatService';

const chatService = new GeminiChatService();

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Initialize the chat service if not already done
    await chatService.initialize();

    // Process the query using RAG
    const response = await chatService.processQuery(message);

    return NextResponse.json({ message: response });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process your request. Please try again.' },
      { status: 500 }
    );
  }
}