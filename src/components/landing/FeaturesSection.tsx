'use client';

import { BarChart2, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const getFeatures = (t: any) => [
  {
    icon: BarChart2,
    tag: t('tag1'),
    title: t('title1'),
    description: t('desc1'),
  },
  {
    icon: TrendingUp,
    tag: t('tag2'),
    title: t('title2'),
    description: t('desc2'),
  },
  {
    icon: Users,
    tag: t('tag3'),
    title: t('title3'),
    description: t('desc3'),
  },
];

export function FeaturesSection() {
  const t = useTranslations('landing.features');
  const features = getFeatures(t);

  return (
    <section id="features" className="py-24 lg:py-32 bg-white dark:bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="border border-endurix-black/12 dark:border-border p-4 sm:p-6 h-full flex flex-col bg-white dark:bg-card hover:border-endurix-black/30 dark:hover:border-white/30 transition-colors duration-300">
                {/* Tag row */}
                <div className="flex items-center gap-2.5 mb-4">
                  <feature.icon
                    className="w-4 h-4 text-endurix-black/60 dark:text-muted-foreground flex-shrink-0"
                    strokeWidth={1.5}
                  />
                  <span
                    className="text-[9px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                  >
                    {feature.tag}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-endurix-black/10 dark:bg-border mb-5" />

                {/* Title */}
                <h3
                  className="text-xl font-bold text-endurix-black dark:text-foreground mb-3 tracking-tight leading-tight"
                  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-endurix-black/55 dark:text-muted-foreground leading-relaxed flex-1">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
