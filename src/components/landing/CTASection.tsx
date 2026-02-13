'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const stats = [
  { value: '5k+', label: 'Active Coaches' },
  { value: '120k', label: 'Workouts Assigned' },
  { value: '99.9%', label: 'System Reliability' },
  { value: '24/7', label: 'Expert Support' },
];

export function CTASection() {
  return (
    <section id="pricing" className="py-20 lg:py-32 bg-card-bg/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold text-white">
              Start Coaching for{' '}
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-green-accent"
              >
                Free.
              </motion.span>
            </h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg text-gray-light"
            >
              Unlimited athletes for your first 14 days. Scale as you grow.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="bg-green-accent text-dark-navy hover:bg-green-dark font-medium h-12 px-8 w-full sm:w-auto">
                Start 14-Day Free Trial
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="bg-transparent border border-gray-light/30 text-white hover:bg-white/5 font-medium h-12 px-8 w-full sm:w-auto">
                View Pricing Plans
              </Button>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xs text-gray-light tracking-wider"
          >
            NO CREDIT CARD REQUIRED • CANCEL ANYTIME
          </motion.p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-16 pt-16 border-t border-white/10">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="text-center"
            >
              <motion.p
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                className="text-3xl lg:text-4xl font-bold text-white mb-2"
              >
                {stat.value}
              </motion.p>
              <p className="text-sm text-gray-light uppercase tracking-wider">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
