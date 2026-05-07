type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogValue = string | number | boolean | null | undefined | Record<string, unknown> | unknown[];

interface LogContext {
  requestId?: string;
  route?: string;
  userId?: string;
  [key: string]: LogValue;
}

interface Logger {
  debug: (event: string, metadata?: Record<string, unknown>) => void;
  info: (event: string, metadata?: Record<string, unknown>) => void;
  warn: (event: string, metadata?: Record<string, unknown>) => void;
  error: (event: string, metadata?: Record<string, unknown>) => void;
  child: (context: LogContext) => Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY_PATTERN = /authorization|token|secret|password|cookie|apikey|api_key|access_token|refresh_token/i;

function getConfiguredLogLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.toLowerCase();

  if (configured === 'debug' || configured === 'info' || configured === 'warn' || configured === 'error') {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = getConfiguredLogLevel();
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
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

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, entryValue] of Object.entries(record)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(entryValue);
      }
    }

    return sanitized;
  }

  return value;
}

function writeLog(level: LogLevel, payload: Record<string, unknown>) {
  const method = level === 'debug' ? 'debug' : level;
  const target = console[method as 'debug' | 'info' | 'warn' | 'error'];
  target(JSON.stringify(payload));
}

function emit(level: LogLevel, event: string, context: LogContext, metadata?: Record<string, unknown>) {
  if (!shouldLog(level)) {
    return;
  }

  const preparedMetadata = metadata ? sanitizeValue(metadata) : undefined;
  const base: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitizeValue(context) as Record<string, unknown>,
  };

  if (preparedMetadata) {
    Object.assign(base, preparedMetadata as Record<string, unknown>);
  }

  if (metadata?.error) {
    Object.assign(base, serializeError(metadata.error));
  }

  writeLog(level, base);
}

export function createLogger(context: LogContext = {}): Logger {
  return {
    debug: (event, metadata) => emit('debug', event, context, metadata),
    info: (event, metadata) => emit('info', event, context, metadata),
    warn: (event, metadata) => emit('warn', event, context, metadata),
    error: (event, metadata) => emit('error', event, context, metadata),
    child: (childContext) => createLogger({ ...context, ...childContext }),
  };
}

export function getRequestId(request: Request): string {
  const inbound = request.headers.get('x-request-id');
  if (inbound && inbound.trim().length > 0) {
    return inbound;
  }

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function withRequestId(init: ResponseInit | undefined, requestId: string): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set('x-request-id', requestId);

  return {
    ...init,
    headers,
  };
}

export function createRequestLogger(route: string, request: Request, context: LogContext = {}) {
  const requestId = getRequestId(request);
  const logger = createLogger({ route, requestId, ...context });

  return { requestId, logger };
}
