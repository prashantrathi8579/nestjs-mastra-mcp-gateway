import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { WikipediaClient } from '@src/wikipedia/wikipedia.client';

const DESCRIPTION = [
  'Notable events, births, deaths, or holidays that occurred on a given',
  'month/day across history. Returns Wikipedia\'s curated "on this day"',
  'feed — each entry has the year, a one-line description, and links to',
  'the relevant articles.',
].join(' ');

const InputSchema = z.object({
  month: z.number().int().min(1).max(12).describe('Month, 1–12.'),
  day: z.number().int().min(1).max(31).describe('Day of month, 1–31.'),
  type: z
    .enum(['all', 'selected', 'events', 'births', 'deaths', 'holidays'])
    .optional()
    .describe('Which slice of the feed to return. Default "selected" (curated highlights).'),
});

export function makeOnThisDayTool(client: WikipediaClient) {
  return createTool({
    id: 'on_this_day',
    description: DESCRIPTION,
    inputSchema: InputSchema,
    execute: async input => {
      const { month, day, type } = input as z.infer<typeof InputSchema>;
      return client.getOnThisDay(month, day, type ?? 'selected');
    },
  });
}
