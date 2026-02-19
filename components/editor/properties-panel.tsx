'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import type { Canvas, FabricObject } from 'fabric';

interface PropertiesPanelProps {
  canvas: Canvas | null;
}

export function PropertiesPanel({ canvas }: PropertiesPanelProps) {
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [properties, setProperties] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    angle: 0,
    opacity: 100,
    fill: '',
    rx: 0,
  });

  useEffect(() => {
    if (!canvas) return;

    const updateSelection = () => {
      const active = canvas.getActiveObject();
      setSelectedObject(active || null);

      if (active) {
        setProperties({
          left: Math.round(active.left || 0),
          top: Math.round(active.top || 0),
          width: Math.round((active.width || 0) * (active.scaleX || 1)),
          height: Math.round((active.height || 0) * (active.scaleY || 1)),
          angle: Math.round(active.angle || 0),
          opacity: Math.round((active.opacity || 1) * 100),
          fill: (active as any).fill || '',
          rx: Math.round((active as any).rx || 0),
        });
      }
    };

    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });
    canvas.on('object:modified', updateSelection);

    return () => {
      canvas.off('selection:created', updateSelection);
      canvas.off('selection:updated', updateSelection);
      canvas.off('object:modified', updateSelection);
    };
  }, [canvas]);

  const updateProperty = (key: string, value: number | string) => {
    if (!selectedObject || !canvas) return;

    if (key === 'opacity') {
      selectedObject.set('opacity', (value as number) / 100);
    } else if (key === 'rx') {
      // Set both rx and ry for uniform rounding
      selectedObject.set({ rx: value, ry: value } as any);
    } else {
      selectedObject.set(key as any, value);
    }

    canvas.renderAll();
    setProperties((prev) => ({ ...prev, [key]: value as any }));
  };

  const isShape = selectedObject && ((selectedObject.type || '').toLowerCase() === 'rect' || (selectedObject.type || '').toLowerCase() === 'circle');
  const isRect = selectedObject && (selectedObject.type || '').toLowerCase() === 'rect';
  const isTextbox = selectedObject && (selectedObject.type || '').toLowerCase() === 'textbox';

  if (!selectedObject) {
    return (
      <div className="w-64 border-l bg-white p-4">
        <p className="text-sm text-gray-500">Select an object to edit properties</p>
      </div>
    );
  }

  return (
    <div className="w-64 border-l bg-white">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Properties</h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Position */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Position</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">X</Label>
              <Input
                type="number"
                value={properties.left}
                onChange={(e) => updateProperty('left', Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Y</Label>
              <Input
                type="number"
                value={properties.top}
                onChange={(e) => updateProperty('top', Number(e.target.value))}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Size</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={properties.width}
                disabled
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                value={properties.height}
                disabled
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Rotation</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[properties.angle]}
              onValueChange={([value]) => updateProperty('angle', value)}
              min={0}
              max={360}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={properties.angle}
              onChange={(e) => updateProperty('angle', Number(e.target.value))}
              className="h-8 w-16"
            />
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Opacity</Label>
          <div className="flex items-center gap-2">
            <Slider
              value={[properties.opacity]}
              onValueChange={([value]) => updateProperty('opacity', value)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={properties.opacity}
              onChange={(e) => updateProperty('opacity', Number(e.target.value))}
              className="h-8 w-16"
            />
          </div>
        </div>

        {/* Fill Color (shapes only) */}
        {isShape && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Fill Color</Label>
            <Input
              type="color"
              value={typeof properties.fill === 'string' && properties.fill.startsWith('#') ? properties.fill : '#3b82f6'}
              onChange={(e) => updateProperty('fill', e.target.value)}
              className="h-8 w-full p-1"
            />
          </div>
        )}

        {/* Border Radius (rect and textbox) */}
        {(isRect || isTextbox) && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Corner Radius</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[properties.rx]}
                onValueChange={([value]) => updateProperty('rx', value)}
                min={0}
                max={Math.round(Math.min(properties.width, properties.height) / 2)}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={properties.rx}
                onChange={(e) => updateProperty('rx', Number(e.target.value))}
                className="h-8 w-16"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
