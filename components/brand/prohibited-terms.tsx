'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ProhibitedTermsProps {
  terms: string[];
  onChange: (terms: string[]) => void;
}

export function ProhibitedTerms({ terms, onChange }: ProhibitedTermsProps) {
  const [inputValue, setInputValue] = useState('');

  const addTerm = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !terms.includes(trimmed)) {
      onChange([...terms, trimmed]);
      setInputValue('');
    }
  };

  const removeTerm = (index: number) => {
    onChange(terms.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTerm();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Enter prohibited term..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" onClick={addTerm}>
          Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {terms.map((term, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
          >
            <span>{term}</span>
            <button
              type="button"
              onClick={() => removeTerm(index)}
              className="hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {terms.length === 0 && (
        <p className="text-sm text-muted-foreground">No prohibited terms added yet.</p>
      )}
    </div>
  );
}
