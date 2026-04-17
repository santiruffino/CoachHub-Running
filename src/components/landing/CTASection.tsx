'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function CTASection() {
  const t = useTranslations('landing.cta');

  const stats = [
    { value: t('stat1Value'), label: t('stat1Label') },
    { value: t('stat2Value'), label: t('stat2Label') },
    { value: t('stat3Value'), label: t('stat3Label') },
    { value: t('stat4Value'), label: t('stat4Label') },
  ];

  return (
    <section id="pricing" className="bg-background dark:bg-[#0a0f14]">
      {/* Main CTA — generous spacing */}
      <div className="py-24 lg:py-40 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-10"
        >
          <div className="space-y-5">
            <p className="text-xs text-primary font-semibold uppercase tracking-[0.05em]">
              {t('eyebrow')}
            </p>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground tracking-[-0.02em]">
              {t('title1')}{' '}
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-primary"
              >
                {t('titleHighlight')}
              </motion.span>
            </h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg text-muted-foreground tracking-[0.01em] max-w-xl mx-auto"
            >
              {t('subtitle')}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/login"
                className="inline-flex items-center justify-center h-12 px-10 rounded-[0.375rem] font-medium text-white text-sm transition-all shadow-[0_4px_12px_rgba(78,96,115,0.25)] hover:shadow-[0_6px_20px_rgba(78,96,115,0.35)]"
                style={{ background: 'linear-gradient(135deg, #4e6073, #425467)' }}
              >
                {t('startTrial')}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="#pricing"
                className="inline-flex items-center justify-center h-12 px-10 rounded-[0.375rem] font-medium text-secondary-foreground text-sm bg-secondary hover:bg-secondary/80 transition-all"
              >
                {t('viewPricing')}
              </Link>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-[10px] text-muted-foreground uppercase tracking-[0.05em]"
          >
            {t('noCreditCard')}
          </motion.p>
        </motion.div>
      </div>

      {/* Stats — tonal band instead of border (No-Line rule) */}
      <div className="bg-muted dark:bg-[#131b23] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <p className="font-display text-3xl lg:text-4xl font-bold text-foreground tracking-[-0.02em] mb-1.5">
                  {stat.value}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.05em]">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
