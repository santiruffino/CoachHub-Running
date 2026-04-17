'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('landing.footer');

  return (
    /* bg-muted closes the page — tonal shift from bg-background CTA above */
    <footer className="bg-muted dark:bg-[#131b23]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded-[0.375rem] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4e6073, #425467)' }}
            >
              <span className="text-white font-bold text-xs font-display">C</span>
            </div>
            <span className="text-foreground font-semibold text-sm font-display tracking-tight">
              COACH HUB
            </span>
          </div>

          {/* Links — tertiary editorial pattern */}
          <div className="flex items-center gap-6">
            {[
              { label: t('privacy'), href: '/privacy' },
              { label: t('terms'), href: '/terms' },
              { label: t('contact'), href: '/contact' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-[0.01em] underline-offset-4 hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-muted-foreground text-xs tracking-[0.01em]">
            {t('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
