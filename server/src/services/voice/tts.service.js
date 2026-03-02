/**
 * TTS Service - ElevenLabs streaming text-to-speech
 * Converts AI text responses to audio for voice mode
 *
 * Uses ElevenLabs streaming API for low-latency playback:
 * Text → ElevenLabs API → Audio chunks → Client via Socket.io
 */

import { env } from '../../config/env.js';

const API_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Stream TTS audio from ElevenLabs
 * @param {string} text - Text to synthesize
 * @param {object} [options]
 * @param {string} [options.voiceId] - Override default voice
 * @param {string} [options.modelId='eleven_multilingual_v2']
 * @param {number} [options.stability=0.5]
 * @param {number} [options.similarityBoost=0.75]
 * @returns {AsyncGenerator<Buffer>} - Audio chunks (mp3)
 */
export async function* streamTTS(text, options = {}) {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new TTSError('ElevenLabs API key not configured');
  }

  const voiceId = options.voiceId || env.ELEVENLABS_VOICE_ID;
  if (!voiceId) {
    throw new TTSError('ElevenLabs voice ID not configured');
  }

  const response = await fetch(
    `${API_BASE}/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: options.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
        },
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new TTSError(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield Buffer.from(value);
  }
}

/**
 * Non-streaming TTS - get full audio buffer
 * @param {string} text
 * @param {object} [options] - Same as streamTTS
 * @returns {Promise<Buffer>} - Complete audio (mp3)
 */
export async function synthesize(text, options = {}) {
  const chunks = [];
  for await (const chunk of streamTTS(text, options)) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Check if TTS is configured and available
 * @returns {Promise<{ available: boolean, voices?: object[] }>}
 */
export async function checkHealth() {
  const apiKey = env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return { available: false, reason: 'API key not configured' };
  }

  try {
    const response = await fetch(`${API_BASE}/voices`, {
      headers: { 'xi-api-key': apiKey },
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return { available: false, reason: `API error: ${response.status}` };
    }

    const data = await response.json();
    return {
      available: true,
      voiceCount: data.voices?.length || 0,
      configuredVoice: env.ELEVENLABS_VOICE_ID || null,
    };
  } catch (err) {
    return { available: false, reason: err.message };
  }
}

export class TTSError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TTSError';
  }
}
