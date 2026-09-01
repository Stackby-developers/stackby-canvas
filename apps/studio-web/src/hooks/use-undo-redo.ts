'use client';
import { useState, useCallback } from 'react';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface UseUndoRedoResult<T> {
  state: T;
  set: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

const MAX_HISTORY = 50;

export function useUndoRedo<T>(initial: T): UseUndoRedoResult<T> {
  const [history, setHistory] = useState<UndoRedoState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const set = useCallback((next: T) => {
    setHistory((h) => ({
      past: [...h.past, h.present].slice(-MAX_HISTORY),
      present: next,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1]!;
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const next = h.future[0]!;
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1),
      };
    });
  }, []);

  const clear = useCallback(() => {
    setHistory((h) => ({ past: [], present: h.present, future: [] }));
  }, []);

  return {
    state: history.present,
    set,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clear,
  };
}
