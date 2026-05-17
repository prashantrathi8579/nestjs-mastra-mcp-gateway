import { All, Controller, Req, Res, UseGuards } from '@nestjs/common';

import type { Request, Response } from 'express';

import { ApiKeyGuard } from '@src/auth/api-key.guard';
import { UserJwtGuard } from '@src/auth/user-jwt.guard';

import { runWithRequestContext } from './request-context';
import { WikipediaMcpServerProvider } from './wikipedia-mcp.provider';

const MCP_PATH = '/mcp/wikipedia';

/**
 * Single MCP endpoint for the Wikipedia surface. Every HTTP method lands here;
 * the MCP transport decides how to handle it (POST = JSON-RPC call, GET = SSE
 * stream, DELETE = session terminate).
 *
 * Guards run before this handler, so by the time we delegate to MCPServer
 * the caller is authorized (API key — when configured) and identified
 * (Principal — anonymous when AUTH_MODE=none, JWT-derived otherwise).
 */
@Controller('mcp/wikipedia')
@UseGuards(ApiKeyGuard, UserJwtGuard)
export class WikipediaMcpController {
  constructor(private readonly mcp: WikipediaMcpServerProvider) {}

  @All()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const principal = req.principal;
    if (!principal) {
      res.status(401).end();
      return;
    }

    const url = new URL(req.originalUrl, `${req.protocol}://${req.get('host') ?? 'localhost'}`);

    await runWithRequestContext({ principal }, () =>
      this.mcp.server.startHTTP({
        url,
        httpPath: MCP_PATH,
        req,
        res,
        options: { serverless: true },
      })
    );
  }
}
