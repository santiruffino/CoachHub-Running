'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function Navbar() {
  const t = useTranslations('landing.navbar');

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-[20px] border-b border-border/15"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[0.375rem] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4e6073, #425467)' }}
            >
              <span className="text-white font-bold text-base font-display">C</span>
            </div>
            <span className="text-foreground font-semibold text-base tracking-tight font-display">
              COACH HUB
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: t('features'), href: '#features' },
              { label: t('roadmap'), href: '#roadmap' },
              { label: t('pricing'), href: '#pricing' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors text-sm tracking-[0.01em]"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-primary text-sm underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all hidden md:block tracking-[0.01em]"
            >
              {t('login')}
            </Link>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/login"
                className="inline-flex items-center h-9 px-5 rounded-[0.375rem] text-sm font-medium text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #4e6073, #425467)' }}
              >
                {t('startFreeTrial')}
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
