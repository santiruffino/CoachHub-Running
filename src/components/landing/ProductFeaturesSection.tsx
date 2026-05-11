'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap, Dumbbell, BarChart3, Monitor } from 'lucide-react';
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from 'recharts';
import { motion, useInView, animate } from 'framer-motion';
import { useTranslations } from 'next-intl';

const lineChartData = Array.from({ length: 22 }, (_, i) => ({
  value: Math.sin(i / 3.5) * 18 + 52 + (i % 4) * 2.2,
}));

const getProductFeatures = (t: any) => [
  {
    icon: Zap,
    number: '01',
    title: t('feature1Title'),
    description: t('feature1Desc'),
  },
  {
    icon: Dumbbell,
    number: '02',
    title: t('feature2Title'),
    description: t('feature2Desc'),
  },
  {
    icon: BarChart3,
    number: '03',
    title: t('feature3Title'),
    description: t('feature3Desc'),
  },
  {
    icon: Monitor,
    number: '04',
    title: t('feature4Title'),
    description: t('feature4Desc'),
  },
];

function Counter({
  target,
  suffix = '',
  duration = 1.4,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = Math.round(v).toString() + suffix;
        }
      },
    });
    return () => controls.stop();
  }, [isInView, target, suffix, duration]);

  return (
    <span ref={ref}>
      0{suffix}
    </span>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const featureItemVariants = {
  hidden: { opacity: 0, x: -28 },
  visible: { opacity: 1, x: 0 },
};

export function ProductFeaturesSection() {
  const [mounted, setMounted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const t = useTranslations('landing.productFeatures');
  const productFeatures = getProductFeatures(t);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 lg:py-36 bg-endurix-paper dark:bg-background"
    >
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

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — Feature list */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            transition={{ staggerChildren: 0.12 }}
            className="space-y-0"
          >
            {productFeatures.map((feature, index) => (
              <motion.div
                key={index}
                variants={featureItemVariants}
                whileHover={{ x: 6 }}
                transition={{ duration: 0.55, ease: 'easeOut', type: 'spring', stiffness: 300, damping: 25 }}
                className="flex gap-5 py-7 border-b border-endurix-black/10 dark:border-border group cursor-default last:border-b-0"
              >
                {/* Number */}
                <span
                  className="text-[11px] text-endurix-black/25 dark:text-muted-foreground tracking-widest pt-0.5 w-6 flex-shrink-0 font-medium"
                  style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                  {feature.number}
                </span>

                {/* Icon */}
                <div className="w-9 h-9 border border-endurix-black/15 dark:border-border flex items-center justify-center flex-shrink-0 group-hover:border-endurix-orange group-hover:bg-endurix-orange/5 transition-all duration-300">
                  <feature.icon
                    className="w-4 h-4 text-endurix-black/50 dark:text-muted-foreground group-hover:text-endurix-orange transition-colors duration-300"
                    strokeWidth={1.5}
                  />
                </div>

                {/* Content */}
                <div>
                  <h3
                    className="font-bold text-endurix-black dark:text-foreground text-base mb-1.5 leading-tight group-hover:text-endurix-orange transition-colors duration-300"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-endurix-black/55 dark:text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Right — Analytics card */}
          <motion.div
            initial={{ opacity: 0, x: 32, scale: 0.98 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:sticky lg:top-24"
          >
            <div className="bg-white dark:bg-card border border-endurix-black/12 dark:border-border shadow-sm">
              {/* Card header */}
              <div className="px-5 py-4 border-b border-endurix-black/8 dark:border-border">
                <p
                  className="text-[9px] text-endurix-black/40 dark:text-muted-foreground tracking-widest mb-1"
                  style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                  {t('weekLabel')}
                </p>
                <h3
                  className="font-bold text-endurix-black dark:text-foreground text-sm"
                  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                  {t('formTrending')}
                </h3>
              </div>

              {/* Line chart */}
              <div className="px-2 pt-4 pb-2">
                <div className="h-48">
                  {mounted && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="h-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={lineChartData}>
                          <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                          <Tooltip
                            contentStyle={{
                              background: '#111317',
                              border: 'none',
                              borderRadius: 0,
                              fontSize: 10,
                              fontFamily: 'var(--font-ibm-plex-mono, monospace)',
                              color: '#fff',
                              padding: '4px 8px',
                            }}
                            itemStyle={{ color: '#FF6800' }}
                            cursor={{ stroke: '#FF6800', strokeWidth: 1 }}
                            formatter={(v) => [(v as number).toFixed(1), t('forma')]}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#FF6800"
                            strokeWidth={2}
                            dot={false}
                            strokeLinecap="round"
                            isAnimationActive={true}
                            animationDuration={1200}
                            animationEasing="ease-out"
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 border-t border-endurix-black/8 dark:border-border">
                <div className="px-5 py-4 border-r border-endurix-black/8 dark:border-border">
                  <p
                    className="text-[9px] text-endurix-black/40 dark:text-muted-foreground tracking-widest mb-2"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                  >
                    {t('currentLoad')}
                  </p>
                  <p
                    className="text-2xl font-bold text-endurix-black dark:text-foreground leading-none"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                  >
                    <Counter target={980} />
                    <span
                      className="text-xs font-normal text-endurix-black/40 dark:text-muted-foreground ml-1"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      {t('km')}
                    </span>
                  </p>
                </div>
                <div className="px-5 py-4">
                  <p
                    className="text-[9px] text-endurix-black/40 dark:text-muted-foreground tracking-widest mb-2"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                  >
                    {t('formScore')}
                  </p>
                  <p
                    className="text-2xl font-bold text-endurix-orange leading-none"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                  >
                    <Counter target={88} suffix="%" />
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
