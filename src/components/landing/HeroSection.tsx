'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const FONT_MONO = { fontFamily: 'var(--font-ibm-plex-mono, monospace)' } as const;
const FONT_DISPLAY = { fontFamily: 'var(--font-exo-2, sans-serif)' } as const;

const weeklyData = [
  { day: 'L', value: 38 },
  { day: 'M', value: 52 },
  { day: 'M', value: 34 },
  { day: 'J', value: 85, highlight: true },
  { day: 'V', value: 60 },
  { day: 'S', value: 48 },
  { day: 'D', value: 44 },
];

type ChipColor = 'orange' | 'green' | 'red' | 'neutral';

const chipColorMap: Record<ChipColor, string> = {
  orange: 'text-endurix-orange border-endurix-orange/30',
  green: 'text-green-600 dark:text-green-500 border-green-500/30',
  red: 'text-red-600 dark:text-red-500 border-red-500/30',
  neutral: 'text-endurix-black/60 dark:text-muted-foreground border-endurix-black/20 dark:border-border',
};

function MiniStatCard({
  label,
  value,
  chip,
  chipColor = 'orange',
}: {
  label: string;
  value: React.ReactNode;
  chip?: string;
  chipColor?: ChipColor;
}) {
  return (
    <div className="border border-endurix-black/20 dark:border-white/20 bg-white dark:bg-white/5 p-3 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-1">
        <span
          className="text-[8px] text-endurix-black/50 dark:text-muted-foreground tracking-widest font-semibold uppercase leading-tight"
          style={FONT_MONO}
        >
          {label}
        </span>
        {chip !== undefined && (
          <span
            className={cn(
              'text-[7px] font-bold tracking-wider border px-1.5 py-px',
              chipColorMap[chipColor],
            )}
            style={FONT_MONO}
          >
            {chip}
          </span>
        )}
      </div>
      <p
        className="text-xl font-bold text-endurix-black dark:text-foreground leading-none mt-1"
        style={FONT_DISPLAY}
      >
        {value}
      </p>
    </div>
  );
}

function DashboardMock({ mounted, t }: { mounted: boolean, t: any }) {
  return (
    <div className="relative">
      {/* Decorative orange offset block */}
      <div
        className="absolute -bottom-3 -right-3 w-full h-full bg-endurix-orange"
        aria-hidden
      />

      {/* Dashboard card */}
      <div className="relative bg-white dark:bg-card border border-endurix-black/12 dark:border-border shadow-sm">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#FEF9F6] dark:bg-muted border-b border-endurix-black/8 dark:border-border">
          <span
            className="text-[9px] text-endurix-black/60 dark:text-muted-foreground tracking-widest"
            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
          >
            {t('dashboardMock')}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-endurix-orange" />
            <div className="w-2 h-2 rounded-full bg-endurix-black" />
            <div className="w-2 h-2 rounded-full bg-endurix-stone" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-endurix-black/8 dark:border-b border-endurix-black/8 dark:border-border border-b border-endurix-black/8">
          <MiniStatCard
            label={t('complianceRate')}
            value="94%"
          />
          <MiniStatCard
            label={t('loadMonitoring')}
            value="+12"
            chip={t('balanced')}
            chipColor="green"
          />
          <MiniStatCard
            label={t('weeklyVolume')}
            value={
              <>
                52.4 <span className="text-[10px] text-muted-foreground font-sans">km</span>
              </>
            }
          />
          <MiniStatCard
            label={t('nextRace')}
            value={
              <>
                14 <span className="text-[10px] text-muted-foreground font-sans">dias</span>
              </>
            }
          />
        </div>

        {/* Weekly summary chart */}
        <div className="p-4">
          <p
            className="text-[8px] text-endurix-black/50 dark:text-muted-foreground tracking-widest uppercase mb-3"
            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
          >
            {t('resumenSemanal')}
          </p>
          <div className="h-28">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barCategoryGap="25%">
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: '#111317',
                      fontSize: 9,
                      fontFamily: 'var(--font-ibm-plex-mono, monospace)',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 0, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        className={entry.highlight ? 'fill-endurix-orange' : 'fill-endurix-black dark:fill-white'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('landing.hero');

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section className="relative overflow-hidden py-20 lg:py-32 bg-endurix-paper dark:bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <span
                className="inline-block bg-endurix-black dark:bg-white text-white dark:text-endurix-black text-[10px] font-bold tracking-widest px-3 py-1.5"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
              >
                {t('somosEndurix')}
              </span>
            </motion.div>

            {/* Headline */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2 }}
                className="font-bold leading-[1.0] tracking-tight"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
              >
                <span className="block text-endurix-black dark:text-foreground text-5xl lg:text-6xl xl:text-7xl uppercase">
                  {t('title1')}
                </span>
                <span className="block text-endurix-orange text-5xl lg:text-6xl xl:text-7xl uppercase">
                  {t('title2')}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="mt-6 text-endurix-black/60 dark:text-muted-foreground text-base leading-relaxed max-w-md"
              >
                {t('subtitle')}
              </motion.p>
            </div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-endurix-orange text-white text-xs font-bold tracking-widest px-8 py-4 transition-all hover:bg-endurix-orange/90 w-full sm:w-auto"
                  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                  {t('start')} <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 border border-endurix-black dark:border-white text-endurix-black dark:text-white text-xs font-bold tracking-widest px-8 py-4 transition-all hover:bg-endurix-black dark:hover:bg-white hover:text-white dark:hover:text-endurix-black w-full sm:w-auto"
                  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                  {t('discover')} <span aria-hidden>+</span>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right — Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.3 }}
            className="relative px-4 pb-4"
          >
            <DashboardMock mounted={mounted} t={t} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
