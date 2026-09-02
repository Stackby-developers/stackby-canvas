'use client';
import { useEffect, useRef, useState } from 'react';

const PHRASES = [
  'Build me a report summarizing this quarter…',
  'Build me a data story for my team…',
  'Build me a landing page for my product launch…',
  'Build me an inventory gallery from my product base…',
];

export function useTypewriter(): string {
  const [text, setText] = useState('');
  const phraseIdx = useRef(0);
  const charIdx = useRef(0);
  const deleting = useRef(false);
  const paused = useRef(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    function tick() {
      const phrase = PHRASES[phraseIdx.current] ?? '';

      if (paused.current) {
        paused.current = false;
        deleting.current = true;
        timeout = setTimeout(tick, 1400);
        return;
      }

      if (!deleting.current) {
        if (charIdx.current < phrase.length) {
          charIdx.current += 1;
          setText(phrase.slice(0, charIdx.current));
          timeout = setTimeout(tick, 45);
        } else {
          paused.current = true;
          timeout = setTimeout(tick, 45);
        }
      } else {
        if (charIdx.current > 0) {
          charIdx.current -= 1;
          setText(phrase.slice(0, charIdx.current));
          timeout = setTimeout(tick, 25);
        } else {
          deleting.current = false;
          phraseIdx.current = (phraseIdx.current + 1) % PHRASES.length;
          timeout = setTimeout(tick, 300);
        }
      }
    }

    timeout = setTimeout(tick, 800);
    return () => clearTimeout(timeout);
  }, []);

  return text;
}
