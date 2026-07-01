import { createClient } from '@/lib/supabase/client';
import { appLogger } from '@/lib/app-logger';

type PostgresChangesFilter = {
  event: '*';
  schema: string;
  table: string;
  filter?: string;
};

/**
 * Subscribes to Postgres changes, guarding against environments where the
 * native WebSocket global isn't available (e.g. SSR/build passes, or browsers
 * without WebSocket support). Realtime is a progressive enhancement here —
 * callers already render from an initial fetch, so a failed subscription
 * should never crash the component, just skip live updates.
 *
 * Returns a cleanup function safe to call unconditionally on unmount.
 */
export function subscribeToTableChanges(
  channelName: string,
  filter: PostgresChangesFilter,
  onChange: () => void
): () => void {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    return () => {};
  }

  try {
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', filter, onChange)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  } catch (error) {
    // Non-fatal: realtime is a progressive enhancement, callers already render
    // from an initial fetch. Warn (not error) since this is an expected,
    // handled condition in environments where WebSocket connections are blocked.
    appLogger.warn(`Realtime unavailable for channel "${channelName}"`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return () => {};
  }
}
