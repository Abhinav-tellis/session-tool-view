import { NextResponse } from 'next/server';
import { GeminiChatService } from '../../../lib/GeminiChatService';

const chatService = new GeminiChatService();

export async function GET() {
  try {
    const health = await chatService.healthCheck();
    
    const status = health.status === 'healthy' ? 200 : 
                  health.status === 'degraded' ? 206 : 500;

    return NextResponse.json(health, { status });

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        details: { error: 'Health check failed' }
      },
      { status: 500 }
    );
  }
}