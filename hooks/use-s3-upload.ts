'use client';

import { useState } from 'react';

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
}

export function useS3Upload() {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});

  const uploadFile = async (file: File): Promise<{ s3Key: string; s3Url: string }> => {
    const uploadId = `${file.name}-${Date.now()}`;

    setUploads((prev) => ({
      ...prev,
      [uploadId]: {
        fileName: file.name,
        progress: 0,
        status: 'uploading',
      },
    }));

    try {
      // Get presigned URL from API
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { url, key, s3Url } = await response.json();

      // Upload directly to S3
      await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      setUploads((prev) => ({
        ...prev,
        [uploadId]: {
          fileName: file.name,
          progress: 100,
          status: 'success',
        },
      }));

      return {
        s3Key: key,
        s3Url, // Use the URL from the API response
      };
    } catch (error) {
      setUploads((prev) => ({
        ...prev,
        [uploadId]: {
          fileName: file.name,
          progress: 0,
          status: 'error',
        },
      }));
      throw error;
    }
  };

  const clearUploads = () => setUploads({});

  return {
    uploads: Object.values(uploads),
    uploadFile,
    clearUploads,
  };
}
