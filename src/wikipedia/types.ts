/**
 * Subset of Wikipedia REST/Action API response shapes that this gateway
 * exposes via MCP tools. Modeled tight to what's actually returned, with
 * everything optional we don't depend on left out for clarity.
 */

export interface PageSummary {
  title: string;
  displaytitle?: string;
  description?: string;
  extract: string;
  extract_html?: string;
  thumbnail?: { source: string; width: number; height: number };
  content_urls?: {
    desktop?: { page?: string };
    mobile?: { page?: string };
  };
  type?: string;
  lang?: string;
}

export interface SearchResult {
  title: string;
  pageId: number;
  snippet: string;
  size: number;
  wordCount: number;
  timestamp: string;
}

export interface PageSection {
  level: number;
  line: string;
  anchor: string;
  index: string;
}

export interface OnThisDayEvent {
  text: string;
  year?: number;
  pages: Array<{
    title: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  }>;
}

export type OnThisDayType = 'all' | 'selected' | 'events' | 'births' | 'deaths' | 'holidays';
