# Session Tool - AI-Powered Session Tracking & Search System

A comprehensive session management system that combines a Session MCP Server with a Next.js frontend for tracking, capturing, and searching through Claude Code conversation sessions using vector embeddings and MongoDB.
A dummy session is provided for seeing how the app works.

## Project Structure

```
session-tool/
├── sessions/                    # **ROOT SESSIONS DIRECTORY** - All active session files stored here
├── session-mcp/                # MCP Server implementation
│   ├── index.ts                # Main MCP server file
│   └── sessions/               # Legacy sessions (not used for sync)
├── frontend/                   # Next.js web application
│   ├── app/                    # App router pages and API routes
│   ├── _components/            # React components (ChatHeader, etc.)
│   └── ...
├── services/                   # Core services (vector store, embeddings)
├── testMongoDB.ts              # Sync script for processing sessions
└── sessionCapture.ts           # Session capture utilities
```

## Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB instance
- Ollama with embedding model
- Claude Code CLI

### 1. MCP Server Setup

First, build the MCP server:

```bash
cd session-mcp
npm install
npm run build
cd ..
```

Then add the Session MCP Server to your Claude Code configuration:

```bash
claude mcp add session-tracker -- node /absolute/path/to/session-tool/session-mcp/index.ts
```

**Important:** Replace `/absolute/path/to/session-tool` with the actual absolute path to this project directory.

### 2. Environment Setup

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb://localhost:27017/session-tracker
SESSIONS_DIR=./sessions
OLLAMA_BASE_URL=http://localhost:11434
```

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install MCP server dependencies
cd session-mcp
npm install
cd ..
```

### 4. Start the Frontend

```bash
cd frontend
npm run dev
```

The web interface will be available at `http://localhost:3000`

## Essential Usage Guidelines

### **CRITICAL: Always Run Auto-Capture First!**

**ALWAYS** run the `auto_capture` tool at the start of every new Claude Code instance to ensure proper session tracking:

```
use auto_capture for this conversation: [describe what you're working on]
```

This ensures your current conversation is properly tracked and will be available for search and sync operations.

If your auto_capture tool failed to work, run "capture_complete_exchange" then auto_capture again.

### Session Directory Structure

- **`./sessions/`** - This is the **ROOT SESSIONS DIRECTORY** where all active session files are stored
- All session files follow the format: `YYYY-MM-DD-HHMM-auto-description.md`
- The sync button in the frontend reads from this directory
- Do NOT confuse this with `./session-mcp/sessions/` which contains legacy data

### Key Features

#### 1. **Session Capture & Tracking**
- Automatic session file generation in markdown format
- Intelligent conversation appending (avoids duplicates within 5 minutes)
- Comprehensive session metadata tracking

#### 2. **Vector Search & Embeddings**
- Sessions are processed into vector embeddings using Ollama
- MongoDB vector store for efficient similarity search
- Real-time search across all session content

#### 3. **Web Interface**
- Modern Next.js frontend with real-time sync capabilities
- ChatHeader component shows session statistics and sync status
- Manual sync button to process new sessions

#### 4. **MCP Integration**
- Full MCP (Model Context Protocol) server implementation
- Available tools: `auto_capture`, `capture_complete_exchange`, `list_sessions`, etc.
- Session management directly within Claude Code

## Available MCP Tools

- `auto_capture` - Capture ongoing conversations intelligently
- `capture_complete_exchange` - Save complete conversation exchanges
- `list_sessions` - View all available session files
- `get_current_session` - Get details about the active session
- `start_session` / `end_session` - Manual session management

## Sync Process

The sync process works as follows:

1. **Manual Sync**: Click the sync button in the web interface
2. **API Call**: Frontend calls `/api/sync` endpoint
3. **Script Execution**: Runs `testMongoDB.ts` which processes sessions from `./sessions/`
4. **Vector Processing**: Converts session content to embeddings
5. **Database Storage**: Stores embeddings in MongoDB vector store
6. **Search Ready**: Sessions become searchable through the interface

## Development Commands

```bash
# Start frontend development server
cd frontend && npm run dev

# Run session processing script manually
npx tsx testMongoDB.ts

# Test MCP server locally
cd session-mcp && npm run dev

# Build frontend for production
cd frontend && npm run build
```

## Troubleshooting

### Common Issues

**Sync Button Shows Old Data:**
- Ensure sessions are in `./sessions/` not `./session-mcp/sessions/`
- Check MongoDB connection
- Verify Ollama is running and accessible

**MCP Tools Not Available:**
- Verify MCP server is properly added to Claude Code config
- Check absolute path in the `claude mcp add` command
- Restart Claude Code after adding the MCP server

**Sessions Not Appearing:**
- Always use `auto_capture` at the start of new conversations
- Check that session files are being created in `./sessions/`
- Verify write permissions for the sessions directory

### Health Checks

Visit `http://localhost:3000/api/health` to verify:
- MongoDB connection status
- Ollama API availability
- Session directory access

## Session File Format

Sessions are stored as markdown files with the following structure:

```markdown
# Session: [Description]

**Date:** YYYY-MM-DD HH:MM:SS  
**Session ID:** unique-session-identifier

## Interactions

### User:
[User prompt/question]

### Assistant:
[Complete assistant response including tool outputs]
```

## Contributing

1. Always test MCP functionality after changes
2. Ensure session files are properly formatted
3. Test sync functionality with multiple sessions
4. Verify vector search works with new content

## Notes

- Session files are automatically created in `./sessions/` when using MCP tools
- The sync process is essential for making sessions searchable
- Always use absolute paths when configuring the MCP server
- The system handles conversation deduplication automatically

## Environment Variables Reference

### Required Variables
- `MONGODB_URI` - MongoDB connection string for storing vector embeddings
- `SESSIONS_DIR` - Path to sessions directory (should be `./sessions`)
- `OLLAMA_BASE_URL` / `OLLAMA_URL` - Base URL for your Ollama instance

### Optional Variables  
- `EMBED_MODEL` - Embedding model to use (defaults to `nomic-embed-text:v1.5`)
- `VECTOR_STORE_TYPE` - Vector store type (defaults to `mongodb`)
- `GEMINI_API_KEY` - Google Gemini API key for alternative AI provider

Make sure to install the embedding model in Ollama:
```bash
ollama pull nomic-embed-text:v1.5
```