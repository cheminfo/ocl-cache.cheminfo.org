import { expect, test } from 'vitest';

import { LineStream } from '../LineStream.ts';

test('LineStream', async () => {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue('line1\nline2\r\nline3\npartial');
      controller.close();
    },
  });

  const lineStream = stream.pipeThrough(new LineStream());
  const result: string[] = [];

  for await (const line of lineStream) {
    result.push(line);
  }

  expect(result).toStrictEqual(['line1', 'line2', 'line3', 'partial']);
});
