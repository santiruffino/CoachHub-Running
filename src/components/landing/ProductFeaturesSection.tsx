'use client';

import { useEffect, useState } from 'react';
import { LineChart, Dumbbell, Sliders, RefreshCw } from 'lucide-react';
import { Line, LineChart as RechartsLineChart, ResponsiveContainer, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const lineChartData = Array.from({ length: 20 }, (_, i) => ({
  value: Math.sin(i / 3) * 20 + 50 + (i % 3) * 3,
}));

export function ProductFeaturesSection() {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('landing.productFeatures');

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const productFeatures = [
    {
      icon: LineChart,
      title: t('feature1Title'),
      description: t('feature1Desc'),
    },
    {
      icon: Dumbbell,
      title: t('feature2Title'),
      description: t('feature2Desc'),
    },
    {
      icon: Sliders,
      title: t('feature3Title'),
      description: t('feature3Desc'),
    },
    {
      icon: RefreshCw,
      title: t('feature4Title'),
      description: t('feature4Desc'),
    },
  ];

  return (
    /* bg-background alternates with the muted FeaturesSection — No-Line */
    <section className="py-24 lg:py-36 bg-background dark:bg-[#0a0f14]">
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
          <h2 className="font-display text-4xl lg:text-5xl font-bold text-foreground tracking-[-0.02em] max-w-2xl">
            {t('title1')}{' '}
            <span className="text-primary">{t('titleHighlight')}</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Feature list (asymmetrical: large space between items) */}
          <div className="space-y-10">
            {productFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ x: 4 }}
                className="flex gap-6 group"
              >
                {/* Thin progress-ring style icon badge */}
                <div className="w-11 h-11 bg-accent dark:bg-[#131b23] rounded-lg flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-accent/70">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="pt-0.5">
                  <h3 className="font-display text-base font-semibold text-foreground mb-1.5 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed tracking-[0.01em]">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right — Analytics card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div
              className="rounded-xl overflow-hidden bg-card dark:bg-[#1a232c]"
              style={{
                boxShadow: '0 20px 40px rgba(43, 52, 55, 0.07)',
                border: '1px solid rgba(171, 179, 183, 0.15)',
              }}
            >
              <div className="p-6 space-y-6">
                {/* Card header */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.05em] mb-1">
                    {t('weekLabel')}
                  </p>
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    {t('formTrending')}
                  </h3>
                </div>

                {/* Line chart */}
                <div className="h-44">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={lineChartData}>
                        <YAxis hide />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#4e6073"
                          strokeWidth={2}
                          dot={false}
                          strokeLinecap="round"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Stats — tonal bg shift instead of border */}
                <div className="rounded-lg bg-muted dark:bg-[#0a0f14] px-4 py-3 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.05em] mb-1">
                      {t('currentLoad')}
                    </p>
                    <p className="font-display text-2xl font-bold text-foreground leading-none">
                      980<span className="text-xs font-normal text-muted-foreground ml-1">km</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.05em] mb-1">
                      {t('formScore')}
                    </p>
                    <p className="font-display text-2xl font-bold text-primary leading-none">88%</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
