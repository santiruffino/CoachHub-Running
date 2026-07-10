import { getTranslations } from 'next-intl/server';
import { getSiteUrl, siteConfig } from '@/lib/seo';

const FAQ_KEYS = [1, 2, 3, 4, 5, 6, 7] as const;

/**
 * JSON-LD structured data for the public landing page. Emits Organization,
 * WebSite, SoftwareApplication and FAQPage schema so search engines can build a
 * rich result (sitelinks search box, brand knowledge panel, app listing, FAQ
 * rich snippet).
 *
 * Server component — renders a plain <script> tag; no client JS shipped. Kept in
 * sync with the questions rendered by FAQSection (landing.faq.q1…q7).
 */
export async function StructuredData() {
  const siteUrl = getSiteUrl();
  const t = await getTranslations('landing.faq');

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: siteConfig.name,
        url: siteUrl,
        logo: `${siteUrl}/web-app-manifest-512x512.png`,
        description: siteConfig.description,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: 'es',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#software`,
        name: siteConfig.name,
        applicationCategory: 'SportsApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: siteConfig.description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${siteUrl}/#faq`,
        mainEntity: FAQ_KEYS.map((n) => ({
          '@type': 'Question',
          name: t(`q${n}`),
          acceptedAnswer: {
            '@type': 'Answer',
            text: t(`a${n}`),
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user-controlled input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
