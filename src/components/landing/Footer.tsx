'use client';

import Link from 'next/link';
import { ChevronsRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('landing.footer');
  const currentYear = new Date().getFullYear();

  const FOOTER_LINKS = [
    { label: t('privacy'), href: '/privacy' },
  ];

  return (
    <footer className="bg-endurix-dark dark:bg-background border-t border-white/8 dark:border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5">
            <ChevronsRight
              className="w-5 h-5 text-endurix-orange"
              strokeWidth={3}
            />
            <span
              className="font-bold text-endurix-orange tracking-widest text-sm uppercase"
              style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
              ENDURIX
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center flex-wrap justify-center gap-6">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/35 hover:text-white/70 transition-colors text-[10px] tracking-widest"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Copyright */}
          <p
            className="text-white/30 text-[10px] tracking-wider text-center md:text-right"
            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
          >
            {t('copyright', { year: currentYear })}
          </p>
        </div>
      </div>
    </footer>
  );
}
