import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { WikipediaClient } from '@src/wikipedia/wikipedia.client';

const DESCRIPTION = [
  'Find Wikipedia pages similar to a given article — useful for "related',
  'reading" or to broaden context after a focused lookup. Implemented via',
  'the Action API\'s `morelike:` search prefix.',
].join(' ');

const InputSchema = z.object({
  title: z.string().min(1).describe('Canonical Wikipedia page title to find related articles for.'),
  limit: z.number().int().min(1).max(50).optional().describe('Max related results to return. Default 10.'),
});

export function makeGetRelatedPagesTool(client: WikipediaClient) {
  return createTool({
    id: 'get_related_pages',
    description: DESCRIPTION,
    inputSchema: InputSchema,
    execute: async input => {
      const { title, limit } = input as z.infer<typeof InputSchema>;
      return client.getRelated(title, limit);
    },
  });
}
