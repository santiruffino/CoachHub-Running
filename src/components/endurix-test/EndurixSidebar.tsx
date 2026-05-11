'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Users, Dumbbell, TrendingUp,
  Calendar, Settings, ChevronsRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Users, label: 'Atletas', active: false },
  { icon: Dumbbell, label: 'Entrenamientos', active: false },
  { icon: TrendingUp, label: 'Progreso', active: false },
  { icon: Calendar, label: 'Calendario', active: false },
];

export function EndurixSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex-shrink-0 bg-endurix-black flex flex-col h-full overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/8 flex-shrink-0">
        <ChevronsRight className="w-5 h-5 text-endurix-orange flex-shrink-0" strokeWidth={3} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="font-bold text-white tracking-widest text-sm uppercase whitespace-nowrap overflow-hidden"
              style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
            >
              ENDURIX
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={`
              flex items-center gap-3 px-3 py-2.5 w-full text-left transition-all duration-200 relative group
              ${active
                ? 'bg-white/8 text-white before:absolute before:left-0 before:inset-y-0 before:w-0.5 before:bg-endurix-orange'
                : 'text-white/40 hover:text-white/80 hover:bg-white/4'
              }
            `}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${active ? 'text-endurix-orange' : ''}`}
              strokeWidth={active ? 2 : 1.5}
            />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs font-semibold tracking-widest uppercase whitespace-nowrap overflow-hidden"
                  style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}

        <div className="my-3 mx-2 h-px bg-white/8" />

        <button className="flex items-center gap-3 px-3 py-2.5 w-full text-left text-white/40 hover:text-white/80 hover:bg-white/4 transition-all duration-200">
          <Settings className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-semibold tracking-widest uppercase whitespace-nowrap overflow-hidden"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
              >
                Ajustes
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </nav>

      {/* User info */}
      <div className="border-t border-white/8 p-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-endurix-orange flex items-center justify-center flex-shrink-0">
          <span
            className="text-white text-xs font-bold"
            style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
          >
            SR
          </span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p
                className="text-white text-xs font-bold whitespace-nowrap tracking-wide"
                style={{ fontFamily: 'var(--font-exo-2, sans-serif)' }}
              >
                Santiago R.
              </p>
              <p
                className="text-white/40 text-[9px] tracking-widest whitespace-nowrap"
                style={{ fontFamily: 'var(--font-ibm-plex-mono, monospace)' }}
              >
                COACH PRINCIPAL
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-20 w-6 h-6 bg-endurix-black border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-endurix-orange transition-all z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft className="w-3 h-3" />
        }
      </button>
    </motion.aside>
  );
}
