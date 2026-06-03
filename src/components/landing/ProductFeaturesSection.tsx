'use client';

import { Zap, Dumbbell, BarChart3, Monitor, Trophy, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const getProductFeatures = (t: any) => [
  {
    icon: Zap,
    number: '01',
    title: t('feature1Title'),
    description: t('feature1Desc'),
  },
  {
    icon: BarChart3,
    number: '02',
    title: t('feature2Title'),
    description: t('feature2Desc'),
  },
  {
    icon: Dumbbell,
    number: '03',
    title: t('feature3Title'),
    description: t('feature3Desc'),
  },
  {
    icon: ClipboardList,
    number: '04',
    title: t('feature4Title'),
    description: t('feature4Desc'),
  },
  {
    icon: Trophy,
    number: '05',
    title: t('feature5Title'),
    description: t('feature5Desc'),
  },
  {
    icon: Monitor,
    number: '06',
    title: t('feature6Title'),
    description: t('feature6Desc'),
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const featureItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function ProductFeaturesSection() {
  const t = useTranslations('landing.productFeatures');
  const productFeatures = getProductFeatures(t);

  return (
    <section id="product-features" className="py-24 lg:py-36 bg-endurix-paper dark:bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <span
            className="inline-block text-[10px] text-endurix-black/50 dark:text-muted-foreground tracking-widest mb-4"
            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
          >
            {t('eyebrow')}
          </span>
          <h2
            className="font-bold text-endurix-black dark:text-foreground text-4xl lg:text-5xl xl:text-6xl leading-[1.05] tracking-tight uppercase max-w-2xl"
            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
          >
            {t('title1')}{' '}
            <span className="text-endurix-orange">{t('titleHighlight')}</span>
          </h2>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {productFeatures.map((feature, index) => (
            <motion.div
              key={index}
              variants={featureItemVariants}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.4, ease: 'easeOut', type: 'spring', stiffness: 300, damping: 20 }}
              className="flex flex-col justify-between p-6 border border-endurix-black/12 dark:border-border bg-white dark:bg-card hover:border-endurix-orange/50 dark:hover:border-endurix-orange/50 transition-all duration-300 group cursor-default"
            >
              <div>
                {/* Header row: Icon & Number */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 border border-endurix-black/15 dark:border-border flex items-center justify-center flex-shrink-0 group-hover:border-endurix-orange group-hover:bg-endurix-orange/5 transition-all duration-300">
                    <feature.icon
                      className="w-4 h-4 text-endurix-black/50 dark:text-muted-foreground group-hover:text-endurix-orange transition-colors duration-300"
                      strokeWidth={1.5}
                    />
                  </div>
                  <span
                    className="text-[10px] text-endurix-black/30 dark:text-muted-foreground tracking-widest font-medium"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                  >
                    {feature.number}
                  </span>
                </div>

                {/* Divider */}
                <div className="h-px bg-endurix-black/8 dark:bg-border/60 mb-4" />

                {/* Title */}
                <h3
                  className="font-bold text-endurix-black dark:text-foreground text-base mb-2 leading-tight group-hover:text-endurix-orange transition-colors duration-300"
                  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-endurix-black/55 dark:text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
