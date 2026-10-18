export type SseEvent = {
  readonly event: string;
  readonly data: string;
};

// Incremental parser for a text/event-stream body. Feed decoded chunks; complete events are returned as soon as their blank-line terminator arrives.
export function createSseParser(): { readonly push: (chunk: string) => SseEvent[]; readonly flush: () => SseEvent[] } {
  let buffer = '';

  function parseBlock(block: string): SseEvent | null {
    let event = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? '' : line.slice(colon + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    return data.length ? { event, data: data.join('\n') } : null;
  }

  function drain(final: boolean): SseEvent[] {
    const events: SseEvent[] = [];
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const parsed = parseBlock(buffer.slice(0, boundary));
      if (parsed) events.push(parsed);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
    if (final && buffer.trim()) {
      const parsed = parseBlock(buffer);
      if (parsed) events.push(parsed);
      buffer = '';
    }
    return events;
  }

  return {
    push: (chunk) => {
      buffer += chunk.replace(/\r\n?/g, '\n');
      return drain(false);
    },
    flush: () => drain(true),
  };
}
