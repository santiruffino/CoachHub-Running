import { createNotification } from '@/lib/notifications/create-notification';

export async function notifyActivitySync(userId: string, insertedCount: number): Promise<void> {
  if (insertedCount <= 0) return;

  const isSingular = insertedCount === 1;

  await createNotification({
    userId,
    category: 'system',
    title: isSingular ? 'Nueva actividad sincronizada' : `${insertedCount} actividades sincronizadas`,
    body: isSingular
      ? 'Ya puedes abrir Endurix para dejar feedback.'
      : 'Ya puedes abrir Endurix para dejar feedback de tus actividades.',
    link: '/dashboard',
  });
}
