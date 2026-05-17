import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { WikipediaClient } from '@src/wikipedia/wikipedia.client';

const DESCRIPTION = [
  "Concise summary of a Wikipedia page: a short description and a multi-sentence",
  'plain-text extract (intro), plus a thumbnail and canonical URL when available.',
  'Use this after `search_wikipedia` to fetch the lead content for a specific',
  'article. The title must match the canonical Wikipedia title (case-sensitive,',
  'spaces or underscores both accepted).',
].join(' ');

const InputSchema = z.object({
  title: z.string().min(1).describe('Canonical Wikipedia page title (e.g. "Model_Context_Protocol").'),
});

export function makeGetPageSummaryTool(client: WikipediaClient) {
  return createTool({
    id: 'get_page_summary',
    description: DESCRIPTION,
    inputSchema: InputSchema,
    execute: async input => {
      const { title } = input as z.infer<typeof InputSchema>;
      return client.getSummary(title);
    },
  });
}
