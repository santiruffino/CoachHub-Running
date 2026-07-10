/**
 * SEO helpers shared across metadata, robots, sitemap and structured data.
 *
 * The canonical site origin. Prefers the browser-exposed app URL, falls back to
 * the server-side one, and finally to the production domain. Trailing slash is
 * stripped so callers can safely template `${getSiteUrl()}/path`.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://endurix.app';
  return raw.replace(/\/$/, '');
}

/** Brand / product constants reused in metadata and JSON-LD. */
export const siteConfig = {
  name: 'Endurix',
  title: 'Endurix — Plataforma para entrenadores y atletas de resistencia',
  description:
    'Plataforma de coaching todo-en-uno para running: planifica entrenamientos, monitorea la carga, sincroniza Strava y Garmin, y convierte los datos en decisiones.',
  keywords: [
    'entrenador de running',
    'plataforma de coaching',
    'planes de entrenamiento',
    'análisis de carga de entrenamiento',
    'training load',
    'Strava',
    'Garmin',
    'atletas de resistencia',
    'coaching deportivo',
    'entrenamiento de running',
  ],
  locale: 'es_ES',
} as const;
