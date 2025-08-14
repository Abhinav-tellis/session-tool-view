'use client';

import { useState, useEffect } from 'react';

interface HeaderStats {
  sessionsCount: number;
  lastActivity: string;
  status: 'online' | 'connecting' | 'offline';
}

export default function ChatHeader() {
  const [stats, setStats] = useState<HeaderStats>({
    sessionsCount: 0,
    lastActivity: 'Just now',
    status: 'connecting'
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    // Simulate loading stats
    const timer = setTimeout(() => {
      setStats({
        sessionsCount: 12,
        lastActivity: 'Just now',
        status: 'online'
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = () => {
    switch (stats.status) {
      case 'online': return 'bg-emerald-400';
      case 'connecting': return 'bg-amber-400 animate-pulse';
      case 'offline': return 'bg-red-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (stats.status) {
      case 'online': return 'Connected to session database';
      case 'connecting': return 'Connecting to database...';
      case 'offline': return 'Database offline';
      default: return 'Unknown status';
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSyncMessage(`✅ Synced ${data.chunksProcessed} new chunks. Total: ${data.totalDocuments} documents`);
        // Update session count
        setStats(prev => ({
          ...prev,
          sessionsCount: Math.ceil(data.totalDocuments / 3), // Rough estimate
          lastActivity: 'Just now'
        }));
      } else {
        setSyncMessage(`❌ Sync failed: ${data.error}`);
      }
    } catch (error) {
      setSyncMessage(`❌ Sync error: ${error.message}`);
    } finally {
      setIsSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor()} rounded-full border-2 border-white shadow-sm`}></div>
            </div>
            
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Session Assistant</h1>
              <p className="text-sm text-gray-600">{getStatusText()}</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{stats.sessionsCount} Sessions</p>
              <p className="text-xs text-gray-500">Available for search</p>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Last Activity</p>
              <p className="text-xs text-gray-500">{stats.lastActivity}</p>
            </div>
            
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="
                flex items-center space-x-2 px-4 py-2 
                bg-blue-600 hover:bg-blue-700 
                disabled:bg-blue-400 disabled:cursor-not-allowed
                text-white rounded-lg transition-colors 
                text-sm font-medium shadow-sm
              "
            >
              {isSyncing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Sync</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="px-6 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
        {syncMessage ? (
          <p className="text-sm text-blue-700 font-medium">
            {syncMessage}
          </p>
        ) : (
          <p className="text-sm text-blue-700">
            <span className="font-medium">💡 Tip:</span> Ask about your coding sessions, projects, or technical discussions. Use the Sync button to load new sessions.
          </p>
        )}
      </div>
    </div>
  );
}