import webpush from 'web-push';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { appLogger } from '@/lib/app-logger';

export type NotificationCategory =
  | 'chat_message'
  | 'workout_assigned'
  | 'race_reminder'
  | 'system'
  | 'rpe_mismatch'
  | 'low_compliance'
  | 'training_load';

export interface CreateNotificationInput {
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string | null;
  link?: string | null;
}

type NotificationFrequency = 'immediate' | 'daily' | 'weekly';

interface PreferenceRow {
  in_app_enabled: boolean;
  push_enabled: boolean;
  frequency: NotificationFrequency;
}

const DEFAULT_PREFERENCE: PreferenceRow = { in_app_enabled: true, push_enabled: true, frequency: 'immediate' };

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@endurix.app';

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export async function sendPushToUser(userId: string, payload: { title: string; body?: string | null; link?: string | null }) {
  const vapid = getVapidConfig();
  if (!vapid) return;

  const serviceSupabase = createServiceRoleClient();
  const { data: subscriptions } = await serviceSupabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subscriptions || subscriptions.length === 0) return;

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  const payloadJson = JSON.stringify({
    title: payload.title,
    body: payload.body || '',
    link: payload.link || '/dashboard',
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payloadJson
        );
      } catch (error: unknown) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await serviceSupabase.from('push_subscriptions').delete().eq('id', subscription.id);
        } else {
          appLogger.error('Failed to send web push notification:', error);
        }
      }
    })
  );
}

/**
 * Single entry point for every notification producer (chat, workout assignment, etc).
 * Respects per-category, per-channel user preferences (defaulting to enabled when unset)
 * and fans out to in-app storage and Web Push as applicable. Never throws — failures are
 * logged so a notification side-effect can't break the primary action (e.g. sending a chat message).
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const serviceSupabase = createServiceRoleClient();

  try {
    const { data: preference } = await serviceSupabase
      .from('notification_preferences')
      .select('in_app_enabled, push_enabled, frequency')
      .eq('user_id', input.userId)
      .eq('category', input.category)
      .maybeSingle();

    const effective: PreferenceRow = preference || DEFAULT_PREFERENCE;

    // Digest batching (daily/weekly) only applies when the in-app row exists to track via
    // push_sent_at. If in-app is disabled there is nothing for the digest cron to pick up,
    // so push is sent immediately regardless of frequency in that case.
    const deferPush = effective.in_app_enabled && effective.push_enabled && effective.frequency !== 'immediate';
    const sendPushNow = effective.push_enabled && !deferPush;

    if (effective.in_app_enabled) {
      const { error } = await serviceSupabase.from('notifications').insert({
        user_id: input.userId,
        type: input.category,
        title: input.title,
        body: input.body || null,
        link: input.link || null,
        push_sent_at: sendPushNow ? new Date().toISOString() : null,
      });

      if (error) {
        appLogger.error('Failed to create in-app notification:', error);
      }
    }

    if (sendPushNow) {
      await sendPushToUser(input.userId, { title: input.title, body: input.body, link: input.link });
    }
  } catch (error) {
    appLogger.error('createNotification failed:', error);
  }
}
