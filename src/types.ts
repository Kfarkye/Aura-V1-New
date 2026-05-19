/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Core application-wide type definitions.
 *
 * This file has been enhanced to include types that support the full
 * AI tool-use lifecycle, including ToolCall, MessageRole.TOOL, and the
 * ChatEvent discriminated union for streaming structured data from the server.
 */

// --- Core Chat Types ---

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  /** Represents a tool invocation step in the chat UI. */
  TOOL = 'tool',
}

export interface Attachment {
  mimeType: string;
  data: string; // base64 encoded
  name?: string;
  url?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: Attachment[];
  toolCalls?: ToolCall[];
  timestamp: number;
}

// --- Streaming & AI Service Types ---

/**
 * A discriminated union of all possible events streamed from the `/api/chat` endpoint.
 * This allows the client to react to different stages of the AI's response generation.
 */
export type ChatEvent =
  | { type: 'text_chunk'; chunk: string }
  | { type: 'tool_call'; data: ToolCall }
  | { type: 'tool_result'; data: { id: string; result: any } }
  | { type: 'error'; message: string };

/**
 * Defines the operational mode for the AI, controlling server-side behavior
 * such as grounding, tool availability, and response formatting.
 */
export type ChatMode = 'chat' | 'search' | 'page' | 'research' | 'fantasy' | 'artifact' | 'build' | 'sports_market';


// --- Artifact & Data Types ---

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'heatmap' | 'scatter' | 'network';
  title?: string;
  data: any[];
  keys: string[];
  xAxisKey: string;
}

export interface RenderedBlock {
  title: string;
  jsx: string;
}

// --- Workspace & Task Types ---

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export interface StrikeAlert {
  id:string;
  type: 'facility' | 'state' | 'specialty';
  label: string;
  facilityId?: string;
  state?: string;
  specialty?: string;
  createdAt: string;
  status: 'active';
}

export interface Template {
  id: string;
  title: string;
  content: string;
}

export interface ExternalCursor {
  userId: string;
  roomId?: string;
  x: number;
  y: number;
  name?: string;
  lastUpdate: number;
}
