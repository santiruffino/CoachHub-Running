'use client';

import { Card } from '@/components/ui/card';
import { LineChart, Dumbbell, Sliders, RefreshCw } from 'lucide-react';
import { Line, LineChart as RechartsLineChart, ResponsiveContainer, YAxis } from 'recharts';
import { motion } from 'framer-motion';

const productFeatures = [
  {
    icon: LineChart,
    title: 'AI Spotlight Dashboard',
    description:
      'Predictive modeling that highlights potential overtraining before injuries occur.',
  },
  {
    icon: Dumbbell,
    title: 'Dynamic Workout Builder',
    description:
      'Generate structured workouts based on real data. VAM and lactate threshold.',
  },
  {
    icon: Sliders,
    title: 'VAM Auto-Adjust',
    description:
      'Automatic pace adjustments based on elevation profile and vertical meters per hour.',
  },
  {
    icon: RefreshCw,
    title: 'Sync-Pace Analysis',
    description:
      'Synchronized heart rate, pace, and elevation overlay for surgical precision.',
  },
];

const lineChartData = Array.from({ length: 20 }, (_, i) => ({
  value: Math.sin(i / 3) * 20 + 50 + Math.random() * 10,
}));

export function ProductFeaturesSection() {
  return (
    <section className="py-20 lg:py-32 bg-card-bg/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Built by Coaches,{' '}
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-green-accent"
            >
              Refined by Intelligence.
            </motion.span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Features List */}
          <div className="space-y-6">
            {productFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ x: 8 }}
                className="flex gap-4 group"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-12 h-12 bg-green-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-accent/20 transition-colors"
                >
                  <feature.icon className="w-6 h-6 text-green-accent" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-light leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right - Analytics Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Card className="bg-card-bg/50 backdrop-blur-sm border-white/10 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-light uppercase tracking-wider">
                  Week 7 - 1wk7 - HR Adjust
                </p>
                <h3 className="text-sm font-medium text-white mt-1">Form Trending</h3>
              </div>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={lineChartData}>
                  <YAxis hide />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#00FF88"
                    strokeWidth={2}
                    dot={false}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs text-gray-light uppercase">Current Load</p>
                <p className="text-2xl font-bold text-white">
                  980<span className="text-sm text-gray-light ml-1">km</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-light uppercase">Form Score</p>
                <p className="text-2xl font-bold text-green-accent">88%</p>
              </div>
            </div>
          </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
