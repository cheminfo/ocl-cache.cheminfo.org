import type { PendingWrite } from './insertInfoBatch.ts';

/** What the thread serving requests sends the writer. */
export type WriterRequest =
  { type: 'write'; writes: PendingWrite[] } | { type: 'flush'; id: number };

/** What the writer sends back. */
export type WriterResponse =
  { type: 'written'; count: number } | { type: 'flushed'; id: number };
