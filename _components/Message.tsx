'use client';

import { ChatMessage, SessionReference } from './ChatBot';
import { useState } from 'react';

interface MessageProps {
  message: ChatMessage;
}

function SessionReferenceCard({ reference }: { reference: SessionReference }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium text-blue-900">
              {reference.title || reference.sessionId}
            </span>
            {reference.relevanceScore && (
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                {Math.round(reference.relevanceScore * 100)}% match
              </span>
            )}
          </div>
          <p className="text-xs text-blue-700 mt-1">{reference.source}</p>
          <p className="text-xs text-blue-600 mt-1">{reference.timestamp}</p>
        </div>
      </div>
    </div>
  );
}

export default function Message({ message }: MessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isUser = message.sender === 'user';
  const isBot = message.sender === 'bot';
  const isSystem = message.sender === 'system';
  
  const shouldTruncate = message.text.length > 500;
  const displayText = shouldTruncate && !isExpanded 
    ? message.text.substring(0, 500) + '...' 
    : message.text;

  const getMessageIcon = () => {
    if (isUser) return null;
    if (isSystem) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  };

  const getMessageStyles = () => {
    if (isUser) {
      return {
        container: 'justify-end',
        bubble: 'bg-blue-600 text-white shadow-lg',
        maxWidth: 'max-w-2xl lg:max-w-3xl'
      };
    } else if (isSystem) {
      return {
        container: 'justify-center',
        bubble: 'bg-gray-100 text-gray-700 border border-gray-200',
        maxWidth: 'max-w-md'
      };
    } else {
      return {
        container: 'justify-start',
        bubble: 'bg-white text-gray-900 shadow-md border border-gray-200',
        maxWidth: 'max-w-4xl'
      };
    }
  };

  const styles = getMessageStyles();

  if (message.isProcessing) {
    return (
      <div className="flex justify-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            {getMessageIcon()}
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-gray-600">Searching sessions...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${styles.container} mb-6 message-enter`}>
      <div className={`${styles.maxWidth} w-full`}>
        <div className="flex items-start space-x-3">
          {!isUser && (
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
              ${isSystem ? 'bg-gray-400' : 'bg-gradient-to-br from-blue-500 to-blue-600'}
              text-white shadow-sm
            `}>
              {getMessageIcon()}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className={`
              ${styles.bubble}
              rounded-2xl px-4 py-3 break-words
              ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}
            `}>
              {/* Message content */}
              <div className={`
                text-sm leading-relaxed
                ${isUser ? 'text-white' : 'text-gray-900'}
              `}>
                {displayText.split('\n').map((line, index) => (
                  <p key={index} className={index > 0 ? 'mt-2' : ''}>
                    {line}
                  </p>
                ))}
              </div>

              {/* Show expand/collapse button for long messages */}
              {shouldTruncate && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`
                    text-xs mt-2 underline hover:no-underline
                    ${isUser ? 'text-blue-200' : 'text-blue-600'}
                  `}
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}

              {/* Timestamp */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/50">
                <p className={`
                  text-xs
                  ${isUser ? 'text-blue-200' : isSystem ? 'text-gray-500' : 'text-gray-500'}
                `}>
                  {message.timestamp.toLocaleString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
                
                {message.hasError && (
                  <span className="text-xs text-red-500 flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Error occurred</span>
                  </span>
                )}
              </div>
            </div>

            {/* Session References */}
            {message.sessionReferences && message.sessionReferences.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-xs font-medium text-gray-600">
                    Found {message.sessionReferences.length} relevant session{message.sessionReferences.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {message.sessionReferences.map((ref, index) => (
                  <SessionReferenceCard key={`${ref.sessionId}-${index}`} reference={ref} />
                ))}
              </div>
            )}
          </div>

          {isUser && (
            <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-white shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}