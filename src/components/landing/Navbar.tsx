'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-b border-white/10 bg-dark-navy/80 backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-accent rounded-sm flex items-center justify-center">
              <span className="text-dark-navy font-bold text-lg">C</span>
            </div>
            <span className="text-white font-semibold text-xl">COACH HUB</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-gray-light hover:text-white transition-colors text-sm"
            >
              Features
            </Link>
            <Link
              href="#roadmap"
              className="text-gray-light hover:text-white transition-colors text-sm"
            >
              Roadmap
            </Link>
            <Link
              href="#pricing"
              className="text-gray-light hover:text-white transition-colors text-sm"
            >
              Pricing
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-gray-light hover:text-white transition-colors text-sm hidden md:block"
            >
              Login
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="bg-green-accent text-dark-navy hover:bg-green-dark font-medium">
                Start Free Trial
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
