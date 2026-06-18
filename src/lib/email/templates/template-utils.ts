import { readFileSync } from 'node:fs';

const templateCache = new Map<string, string>();

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function loadEmailTemplate(fileName: string): string {
  const cached = templateCache.get(fileName);

  if (cached) {
    return cached;
  }

  const template = readFileSync(new URL(`./${fileName}`, import.meta.url), 'utf8');
  templateCache.set(fileName, template);

  return template;
}

export function renderEmailTemplate(
  template: string,
  replacements: Record<string, string>,
): string {
  return Object.entries(replacements).reduce(
    (output, [key, value]) => output.replaceAll(`{{${key}}}`, value),
    template,
  );
}
