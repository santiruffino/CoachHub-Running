'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

const chartData = [
  { day: 'Mon', value: 45 },
  { day: 'Tue', value: 52 },
  { day: 'Wed', value: 38 },
  { day: 'Thu', value: 65 },
  { day: 'Fri', value: 73 },
  { day: 'Sat', value: 88 },
  { day: 'Sun', value: 95 },
  { day: 'Mon', value: 68 },
  { day: 'Tue', value: 42 },
  { day: 'Wed', value: 35 },
];

const athletes = [
  { name: 'Sarah M.', status: 'active' },
  { name: 'Mike R.', status: 'active' },
  { name: 'Emma T.', status: 'active' },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Badge className="bg-green-accent/10 text-green-accent border-green-accent/20 hover:bg-green-accent/20 animate-pulse">
                ⚡ AI-POWERED PERFORMANCE
              </Badge>
            </motion.div>

            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-5xl lg:text-6xl font-bold text-white leading-tight"
              >
                Coach Smarter, Not Harder. Your AI-Powered{' '}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="text-green-accent"
                >
                  Command Center.
                </motion.span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg text-gray-light max-w-xl"
              >
                Harness the power of VAM adjustments, automated workout building, and
                real-time athlete insights in one unified dashboard.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-green-accent text-dark-navy hover:bg-green-dark font-medium h-12 px-8 w-full sm:w-auto">
                  Start Free Trial
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="bg-transparent border border-gray-light/30 text-white hover:bg-white/5 font-medium h-12 px-8 w-full sm:w-auto">
                  View Pricing Plans
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right Content - Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card-bg/50 backdrop-blur-sm border-white/10 p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-light uppercase tracking-wider">
                    PERFORMANCE ANALYTICS V2.6
                  </p>
                  <h3 className="text-sm font-medium text-white mt-1">
                    TRAINED STRESS BALANCE (TSB)
                  </h3>
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-accent"></div>
                    <span className="text-xs text-gray-light">Form</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-light">Fatigue</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#A0A8B8', fontSize: 10 }}
                    />
                    <YAxis hide />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 5 ? '#00FF88' : '#1A4D3A'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-gray-light uppercase">Volume</p>
                  <p className="text-2xl font-bold text-white">
                    1,240<span className="text-sm text-gray-light ml-1">km</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-light uppercase">Load Duration</p>
                  <p className="text-2xl font-bold text-white">
                    174<span className="text-sm text-gray-light ml-1">hrs</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-light uppercase">Recovery Rate</p>
                  <p className="text-2xl font-bold text-green-accent">+12.4%</p>
                </div>
              </div>

              {/* Active Athletes */}
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-light uppercase tracking-wider">
                    Active Athletes
                  </p>
                  <div className="bg-green-accent/10 text-green-accent text-xs px-2 py-1 rounded">
                    RECOMMENDATION
                  </div>
                </div>
                <div className="space-y-2">
                  {athletes.map((athlete, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-light/20"></div>
                        <span className="text-sm text-white">{athlete.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-accent"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
