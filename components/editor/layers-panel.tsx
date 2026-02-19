'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import type { Canvas, FabricObject } from 'fabric';

interface Layer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  fabricObject: FabricObject;
}

interface LayersPanelProps {
  canvas: Canvas | null;
}

export function LayersPanel({ canvas }: LayersPanelProps) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refreshLayers = () => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const newLayers: Layer[] = objects.map((obj, index) => ({
      id: (obj as any).id || `layer-${index}`,
      name: (obj as any).name || `Layer ${index + 1}`,
      type: obj.type || 'object',
      visible: obj.visible !== false,
      locked: (obj as any).locked || !obj.selectable,
      fabricObject: obj,
    })).reverse(); // Reverse to show top layers first

    setLayers(newLayers);
  };

  useEffect(() => {
    if (!canvas) return;

    refreshLayers();

    const handleSelection = () => {
      const active = canvas.getActiveObject();
      setSelectedId(active ? (active as any).id : null);
    };

    canvas.on('object:added', refreshLayers);
    canvas.on('object:removed', refreshLayers);
    canvas.on('object:modified', refreshLayers);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedId(null));

    return () => {
      canvas.off('object:added', refreshLayers);
      canvas.off('object:removed', refreshLayers);
      canvas.off('object:modified', refreshLayers);
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
    };
  }, [canvas]);

  const toggleVisibility = (layer: Layer) => {
    layer.fabricObject.set('visible', !layer.visible);
    canvas?.renderAll();
    refreshLayers();
  };

  const toggleLock = (layer: Layer) => {
    const newLocked = !layer.locked;
    layer.fabricObject.set({
      selectable: !newLocked,
      evented: !newLocked,
    });
    (layer.fabricObject as any).locked = newLocked;
    canvas?.renderAll();
    refreshLayers();
  };

  const selectLayer = (layer: Layer) => {
    if (!canvas || layer.locked) return;
    canvas.setActiveObject(layer.fabricObject);
    canvas.renderAll();
  };

  const deleteLayer = (layer: Layer) => {
    if (!canvas || layer.locked) return;
    canvas.remove(layer.fabricObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    refreshLayers();
  };

  // Keyboard shortcut for delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canvas) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        const active = canvas.getActiveObject();
        if (active && (active as any).selectable !== false && !(active as any).locked) {
          // Don't delete background
          if ((active as any).layerType === 'background') return;
          canvas.remove(active);
          canvas.discardActiveObject();
          canvas.renderAll();
          refreshLayers();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas]);

  const moveLayer = (layer: Layer, direction: 'up' | 'down') => {
    if (!canvas) return;

    if (direction === 'up') {
      canvas.bringObjectForward(layer.fabricObject);
    } else {
      canvas.sendObjectBackwards(layer.fabricObject);
    }

    canvas.renderAll();
    refreshLayers();
  };

  return (
    <div className="w-64 border-l bg-white">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Layers</h3>
      </div>
      <div className="p-2 space-y-1">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 ${
              selectedId === layer.id ? 'bg-blue-50 hover:bg-blue-100' : ''
            }`}
            onClick={() => selectLayer(layer)}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleVisibility(layer);
              }}
            >
              {layer.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3 text-gray-400" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleLock(layer);
              }}
            >
              {layer.locked ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Unlock className="h-3 w-3 text-gray-400" />
              )}
            </Button>

            <div className="flex-1 text-sm truncate">
              {layer.name}
              <span className="text-xs text-gray-500 ml-1">({layer.type})</span>
            </div>

            <div className="flex items-center gap-0.5">
              {!layer.locked && (layer.fabricObject as any).layerType !== 'background' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLayer(layer);
                  }}
                  title="Delete layer"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  moveLayer(layer, 'up');
                }}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  moveLayer(layer, 'down');
                }}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
