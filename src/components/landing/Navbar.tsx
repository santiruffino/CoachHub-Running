'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations('landing.navbar');

  const NAV_LINKS = [
    { label: t('training'), href: '#features' },
    { label: t('metrics'), href: '#product-features' },
    { label: t('coaching'), href: '#roadmap' },
    { label: t('pricing'), href: '#wishlist' },
  ];

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45 }}
      className="sticky top-0 z-50 bg-white dark:bg-card border-b border-endurix-black/10 dark:border-border shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 group">
            <span
              className="font-bold text-endurix-black dark:text-foreground tracking-widest text-sm uppercase"
              style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
              ENDURIX
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-endurix-black/70 dark:text-muted-foreground hover:text-endurix-black dark:hover:text-foreground text-xs font-semibold tracking-widest transition-colors"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA & Theme/Locale Toggle */}
          <div className="hidden md:flex items-center gap-4">
            <LocaleSwitcher />
            <ThemeToggle />
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-endurix-orange text-white text-xs font-bold tracking-widest px-5 py-2.5 transition-all hover:bg-endurix-orange/90"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
              >
                {t('start')} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile Theme/Locale Toggle & Menu button */}
          <div className="md:hidden flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            <button
              className="text-endurix-black dark:text-foreground p-1"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white dark:bg-card border-t border-endurix-black/10 dark:border-border px-4 pb-4 pt-2 shadow-md"
        >
          <div className="flex flex-col gap-4 mt-2">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="text-endurix-black dark:text-foreground text-xs font-semibold tracking-widest"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-endurix-orange text-white text-xs font-bold tracking-widest px-5 py-2.5 self-start"
              style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
              {t('start')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
