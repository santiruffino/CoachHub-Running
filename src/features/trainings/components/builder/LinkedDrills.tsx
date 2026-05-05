'use client';

import { PlayCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function LinkedDrills() {
    const t = useTranslations('builder');
    
    return (
        <div className="flex flex-col w-full text-white">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#8b9bb4] mb-3">{t('linkedDrills')}</h3>
            
            <div className="bg-white dark:bg-[#1a232c] rounded-lg p-3 flex items-center gap-3 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1f2933] transition-colors">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {/* Mock thumbnail */}
                    <div className="w-full h-full bg-slate-800 relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-white/50">{t('video')}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-sm font-semibold text-[#2b3437] dark:text-[#f8f9fa] leading-tight">{t('linkedDrillsTitle')}</h4>
                    <span className="text-xs text-[#8b9bb4] mt-0.5">04:20 • {t('video').toUpperCase()}</span>
                </div>
                
                <div className="pr-1 text-[#8b9bb4]">
                    <PlayCircle className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
