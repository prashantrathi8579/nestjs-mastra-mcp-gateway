/**
 * McpModule — owns every MCP surface hosted by this service.
 *
 * Each surface is a triple of:
 *   - an `MCPServer` provider (e.g. WikipediaMcpServerProvider)
 *   - a NestJS controller at `/mcp/<surface>` (e.g. WikipediaMcpController)
 *   - a tool registry under `./tools/`
 *
 * To add a second surface, add its provider + controller alongside the
 * Wikipedia ones — no other wiring changes.
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '@src/auth/auth.module';
import { WikipediaModule } from '@src/wikipedia/wikipedia.module';

import { WikipediaMcpController } from './wikipedia-mcp.controller';
import { WikipediaMcpServerProvider } from './wikipedia-mcp.provider';

@Module({
  imports: [AuthModule, WikipediaModule],
  providers: [WikipediaMcpServerProvider],
  controllers: [WikipediaMcpController],
})
export class McpModule {}
