'use client';

import { useState, useEffect, useCallback } from 'react';

interface GenerationJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  error?: string;
  generatedAssets?: any[];
}

export function useGenerationPoll(jobId: string | null) {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const data = await response.json();
      setJob(data);

      // Stop polling if job is complete or failed
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        return true; // Signal to stop polling
      }

      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return true; // Stop polling on error
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    let interval: NodeJS.Timeout;
    let pollDelay = 3000; // Start with 3 seconds
    const maxDelay = 10000; // Max 10 seconds

    const poll = async () => {
      const shouldStop = await fetchJob();

      if (!shouldStop) {
        // Exponential backoff
        pollDelay = Math.min(pollDelay * 1.2, maxDelay);
        interval = setTimeout(poll, pollDelay);
      }
    };

    // Initial fetch
    poll();

    return () => {
      if (interval) {
        clearTimeout(interval);
      }
    };
  }, [jobId, fetchJob]);

  return { job, error };
}
