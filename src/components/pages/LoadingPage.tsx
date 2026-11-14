import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { AppLanguage } from '../../types/farm';

interface LoadingPageProps {
  language: AppLanguage;
  onComplete: () => void;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ language, onComplete }) => {
  const isAr = language === 'ar';
  const [progress, setProgress] = useState(18);

  useEffect(() => {
    const t1 = window.setTimeout(() => setProgress(58), 260);
    const t2 = window.setTimeout(() => setProgress(92), 750);
    const t3 = window.setTimeout(() => onComplete(), 1450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden"
      style={{
        background:
          'linear-gradient(170deg, #f9faef 0%, #eff4db 38%, #c7d996 72%, #535C21 100%)',
      }}
    >
      {/* Decorative soft olive wave matching loading_page.mp4 */}
      <svg
        viewBox="0 0 1440 420"
        preserveAspectRatio="none"
        className="pointer-events-none absolute bottom-0 inset-x-0 w-full h-[48vh] opacity-90"
        aria-hidden="true"
      >
        <path
          d="M0,180 C320,80 540,310 880,190 C1140,100 1300,150 1440,120 L1440,420 L0,420 Z"
          fill="#535C21"
        />
        <path
          d="M0,260 C360,170 680,350 1020,235 C1240,165 1360,215 1440,195 L1440,420 L0,420 Z"
          fill="#1C250C"
          opacity="0.42"
        />
      </svg>

      <div className="pt-10 px-6 w-full flex justify-end relative z-10">
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/80 hover:bg-white text-[#1C250C] text-xs font-semibold border border-[#535C21]/25 transition-colors cursor-pointer"
        >
          <span>{isAr ? 'تخطي' : 'Skip'}</span>
          <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 animate-wave-float">
        {/* Stylized Palm-Leaf & Sprout Emblem */}
        <div className="w-24 h-24 rounded-3xl bg-white/95 shadow-lg border border-[#535C21]/20 flex items-center justify-center mb-5">
          <svg viewBox="0 0 64 64" className="w-14 h-14" aria-hidden="true">
            <path
              d="M32 52 V28"
              stroke="#535C21"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M32 30 C18 28 11 19 14 11 C24 11 31 18 32 30 Z"
              fill="#535C21"
            />
            <path
              d="M32 28 C44 26 52 17 49 9 C39 9 32 16 32 28 Z"
              fill="#8E7D49"
            />
            <circle cx="32" cy="14" r="4.5" fill="#DBAE83" />
          </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1C250C]">
          THAMRA <span className="text-[#535C21]">· ثمرة</span>
        </h1>
        <p className="mt-2.5 text-sm sm:text-base font-medium text-[#1C250C]/85 max-w-md">
          {isAr
            ? 'منصة الزراعة الذكية للبحرين · بيانات ناسا الفضائية وتوصيات تمرة'
            : 'Smart Agriculture for Bahrain · NASA Satellite Insights & Tamra Guidance'}
        </p>

        <div className="mt-6 w-60 h-2 bg-white/75 rounded-full overflow-hidden border border-[#535C21]/20">
          <div
            className="h-full bg-[#535C21] transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-[#1C250C]/75">
          {isAr ? 'جاري تجهيز مزرعتك وبيانات الأقمار الصناعية...' : 'Preparing your farm workspace & NASA layers...'}
        </p>
      </div>

      <div className="relative z-10 pb-8 text-xs font-medium text-white/90">
        {isAr ? 'بيانات ناسا SMAP و POWER · البحرين' : 'NASA SMAP & POWER · Bahrain Farming Suite'}
      </div>
    </div>
  );
};
