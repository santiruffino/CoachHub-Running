'use client';

import { Watch, Bike, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const getRoadmapItems = (t: any): Array<{
  icon: any;
  number: string;
  title: string;
  description: string;
  status: string;
  statusType: 'active' | 'future' | 'planned';
}> => [
  {
    icon: Bike,
    number: '01',
    title: t('item1Title'),
    description: t('item1Desc'),
    status: t('item1Status'),
    statusType: 'future',
  },
  {
    icon: Brain,
    number: '02',
    title: t('item2Title'),
    description: t('item2Desc'),
    status: t('item2Status'),
    statusType: 'future',
  },
  {
    icon: Watch,
    number: '03',
    title: t('item3Title'),
    description: t('item3Desc'),
    status: t('item3Status'),
    statusType: 'planned',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0 },
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

export function RoadmapSection() {
  const t = useTranslations('landing.roadmap');
  const roadmapItems = getRoadmapItems(t);

  return (
    <section id="roadmap" className="py-24 lg:py-36 bg-white dark:bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6"
        >
          <div>
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
              {t('title1')}
              <br />
              <span className="text-endurix-orange">{t('title2')}</span>
            </h2>
          </div>

          {/* Orange accent rule */}
          <motion.div
            className="hidden lg:block h-0.5 bg-endurix-orange flex-1 max-w-xs mb-3 ml-10"
            initial={{ scaleX: 0, originX: 'left' }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
          />
        </motion.div>

        {/* Cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {roadmapItems.map((item, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              whileHover={{ y: -8, transition: { duration: 0.25 } }}
              className="group"
            >
              <div className="border border-endurix-black/12 dark:border-border p-7 h-full flex flex-col bg-white dark:bg-card hover:border-endurix-orange/40 dark:hover:border-endurix-orange/40 hover:shadow-[0_16px_48px_rgba(255,104,0,0.08)] transition-all duration-300 relative overflow-hidden">
                {/* Hover orange corner accent */}
                <div className="absolute top-0 right-0 w-0 h-0 group-hover:w-16 group-hover:h-16 bg-endurix-orange/5 transition-all duration-500 origin-top-right" />

                {/* Number tag */}
                <span
                  className="text-[10px] text-endurix-black/25 dark:text-muted-foreground tracking-widest mb-5 font-medium"
                  style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                >
                  {item.number}
                </span>

                {/* Icon */}
                <div className="w-11 h-11 border border-endurix-black/12 dark:border-border flex items-center justify-center mb-5 group-hover:border-endurix-orange/30 group-hover:bg-endurix-orange/5 transition-all duration-300">
                  <item.icon
                    className="w-5 h-5 text-endurix-black/50 dark:text-muted-foreground group-hover:text-endurix-orange transition-colors duration-300"
                    strokeWidth={1.5}
                  />
                </div>

                {/* Status badge */}
                <motion.div variants={badgeVariants} transition={{ duration: 0.4, delay: 0.3 }} className="mb-5">
                  {item.statusType === 'active' ? (
                    <span
                      className="inline-flex items-center gap-1.5 bg-endurix-orange text-white text-[9px] font-bold tracking-widest px-3 py-1.5"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {item.status}
                    </span>
                  ) : item.statusType === 'future' ? (
                    <span
                      className="inline-block bg-endurix-black dark:bg-white text-white dark:text-endurix-black text-[9px] font-bold tracking-widest px-3 py-1.5"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      {item.status}
                    </span>
                  ) : (
                    <span
                      className="inline-block border border-endurix-black/25 dark:border-border text-endurix-black/50 dark:text-muted-foreground text-[9px] font-bold tracking-widest px-3 py-1.5"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      {item.status}
                    </span>
                  )}
                </motion.div>

                {/* Title */}
                <h3
                  className="font-bold text-endurix-black dark:text-foreground text-xl mb-3 leading-tight group-hover:text-endurix-orange transition-colors duration-300"
                  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-endurix-black/50 dark:text-muted-foreground text-sm leading-relaxed flex-1">
                  {item.description}
                </p>

                {/* Bottom indicator bar — fills on hover */}
                <div className="mt-6 h-0.5 bg-endurix-black/8 dark:bg-border relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-endurix-orange w-0 group-hover:w-full transition-all duration-500 ease-out" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
