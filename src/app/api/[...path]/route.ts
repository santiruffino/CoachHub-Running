import { NextRequest, NextResponse } from 'next/server';
import { appLogger } from '@/lib/app-logger';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;

async function proxyToV2(request: NextRequest, path: string[]) {
  if (path.length === 0 || path[0] === 'v2') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const legacyPath = `/api/${path.join('/')}`;
  const targetUrl = new URL(`/api/v2/${path.join('/')}`, request.url);
  targetUrl.search = request.nextUrl.search;

  appLogger.info('legacy.api.alias.hit', {
    method: request.method,
    legacyPath,
    targetPath: `${targetUrl.pathname}${targetUrl.search}`,
    userAgent: request.headers.get('user-agent') || 'unknown',
  });

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.delete('host');
  forwardedHeaders.delete('content-length');

  const upstreamResponse = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: forwardedHeaders,
    body: request.body,
    duplex: request.body ? 'half' : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  const headers = new Headers(upstreamResponse.headers);
  headers.set('x-api-alias', 'v2');

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToV2(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToV2(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToV2(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToV2(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToV2(request, path);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyToV2(request, path);
}

export function HEAD() {
  return new NextResponse(null, {
    status: 405,
    headers: {
      Allow: METHODS.join(', '),
    },
  });
}
