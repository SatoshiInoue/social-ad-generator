'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MediaAsset {
  id: string;
  fileName: string;
  s3Url: string;
  thumbnailUrl: string | null;
  dimensions: any;
  createdAt: Date;
}

interface MediaGridProps {
  assets: MediaAsset[];
}

export function MediaGrid({ assets }: MediaGridProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    setDeleting(id);
    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset');
    } finally {
      setDeleting(null);
    }
  };

  if (assets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No media assets yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {assets.map((asset) => (
        <Card key={asset.id} className="group relative overflow-hidden">
          <div className="aspect-square relative bg-muted">
            <Image
              src={asset.thumbnailUrl || asset.s3Url}
              alt={asset.fileName}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-2">
            <p className="text-sm truncate">{asset.fileName}</p>
            {asset.dimensions && (
              <p className="text-xs text-muted-foreground">
                {asset.dimensions.width} × {asset.dimensions.height}
              </p>
            )}
          </div>
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(asset.id)}
              disabled={deleting === asset.id}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
