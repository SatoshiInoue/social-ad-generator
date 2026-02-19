'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas } from 'fabric';

interface UseCanvasOptions {
  width: number;
  height: number;
}

export function useCanvas({ width, height }: UseCanvasOptions) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!canvasElRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const fc = new Canvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    fabricRef.current = fc;
    setCanvas(fc);

    return () => {
      fc.dispose();
      fabricRef.current = null;
      setCanvas(null);
      initializedRef.current = false;
    };
  }, []); // Only init once

  // Resize without recreating
  useEffect(() => {
    if (!fabricRef.current) return;
    fabricRef.current.setDimensions({ width, height });
    fabricRef.current.renderAll();
  }, [width, height]);

  return {
    canvasElRef,
    canvas,
  };
}
