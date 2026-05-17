import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { WikipediaClient } from '@src/wikipedia/wikipedia.client';

const DESCRIPTION = [
  'Outline of a Wikipedia page — the table of contents, as an ordered list of',
  'section headings with their nesting level. Useful when you need to see what',
  'topics a long article covers before deciding which area to dig into.',
].join(' ');

const InputSchema = z.object({
  title: z.string().min(1).describe('Canonical Wikipedia page title.'),
});

export function makeGetPageSectionsTool(client: WikipediaClient) {
  return createTool({
    id: 'get_page_sections',
    description: DESCRIPTION,
    inputSchema: InputSchema,
    execute: async input => {
      const { title } = input as z.infer<typeof InputSchema>;
      return client.getSections(title);
    },
  });
}
