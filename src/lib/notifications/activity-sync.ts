import { createNotification } from '@/lib/notifications/create-notification';

export async function notifyActivitySync(userId: string, insertedCount: number, firstActivityId?: string | null): Promise<void> {
  if (insertedCount <= 0) return;

  const isSingular = insertedCount === 1;
  const activityLink = firstActivityId ? `/activities/${firstActivityId}` : '/dashboard';

  await createNotification({
    userId,
    category: 'system',
    title: isSingular ? 'Nueva actividad sincronizada' : `${insertedCount} actividades sincronizadas`,
    body: isSingular
      ? 'Toca para completar el feedback de tu actividad.'
      : 'Toca para completar el feedback de tus actividades sincronizadas.',
    link: activityLink,
  });
}
