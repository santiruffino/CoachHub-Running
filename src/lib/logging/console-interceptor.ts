type ConsoleMethod = 'debug' | 'info' | 'warn' | 'error' | 'log';

type InterceptorOptions = {
  runtime: 'client' | 'server' | 'edge';
  onError?: (error: unknown, context: { runtime: string; method: ConsoleMethod }) => void;
};

type InterceptableConsole = Pick<Console, ConsoleMethod>;

const MARK = '__coach_hub_console_intercepted__';

function isErrorLike(value: unknown): value is Error {
  return value instanceof Error;
}

function argsToError(args: unknown[]): unknown {
  const found = args.find((arg) => isErrorLike(arg));
  if (found) {
    return found;
  }

  const text = args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ')
    .trim();

  return text.length > 0 ? new Error(text) : new Error('console.error called');
}

export function initConsoleInterceptor(options: InterceptorOptions) {
  const globalObject = globalThis as typeof globalThis & { [MARK]?: boolean };
  if (globalObject[MARK]) {
    return;
  }

  globalObject[MARK] = true;

  const methods: ConsoleMethod[] = ['debug', 'info', 'warn', 'error', 'log'];
  const original: InterceptableConsole = {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    log: console.log.bind(console),
  };

  let handlingError = false;

  for (const method of methods) {
    console[method] = (...args: unknown[]) => {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${options.runtime}] [${method}]`;
      original[method](prefix, ...args);

      if (method === 'error' && options.onError && !handlingError) {
        try {
          handlingError = true;
          options.onError(argsToError(args), { runtime: options.runtime, method });
        } finally {
          handlingError = false;
        }
      }
    };
  }
}
