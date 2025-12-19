// src/services/pdf.queue.js
import PQueue from 'p-queue';

const CONCURRENCY = Number(process.env.PDF_CONCURRENCY || 2);

export const pdfQueue = new PQueue({
  concurrency: CONCURRENCY,
  timeout: Number(process.env.PDF_JOB_TIMEOUT_MS || 90000),
  throwOnTimeout: true,
});

// (opcional pero útil)
export function pdfQueueStats() {
  return {
    size: pdfQueue.size,
    pending: pdfQueue.pending,
    concurrency: CONCURRENCY,
  };
}
