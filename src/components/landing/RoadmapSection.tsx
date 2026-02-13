'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Watch, ShieldCheck, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

const roadmapItems = [
  {
    icon: Watch,
    title: 'Garmin Push',
    description:
      'Direct workout sync to all athlete Garmin devices. No more manual setup.',
    status: 'VIEW RELEASE',
    statusType: 'active' as const,
  },
  {
    icon: ShieldCheck,
    title: 'Injury Prevention Auditor',
    description:
      "Proprietary biometrics analyzer that flags early warning signs of common injuries.",
    status: 'Q2 2025',
    statusType: 'upcoming' as const,
  },
  {
    icon: Smartphone,
    title: 'Native Mobile App',
    description:
      'A streamlined mobile command center for trackside coaching and instant feedback.',
    status: 'Q3 2025',
    statusType: 'future' as const,
  },
];

export function RoadmapSection() {
  return (
    <section id="roadmap" className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-green-accent text-sm font-semibold uppercase tracking-wider mb-4"
          >
            ELITE ROADMAP
          </motion.p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            What&#39;s coming next for the performance-driven coach.
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
              whileHover={{ y: -8 }}
            >
              <Card className="bg-card-bg/50 backdrop-blur-sm border-white/10 p-8 hover:border-green-accent/30 transition-all duration-300 h-full">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 bg-green-accent/10 rounded-full flex items-center justify-center mb-6 mx-auto"
                >
                  <item.icon className="w-8 h-8 text-green-accent" />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-4 text-center">
                  {item.title}
                </h3>
                <p className="text-gray-light leading-relaxed text-center mb-6">
                  {item.description}
                </p>
                <div className="text-center">
                  {item.statusType === 'active' ? (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Badge className="bg-green-accent/10 text-green-accent border-green-accent/20 hover:bg-green-accent/20">
                        {item.status}
                      </Badge>
                    </motion.div>
                  ) : (
                    <Badge className="bg-white/5 text-gray-light border-white/10">
                      {item.status}
                    </Badge>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
