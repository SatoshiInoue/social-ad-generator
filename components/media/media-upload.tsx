'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useS3Upload } from '@/hooks/use-s3-upload';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

export function MediaUpload() {
  const router = useRouter();
  const { uploads, uploadFile, clearUploads } = useS3Upload();
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const imageFiles = fileArray.filter((file) =>
        file.type.startsWith('image/')
      );

      for (const file of imageFiles) {
        try {
          const { s3Key, s3Url } = await uploadFile(file);

          // Get image dimensions
          const img = new Image();
          const dimensions = await new Promise<{ width: number; height: number }>(
            (resolve) => {
              img.onload = () => {
                resolve({ width: img.width, height: img.height });
              };
              img.src = URL.createObjectURL(file);
            }
          );

          // Register in database
          await fetch('/api/media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              s3Key,
              s3Url,
              thumbnailUrl: s3Url,
              dimensions,
            }),
          });
        } catch (error) {
          console.error('Upload failed:', error);
        }
      }

      // Refresh the page to show new uploads
      router.refresh();
    },
    [uploadFile, router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-primary/10 p-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Upload Images</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop images here, or click to browse
            </p>
          </div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept="image/*"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <label htmlFor="file-upload">
            <Button asChild>
              <span>Browse Files</span>
            </Button>
          </label>
        </div>
      </Card>

      {uploads.length > 0 && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Uploading...</h4>
              <Button variant="ghost" size="sm" onClick={clearUploads}>
                Clear
              </Button>
            </div>
            {uploads.map((upload, index) => (
              <div key={index} className="flex items-center gap-3">
                {upload.status === 'uploading' && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
                {upload.status === 'success' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="flex-1 text-sm">{upload.fileName}</span>
                <span className="text-sm text-muted-foreground">
                  {upload.progress}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
