'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bell, Search, ArrowUp, ArrowUpRight, ArrowDownRight, Minus,
  AlertTriangle, Clock, ChevronRight, Activity, Users,
  BarChart2, CheckCircle, Zap,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { animate } from 'framer-motion';
import { EndurixSidebar } from './EndurixSidebar';
import {
  mockAthletes, weeklyData, upcomingWorkouts, alerts, zoneBreakdown,
  type AthleteStatus, type TrendDirection,
} from './data';

// ─── Counter ─────────────────────────────────────────────────────────────────
function Counter({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const ctrl = animate(0, target, {
      duration: 1.3,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) {
          ref.current.textContent = v.toFixed(decimals) + suffix;
        }
      },
    });
    return () => ctrl.stop();
  }, [target, suffix, decimals]);
  return <span ref={ref}>0{suffix}</span>;
}

// ─── Training Load Ring ───────────────────────────────────────────────────────
function TrainingLoadRing({ value, max = 600 }: { value: number; max?: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#EBE9EC" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke="#FF6800"
          strokeWidth="10"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${circ * pct} ${circ * (1 - pct)}` }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold text-endurix-black leading-none"
          style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
        >
          <Counter target={value} />
        </span>
        <span
          className="text-[9px] text-endurix-orange font-bold tracking-widest mt-0.5"
          style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
        >
          ÓPTIMO
        </span>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: AthleteStatus }) {
  const map: Record<AthleteStatus, { label: string; className: string }> = {
    optimal: { label: 'ÓPTIMA', className: 'bg-endurix-orange text-white' },
    stable: { label: 'ESTABLE', className: 'bg-endurix-black text-white' },
    alert: { label: 'ALERTA', className: 'border border-red-500 text-red-500' },
    monitor: { label: 'MONITOREO', className: 'border border-endurix-black/30 text-endurix-black/60' },
  };
  const { label, className } = map[status];
  return (
    <span
      className={`inline-block text-[8px] font-bold tracking-widest px-2 py-0.5 ${className}`}
      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
    >
      {label}
    </span>
  );
}

// ─── Trend Icon ───────────────────────────────────────────────────────────────
function TrendIcon({ trend }: { trend: TrendDirection }) {
  if (trend === 'up') return <ArrowUpRight className="w-4 h-4 text-endurix-orange" />;
  if (trend === 'down') return <ArrowDownRight className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-endurix-black/30" />;
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-endurix-black/10 ${className}`}>
      {children}
    </div>
  );
}

// ─── Zone Badge ───────────────────────────────────────────────────────────────
function ZoneBadge({ zone, num }: { zone: string; num: number }) {
  const colors: Record<number, string> = {
    1: 'bg-endurix-stone text-endurix-black/70',
    2: 'bg-endurix-mint text-endurix-black/70',
    3: 'bg-endurix-lemon text-endurix-black/70',
    4: 'bg-endurix-orange text-white',
    5: 'bg-endurix-black text-white',
  };
  return (
    <span
      className={`text-[8px] font-bold tracking-widest px-2 py-0.5 ${colors[num] ?? 'bg-endurix-stone text-endurix-black'}`}
      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
    >
      {zone}
    </span>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function EndurixDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const f = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(f);
  }, []);

  const stagger = (i: number) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.05 + i * 0.08 } });

  return (
    <div className="flex h-screen overflow-hidden bg-endurix-paper">
      <EndurixSidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="h-16 bg-white border-b border-endurix-black/8 flex items-center justify-between px-6 flex-shrink-0"
        >
          <div>
            <h1
              className="font-bold text-endurix-black text-lg uppercase tracking-tight leading-none"
              style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
              Coach Dashboard
            </h1>
            <p
              className="text-[9px] text-endurix-black/40 tracking-widest mt-0.5"
              style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
            >
              SEMANA 19 · 10 MAYO 2026
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 border border-endurix-black/15 px-3 py-1.5 bg-endurix-paper">
              <Search className="w-3.5 h-3.5 text-endurix-black/35" />
              <input
                type="text"
                placeholder="Buscar atleta..."
                className="bg-transparent text-xs text-endurix-black placeholder:text-endurix-black/30 outline-none w-36"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
              />
            </div>
            {/* Bell */}
            <button className="relative p-2 text-endurix-black/50 hover:text-endurix-black transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-endurix-orange rounded-full" />
            </button>
            {/* Avatar */}
            <div className="w-8 h-8 bg-endurix-orange flex items-center justify-center">
              <span
                className="text-white text-xs font-bold"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
              >
                SR
              </span>
            </div>
          </div>
        </motion.header>

        {/* ── Scrollable content ── */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">

          {/* Metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              {
                icon: Users,
                label: 'ATLETAS ACTIVOS',
                value: 12,
                suffix: '',
                sub: '2 nuevos este mes',
                subIcon: ArrowUp,
                subColor: 'text-endurix-orange',
              },
              {
                icon: Zap,
                label: 'CARGA SEMANAL',
                value: 487,
                suffix: ' TSS',
                badge: 'ÓPTIMA',
                subColor: 'text-endurix-orange',
              },
              {
                icon: CheckCircle,
                label: 'CUMPLIMIENTO',
                value: 84,
                suffix: '%',
                sub: '3% esta semana',
                subIcon: ArrowUp,
                subColor: 'text-endurix-orange',
              },
              {
                icon: AlertTriangle,
                label: 'ALERTAS ACTIVAS',
                value: 3,
                suffix: '',
                sub: '2 urgentes',
                subColor: 'text-red-500',
                alert: true,
              },
            ].map((m, i) => (
              <motion.div key={m.label} {...stagger(i)}>
                <Card className={`p-4 ${m.alert ? 'border-red-200' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className="text-[9px] text-endurix-black/45 tracking-widest"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      {m.label}
                    </span>
                    <m.icon
                      className={`w-3.5 h-3.5 flex-shrink-0 ${m.alert ? 'text-red-400' : 'text-endurix-black/25'}`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <p
                    className="text-3xl font-bold text-endurix-black leading-none mb-2"
                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                  >
                    <Counter target={m.value} suffix={m.suffix} />
                  </p>
                  {m.badge ? (
                    <span
                      className="inline-block bg-endurix-orange text-white text-[8px] font-bold tracking-widest px-2 py-0.5"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      {m.badge}
                    </span>
                  ) : (
                    <p className={`flex items-center gap-1 text-[10px] ${m.subColor}`}>
                      {m.subIcon && <m.subIcon className="w-3 h-3" strokeWidth={2} />}
                      {m.sub}
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main grid */}
          <div className="grid lg:grid-cols-3 gap-5">

            {/* ── Left column (2/3) ── */}
            <div className="lg:col-span-2 space-y-5">

              {/* Weekly chart */}
              <motion.div {...stagger(4)}>
                <Card>
                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div>
                      <p
                        className="text-[9px] text-endurix-black/40 tracking-widest"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                      >
                        RESUMEN SEMANAL
                      </p>
                      <div className="flex items-baseline gap-3 mt-0.5">
                        <span
                          className="text-2xl font-bold text-endurix-black"
                          style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                        >
                          <Counter target={62.4} suffix=" KM" decimals={1} />
                        </span>
                        <span className="text-xs text-endurix-orange flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          14% vs semana anterior
                        </span>
                      </div>
                    </div>
                    <Activity className="w-4 h-4 text-endurix-black/25" strokeWidth={1.5} />
                  </div>

                  <div className="px-3 pb-2 h-44">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData} barCategoryGap="28%">
                          <XAxis
                            dataKey="day"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: '#111317',
                              fontSize: 10,
                              fontFamily: 'var(--font-ibm-plex-mono, monospace)',
                            }}
                          />
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
                            cursor={{ fill: 'rgba(17,19,23,0.04)' }}
                            formatter={(v) => [`${v} TSS`, 'Carga']}
                          />
                          <Bar dataKey="tss" radius={[0, 0, 0, 0]} isAnimationActive animationDuration={900}>
                            {weeklyData.map((d, i) => (
                              <Cell
                                key={i}
                                fill={d.highlight ? '#FF6800' : '#111317'}
                                opacity={d.highlight ? 1 : 0.75}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="border-t border-endurix-black/8 px-5 py-3">
                    <button className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-endurix-black hover:text-endurix-orange transition-colors"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      VER ANÁLISIS COMPLETO <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </Card>
              </motion.div>

              {/* Athletes table */}
              <motion.div {...stagger(5)}>
                <Card>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-endurix-black/8">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[9px] text-endurix-black/40 tracking-widest"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                      >
                        ATLETAS
                      </span>
                      <span
                        className="bg-endurix-black text-white text-[8px] font-bold tracking-widest px-1.5 py-0.5"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                      >
                        {mockAthletes.length}
                      </span>
                    </div>
                    <button className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-endurix-black/40 hover:text-endurix-orange transition-colors"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      VER TODOS <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-endurix-black/8">
                          {['ATLETA', 'DEPORTE', 'TSS', 'FORMA', 'ESTADO', ''].map((h) => (
                            <th
                              key={h}
                              className="px-5 py-3 text-left text-[8px] text-endurix-black/35 tracking-widest font-medium whitespace-nowrap"
                              style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mockAthletes.map((athlete, i) => (
                          <motion.tr
                            key={athlete.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
                            className="border-b border-endurix-black/5 last:border-0 hover:bg-endurix-paper/60 transition-colors group"
                          >
                            {/* Atleta */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 bg-endurix-black flex items-center justify-center flex-shrink-0">
                                  <span
                                    className="text-white text-[9px] font-bold"
                                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                  >
                                    {athlete.initials}
                                  </span>
                                </div>
                                <div>
                                  <p
                                    className="text-xs font-bold text-endurix-black leading-none group-hover:text-endurix-orange transition-colors"
                                    style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                                  >
                                    {athlete.name}
                                  </p>
                                  <p
                                    className="text-[9px] text-endurix-black/40 tracking-wide mt-0.5"
                                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                  >
                                    {athlete.lastActivity}
                                  </p>
                                </div>
                              </div>
                            </td>
                            {/* Deporte */}
                            <td className="px-5 py-3.5">
                              <span className="text-xs text-endurix-black/55">{athlete.sport}</span>
                            </td>
                            {/* TSS */}
                            <td className="px-5 py-3.5">
                              <span
                                className="text-sm font-bold text-endurix-black"
                                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                              >
                                {athlete.tss}
                              </span>
                            </td>
                            {/* Forma */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-sm font-bold text-endurix-black"
                                  style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                                >
                                  {athlete.form}%
                                </span>
                                <TrendIcon trend={athlete.trend} />
                              </div>
                            </td>
                            {/* Estado */}
                            <td className="px-5 py-3.5">
                              <StatusBadge status={athlete.status} />
                            </td>
                            {/* Actions */}
                            <td className="px-5 py-3.5">
                              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-endurix-black/40 hover:text-endurix-orange">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* ── Right column (1/3) ── */}
            <div className="space-y-5">

              {/* Training Load */}
              <motion.div {...stagger(4)}>
                <Card className="p-5">
                  <p
                    className="text-[9px] text-endurix-black/40 tracking-widest mb-4"
                    style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                  >
                    CARGA DE ENTRENAMIENTO
                  </p>

                  <TrainingLoadRing value={487} />

                  {/* Zone breakdown */}
                  <div className="mt-5 space-y-2.5">
                    {zoneBreakdown.map((z, i) => (
                      <div key={z.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className="text-[8px] text-endurix-black/50 tracking-widest"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                          >
                            {z.label}
                          </span>
                          <span
                            className="text-[8px] text-endurix-black/50 tracking-widest"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                          >
                            {z.pct}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-endurix-stone relative overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 left-0"
                            style={{ background: z.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${z.pct}%` }}
                            transition={{ duration: 0.9, delay: 0.4 + i * 0.1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>

              {/* Upcoming workouts */}
              <motion.div {...stagger(5)}>
                <Card>
                  <div className="flex items-center gap-2 px-4 py-3.5 border-b border-endurix-black/8">
                    <Clock className="w-3 h-3 text-endurix-black/30" strokeWidth={1.5} />
                    <span
                      className="text-[9px] text-endurix-black/40 tracking-widest"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      PRÓXIMAS SESIONES
                    </span>
                  </div>
                  <div className="divide-y divide-endurix-black/5">
                    {upcomingWorkouts.map((w, i) => (
                      <motion.div
                        key={w.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
                        className="px-4 py-3 flex items-start justify-between gap-2 group hover:bg-endurix-paper/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p
                            className="text-xs font-bold text-endurix-black leading-none truncate group-hover:text-endurix-orange transition-colors"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                          >
                            {w.athleteName}
                          </p>
                          <p className="text-[10px] text-endurix-black/45 mt-0.5 truncate">{w.type}</p>
                          <p
                            className="text-[9px] text-endurix-black/30 tracking-wide mt-1"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                          >
                            {w.time}
                          </p>
                        </div>
                        <ZoneBadge zone={w.zone} num={w.zoneNum} />
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>

              {/* Alerts */}
              <motion.div {...stagger(6)}>
                <Card>
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-endurix-black/8">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-red-400" strokeWidth={1.5} />
                      <span
                        className="text-[9px] text-endurix-black/40 tracking-widest"
                        style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                      >
                        ALERTAS
                      </span>
                    </div>
                    <span
                      className="bg-red-500 text-white text-[8px] font-bold tracking-widest px-1.5 py-0.5"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      {alerts.length}
                    </span>
                  </div>
                  <div className="divide-y divide-endurix-black/5">
                    {alerts.map((alert, i) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
                        className={`px-4 py-3 border-l-2 hover:bg-endurix-paper/50 transition-colors ${
                          alert.severity === 'high' ? 'border-l-red-500' : 'border-l-endurix-orange'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className="text-xs font-bold text-endurix-black leading-none"
                            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                          >
                            {alert.athleteName}
                          </p>
                          <span
                            className="text-[8px] text-endurix-black/30 tracking-wide flex-shrink-0"
                            style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                          >
                            {alert.timeAgo}
                          </span>
                        </div>
                        <p className="text-[10px] text-endurix-black/50 mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="border-t border-endurix-black/8 px-4 py-3">
                    <button
                      className="text-[10px] font-bold tracking-widest text-endurix-black/40 hover:text-endurix-orange transition-colors flex items-center gap-1"
                      style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
                    >
                      VER TODAS <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </Card>
              </motion.div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
