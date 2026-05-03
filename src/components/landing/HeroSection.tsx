'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const chartData = [
  { day: 'Lun', value: 45 },
  { day: 'Mar', value: 52 },
  { day: 'Mié', value: 38 },
  { day: 'Jue', value: 65 },
  { day: 'Vie', value: 73 },
  { day: 'Sáb', value: 88 },
  { day: 'Dom', value: 95 },
  { day: 'Lun', value: 68 },
  { day: 'Mar', value: 42 },
  { day: 'Mié', value: 35 },
];

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('landing.hero');

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const athletes = [
    { name: 'Sarah M.', note: t('athleteNoteForm') },
    { name: 'Mike R.', note: t('athleteNoteRecovery') },
    { name: 'Emma T.', note: t('athleteNoteLoad') },
  ];

  const stats = [
    { value: '1,240', unit: 'km', label: t('volumeLabel') },
    { value: '174', unit: 'hrs', label: t('loadDurationLabel') },
    { value: '+12.4%', unit: '', label: t('recoveryRateLabel') },
  ];

  return (
    <section className="relative overflow-hidden py-24 lg:py-40 bg-background">
      {/* Subtle background texture — tonal only, no harsh lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 60% 0%, rgba(78,96,115,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="space-y-10"
          >
            {/* Eyebrow label */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <span className="inline-flex items-center gap-2 bg-accent text-primary text-xs font-semibold uppercase tracking-[0.05em] px-3 py-1.5 rounded-[0.375rem]">
                {t('eyebrow')}
              </span>
            </motion.div>

            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="font-display text-[3rem] lg:text-[3.75rem] font-bold text-foreground leading-[1.1] tracking-[-0.02em]"
              >
                {t('title1')}{' '}
                <br className="hidden lg:block" />
                {t('title2')}{' '}
                <span className="text-primary">
                  {t('titleHighlight')}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="text-lg text-muted-foreground tracking-[0.01em] leading-relaxed max-w-xl"
              >
                {t('subtitle')}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center h-12 px-8 rounded-[0.375rem] font-medium text-white text-sm transition-all shadow-[0_4px_12px_rgba(78,96,115,0.25)] hover:shadow-[0_6px_20px_rgba(78,96,115,0.35)]"
                  style={{ background: 'linear-gradient(135deg, #4e6073, #425467)' }}
                >
                  {t('startFreeTrial')}
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium h-12 px-8 w-full sm:w-auto rounded-[0.375rem] border-0 shadow-none">
                  {t('viewPricing')}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right Content — Dashboard Preview Card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="relative"
          >
            <motion.div
              whileHover={{ scale: 1.015 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--color-card, #ffffff)',
                boxShadow: '0 20px 40px rgba(43, 52, 55, 0.08)',
                border: '1px solid rgba(171, 179, 183, 0.15)',
              }}
            >
              <div className="dark:bg-[#1a232c] p-6 space-y-6">
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-[0.05em] font-medium">
                      {t('analyticsLabel')}
                    </p>
                    <h3 className="text-sm font-semibold text-foreground mt-1 tracking-tight font-display">
                      {t('tsbTitle')}
                    </h3>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary opacity-80" />
                      <span className="text-xs text-muted-foreground">{t('formLabel')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-destructive opacity-70" />
                      <span className="text-xs text-muted-foreground">{t('fatigueLabel')}</span>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-44">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barCategoryGap="28%">
                        <XAxis
                          dataKey="day"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                        />
                        <YAxis hide />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={index === 6 ? '#4e6073' : 'rgba(78,96,115,0.15)'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Stats — tonal background shift instead of border */}
                <div className="rounded-lg bg-muted dark:bg-[#0a0f14] px-4 py-3 grid grid-cols-3 gap-4">
                  {stats.map((s) => (
                    <div key={s.label}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.05em] mb-1">
                        {s.label}
                      </p>
                      <p className="font-display text-xl font-bold text-foreground leading-none">
                        {s.value}
                        {s.unit && (
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            {s.unit}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Active Athletes */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.05em] font-medium">
                      {t('activeAthletes')}
                    </p>
                    <span className="bg-accent text-primary text-[10px] font-semibold uppercase tracking-[0.04em] px-2 py-0.5 rounded">
                      {t('aiRecommendation')}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {athletes.map((athlete) => (
                      <div key={athlete.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-muted dark:bg-[#0a0f14] flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                            {athlete.name[0]}
                          </div>
                          <span className="text-sm text-foreground font-medium">{athlete.name}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{athlete.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
