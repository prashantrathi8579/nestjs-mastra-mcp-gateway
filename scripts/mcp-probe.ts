/**
 * Local MCP-client probe. Connects to the running gateway over the same
 * Streamable HTTP transport an LLM agent (or another Mastra/MCP client)
 * would use, lists available tools, and optionally calls one.
 *
 * Usage:
 *   MCP_URL='http://localhost:3000/mcp/wikipedia' npx tsx scripts/mcp-probe.ts
 *
 * If the gateway is running with AUTH_MODE=jwt, also export:
 *   MCP_JWT='<bearer token from your IdP>'
 *
 * If MCP_API_KEY is configured on the gateway, also export:
 *   MCP_API_KEY='<your key>'
 *
 * To call a tool:
 *   TOOL=search_wikipedia TOOL_ARGS='{"query":"NestJS","limit":3}' npx tsx scripts/mcp-probe.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const url = requireEnv('MCP_URL');
  const apiKey = process.env.MCP_API_KEY;
  const jwt = process.env.MCP_JWT;

  const headers: Record<string, string> = {};
  if (apiKey) headers['x-api-key'] = apiKey;
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers },
  });

  const client = new Client({ name: 'mcp-probe', version: '0.1.0' }, { capabilities: {} });

  console.log(`Connecting to ${url} …`);
  await client.connect(transport);
  console.log('Connected.\n');

  const listResult = await client.listTools();
  console.log(`Tools (${listResult.tools.length}):`);
  for (const tool of listResult.tools) {
    console.log(`  • ${tool.name}`);
  }
  console.log();

  const toolName = process.env.TOOL;
  if (toolName) {
    const rawArgs = process.env.TOOL_ARGS ?? '{}';
    const args = JSON.parse(rawArgs);
    console.log(`Calling ${toolName} with`, args, '…\n');
    const callResult = await client.callTool({ name: toolName, arguments: args });
    console.log('Result:');
    console.log(JSON.stringify(callResult, null, 2));
  }

  await client.close();
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
