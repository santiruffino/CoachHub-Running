'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { BellRing, Bot, ShieldCheck } from 'lucide-react';

type TranslateFn = (key: string) => string;

const getItems = (t: TranslateFn) => [
  {
    icon: Bot,
    tag: t('card1Tag'),
    title: t('card1Title'),
    description: t('card1Desc'),
  },
  {
    icon: ShieldCheck,
    tag: t('card2Tag'),
    title: t('card2Title'),
    description: t('card2Desc'),
  },
  {
    icon: BellRing,
    tag: t('card3Tag'),
    title: t('card3Title'),
    description: t('card3Desc'),
  },
];

export function CoachOpsSection() {
  const t = useTranslations('landing.coachOps');
  const items = getItems(t);

  return (
    <section id="coach-ops" className="py-24 lg:py-36 bg-white dark:bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-16 max-w-3xl"
        >
          <span
            className="inline-block text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest mb-4"
            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
          >
            {t('eyebrow')}
          </span>
          <h2
            className="font-bold text-endurix-black dark:text-foreground text-4xl lg:text-5xl xl:text-6xl leading-[1.05] tracking-tight uppercase"
            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
          >
            {t('headline1')}
            <br />
            <span className="text-endurix-orange">{t('headline2')}</span>
          </h2>
          <p className="mt-6 text-endurix-black/60 dark:text-muted-foreground text-base leading-relaxed max-w-2xl">
            {t('subtitle')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="border border-endurix-black/12 dark:border-border p-6 h-full flex flex-col bg-white dark:bg-card hover:border-endurix-orange/40 transition-colors duration-300">
                <div className="flex items-center gap-2.5 mb-4">
                  <item.icon
                    className="w-4 h-4 text-endurix-black/60 dark:text-muted-foreground flex-shrink-0"
                    strokeWidth={1.5}
                  />
                  <span
                    className="text-[9px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                  >
                    {item.tag}
                  </span>
                </div>

                <div className="h-px bg-endurix-black/10 dark:bg-border mb-5" />

                <h3
                  className="text-xl font-bold text-endurix-black dark:text-foreground mb-3 tracking-tight leading-tight"
                  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                  {item.title}
                </h3>

                <p className="text-sm text-endurix-black/55 dark:text-muted-foreground leading-relaxed flex-1">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
