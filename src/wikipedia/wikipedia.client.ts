import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import axios, { AxiosError, AxiosInstance } from 'axios';

import { RedisService } from '@src/redis/redis.service';

import type {
  OnThisDayEvent,
  OnThisDayType,
  PageSection,
  PageSummary,
  SearchResult,
} from './types';

const REST_BASE = 'https://en.wikipedia.org/api/rest_v1';
const ACTION_BASE = 'https://en.wikipedia.org/w/api.php';
const USER_AGENT =
  'nestjs-mastra-mcp-gateway/0.1 (+https://github.com/prashant-rathi/nestjs-mastra-mcp-gateway) axios';

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h — Wikipedia content is slow-moving.

/**
 * Thin client over Wikipedia's two public APIs (REST v1 + Action). Both are
 * unauthenticated; politeness is enforced by sending a descriptive
 * User-Agent (Wikipedia's policy) and by caching responses in Redis to
 * avoid hammering the upstream during demos and dev iteration.
 *
 * 404s from the REST API are translated to NotFoundException so MCP tool
 * errors are HTTP-shaped rather than axios-shaped.
 */
@Injectable()
export class WikipediaClient {
  private readonly logger = new Logger(WikipediaClient.name);
  private readonly rest: AxiosInstance;
  private readonly action: AxiosInstance;

  constructor(private readonly redis: RedisService) {
    const headers = { 'User-Agent': USER_AGENT, Accept: 'application/json' };
    this.rest = axios.create({ baseURL: REST_BASE, headers, timeout: 10_000 });
    this.action = axios.create({ baseURL: ACTION_BASE, headers, timeout: 10_000 });
  }

  async search(query: string, limit = 10): Promise<SearchResult[]> {
    return this.cached(`search:${limit}:${query}`, async () => {
      const { data } = await this.action.get('', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          srlimit: limit,
          format: 'json',
          formatversion: 2,
        },
      });
      const hits = (data?.query?.search ?? []) as Array<{
        title: string;
        pageid: number;
        snippet: string;
        size: number;
        wordcount: number;
        timestamp: string;
      }>;
      return hits.map(h => ({
        title: h.title,
        pageId: h.pageid,
        snippet: stripHtml(h.snippet),
        size: h.size,
        wordCount: h.wordcount,
        timestamp: h.timestamp,
      }));
    });
  }

  async getSummary(title: string): Promise<PageSummary> {
    return this.cached(`summary:${title}`, async () => {
      try {
        const { data } = await this.rest.get<PageSummary>(`/page/summary/${encodeWikiTitle(title)}`);
        return data;
      } catch (err) {
        throw translate404(err, `No Wikipedia page named "${title}"`);
      }
    });
  }

  async getSections(title: string): Promise<PageSection[]> {
    return this.cached(`sections:${title}`, async () => {
      const { data } = await this.action.get('', {
        params: {
          action: 'parse',
          page: title,
          prop: 'sections',
          format: 'json',
          formatversion: 2,
          redirects: 1,
        },
      });
      if (data?.error) {
        throw new NotFoundException(`No Wikipedia page named "${title}"`);
      }
      const sections = (data?.parse?.sections ?? []) as Array<{
        toclevel: number;
        line: string;
        anchor: string;
        index: string;
      }>;
      return sections.map(s => ({
        level: s.toclevel,
        line: s.line,
        anchor: s.anchor,
        index: s.index,
      }));
    });
  }

  async getRelated(title: string, limit = 10): Promise<SearchResult[]> {
    // The deprecated REST `/page/related/{title}` endpoint is replaced here
    // by the Action API's `morelike:` search prefix, which is the canonical
    // "find similar pages" mechanism.
    return this.search(`morelike:${title}`, limit);
  }

  async getOnThisDay(month: number, day: number, type: OnThisDayType = 'selected'): Promise<OnThisDayEvent[]> {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return this.cached(`onthisday:${type}:${mm}:${dd}`, async () => {
      try {
        const { data } = await this.rest.get(`/feed/onthisday/${type}/${mm}/${dd}`);
        const events = (data?.[type] ?? data?.events ?? data?.selected ?? []) as Array<{
          text: string;
          year?: number;
          pages?: Array<{
            title: string;
            extract?: string;
            content_urls?: { desktop?: { page?: string } };
          }>;
        }>;
        return events.map(e => ({
          text: e.text,
          year: e.year,
          pages: (e.pages ?? []).map(p => ({
            title: p.title,
            extract: p.extract,
            content_urls: p.content_urls,
          })),
        }));
      } catch (err) {
        throw translate404(err, `No on-this-day data for ${mm}-${dd}`);
      }
    });
  }

  private async cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const fullKey = `wiki:${key}`;
    const client = this.redis.client;

    if (client?.isOpen) {
      try {
        const hit = await client.get(fullKey);
        if (hit) return JSON.parse(hit) as T;
      } catch (err) {
        this.logger.warn(`Cache read failed for ${fullKey}: ${asMessage(err)}`);
      }
    }

    const value = await fetcher();

    if (client?.isOpen) {
      try {
        await client.set(fullKey, JSON.stringify(value), { EX: CACHE_TTL_SECONDS });
      } catch (err) {
        this.logger.warn(`Cache write failed for ${fullKey}: ${asMessage(err)}`);
      }
    }

    return value;
  }
}

function encodeWikiTitle(title: string): string {
  return encodeURIComponent(title.replace(/ /g, '_'));
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

function translate404(err: unknown, message: string): Error {
  if (err instanceof AxiosError && err.response?.status === 404) {
    return new NotFoundException(message);
  }
  return err instanceof Error ? err : new Error(String(err));
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
