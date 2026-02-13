'use client';

import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-dark-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-accent rounded-sm flex items-center justify-center">
              <span className="text-dark-navy font-bold text-sm">C</span>
            </div>
            <span className="text-white font-semibold">COACH HUB</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-gray-light hover:text-white transition-colors text-sm"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-gray-light hover:text-white transition-colors text-sm"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="text-gray-light hover:text-white transition-colors text-sm"
            >
              Contact Us
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-gray-light text-sm">
            © 2025 Coach Hub & Athletics. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
