import { createLogger } from '@/lib/logger';

const runtime = typeof window === 'undefined' ? 'server' : 'client';

const base = createLogger({ runtime });

function toPayload(args: unknown[]): { event: string; metadata?: Record<string, unknown> } {
  if (args.length === 0) {
    return { event: 'log.empty' };
  }

  const [first, ...rest] = args;

  if (typeof first === 'string') {
    if (rest.length === 0) {
      return { event: first };
    }

    if (rest.length === 1 && rest[0] && typeof rest[0] === 'object' && !Array.isArray(rest[0])) {
      return { event: first, metadata: rest[0] as Record<string, unknown> };
    }

    return { event: first, metadata: { args: rest } };
  }

  return {
    event: first instanceof Error ? first.message : 'log.message',
    metadata: { args },
  };
}

export const appLogger = {
  debug: (...args: unknown[]) => {
    const { event, metadata } = toPayload(args);
    base.debug(event, metadata);
  },
  info: (...args: unknown[]) => {
    const { event, metadata } = toPayload(args);
    base.info(event, metadata);
  },
  warn: (...args: unknown[]) => {
    const { event, metadata } = toPayload(args);
    base.warn(event, metadata);
  },
  error: (...args: unknown[]) => {
    const { event, metadata } = toPayload(args);
    base.error(event, metadata);
  },
  log: (...args: unknown[]) => {
    const { event, metadata } = toPayload(args);
    base.info(event, metadata);
  },
};
