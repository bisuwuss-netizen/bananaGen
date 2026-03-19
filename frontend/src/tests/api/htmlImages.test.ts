import { afterEach, describe, expect, it, vi } from 'vitest';

import { generateHtmlImagesStreaming, type HtmlImageSSEEvent } from '@/api/endpoints';

describe('generateHtmlImagesStreaming', () => {
  afterEach(() => {
    vi.mocked(global.fetch).mockReset();
  });

  it('flushes the final SSE event when the stream ends without a trailing delimiter', async () => {
    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode('data: {"type":"progress","current":1,"total":1}\n\n'),
      encoder.encode('data: {"type":"complete","summary":{"total":1,"success":1,"error":0}}'),
    ];
    let index = 0;

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockImplementation(async () => {
            if (index < chunks.length) {
              return { done: false, value: chunks[index++] };
            }
            return { done: true, value: undefined };
          }),
        }),
      },
    } as unknown as Response);

    const events: HtmlImageSSEEvent[] = [];

    await generateHtmlImagesStreaming(
      'project-1',
      [{ page_id: 'page-1', slot_path: 'hero.image', prompt: 'test prompt' }],
      (event) => {
        events.push(event);
      }
    );

    expect(events).toEqual([
      { type: 'progress', current: 1, total: 1 },
      { type: 'complete', summary: { total: 1, success: 1, error: 0 } },
    ]);
  });
});
