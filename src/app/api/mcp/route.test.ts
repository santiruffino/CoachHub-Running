import { describe, expect, it, vi } from 'vitest';

const mockHandleRequest = vi.hoisted(() => vi.fn(async () => new Response('ok')));
const mockConnect = vi.hoisted(() => vi.fn(async () => undefined));
const mockRequireAuth = vi.hoisted(() => vi.fn(async () => ({
  response: null,
  user: { id: 'user-123' },
})));
const mockBuildRateLimitKey = vi.hoisted(() => vi.fn(() => 'rate-limit-key'));
const mockConsumeRateLimit = vi.hoisted(() => vi.fn(async () => ({
  allowed: true,
  limit: 30,
  remaining: 29,
  resetAt: Date.now() + 60_000,
  retryAfterSeconds: 60,
})));
const mockGetClientIpFromHeaders = vi.hoisted(() => vi.fn(() => '127.0.0.1'));

vi.mock('@/lib/mcp/server', () => ({
  mcpServer: {
    connect: mockConnect,
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js', () => ({
  WebStandardStreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
    handleRequest: mockHandleRequest,
  })),
}));

vi.mock('@/lib/supabase/api-helpers', () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock('@/lib/api/rate-limit', () => ({
  buildRateLimitKey: mockBuildRateLimitKey,
  consumeRateLimit: mockConsumeRateLimit,
  getClientIpFromHeaders: mockGetClientIpFromHeaders,
}));

vi.mock('@/lib/api/error-response', () => ({
  apiError: vi.fn((code: string) => ({ code })),
}));

import { DELETE, GET, POST } from './route';

describe('MCP route', () => {
  it('handles GET, POST, and DELETE through the shared transport', async () => {
    const request = new Request('http://localhost/api/mcp', { method: 'DELETE' }) as Parameters<
      typeof GET
    >[0];

    await GET(request);
    await POST(request);
    const response = await DELETE(request);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockHandleRequest).toHaveBeenCalledTimes(3);
  });
});
