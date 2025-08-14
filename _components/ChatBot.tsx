'use client';

import { useState } from 'react';
import ChatHeader from './ChatHeader';
import Message from './Message';
import ChatInput from './ChatInput';

export interface SessionReference {
  sessionId: string;
  source: string;
  timestamp: string;
  relevanceScore?: number;
  title?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'system';
  timestamp: Date;
  sessionReferences?: SessionReference[];
  isProcessing?: boolean;
  hasError?: boolean;
  type?: 'message' | 'data' | 'error' | 'system';
}

export default function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Welcome to your Session Assistant! I can help you search through your coding sessions, project discussions, and technical conversations. Try asking about specific projects, technologies, or any topics you\'ve discussed recently.',
      sender: 'bot',
      timestamp: new Date(),
      type: 'message',
      sessionReferences: []
    },
    {
      id: 'welcome-tip',
      text: 'Get started by typing a query like "What projects did I work on recently?" or click on one of the suggested queries below.',
      sender: 'system',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const parseSessionReferences = (responseText: string): { cleanText: string; references: SessionReference[] } => {
    // This is a placeholder for parsing session references from the API response
    // In a real implementation, the API would return structured data
    const references: SessionReference[] = [];
    const cleanText = responseText;
    
    // Mock parsing - in reality, this would parse the response format from GeminiChatService
    const sessionPattern = /Session:\s*([^\\n]+)/g;
    let match;
    
    while ((match = sessionPattern.exec(responseText)) !== null) {
      references.push({
        sessionId: match[1],
        source: 'session-file.md',
        timestamp: new Date().toISOString(),
        relevanceScore: Math.random() * 0.5 + 0.5 // Mock relevance score
      });
    }
    
    return { cleanText, references };
  };

  const handleSendMessage = async (text: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
      type: 'message'
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Add processing message
    const processingMessage: ChatMessage = {
      id: `processing-${Date.now()}`,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isProcessing: true,
      type: 'message'
    };
    
    setMessages(prev => [...prev, processingMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      const { cleanText, references } = parseSessionReferences(data.message);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: cleanText || 'I apologize, but I couldn\'t find relevant information for your query. Please try rephrasing or asking about something more specific.',
        sender: 'bot',
        timestamp: new Date(),
        sessionReferences: references.length > 0 ? references : undefined,
        type: 'message'
      };

      // Remove processing message and add actual response
      setMessages(prev => prev.filter(msg => !msg.isProcessing).concat([botMessage]));
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'I apologize, but I encountered an error while processing your request. Please check your connection and try again.',
        sender: 'bot',
        timestamp: new Date(),
        hasError: true,
        type: 'error'
      };

      // Remove processing message and add error message
      setMessages(prev => prev.filter(msg => !msg.isProcessing).concat([errorMessage]));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-6xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
      <ChatHeader />
      
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
        <div className="px-4 py-6 space-y-2">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          
          {messages.length <= 2 && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to explore your sessions</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Start a conversation by asking about your coding projects, technical discussions, or any specific topics from your session history.
              </p>
            </div>
          )}
        </div>
        
        {/* Scroll anchor */}
        <div id="messages-end" />
      </div>
      
      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
    </div>
  );
}