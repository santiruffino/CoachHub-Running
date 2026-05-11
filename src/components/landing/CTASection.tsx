'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

const RUNNER_IMAGE =
  'https://images.pexels.com/photos/13158581/pexels-photo-13158581.jpeg';

export function CTASection() {
  const t = useTranslations('landing.cta');
  
  return (
    <section className="bg-endurix-dark dark:bg-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Manifesto */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2
              className="font-bold uppercase leading-[1.0] tracking-tight text-white"
              style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
              {[t('disciplina'), t('consistencia'), t('progreso')].map((word, i) => (
                <motion.span
                  key={word}
                  className="block text-5xl lg:text-6xl xl:text-7xl overflow-hidden"
                  initial={{ opacity: 0, y: '100%' }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  {word}
                </motion.span>
              ))}
            </h2>

            {/* Orange accent line */}
            <motion.div
              className="mt-6 h-1 bg-endurix-orange"
              initial={{ width: 0 }}
              whileInView={{ width: 80 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 text-white/50 text-base leading-relaxed max-w-md"
            >
              {t('manifesto')}
            </motion.p>
          </motion.div>

          {/* Right — Runner image with overlay */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, delay: 0.15 }}
            className="relative"
          >
            {/* Image container */}
            <div className="relative overflow-hidden aspect-[4/3] lg:aspect-[3/4]">
              <img
                src={RUNNER_IMAGE}
                alt="Trail runner ascending rocky mountain path — RUN 4 FFWPU on Pexels"
                className="w-full h-full object-cover grayscale"
              />

              {/* "NO EXCUSES. JUST DATA." orange overlay card */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: 0.5 }}
                className="absolute bottom-0 left-0 bg-endurix-orange px-6 py-5 max-w-[260px]"
              >
                <p
                  className="font-bold text-endurix-black text-xl leading-tight uppercase"
                  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                  {t('noExcuses')}
                  <br />
                  {t('justData')}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
