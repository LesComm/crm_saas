/**
 * Socket.io Voice Handler
 * Handles voice-to-voice chat: audio in → STT → AI → TTS → audio out
 *
 * Events (client → server):
 *   voice:send        { audio: Buffer, conversationId? }  - Send audio for processing
 *   voice:transcribe  { audio: Buffer }                   - STT only (no AI response)
 *
 * Events (server → client):
 *   voice:transcription  { text }                - Transcribed text
 *   voice:thinking       {}                      - AI is processing
 *   voice:audio_chunk    { chunk: Buffer, index } - TTS audio chunk (streaming)
 *   voice:audio_end      { text }                - TTS streaming complete
 *   voice:response       { conversation, message, text }
 *   voice:error          { error }
 */

import * as chatService from '../services/chat.service.js';
import * as sttService from '../services/voice/stt.service.js';
import * as ttsService from '../services/voice/tts.service.js';

export function voiceHandler(_io, socket) {
  const { tenantId, userId } = socket;

  // ── Full voice flow: audio → STT → AI → TTS → audio ──
  socket.on('voice:send', async (data, callback) => {
    try {
      const { audio, conversationId, language } = data;

      if (!audio || !Buffer.isBuffer(audio)) {
        return emitError(socket, callback, 'Audio buffer is required');
      }

      // 1. Speech-to-Text
      let transcription;
      try {
        const result = await sttService.transcribe(audio, { language });
        transcription = result.text;
      } catch {
        return emitError(socket, callback, 'Speech recognition failed. Try using text input.');
      }

      if (!transcription || transcription.trim().length === 0) {
        return emitError(socket, callback, 'Could not understand audio. Please try again.');
      }

      socket.emit('voice:transcription', { text: transcription });

      // 2. Process through AI (same as chat)
      socket.emit('voice:thinking', {});

      const result = await chatService.processMessage({
        tenantId,
        userId,
        conversationId: conversationId || null,
        content: transcription,
        inputType: 'voice',
      });

      const responseText = result.assistantMessage.content;

      // 3. Text-to-Speech (streaming)
      try {
        let chunkIndex = 0;
        for await (const chunk of ttsService.streamTTS(responseText)) {
          socket.emit('voice:audio_chunk', { chunk, index: chunkIndex++ });
        }
        socket.emit('voice:audio_end', { text: responseText });
      } catch (ttsErr) {
        // TTS failed but we still have the text response
        console.error('TTS error:', ttsErr.message);
        socket.emit('voice:audio_end', { text: responseText, ttsError: true });
      }

      // 4. Emit the complete response
      const response = {
        conversation: {
          id: result.conversation.id,
          title: result.conversation.title,
        },
        message: {
          id: result.assistantMessage.id,
          role: 'assistant',
          content: responseText,
        },
        text: responseText,
        toolResults: result.toolResults,
      };

      socket.emit('voice:response', response);

      if (typeof callback === 'function') {
        callback({ success: true, data: response });
      }
    } catch (err) {
      console.error('voice:send error:', err.message);
      emitError(socket, callback, err.message);
    }
  });

  // ── STT only (no AI, no TTS) ──────────────────────
  socket.on('voice:transcribe', async (data, callback) => {
    try {
      const { audio, language } = data;

      if (!audio || !Buffer.isBuffer(audio)) {
        return emitError(socket, callback, 'Audio buffer is required');
      }

      const result = await sttService.transcribe(audio, { language });

      socket.emit('voice:transcription', { text: result.text });

      if (typeof callback === 'function') {
        callback({ success: true, data: { text: result.text } });
      }
    } catch (err) {
      console.error('voice:transcribe error:', err.message);
      emitError(socket, callback, err.message);
    }
  });
}

function emitError(socket, callback, message) {
  socket.emit('voice:error', { error: message });
  if (typeof callback === 'function') {
    callback({ success: false, error: message });
  }
}
