'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import Image from 'next/image';

interface MediaAsset {
  id: string;
  fileName: string;
  s3Url: string;
  thumbnailUrl?: string;
}

interface MediaSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function MediaSelector({ selectedIds, onChange }: MediaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadMedia();
    }
  }, [open]);

  useEffect(() => {
    if (selectedIds.length > 0) {
      loadSelectedMedia();
    }
  }, [selectedIds]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/media');
      if (response.ok) {
        const data = await response.json();
        setMedia(data.assets || []);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedMedia = async () => {
    try {
      const response = await fetch('/api/media');
      if (response.ok) {
        const data = await response.json();
        const selected = (data.assets || []).filter((asset: MediaAsset) =>
          selectedIds.includes(asset.id)
        );
        setSelectedMedia(selected);
      }
    } catch (error) {
      console.error('Error loading selected media:', error);
    }
  };

  const toggleSelection = (assetId: string) => {
    if (selectedIds.includes(assetId)) {
      onChange(selectedIds.filter((id) => id !== assetId));
    } else {
      onChange([...selectedIds, assetId]);
    }
  };

  const removeMedia = (assetId: string) => {
    onChange(selectedIds.filter((id) => id !== assetId));
  };

  return (
    <div className="space-y-4">
      {/* Selected media display */}
      {selectedMedia.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {selectedMedia.map((asset) => (
            <div key={asset.id} className="relative group">
              <Card className="p-2">
                <div className="w-24 h-24 relative bg-muted rounded overflow-hidden">
                  <Image
                    src={asset.thumbnailUrl || asset.s3Url}
                    alt={asset.fileName}
                    fill
                    className="object-cover"
                  />
                </div>
              </Card>
              <button
                onClick={() => removeMedia(asset.id)}
                className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add media button */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {selectedIds.length > 0 ? 'Add More Images' : 'Select Product Images'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Product Images</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading media...</div>
          ) : media.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No media assets found.</p>
              <Button
                variant="link"
                onClick={() => {
                  setOpen(false);
                  window.location.href = '/media';
                }}
              >
                Upload some media first
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 py-4">
              {media.map((asset) => {
                const isSelected = selectedIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggleSelection(asset.id)}
                    className={`relative group ${
                      isSelected ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <Card className="p-2 hover:shadow-md transition-shadow">
                      <div className="aspect-square relative bg-muted rounded overflow-hidden">
                        <Image
                          src={asset.thumbnailUrl || asset.s3Url}
                          alt={asset.fileName}
                          fill
                          className="object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-1">
                              ✓
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs mt-1 truncate">{asset.fileName}</p>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>
              Done ({selectedIds.length} selected)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
