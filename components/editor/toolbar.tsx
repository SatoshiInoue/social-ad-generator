'use client';

import { Button } from '@/components/ui/button';
import { Undo, Redo, Save, Type, Square, Circle, Image as ImageIcon } from 'lucide-react';

interface ToolbarProps {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onAddText?: () => void;
  onAddShape?: (shape: 'rectangle' | 'circle') => void;
}

export function Toolbar({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onSave,
  onAddText,
  onAddShape,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-4 border-b bg-white">
      {/* History controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-gray-300" />

      {/* Add tools */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddText}
          title="Add Text"
        >
          <Type className="h-4 w-4 mr-1" />
          Text
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddShape?.('rectangle')}
          title="Add Rectangle"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddShape?.('circle')}
          title="Add Circle"
        >
          <Circle className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      {/* Save button */}
      <Button onClick={onSave} size="sm">
        <Save className="h-4 w-4 mr-1" />
        Save
      </Button>
    </div>
  );
}
