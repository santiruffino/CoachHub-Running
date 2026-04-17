'use client';

import { FileSpreadsheet, AudioWaveform, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function FeaturesSection() {
  const t = useTranslations('landing.features');

  const features = [
    {
      icon: FileSpreadsheet,
      title: t('card1Title'),
      description: t('card1Desc'),
    },
    {
      icon: AudioWaveform,
      title: t('card2Title'),
      description: t('card2Desc'),
    },
    {
      icon: MessageCircle,
      title: t('card3Title'),
      description: t('card3Desc'),
    },
  ];

  return (
    /* Tonal background shift — No-Line rule */
    <section id="features" className="py-24 lg:py-36 bg-muted dark:bg-[#131b23]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-20"
        >
          <p className="text-xs text-primary font-semibold uppercase tracking-[0.05em] mb-3">
            {t('eyebrow')}
          </p>
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground tracking-[-0.02em] max-w-xl">
            {t('title')}
          </h2>
        </motion.div>

        {/* Feature cards — "soft lift" layering: white cards on off-white bg */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -6 }}
            >
              <div
                className="bg-card dark:bg-[#1a232c] rounded-xl p-8 h-full transition-shadow duration-300 hover:shadow-[0_20px_40px_rgba(43,52,55,0.08)]"
                style={{
                  boxShadow: '0 4px 16px rgba(43, 52, 55, 0.05)',
                  border: '1px solid rgba(171, 179, 183, 0.15)',
                }}
              >
                {/* Icon badge */}
                <div className="w-12 h-12 bg-accent dark:bg-[#0a0f14] rounded-lg flex items-center justify-center mb-7">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>

                {/* Card number — editorial detail */}
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.05em] mb-2">
                  0{index + 1}
                </p>

                <h3 className="font-display text-xl font-semibold text-foreground mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed tracking-[0.01em] text-sm">
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
