export class LineStream extends TransformStream<string, string> {
  constructor() {
    let buffer = '';
    super({
      transform(chunk, controller) {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || ''; // Keep the last unfinished line
        for (const line of lines) {
          controller.enqueue(line);
        }
      },
      flush(controller) {
        if (buffer) {
          controller.enqueue(buffer);
        }
      },
    });
  }
}
