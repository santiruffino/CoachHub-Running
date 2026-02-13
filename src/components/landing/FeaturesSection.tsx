'use client';

import { Card } from '@/components/ui/card';
import { FileSpreadsheet, AudioWaveform, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: FileSpreadsheet,
    title: 'The Manual Trap',
    description:
      'Stop spending hours juggling spreadsheets and manual data entry. Our automation engine syncs workouts instantly across all platforms.',
  },
  {
    icon: AudioWaveform,
    title: 'The Noise',
    description:
      'Raw data is useless without context. Coach Hub separates critical insights from everyday metrics automatically using proprietary AI.',
  },
  {
    icon: MessageCircle,
    title: 'The Communication Gap',
    description:
      'Never miss a red flag again. Centralized feedback loops ensure athletes feel heard and coaches stay informed 24/7.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Why Coaches Switch to Hub
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: 80 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="h-1 bg-green-accent mx-auto"
          ></motion.div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
            >
              <Card className="bg-card-bg/50 backdrop-blur-sm border-white/10 p-8 hover:border-green-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-green-accent/10 h-full">
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  className="w-14 h-14 bg-green-accent/10 rounded-lg flex items-center justify-center mb-6"
                >
                  <feature.icon className="w-7 h-7 text-green-accent" />
                </motion.div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-light leading-relaxed">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
