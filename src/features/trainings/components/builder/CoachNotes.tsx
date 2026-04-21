'use client';

import { Edit3 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function CoachNotes() {
    const t = useTranslations('builder');
    
    return (
        <div className="bg-[#f8f9fa] dark:bg-[#1a232c] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
                <Edit3 className="w-4 h-4 text-[#4e6073]" />
                <h3 className="text-sm font-semibold text-[#2b3437] dark:text-[#f8f9fa]">{t('coachNotes')}</h3>
            </div>
            
            <textarea 
                placeholder={t('notesPlaceholder')}
                className="w-full bg-transparent border-none outline-none resize-none text-sm text-[#4e6073] dark:text-[#8b9bb4] placeholder:text-[#8b9bb4]/50 min-h-[120px] focus:ring-0 p-0 font-inter italic"
                defaultValue={"Focus on maintaining a cadence of 95-105 RPM during the 2-minute work intervals.\n\nThe recovery is short for a reason; we want to keep the oxygen uptake elevated between sets. If you feel the power dropping more than 5% by the 4th repeat, extend the recovery by 30 seconds."}
            />
        </div>
    );
}
