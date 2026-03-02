/**
 * Voice button with visual states:
 * idle (mic icon) → recording (red pulse) → processing (spinner) → speaking (waveform)
 */

import { Spinner } from '../ui/Spinner.jsx';

export function VoiceButton({ voiceState, onStart, onStop, onCancel }) {
  const { isRecording, isProcessing, isSpeaking } = voiceState;

  if (isProcessing) {
    return (
      <button className="relative rounded-full bg-yellow-100 p-3 text-yellow-600" disabled>
        <Spinner size="sm" className="text-yellow-600" />
      </button>
    );
  }

  if (isSpeaking) {
    return (
      <button
        className="relative rounded-full bg-green-100 p-3 text-green-600"
        title="IA en train de parler"
        disabled
      >
        <SpeakingIcon />
      </button>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onStop}
          className="relative rounded-full bg-red-500 p-3 text-white hover:bg-red-600 transition-colors"
          title="Envoyer"
        >
          <div className="absolute inset-0 rounded-full bg-red-400 voice-pulse" />
          <MicIcon />
        </button>
        <button
          onClick={onCancel}
          className="rounded-full bg-gray-200 p-2 text-gray-500 hover:bg-gray-300 text-xs"
          title="Annuler"
        >
          &#x2715;
        </button>
      </div>
    );
  }

  // Idle
  return (
    <button
      onClick={onStart}
      className="rounded-full bg-gray-100 p-3 text-gray-600 hover:bg-primary-100 hover:text-primary-600 transition-colors"
      title="Maintenir pour parler"
    >
      <MicIcon />
    </button>
  );
}

function MicIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 01-14 0v-1M12 19v4M8 23h8" />
    </svg>
  );
}

function SpeakingIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 12h.01" />
    </svg>
  );
}
