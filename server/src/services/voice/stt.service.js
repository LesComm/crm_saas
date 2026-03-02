/**
 * STT Service - Speech-to-text server-side fallback
 *
 * Primary: Web Speech API runs in the browser (zero server cost)
 * Fallback: This service uses Whisper via Ollama for server-side transcription
 *           when the browser doesn't support Web Speech API
 *
 * Audio flow:
 * Client records audio → sends via Socket.io → this service transcribes → returns text
 */

import { env } from '../../config/env.js';

const OLLAMA_BASE = env.OLLAMA_BASE_URL;

/**
 * Transcribe audio using Whisper model via Ollama
 * Note: Requires whisper model pulled in Ollama (ollama pull whisper)
 * Falls back to a simple endpoint if available
 *
 * @param {Buffer} audioBuffer - Audio data (webm/opus from browser MediaRecorder)
 * @param {object} [options]
 * @param {string} [options.language='fr'] - Expected language
 * @returns {Promise<{ text: string, language: string }>}
 */
export async function transcribe(audioBuffer, options = {}) {
  const language = options.language || 'fr';

  // Try Ollama's audio transcription endpoint
  // Note: Ollama Whisper support varies by version
  try {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm');
    formData.append('model', 'whisper');
    formData.append('language', language);

    const response = await fetch(`${OLLAMA_BASE}/api/transcribe`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        text: data.text || '',
        language,
        source: 'whisper-ollama',
      };
    }
  } catch {
    // Ollama transcription not available, fall through
  }

  // If no server-side STT is available, return an error
  // The client should use Web Speech API as primary
  throw new STTError(
    'Server-side STT not available. Use Web Speech API in the browser.'
  );
}

/**
 * Check if server-side STT is available
 * @returns {Promise<{ available: boolean }>}
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    const data = await response.json();
    const models = (data.models || []).map((m) => m.name);
    const hasWhisper = models.some((m) => m.includes('whisper'));

    return {
      available: hasWhisper,
      method: hasWhisper ? 'whisper-ollama' : 'browser-only',
      note: hasWhisper
        ? 'Whisper model available via Ollama'
        : 'Use Web Speech API in browser (primary method)',
    };
  } catch {
    return {
      available: false,
      method: 'browser-only',
      note: 'Use Web Speech API in browser',
    };
  }
}

export class STTError extends Error {
  constructor(message) {
    super(message);
    this.name = 'STTError';
  }
}
