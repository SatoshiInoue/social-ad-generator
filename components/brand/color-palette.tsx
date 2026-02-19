'use client';

import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X } from 'lucide-react';

interface ColorPaletteProps {
  colors: string[];
  onChange: (colors: string[]) => void;
}

export function ColorPalette({ colors, onChange }: ColorPaletteProps) {
  const [newColor, setNewColor] = useState('#3b82f6');

  const addColor = () => {
    if (!colors.includes(newColor)) {
      onChange([...colors, newColor]);
    }
  };

  const removeColor = (index: number) => {
    onChange(colors.filter((_, i) => i !== index));
  };

  const updateColor = (index: number, color: string) => {
    const updated = [...colors];
    updated[index] = color;
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {colors.map((color, index) => (
          <div key={index} className="relative">
            <Popover>
              <PopoverTrigger asChild>
                <div
                  className="h-12 w-12 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                  style={{ backgroundColor: color }}
                  role="button"
                  tabIndex={0}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <div className="space-y-3">
                  <HexColorPicker
                    color={color}
                    onChange={(newColor) => updateColor(index, newColor)}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => updateColor(index, e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <button
              onClick={() => removeColor(index)}
              className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <button className="h-12 w-12 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center transition-colors">
              <Plus className="h-5 w-5 text-gray-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="space-y-3">
              <HexColorPicker color={newColor} onChange={setNewColor} />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border rounded"
                />
                <Button size="sm" onClick={addColor}>
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
