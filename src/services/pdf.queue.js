// src/services/pdf.queue.js
import PQueue from 'p-queue';
export const pdfQueue = new PQueue({ concurrency: 2 }); // 1 o 2 en Render free
