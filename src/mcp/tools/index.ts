import type { ToolsInput } from '@mastra/core/agent';

import { WikipediaClient } from '@src/wikipedia/wikipedia.client';

import { makeGetPageSectionsTool } from './get-page-sections.tool';
import { makeGetPageSummaryTool } from './get-page-summary.tool';
import { makeGetRelatedPagesTool } from './get-related-pages.tool';
import { makeOnThisDayTool } from './on-this-day.tool';
import { makeSearchWikipediaTool } from './search-wikipedia.tool';

/**
 * Builds the Wikipedia tool set registered on the MCPServer. Each tool is a
 * thin Mastra `createTool` wrapper over a method on `WikipediaClient`. Pure
 * I/O at this layer — auth/principal extraction (when needed) lives in the
 * tool itself, via `getPrincipalOrThrow()` from `../request-context`.
 */
export function buildWikipediaTools(client: WikipediaClient): ToolsInput {
  return {
    search_wikipedia: makeSearchWikipediaTool(client),
    get_page_summary: makeGetPageSummaryTool(client),
    get_page_sections: makeGetPageSectionsTool(client),
    get_related_pages: makeGetRelatedPagesTool(client),
    on_this_day: makeOnThisDayTool(client),
  };
}
