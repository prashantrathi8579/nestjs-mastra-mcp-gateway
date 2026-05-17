import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { WikipediaClient } from '@src/wikipedia/wikipedia.client';

const DESCRIPTION = [
  'Full-text search across Wikipedia article titles and content.',
  'Returns the top matches with a snippet of the matching text.',
  'Use this when the user asks an open-ended question and you need to find',
  'the relevant article(s) before fetching details.',
].join(' ');

const InputSchema = z.object({
  query: z.string().min(1).describe('Search query (any natural-language string).'),
  limit: z.number().int().min(1).max(50).optional().describe('Max results to return. Default 10.'),
});

export function makeSearchWikipediaTool(client: WikipediaClient) {
  return createTool({
    id: 'search_wikipedia',
    description: DESCRIPTION,
    inputSchema: InputSchema,
    execute: async input => {
      const { query, limit } = input as z.infer<typeof InputSchema>;
      return client.search(query, limit);
    },
  });
}
