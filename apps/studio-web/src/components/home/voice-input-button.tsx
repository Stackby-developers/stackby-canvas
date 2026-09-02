'use client';

import { useEffect, useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

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
      style={{
        position: 'relative',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '1px solid #363636',
        background: isListening ? 'rgba(45,127,249,0.15)' : '#232323',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        cursor: isUnsupported || disabled ? 'not-allowed' : 'pointer',
        opacity: isUnsupported || disabled ? 0.4 : 1,
        color: isListening ? '#2D7FF9' : '#8A8A8A',
      }}
    >
      {isListening && (
        <span className="absolute inset-0 animate-ping rounded-full" style={{ background: 'rgba(45,127,249,0.3)' }} />
      )}
      {isUnsupported ? (
        <MicOff strokeWidth={1.6} style={{ width: '16px', height: '16px' }} />
      ) : (
        <Mic strokeWidth={1.6} style={{ width: '16px', height: '16px' }} />
      )}
    </button>
  );
}
