'use client';

import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@stackby/ui';

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
  interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start(): void;
    stop(): void;
  }
  interface SpeechRecognitionResultEvent {
    results: SpeechRecognitionResultList;
  }
}

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type SpeechState = 'idle' | 'listening' | 'unsupported';

export function VoiceInputButton({ onTranscript, disabled = false }: VoiceInputButtonProps) {
  const [state, setState] = useState<SpeechState>('idle');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setState('unsupported');
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) onTranscript(transcript);
    };
    rec.onend = () => setState('idle');
    rec.onerror = () => setState('idle');
    recognitionRef.current = rec;
  }, [onTranscript]);

  function toggle() {
    if (state === 'unsupported' || disabled) return;
    if (state === 'listening') {
      recognitionRef.current?.stop();
      setState('idle');
    } else {
      recognitionRef.current?.start();
      setState('listening');
    }
  }

  const isUnsupported = state === 'unsupported';
  const isListening = state === 'listening';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isUnsupported || disabled}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      className={cn(
        'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
        isUnsupported || disabled
          ? 'cursor-not-allowed text-text-faint opacity-40'
          : isListening
            ? 'bg-accent/15 text-accent'
            : 'text-text-faint hover:bg-bg-muted hover:text-text-muted',
      )}
    >
      {isListening && (
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/30" />
      )}
      {isUnsupported ? (
        <MicOff className="h-3.5 w-3.5" />
      ) : (
        <Mic className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
