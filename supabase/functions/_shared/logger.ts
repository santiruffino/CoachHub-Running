type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN = /authorization|token|secret|password|cookie|apikey|api_key|access_token|refresh_token/i;

function getConfiguredLogLevel(): LogLevel {
  const configured = Deno.env.get('LOG_LEVEL')?.toLowerCase();
  if (configured === 'debug' || configured === 'info' || configured === 'warn' || configured === 'error') {
    return configured;
  }

  return Deno.env.get('DENO_ENV') === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = getConfiguredLogLevel();
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(source)) {
      sanitized[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : sanitizeValue(entry);
    }

    return sanitized;
  }

  return value;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    };
  }

  return { error };
}

function emit(level: LogLevel, event: string, context: LogContext, metadata?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeValue(context) as Record<string, unknown>,
  };

  if (metadata) {
    Object.assign(payload, sanitizeValue(metadata) as Record<string, unknown>);
  }

  if (metadata?.error) {
    Object.assign(payload, serializeError(metadata.error));
  }

  const method = level === 'debug' ? 'debug' : level;
  console[method](JSON.stringify(payload));
}

export function getEdgeRequestId(request: Request): string {
  const inbound = request.headers.get('x-request-id');
  if (inbound && inbound.trim()) return inbound;

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function withRequestIdHeader(headers: HeadersInit, requestId: string): Headers {
  const merged = new Headers(headers);
  merged.set('x-request-id', requestId);
  return merged;
}

export function createEdgeLogger(context: LogContext = {}) {
  return {
    debug: (event: string, metadata?: Record<string, unknown>) => emit('debug', event, context, metadata),
    info: (event: string, metadata?: Record<string, unknown>) => emit('info', event, context, metadata),
    warn: (event: string, metadata?: Record<string, unknown>) => emit('warn', event, context, metadata),
    error: (event: string, metadata?: Record<string, unknown>) => emit('error', event, context, metadata),
    child: (childContext: LogContext) => createEdgeLogger({ ...context, ...childContext }),
  };
}
