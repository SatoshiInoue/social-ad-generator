'use client';

import { useCallback, useRef, useState } from 'react';
import type { Canvas } from 'fabric';

const MAX_HISTORY_SIZE = 50;

export function useCanvasHistory(canvas: Canvas | null) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const historyRef = useRef<string[]>([]);
  const currentIndexRef = useRef(-1);
  const isLoadingRef = useRef(false);

  const saveState = useCallback(() => {
    if (!canvas || isLoadingRef.current) return;

    const json = JSON.stringify((canvas as any).toJSON(['id', 'name', 'layerType', 'locked']));

    // Remove any redo states
    historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);

    // Add new state
    historyRef.current.push(json);

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
    } else {
      currentIndexRef.current++;
    }

    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(false);
  }, [canvas]);

  const undo = useCallback(() => {
    if (!canvas || currentIndexRef.current <= 0) return;

    currentIndexRef.current--;
    const state = historyRef.current[currentIndexRef.current];

    if (state) {
      isLoadingRef.current = true;
      canvas.loadFromJSON(JSON.parse(state), () => {
        canvas.renderAll();
        isLoadingRef.current = false;
      });
    }

    setCanUndo(currentIndexRef.current > 0);
    setCanRedo(true);
  }, [canvas]);

  const redo = useCallback(() => {
    if (!canvas || currentIndexRef.current >= historyRef.current.length - 1) return;

    currentIndexRef.current++;
    const state = historyRef.current[currentIndexRef.current];

    if (state) {
      isLoadingRef.current = true;
      canvas.loadFromJSON(JSON.parse(state), () => {
        canvas.renderAll();
        isLoadingRef.current = false;
      });
    }

    setCanUndo(true);
    setCanRedo(currentIndexRef.current < historyRef.current.length - 1);
  }, [canvas]);

  const initialize = useCallback((initialState?: string) => {
    historyRef.current = initialState ? [initialState] : [];
    currentIndexRef.current = initialState ? 0 : -1;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    initialize,
  };
}
