type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface GenerationJob {
  id: string;
  status: JobStatus;
  progress: number;
  error?: string;
}

class GenerationQueue {
  private jobs: Map<string, GenerationJob> = new Map();
  private processing: Set<string> = new Set();
  private readonly maxConcurrent = 3;

  async addJob(
    jobId: string,
    task: () => Promise<void>
  ): Promise<void> {
    this.jobs.set(jobId, {
      id: jobId,
      status: 'PENDING',
      progress: 0,
    });

    this.processQueue();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const job = this.jobs.get(jobId);
        if (job?.status === 'COMPLETED') {
          clearInterval(checkInterval);
          resolve();
        } else if (job?.status === 'FAILED') {
          clearInterval(checkInterval);
          reject(new Error(job.error || 'Job failed'));
        }
      }, 500);
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    const pendingJob = Array.from(this.jobs.entries()).find(
      ([id, job]) => job.status === 'PENDING' && !this.processing.has(id)
    );

    if (!pendingJob) {
      return;
    }

    const [jobId] = pendingJob;
    this.processing.add(jobId);

    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'PROCESSING';

    // Process the job (actual implementation would call the task)
    // For now, we'll simulate progress
    setTimeout(() => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob) {
        currentJob.status = 'COMPLETED';
        currentJob.progress = 100;
      }
      this.processing.delete(jobId);
      this.processQueue(); // Process next job
    }, 2000);
  }

  getJobStatus(jobId: string): GenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  updateProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
    }
  }

  failJob(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'FAILED';
      job.error = error;
      this.processing.delete(jobId);
    }
  }
}

export const generationQueue = new GenerationQueue();
