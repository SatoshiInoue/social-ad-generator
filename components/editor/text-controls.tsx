'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { Canvas } from 'fabric';

interface TextControlsProps {
  canvas: Canvas | null;
}

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Noto Sans JP',
];

const FONT_SIZES = [12, 14, 16, 18, 24, 32, 48, 64, 72, 96];

export function TextControls({ canvas }: TextControlsProps) {
  const [selectedText, setSelectedText] = useState<any>(null);
  const [textProps, setTextProps] = useState({
    fontFamily: 'Arial',
    fontSize: 16,
    fill: '#000000',
    backgroundColor: '',
    fontWeight: 'normal' as 'normal' | 'bold',
    fontStyle: 'normal' as 'normal' | 'italic',
    underline: false,
    textAlign: 'left' as 'left' | 'center' | 'right',
  });

  useEffect(() => {
    if (!canvas) return;

    const updateSelection = () => {
      const active = canvas.getActiveObject();

      if (active && active.type === 'textbox') {
        setSelectedText(active);
        setTextProps({
          fontFamily: (active as any).fontFamily || 'Arial',
          fontSize: (active as any).fontSize || 16,
          fill: (active as any).fill || '#000000',
          backgroundColor: (active as any).backgroundColor || '',
          fontWeight: (active as any).fontWeight || 'normal',
          fontStyle: (active as any).fontStyle || 'normal',
          underline: (active as any).underline || false,
          textAlign: (active as any).textAlign || 'left',
        });
      } else {
        setSelectedText(null);
      }
    };

    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', () => setSelectedText(null));

    return () => {
      canvas.off('selection:created', updateSelection);
      canvas.off('selection:updated', updateSelection);
    };
  }, [canvas]);

  const updateTextProperty = (key: string, value: any) => {
    if (!selectedText || !canvas) return;

    selectedText.set(key, value);
    canvas.renderAll();
    setTextProps((prev) => ({ ...prev, [key]: value }));
  };

  if (!selectedText) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
      {/* Font Family */}
      <Select
        value={textProps.fontFamily}
        onValueChange={(value) => updateTextProperty('fontFamily', value)}
      >
        <SelectTrigger className="w-40 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_FAMILIES.map((font) => (
            <SelectItem key={font} value={font}>
              {font}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select
        value={textProps.fontSize.toString()}
        onValueChange={(value) => updateTextProperty('fontSize', Number(value))}
      >
        <SelectTrigger className="w-20 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map((size) => (
            <SelectItem key={size} value={size.toString()}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Text Color */}
      <div className="flex items-center gap-1">
        <Label className="text-xs">Text</Label>
        <Input
          type="color"
          value={textProps.fill}
          onChange={(e) => updateTextProperty('fill', e.target.value)}
          className="h-8 w-10 p-1"
        />
      </div>

      {/* Text Background Color */}
      <div className="flex items-center gap-1">
        <Label className="text-xs">Bg</Label>
        <Input
          type="color"
          value={textProps.backgroundColor || '#ffffff'}
          onChange={(e) => updateTextProperty('backgroundColor', e.target.value)}
          className="h-8 w-10 p-1"
        />
        <Button
          variant={!textProps.backgroundColor ? 'default' : 'ghost'}
          size="sm"
          className="h-7 px-1.5 text-xs"
          title="Transparent background"
          onClick={() => updateTextProperty('backgroundColor', '')}
        >
          None
        </Button>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Text Styles */}
      <div className="flex items-center gap-1">
        <Button
          variant={textProps.fontWeight === 'bold' ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() =>
            updateTextProperty('fontWeight', textProps.fontWeight === 'bold' ? 'normal' : 'bold')
          }
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={textProps.fontStyle === 'italic' ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() =>
            updateTextProperty('fontStyle', textProps.fontStyle === 'italic' ? 'normal' : 'italic')
          }
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={textProps.underline ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => updateTextProperty('underline', !textProps.underline)}
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Text Alignment */}
      <div className="flex items-center gap-1">
        <Button
          variant={textProps.textAlign === 'left' ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => updateTextProperty('textAlign', 'left')}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={textProps.textAlign === 'center' ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => updateTextProperty('textAlign', 'center')}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={textProps.textAlign === 'right' ? 'default' : 'outline'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => updateTextProperty('textAlign', 'right')}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Padding */}
      <div className="flex items-center gap-1">
        <Label className="text-xs whitespace-nowrap">Pad V</Label>
        <Slider
          value={[selectedText?.paddingy ?? selectedText?.padding ?? 0]}
          onValueChange={([value]) => {
            selectedText.set('padding', value);
            canvas?.renderAll();
          }}
          min={0}
          max={60}
          step={2}
          className="w-20"
        />
      </div>

      {/* Border Radius */}
      <div className="flex items-center gap-1">
        <Label className="text-xs whitespace-nowrap">Radius</Label>
        <Slider
          value={[(selectedText as any)?.rx ?? 0]}
          onValueChange={([value]) => {
            selectedText.set({ rx: value, ry: value } as any);
            canvas?.renderAll();
          }}
          min={0}
          max={40}
          step={1}
          className="w-20"
        />
      </div>
    </div>
  );
}
