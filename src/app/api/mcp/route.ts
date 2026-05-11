import { mcpServer } from "@/lib/mcp/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Integrated MCP Server API Route
 * Handles SSE connections and MCP messages using Web Standard Transport.
 */

// Module-level transport to maintain session state in the same server process
let transport: WebStandardStreamableHTTPServerTransport | null = null;

async function getTransport() {
  if (!transport) {
    transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID()
    });
    await mcpServer.connect(transport);
  }
  return transport;
}

export async function GET(request: NextRequest) {
  const t = await getTransport();
  return await t.handleRequest(request);
}

export async function POST(request: NextRequest) {
  const t = await getTransport();
  return await t.handleRequest(request);
}
