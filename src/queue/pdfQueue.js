import PQueue from 'p-queue';

const concurrency = Number(process.env.PDF_CONCURRENCY || 3);

export const pdfQueue = new PQueue({
  concurrency,
});

export function pdfQueueStats() {
  return {
    concurrency,
    pending: pdfQueue.pending,
    size: pdfQueue.size,
  };
}
