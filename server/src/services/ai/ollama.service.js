/**
 * Ollama Service - HTTP client for Ollama /api/chat
 * Handles streaming and non-streaming chat completions
 * Supports function calling via tool definitions in the request
 */

import { env } from '../../config/env.js';

const BASE_URL = env.OLLAMA_BASE_URL;
const MODEL = env.OLLAMA_MODEL;

/**
 * Send a chat completion request to Ollama
 * @param {object} options
 * @param {object[]} options.messages - Chat messages [{role, content}]
 * @param {object[]} [options.tools] - Tool definitions for function calling
 * @param {boolean} [options.stream=false] - Stream response
 * @param {object} [options.options] - Model options (temperature, etc.)
 * @returns {Promise<object>} - { message: { role, content, tool_calls? }, tokens: { prompt, completion } }
 */
export async function chat({ messages, tools, stream = false, options = {} }) {
  const body = {
    model: MODEL,
    messages,
    stream,
    options: {
      temperature: 0.7,
      num_predict: 2048,
      ...options,
    },
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000), // 2 min timeout for LLM
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new OllamaError(`Ollama API error: ${response.status} - ${text}`);
  }

  if (stream) {
    return response.body; // Return ReadableStream for streaming
  }

  const data = await response.json();

  return {
    message: data.message,
    tokens: {
      prompt: data.prompt_eval_count || 0,
      completion: data.eval_count || 0,
    },
    totalDuration: data.total_duration,
  };
}

/**
 * Stream chat completion, yielding chunks
 * @param {object} options - Same as chat()
 * @yields {object} - Parsed JSON chunks from Ollama stream
 */
export async function* chatStream({ messages, tools, options = {} }) {
  const body = {
    model: MODEL,
    messages,
    stream: true,
    options: {
      temperature: 0.7,
      num_predict: 2048,
      ...options,
    },
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new OllamaError(`Ollama API error: ${response.status} - ${text}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          yield JSON.parse(line);
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer);
    } catch {
      // Skip
    }
  }
}

/**
 * Check if Ollama is reachable and the model is available
 * @returns {Promise<{ available: boolean, models: string[] }>}
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    const data = await response.json();
    const models = (data.models || []).map((m) => m.name);
    return {
      available: true,
      models,
      modelLoaded: models.some((m) => m.startsWith(MODEL.split(':')[0])),
    };
  } catch {
    return { available: false, models: [], modelLoaded: false };
  }
}

export class OllamaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OllamaError';
  }
}
