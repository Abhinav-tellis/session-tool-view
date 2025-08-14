#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";

interface SessionData {
  id: string;
  name: string;
  startTime: Date;
  interactions: SessionInteraction[];
  filePath: string;
}

interface SessionInteraction {
  id: string;
  timestamp: Date;
  userPrompt: string;
  assistantResponse: string;
}

class SessionTracker {
  private currentSession: SessionData | null = null;
  private sessionsDir = './sessions';
  private initialized = false;
  private interactionCounter = 0;

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.ensureSessionsDir();
      this.initialized = true;
    }
  }

  private async ensureSessionsDir() {
    try {
      await fs.access(this.sessionsDir);
    } catch {
      await fs.mkdir(this.sessionsDir, { recursive: true });
    }
  }

  private generateSessionId(): string {
    const now = new Date();
    return now.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  }

  private generateInteractionId(): string {
    return `interaction_${++this.interactionCounter}`;
  }

  private generateFileName(name?: string): string {
    const id = this.generateSessionId();
    const sanitizedName = name ? name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-') : '';
    return sanitizedName ? `${id}-${sanitizedName}.md` : `${id}.md`;
  }

  async startSession(name?: string): Promise<string> {
    await this.ensureInitialized();
    
    const fileName = this.generateFileName(name);
    const filePath = path.join(this.sessionsDir, fileName);
    
    this.currentSession = {
      id: this.generateSessionId(),
      name: name || 'Unnamed Session',
      startTime: new Date(),
      interactions: [],
      filePath
    };

    this.interactionCounter = 0;
    await this.updateSessionFile();
    return `Started new session: ${this.currentSession.name} (${fileName})`;
  }

  async updateSession(userPrompt: string, assistantResponse: string): Promise<string> {
    await this.ensureInitialized();
    
    if (!this.currentSession) {
      throw new Error('No active session. Start a session first.');
    }

    const interaction: SessionInteraction = {
      id: this.generateInteractionId(),
      timestamp: new Date(),
      userPrompt,
      assistantResponse
    };

    this.currentSession.interactions.push(interaction);
    await this.updateSessionFile();

    return `Session updated with new interaction (total: ${this.currentSession.interactions.length})`;
  }

  async endSession(): Promise<string> {
    if (!this.currentSession) {
      throw new Error('No active session to end.');
    }

    const sessionName = this.currentSession.name;
    const interactionCount = this.currentSession.interactions.length;
    
    this.currentSession = null;
    this.interactionCounter = 0;

    return `Session "${sessionName}" ended successfully with ${interactionCount} interactions.`;
  }

  async getCurrentSession(): Promise<string> {
    if (!this.currentSession) {
      return 'No active session.';
    }

    return `Active Session: ${this.currentSession.name}
Started: ${this.currentSession.startTime.toLocaleString()}
Interactions: ${this.currentSession.interactions.length}
File: ${this.currentSession.filePath}`;
  }

  async listSessions(): Promise<string> {
    await this.ensureInitialized();
    
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessionFiles = files.filter(f => f.endsWith('.md'));
      
      if (sessionFiles.length === 0) {
        return 'No session files found.';
      }

      const fileDetails = await Promise.all(
        sessionFiles.map(async (file) => {
          const filePath = path.join(this.sessionsDir, file);
          const stats = await fs.stat(filePath);
          return `• ${file} (${stats.size} bytes, modified: ${stats.mtime.toLocaleString()})`;
        })
      );

      return `Session History (${sessionFiles.length} files):\n${fileDetails.join('\n')}`;
    } catch (error) {
      return `Error listing sessions: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async updateSessionFile() {
    if (!this.currentSession) {
      return;
    }

    const content = this.generateMarkdownContent();
    const dir = path.dirname(this.currentSession.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.currentSession.filePath, content, 'utf-8');
  }

  private generateMarkdownContent(): string {
    if (!this.currentSession) {
      return '';
    }

    const session = this.currentSession;
    
    let content = `# ${session.name}

**Started:** ${session.startTime.toLocaleString()}
**Session ID:** ${session.id}
**Total Interactions:** ${session.interactions.length}

## Conversation Log

`;

    if (session.interactions.length === 0) {
      content += '_No interactions recorded yet._\n\n';
    } else {
      session.interactions.forEach((interaction, index) => {
        const time = interaction.timestamp.toLocaleTimeString();
        content += `### Interaction ${index + 1} - ${time}
**ID:** ${interaction.id}

**User:**
${interaction.userPrompt}

**Assistant:**
${interaction.assistantResponse}

---

`;
      });
    }

    return content;
  }

  async autoCapture(userPrompt: string, assistantResponse: string, options?: { 
    forceNew?: boolean;
    interactionId?: string;
  }): Promise<string> {
    await this.ensureInitialized();
    
    if (!this.currentSession) {
      const sessionName = userPrompt.split(' ').slice(0, 4).join(' ').substring(0, 30);
      await this.startSession(`Auto: ${sessionName}`);
    }

    const interactionId = options?.interactionId || this.generateInteractionId();
    const forceNew = options?.forceNew ?? true;

    // Check if we should append to existing interaction or create new one
    const existingInteraction = this.findMatchingInteraction(userPrompt, interactionId, forceNew);
    
    if (existingInteraction && !forceNew) {
      // Append to existing interaction
      existingInteraction.assistantResponse += '\n\n' + assistantResponse;
      existingInteraction.timestamp = new Date(); // Update timestamp
      await this.updateSessionFile();
      return `Auto-captured and appended to existing interaction in session "${this.currentSession?.name}" (ID: ${existingInteraction.id})`;
    } else {
      // Create new interaction
      const interaction: SessionInteraction = {
        id: interactionId,
        timestamp: new Date(),
        userPrompt,
        assistantResponse
      };

      this.currentSession!.interactions.push(interaction);
      await this.updateSessionFile();
      return `Auto-captured new interaction in session "${this.currentSession?.name}" (ID: ${interaction.id})`;
    }
  }

  private findMatchingInteraction(userPrompt: string, interactionId: string, forceNew: boolean): SessionInteraction | null {
    if (!this.currentSession || forceNew) {
      console.error(`DEBUG: findMatchingInteraction returning null - currentSession: ${!!this.currentSession}, forceNew: ${forceNew}`);
      return null;
    }

    // Look for existing interaction with same ID or similar user prompt (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    console.error(`DEBUG: Looking for interaction with ID: ${interactionId} or matching prompt in ${this.currentSession.interactions.length} interactions`);
    
    const found = this.currentSession.interactions.find(interaction => 
      (interaction.id === interactionId) ||
      (interaction.timestamp > fiveMinutesAgo && 
       interaction.userPrompt.trim() === userPrompt.trim())
    ) || null;
    
    console.error(`DEBUG: Found matching interaction: ${found ? found.id : 'none'}`);
    return found;
  }

  async captureCompleteExchange(userPrompt: string, completeResponse: string): Promise<string> {
    return this.autoCapture(userPrompt, completeResponse, { forceNew: true });
  }
}

const server = new Server({
  name: "session-details",
  version: "1.0.0",
});

const sessionTracker = new SessionTracker();

const tools: Tool[] = [
  {
    name: "start_session",
    description: "Manually start a new development session",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Optional name for the session" }
      }
    }
  },
  {
    name: "update_session",
    description: "Manually update the current session",
    inputSchema: {
      type: "object",
      properties: {
        user_prompt: { type: "string", description: "The user's prompt/question" },
        assistant_response: { type: "string", description: "The assistant's response" }
      },
      required: ["user_prompt", "assistant_response"]
    }
  },
  {
    name: "end_session",
    description: "Manually end the current session",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "get_current_session",
    description: "Get information about the current active session",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "list_sessions", 
    description: "List all past session files",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "auto_capture",
    description: "Intelligently capture conversation exchanges, appending to existing interactions unless force_new is true. Ideal for building up complete multi-turn exchanges incrementally.",
    inputSchema: {
      type: "object",
      properties: {
        user_prompt: { type: "string", description: "The user's prompt/question" },
        assistant_response: { type: "string", description: "The assistant's response or partial response to append" },
        force_new: { type: "boolean", description: "Force creation of new interaction even if similar exists. Set to false to append to existing interactions.", default: true },
        interaction_id: { type: "string", description: "Optional custom ID for the interaction. Used to match and append to existing interactions." }
      },
      required: ["user_prompt", "assistant_response"]
    }
  },
  {
    name: "capture_complete_exchange",
    description: "Capture a complete conversation exchange after it's fully finished (recommended method)",
    inputSchema: {
      type: "object",
      properties: {
        user_prompt: { type: "string", description: "The complete user's prompt/question" },
        complete_assistant_response: { type: "string", description: "The complete assistant's response including all tool outputs and final summary" }
      },
      required: ["user_prompt", "complete_assistant_response"]
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "start_session": {
        const sessionArgs = args as { name?: string };
        return {
          content: [{
            type: "text",
            text: await sessionTracker.startSession(sessionArgs?.name)
          }]
        };
      }

      case "update_session": {
        const updateArgs = args as { user_prompt: string; assistant_response: string };
        if (!updateArgs?.user_prompt || !updateArgs?.assistant_response) {
          throw new Error("user_prompt and assistant_response are required");
        }
        return {
          content: [{
            type: "text", 
            text: await sessionTracker.updateSession(updateArgs.user_prompt, updateArgs.assistant_response)
          }]
        };
      }

      case "end_session":
        return {
          content: [{
            type: "text",
            text: await sessionTracker.endSession()
          }]
        };

      case "get_current_session":
        return {
          content: [{
            type: "text",
            text: await sessionTracker.getCurrentSession()
          }]
        };

      case "list_sessions":
        return {
          content: [{
            type: "text",
            text: await sessionTracker.listSessions()
          }]
        };

      case "auto_capture": {
        const captureArgs = args as { 
          user_prompt: string; 
          assistant_response: string; 
          force_new?: boolean;
          interaction_id?: string;
        };
        if (!captureArgs?.user_prompt || !captureArgs?.assistant_response) {
          throw new Error("user_prompt and assistant_response are required");
        }
        return {
          content: [{
            type: "text",
            text: await sessionTracker.autoCapture(
              captureArgs.user_prompt, 
              captureArgs.assistant_response,
              { 
                forceNew: captureArgs.force_new ?? true,
                interactionId: captureArgs.interaction_id
              }
            )
          }]
        };
      }

      case "capture_complete_exchange": {
        const captureArgs = args as { user_prompt: string; complete_assistant_response: string };
        if (!captureArgs?.user_prompt || !captureArgs?.complete_assistant_response) {
          throw new Error("user_prompt and complete_assistant_response are required");
        }
        return {
          content: [{
            type: "text",
            text: await sessionTracker.captureCompleteExchange(
              captureArgs.user_prompt, 
              captureArgs.complete_assistant_response
            )
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);