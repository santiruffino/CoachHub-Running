import { mcpServer } from "@/lib/mcp/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-helpers";
import { buildRateLimitKey, consumeRateLimit, getClientIpFromHeaders } from "@/lib/api/rate-limit";
import { apiError } from "@/lib/api/error-response";

export const dynamic = 'force-dynamic';

/**
 * Integrated MCP Server API Route
 * Handles SSE connections and MCP messages using Web Standard Transport.
 * Requires authentication and applies rate limiting.
 */

// Module-level transport to maintain session state in the same server process
let transport: WebStandardStreamableHTTPServerTransport | null = null;

const MCP_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MCP_RATE_LIMIT_MAX_REQUESTS = 30;

async function getTransport() {
  if (!transport) {
    transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID()
    });
    await mcpServer.connect(transport);
  }
  return transport;
}

async function checkAuthAndRateLimit(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (authResult.response) {
    return { response: authResult.response, userId: null };
  }

  const clientIp = getClientIpFromHeaders(request.headers);
  const userId = authResult.user!.id;
  const rateLimitKey = buildRateLimitKey('/api/mcp', clientIp, userId);
  const rateLimit = consumeRateLimit({
    key: rateLimitKey,
    limit: MCP_RATE_LIMIT_MAX_REQUESTS,
    windowMs: MCP_RATE_LIMIT_WINDOW_MS,
  });

  if (!rateLimit.allowed) {
    const headers = new Headers();
    headers.set('x-ratelimit-limit', String(rateLimit.limit));
    headers.set('x-ratelimit-remaining', String(rateLimit.remaining));
    headers.set('x-ratelimit-reset', String(Math.floor(rateLimit.resetAt / 1000)));
    headers.set('retry-after', String(rateLimit.retryAfterSeconds));
    
    return {
      response: NextResponse.json(apiError('RATE_LIMIT_EXCEEDED'), {
        status: 429,
        headers,
      }),
      userId: null,
    };
  }

  return { response: null, userId };
}

export async function GET(request: NextRequest) {
  const check = await checkAuthAndRateLimit(request);
  if (check.response) {
    return check.response;
  }

  const t = await getTransport();
  return await t.handleRequest(request);
}

export async function POST(request: NextRequest) {
  const check = await checkAuthAndRateLimit(request);
  if (check.response) {
    return check.response;
  }

  const t = await getTransport();
  return await t.handleRequest(request);
}

export async function DELETE(request: NextRequest) {
  const check = await checkAuthAndRateLimit(request);
  if (check.response) {
    return check.response;
  }

  const t = await getTransport();
  return await t.handleRequest(request);
}
