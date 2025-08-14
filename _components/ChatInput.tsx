'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const suggestedQueries = [
  "What projects did I work on recently?",
  "Show me my database discussions",
  "What UI frameworks have I used?",
  "Find my MongoDB-related sessions",
  "What APIs did I implement?"
];

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev <= 0 ? suggestedQueries.length - 1 : prev - 1
      );
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev >= suggestedQueries.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === 'Tab' && showSuggestions && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      setMessage(suggestedQueries[selectedSuggestionIndex]);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }

    // Show suggestions when input is empty or starts typing
    setShowSuggestions(value.length === 0 || (value.length > 0 && value.length < 3));
  };

  const selectSuggestion = (suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    textareaRef.current?.focus();
  };

  const handleFocus = () => {
    if (message.length === 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 200);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  return (
    <div className="relative bg-white border-t border-gray-200 shadow-lg dark:bg-gray-900 dark:border-gray-700">
      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-t-lg shadow-xl z-10 max-h-48 overflow-y-auto dark:bg-gray-800 dark:border-gray-600">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Suggested Queries</h3>
          </div>
          {suggestedQueries.map((query, index) => (
            <button
              key={index}
              onClick={() => selectSuggestion(query)}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-b-0 ${
                selectedSuggestionIndex === index 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>{query}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div ref={inputContainerRef} className="p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Ask about your coding sessions, projects, or any technical discussions..."
              disabled={disabled}
              rows={1}
              className="
                w-full
                resize-none
                px-4 py-3
                text-sm
                text-black
                bg-gray-50
                border border-gray-300 
                rounded-lg 
                focus:outline-none 
                focus:ring-2 
                focus:ring-blue-500 
                focus:border-blue-500
                disabled:bg-gray-100 
                disabled:cursor-not-allowed
                placeholder:text-gray-500
                transition-colors
              "
              style={{
                minHeight: '48px',
                maxHeight: '120px'
              }}
            />
            
            {/* Character counter */}
            {message.length > 0 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 dark:text-gray-500">
                {message.length}
              </div>
            )}
          </div>
          
          <button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className={`
              p-3
              rounded-xl
              focus:outline-none 
              focus:ring-2 
              focus:ring-blue-500/20
              transition-all
              duration-200
              shadow-sm
              ${disabled || !message.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
              }
            `}
            title={disabled ? 'Processing...' : !message.trim() ? 'Enter a message' : 'Send message (Enter)'}
          >
            {disabled ? (
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Quick actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">Enter</kbd> to send, 
              <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded ml-1">Shift+Enter</kbd> for new line
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Database connected</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}