'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Textbox, Rect, Circle } from 'fabric';
import { CanvasEditor } from '@/components/editor/canvas-editor';
import { Toolbar } from '@/components/editor/toolbar';
import { LayersPanel } from '@/components/editor/layers-panel';
import { PropertiesPanel } from '@/components/editor/properties-panel';
import { TextControls } from '@/components/editor/text-controls';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditorPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assetId?: string }>;
}

export default function EditorPage({ params, searchParams }: EditorPageProps) {
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const router = useRouter();
  const { toast } = useToast();

  const [asset, setAsset] = useState<any>(null);
  const [initialCanvasState, setInitialCanvasState] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ width: 1080, height: 1080 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [canvasInstance, setCanvasInstance] = useState<any>(null);
  const canvasRef = useRef<any>(null);
  // Store latest canvas state for saving (not used for rendering)
  const latestCanvasStateRef = useRef<any>(null);

  // Load asset data once
  useEffect(() => {
    const loadAsset = async () => {
      if (!resolvedSearchParams.assetId) return;

      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/campaigns/${resolvedParams.id}/assets/${resolvedSearchParams.assetId}`
        );
        if (!response.ok) throw new Error('Failed to load asset');

        const data = await response.json();
        setAsset(data);
        setInitialCanvasState(data.canvasState);
        latestCanvasStateRef.current = data.canvasState;

        const aspectRatio = data.aspectRatio;
        if (aspectRatio === '1:1') {
          setDimensions({ width: 1080, height: 1080 });
        } else if (aspectRatio === '9:16') {
          setDimensions({ width: 1080, height: 1920 });
        } else if (aspectRatio === '16:9') {
          setDimensions({ width: 1920, height: 1080 });
        }
      } catch (error) {
        console.error('Error loading asset:', error);
        toast({
          title: 'Error',
          description: 'Failed to load asset',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAsset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id, resolvedSearchParams.assetId]);

  const handleUndo = useCallback(() => {
    (window as any).__canvasUndo?.();
  }, []);

  const handleRedo = useCallback(() => {
    (window as any).__canvasRedo?.();
  }, []);

  const handleAddText = useCallback(() => {
    if (!canvasRef.current) return;

    const c = canvasRef.current;
    const zoom = c.getZoom() || 1;
    // Place in the center of the visible viewport
    const centerX = (c.getWidth() / zoom) / 2;
    const centerY = (c.getHeight() / zoom) / 2;

    const text = new Textbox('Text', {
      left: centerX,
      top: centerY,
      originX: 'center',
      originY: 'center',
      fontSize: 48,
      fill: '#000000',
      lockScalingX: true,
      lockScalingY: true,
      fontFamily: 'Arial',
      width: 300,
      textAlign: 'center',
    });

    (text as any).id = `text-${Date.now()}`;
    (text as any).name = 'Text Layer';
    (text as any).layerType = 'text';

    c.add(text);
    c.setActiveObject(text);
    c.renderAll();
  }, []);

  const handleAddShape = useCallback((shape: 'rectangle' | 'circle') => {
    if (!canvasRef.current) return;

    let obj;
    if (shape === 'rectangle') {
      obj = new Rect({
        left: 100,
        top: 100,
        width: 200,
        height: 100,
        fill: '#3b82f6',
      });
      (obj as any).name = 'Rectangle';
    } else {
      obj = new Circle({
        left: 100,
        top: 100,
        radius: 50,
        fill: '#3b82f6',
      });
      (obj as any).name = 'Circle';
    }

    (obj as any).id = `shape-${Date.now()}`;
    (obj as any).layerType = 'shape';

    canvasRef.current.add(obj);
    canvasRef.current.setActiveObject(obj);
    canvasRef.current.renderAll();
  }, []);

  const handleSave = async () => {
    if (!latestCanvasStateRef.current || !resolvedSearchParams.assetId || !canvasRef.current) return;

    try {
      // Render the canvas at full resolution for the thumbnail
      const c = canvasRef.current;
      const currentZoom = c.getZoom();

      // Temporarily reset zoom to 1 to export at full resolution
      c.setZoom(1);
      c.setDimensions({ width: dimensions.width, height: dimensions.height });

      // Deselect all objects so selection handles don't appear in the thumbnail
      c.discardActiveObject();
      c.renderAll();

      const thumbnailDataUrl = c.toDataURL({
        format: 'png',
        multiplier: 1,
      });

      // Restore zoom
      c.setZoom(currentZoom);
      c.setDimensions({
        width: dimensions.width * currentZoom,
        height: dimensions.height * currentZoom,
      });
      c.renderAll();

      const response = await fetch(
        `/api/campaigns/${resolvedParams.id}/assets/${resolvedSearchParams.assetId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            canvasState: latestCanvasStateRef.current,
            thumbnailDataUrl,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to save');

      toast({
        title: 'Saved',
        description: 'Canvas and thumbnail saved successfully',
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save canvas',
        variant: 'destructive',
      });
    }
  };

  // Store state in ref only — never triggers re-render
  const handleStateChange = useCallback((newState: any) => {
    latestCanvasStateRef.current = newState;
  }, []);

  const handleHistoryChange = useCallback((undo: boolean, redo: boolean) => {
    setCanUndo(undo);
    setCanRedo(redo);
  }, []);

  const handleCanvasReady = useCallback((c: any) => {
    canvasRef.current = c;
    setCanvasInstance(c);
  }, []);

  if (isLoading || !asset || !initialCanvasState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-white">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/campaigns/${resolvedParams.id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaign
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Canvas Editor</h1>
          <p className="text-sm text-gray-500">
            {asset.aspectRatio} - {asset.language}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onAddText={handleAddText}
        onAddShape={handleAddShape}
      />

      {/* Text Controls */}
      <TextControls canvas={canvasInstance} />

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto">
          <CanvasEditor
            width={dimensions.width}
            height={dimensions.height}
            initialState={initialCanvasState}
            onStateChange={handleStateChange}
            onHistoryChange={handleHistoryChange}
            onCanvasReady={handleCanvasReady}
          />
        </div>

        {/* Layers Panel */}
        <LayersPanel canvas={canvasInstance} />

        {/* Properties Panel */}
        <PropertiesPanel canvas={canvasInstance} />
      </div>
    </div>
  );
}
