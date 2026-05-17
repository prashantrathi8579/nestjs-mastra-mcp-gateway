import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { MCPServer } from '@mastra/mcp';

import { WikipediaClient } from '@src/wikipedia/wikipedia.client';

import { buildWikipediaTools } from './tools';

const MCP_SERVER_NAME = 'wikipedia-mcp';
const MCP_SERVER_VERSION = '0.1.0';

/**
 * Holds the singleton `MCPServer` for the Wikipedia surface. Tools are
 * registered once at module init; principal/request context is threaded
 * per-request via AsyncLocalStorage (see request-context.ts), not via
 * Mastra tool args.
 */
@Injectable()
export class WikipediaMcpServerProvider implements OnModuleInit {
  private readonly logger = new Logger(WikipediaMcpServerProvider.name);
  private _server!: MCPServer;

  constructor(private readonly client: WikipediaClient) {}

  onModuleInit(): void {
    this._server = new MCPServer({
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      tools: buildWikipediaTools(this.client),
    });
    this.logger.log(`MCP server initialised: ${MCP_SERVER_NAME} v${MCP_SERVER_VERSION}`);
  }

  get server(): MCPServer {
    return this._server;
  }
}
