'use client';

import { Watch, ShieldCheck, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export function RoadmapSection() {
  const t = useTranslations('landing.roadmap');

  const roadmapItems = [
    {
      icon: Watch,
      title: t('item1Title'),
      description: t('item1Desc'),
      status: t('item1Status'),
      statusType: 'active' as const,
    },
    {
      icon: ShieldCheck,
      title: t('item2Title'),
      description: t('item2Desc'),
      status: t('item2Status'),
      statusType: 'active' as const,
    },
    {
      icon: Smartphone,
      title: t('item3Title'),
      description: t('item3Desc'),
      status: t('item3Status'),
      statusType: 'future' as const,
    },
  ];

  return (
    /* Tonal shift back to muted — No-Line alternation */
    <section id="roadmap" className="py-24 lg:py-36 bg-muted dark:bg-[#131b23]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header — left-aligned (asymmetry principle) */}
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
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground tracking-[-0.02em] max-w-2xl">
            {t('title')}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {roadmapItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              whileHover={{ y: -6 }}
            >
              <div
                className="bg-card dark:bg-[#1a232c] rounded-xl p-8 h-full transition-shadow duration-300 hover:shadow-[0_20px_40px_rgba(43,52,55,0.08)]"
                style={{
                  boxShadow: '0 4px 16px rgba(43, 52, 55, 0.05)',
                  border: '1px solid rgba(171, 179, 183, 0.15)',
                }}
              >
                {/* Icon — left aligned, not centered (asymmetry) */}
                <div className="w-12 h-12 bg-accent dark:bg-[#0a0f14] rounded-lg flex items-center justify-center mb-6">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>

                {/* Status badge */}
                <div className="mb-4">
                  {item.statusType === 'active' ? (
                    <span className="bg-accent text-primary text-[10px] font-semibold uppercase tracking-[0.05em] px-2 py-1 rounded">
                      {item.status}
                    </span>
                  ) : (
                    <span className="bg-muted dark:bg-[#0a0f14] text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.05em] px-2 py-1 rounded">
                      {item.status}
                    </span>
                  )}
                </div>

                <h3 className="font-display text-xl font-semibold text-foreground mb-3 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed tracking-[0.01em] text-sm">
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
