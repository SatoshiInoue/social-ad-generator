'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FabricImage } from 'fabric';
import { useCanvas } from '@/hooks/use-canvas';
import { useCanvasHistory } from '@/hooks/use-canvas-history';
import { Button } from '@/components/ui/button';
import { Maximize } from 'lucide-react';

interface CanvasEditorProps {
  width: number;
  height: number;
  initialState?: any;
  onStateChange?: (state: any) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onCanvasReady?: (canvas: any) => void;
}

/**
 * Rewrite S3 URLs to go through our proxy to avoid CORS issues.
 */
function proxyS3Url(src: string): string {
  if (src.includes('.s3.') && src.includes('amazonaws.com')) {
    return `/api/proxy-image?url=${encodeURIComponent(src)}`;
  }
  return src;
}

/**
 * Restore proxy URLs back to original S3 URLs for persistence.
 */
function unproxyUrl(src: string): string {
  if (src.startsWith('/api/proxy-image?url=')) {
    return decodeURIComponent(src.replace('/api/proxy-image?url=', ''));
  }
  return src;
}

export function CanvasEditor({
  width,
  height,
  initialState,
  onStateChange,
  onHistoryChange,
  onCanvasReady,
}: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { canvasElRef, canvas } = useCanvas({ width, height });
  const { saveState, undo, redo, canUndo, canRedo, initialize } = useCanvasHistory(canvas);
  const [zoom, setZoom] = useState(1);

  const initialLoadDoneRef = useRef(false);
  const isLoadingRef = useRef(false);
  const onStateChangeRef = useRef(onStateChange);
  const onCanvasReadyRef = useRef(onCanvasReady);

  onStateChangeRef.current = onStateChange;
  onCanvasReadyRef.current = onCanvasReady;

  // Fit canvas to container
  const fitToScreen = useCallback(() => {
    if (!canvas || !containerRef.current) return;

    const container = containerRef.current;
    const padding = 40; // px padding around the canvas
    const availableWidth = container.clientWidth - padding * 2;
    const availableHeight = container.clientHeight - padding * 2;

    const scaleX = availableWidth / width;
    const scaleY = availableHeight / height;
    const newZoom = Math.min(scaleX, scaleY, 1); // Never zoom beyond 100%

    canvas.setZoom(newZoom);
    canvas.setDimensions({
      width: width * newZoom,
      height: height * newZoom,
    });

    setZoom(newZoom);
  }, [canvas, width, height]);

  // Auto fit on initial load and on window resize
  useEffect(() => {
    if (!canvas || !initialLoadDoneRef.current) return;

    // Small delay to let the container settle
    const timer = setTimeout(fitToScreen, 100);

    const handleResize = () => fitToScreen();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [canvas, fitToScreen]);

  // Load initial state ONCE
  useEffect(() => {
    if (!canvas || initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;

    if (initialState) {
      isLoadingRef.current = true;

      const state = JSON.parse(JSON.stringify(initialState));
      const allObjects = state.objects || [];

      // Separate image objects from non-image objects, keeping track of indices
      const imageEntries: { index: number; obj: any }[] = [];
      const nonImageState = {
        ...state,
        objects: allObjects.map((obj: any, i: number) => {
          if (obj.type === 'image') {
            imageEntries.push({ index: i, obj });
            // Put a placeholder (invisible rect) so z-order indices are preserved
            return null;
          }
          return obj;
        }).filter(Boolean),
      };

      // Load non-image objects first (text, shapes, etc.)
      canvas.loadFromJSON(nonImageState).then(async () => {
        // Apply scaling locks to textbox objects
        canvas.getObjects().forEach((obj) => {
          if (obj.type === 'textbox') {
            obj.set({
              lockScalingX: true,
              lockScalingY: true,
            });
          }
        });

        // Now manually load each image and insert at the correct z-position
        for (const entry of imageEntries) {
          const objDef = entry.obj;
          const intendedWidth = (objDef.width || 100) * (objDef.scaleX || 1);
          const intendedHeight = (objDef.height || 100) * (objDef.scaleY || 1);
          const src = proxyS3Url(objDef.src);

          try {
            const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' });

            // Scale image to match intended display size
            const naturalW = img.width || 1;
            const naturalH = img.height || 1;
            img.set({
              left: objDef.left || 0,
              top: objDef.top || 0,
              originX: objDef.originX || 'left',
              originY: objDef.originY || 'top',
              scaleX: intendedWidth / naturalW,
              scaleY: intendedHeight / naturalH,
              angle: objDef.angle || 0,
              opacity: objDef.opacity ?? 1,
              flipX: objDef.flipX || false,
              flipY: objDef.flipY || false,
              selectable: objDef.selectable ?? true,
              evented: objDef.evented ?? true,
              visible: objDef.visible ?? true,
            });

            // Copy custom properties
            (img as any).id = objDef.id;
            (img as any).name = objDef.name;
            (img as any).layerType = objDef.layerType;
            (img as any).locked = objDef.locked;

            // If locked (e.g. background), make it non-selectable
            if (objDef.locked) {
              img.set({ selectable: false, evented: false });
            }

            // Insert at the correct z-order position
            // Count how many images come before this one to calculate offset
            const insertIndex = Math.min(entry.index, canvas.getObjects().length);
            canvas.insertAt(insertIndex, img);
          } catch (err) {
            console.error(`Failed to load image "${objDef.name || objDef.src}":`, err);
          }
        }

        canvas.renderAll();
        isLoadingRef.current = false;
        initialize(JSON.stringify(initialState));

        // Fit after loading
        if (containerRef.current) {
          const padding = 40;
          const availableWidth = containerRef.current.clientWidth - padding * 2;
          const availableHeight = containerRef.current.clientHeight - padding * 2;
          const scaleX = availableWidth / width;
          const scaleY = availableHeight / height;
          const newZoom = Math.min(scaleX, scaleY, 1);

          canvas.setZoom(newZoom);
          canvas.setDimensions({
            width: width * newZoom,
            height: height * newZoom,
          });
          setZoom(newZoom);
        }
      }).catch((err: unknown) => {
        console.error('Canvas load failed:', err);
        isLoadingRef.current = false;
      });
    } else {
      initialize();
    }

    onCanvasReadyRef.current?.(canvas);
  }, [canvas, initialState, initialize, width, height]);

  // Listen to canvas events
  useEffect(() => {
    if (!canvas) return;

    const handleModified = () => {
      if (isLoadingRef.current) return;
      saveState();
      // Get canvas state and restore original S3 URLs (remove proxy prefix)
      const state = canvas.toJSON(['id', 'name', 'layerType', 'locked']);
      if (state.objects) {
        for (const obj of state.objects) {
          if (obj.type === 'image' && obj.src) {
            obj.src = unproxyUrl(obj.src);
          }
        }
      }
      onStateChangeRef.current?.(state);
    };

    canvas.on('object:modified', handleModified);
    canvas.on('object:added', handleModified);
    canvas.on('object:removed', handleModified);

    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('object:added', handleModified);
      canvas.off('object:removed', handleModified);
    };
  }, [canvas, saveState]);

  useEffect(() => {
    onHistoryChange?.(canUndo, canRedo);
  }, [canUndo, canRedo, onHistoryChange]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__canvasUndo = undo;
      (window as any).__canvasRedo = redo;
    }
  }, [undo, redo]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-gray-100 overflow-hidden">
      <canvas ref={canvasElRef} />

      {/* Fit to screen button */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={fitToScreen}
          title="Fit to screen"
          className="shadow-md"
        >
          <Maximize className="h-4 w-4 mr-1" />
          Fit
        </Button>
        <span className="text-xs text-gray-500 bg-white/80 px-2 py-1 rounded shadow-sm">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    </div>
  );
}
