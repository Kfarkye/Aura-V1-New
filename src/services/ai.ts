/**
 * AI Service Layer
 *
 * This file contains the primary client-side functions for interacting with
 * the backend AI services. It's designed to abstract away the network layer
 * from the UI hooks.
 *
 * The server streams raw text chunks (Content-Type: text/plain). Each chunk
 * from the ReadableStream is decoded and yielded as a `text_chunk` ChatEvent.
 */
import { Message, ChatEvent, ChatMode } from '../types';

/**
 * Sends messages to the backend and returns an async generator that yields
 * structured `ChatEvent` objects (text chunks from raw text stream).
 */
export async function* sendMessage(
  messages: Message[],
  options: {
    mode?: ChatMode;
    targetRepository?: string;
    repoContext?: any;
    signal?: AbortSignal;
  } = {}
): AsyncGenerator<ChatEvent, void, unknown> {
  const { mode = 'chat', targetRepository, repoContext, signal } = options;

  const payload = messages.map(({ role, content, attachments }) => ({
    role,
    content: content || '',
    ...(attachments && { attachments }),
  }));

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: payload,
      mode,
      ...(targetRepository && { targetRepository }),
      ...(repoContext && { repoContext }),
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.json().catch(() => ({ error: 'Chat request failed' }));
    throw new Error(errorBody.error || `Server error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) {
        reader.cancel();
        return;
      }

      const text = decoder.decode(value, { stream: true });
      if (text) {
        // Try JSON-lines first (for structured events from newer endpoints)
        // Fall back to raw text chunks (server's actual format)
        const lines = text.split('\n');
        let handledAsJson = false;

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed && typeof parsed === 'object' && parsed.type) {
              yield parsed as ChatEvent;
              handledAsJson = true;
            }
          } catch {
            // Not JSON — this is expected for the raw text stream
          }
        }

        // If none of the lines parsed as structured JSON events, yield as raw text
        if (!handledAsJson) {
          yield { type: 'text_chunk', chunk: text } as ChatEvent;
        }
      }
    }
  } catch (e) {
    console.error('Error reading chat stream:', e);
    throw new Error('Stream read failed.');
  } finally {
    reader.releaseLock();
  }
}

/**
 * Sends a tool resolution back to the server to resume an ADK session.
 * Yields ChatEvent objects as the agent continues its execution.
 */
export async function* resolveToolCall(
  toolName: string,
  resolution: Record<string, any>,
  options: { signal?: AbortSignal } = {}
): AsyncGenerator<ChatEvent, void, unknown> {
  const { signal } = options;

  const response = await fetch('/api/chat/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolName, resolution }),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.json().catch(() => ({ error: 'Resolution failed' }));
    throw new Error(errorBody.error || `Server error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal?.aborted) {
        reader.cancel();
        return;
      }

      const text = decoder.decode(value, { stream: true });
      if (text) {
        const lines = text.split('\n');
        let handledAsJson = false;

        for (const line of lines) {
          if (line.trim() === '') continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed && typeof parsed === 'object' && parsed.type) {
              yield parsed as ChatEvent;
              handledAsJson = true;
            }
          } catch {
            // Not JSON
          }
        }

        if (!handledAsJson) {
          yield { type: 'text_chunk', chunk: text } as ChatEvent;
        }
      }
    }
  } catch (e) {
    console.error('Error reading resolution stream:', e);
    throw new Error('Stream read failed.');
  } finally {
    reader.releaseLock();
  }
}

/**
 * Deploy file changes to production via /api/deploy.
 * Returns a ReadableStream for deployment status updates.
 */
export async function deployChanges(
  files: { path: string; content: string; description?: string }[],
  summary?: string,
  googleCloudProject?: string
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch('/api/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, summary, googleCloudProject }),
  });

  if (!response.ok || !response.body) {
    const errorBody = await response.json().catch(() => ({ error: 'Deploy request failed' }));
    throw new Error(errorBody.error || `Server error: ${response.status}`);
  }

  return response.body;
}
