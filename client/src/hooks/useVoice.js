/**
 * useVoice hook - manages voice recording, STT and TTS playback
 *
 * States: idle → recording → processing → speaking → idle
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext.jsx';

export function useVoice() {
  const { socket } = useSocket();
  const [state, setState] = useState('idle'); // idle | recording | processing | speaking
  const [transcription, setTranscription] = useState('');
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100); // Collect chunks every 100ms
      mediaRecorderRef.current = recorder;
      setState('recording');
    } catch (err) {
      setError('Microphone access denied');
      console.error('getUserMedia error:', err);
    }
  }, []);

  // Stop recording and send audio
  const stopRecording = useCallback((conversationId = null) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const buffer = await blob.arrayBuffer();

      setState('processing');

      // Send to server via Socket.io
      if (socket) {
        socket.emit('voice:send', {
          audio: Buffer.from(buffer),
          conversationId,
        });
      }

      // Stop all tracks
      recorder.stream.getTracks().forEach((t) => t.stop());
    };

    recorder.stop();
  }, [socket]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stream.getTracks().forEach((t) => t.stop());
      recorder.stop();
    }
    setState('idle');
  }, []);

  // Play audio chunks from TTS
  const playAudioChunk = useCallback(async (chunk) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const arrayBuffer = chunk instanceof ArrayBuffer ? chunk : chunk.buffer;
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch {
      // Audio decode error - skip chunk
    }
  }, []);

  // Socket.io voice event listeners
  useEffect(() => {
    if (!socket) return;

    const onTranscription = (data) => {
      setTranscription(data.text);
    };

    const onThinking = () => {
      setState('processing');
    };

    const onAudioChunk = (data) => {
      setState('speaking');
      playAudioChunk(data.chunk);
    };

    const onAudioEnd = () => {
      setState('idle');
    };

    const onVoiceError = (data) => {
      setState('idle');
      setError(data.error);
    };

    socket.on('voice:transcription', onTranscription);
    socket.on('voice:thinking', onThinking);
    socket.on('voice:audio_chunk', onAudioChunk);
    socket.on('voice:audio_end', onAudioEnd);
    socket.on('voice:error', onVoiceError);

    return () => {
      socket.off('voice:transcription', onTranscription);
      socket.off('voice:thinking', onThinking);
      socket.off('voice:audio_chunk', onAudioChunk);
      socket.off('voice:audio_end', onAudioEnd);
      socket.off('voice:error', onVoiceError);
    };
  }, [socket, playAudioChunk]);

  return {
    state,
    transcription,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    isSpeaking: state === 'speaking',
  };
}
