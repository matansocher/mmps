import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { env } from 'node:process';
import { Logger } from '@core/utils';







const logger = new Logger('github-mcp-client');

let client: Client | null = null;
let transport: StdioClientTransport | null = null;
let connected = false;

export async function connectGithubMcp(): Promise<void> {
  if (connected && client) {
    return;
  }

  try {
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { ...env, GITHUB_PERSONAL_ACCESS_TOKEN: env.GITHUB_PERSONAL_ACCESS_TOKEN || '' },
    });

    client = new Client({ name: 'chatbot-github-mcp', version: '1.0.0' }, { capabilities: {} });

    await client.connect(transport);
    connected = true;

    logger.log('[GitHub MCP] Connected to GitHub MCP server');
  } catch (err) {
    logger.error(`[GitHub MCP] Failed to connect: ${err}`);
    connected = false;
    throw err;
  }
}

export async function disconnectGithubMcp(): Promise<void> {
  if (client) {
    try {
      await client.close();
      logger.log('[GitHub MCP] Disconnected from GitHub MCP server');
    } catch (err) {
      logger.error(`[GitHub MCP] Error disconnecting: ${err}`);
    }
  }
  client = null;
  transport = null;
  connected = false;
}

export async function callGithubMcpTool(name: string, args: Record<string, any>): Promise<any> {
  if (!connected || !client) {
    await connectGithubMcp();
  }

  if (!client) {
    throw new Error('GitHub MCP client is not connected');
  }

  try {
    logger.log(`[GitHub MCP] Calling tool: ${name} with args: ${JSON.stringify(args, null, 2)}`);
    const result = await client.callTool({ name, arguments: args });
    logger.log(`[GitHub MCP] Tool ${name} succeeded`);
    return result;
  } catch (error: any) {
    logger.error(`[GitHub MCP] Tool ${name} failed: ${error}`);
    throw new Error(`GitHub MCP tool ${name} failed: ${error.message || error}`);
  }
}

export function isGithubMcpConnected(): boolean {
  return connected;
}
