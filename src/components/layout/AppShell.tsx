import React, { useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Droplets,
  Leaf,
  LogIn,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import type { AppLanguage, AppPage, FarmPlot, UserProfile } from '../../types/farm';

interface AppShellProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  language: AppLanguage;
  onToggleLanguage: () => void;
  activePlot: FarmPlot | null;
  plots: FarmPlot[];
  onSelectPlot: (plotId: string) => void;
  user: UserProfile | null;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activePage,
  onNavigate,
  language,
  onToggleLanguage,
  activePlot,
  plots,
  onSelectPlot,
  user,
  unreadNotificationsCount,
  onOpenNotifications,
  children,
}) => {
  const isAr = language === 'ar';
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  const desktopLinks: Array<{ id: AppPage; labelEn: string; labelAr: string; icon: React.ReactNode }> = [
    { id: 'dashboard', labelEn: 'Home', labelAr: 'الرئيسية', icon: <Leaf className="w-4 h-4" /> },
    { id: 'analysis', labelEn: 'Analysis', labelAr: 'التحليل', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'map', labelEn: 'Map', labelAr: 'الخريطة', icon: <MapPin className="w-4 h-4" /> },
    { id: 'health', labelEn: 'Crop Lab', labelAr: 'فحص النبات', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'water', labelEn: 'Water & Care', labelAr: 'المياه والرعاية', icon: <Droplets className="w-4 h-4" /> },
    { id: 'tamra', labelEn: 'Tamra AI', labelAr: 'تمرة', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'rotation', labelEn: 'Rotation', labelAr: 'الدورة', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'community', labelEn: 'Community', labelAr: 'المجتمع', icon: <Users className="w-4 h-4" /> },
  ];

  // Bottom nav preserving core mockup slots + quick More/Tools access
  const mobileBottomLinks: Array<{ id: AppPage; labelEn: string; labelAr: string; icon: React.ReactNode }> = [
    { id: 'dashboard', labelEn: 'Home', labelAr: 'الرئيسية', icon: <Leaf className="w-5 h-5" /> },
    { id: 'map', labelEn: 'Map', labelAr: 'الخريطة', icon: <MapPin className="w-5 h-5" /> },
    { id: 'tamra', labelEn: 'Tamra', labelAr: 'تمرة', icon: <MessageCircle className="w-5 h-5" /> },
    { id: 'health', labelEn: 'Crop Lab', labelAr: 'فحص النبات', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'water', labelEn: 'Water/Care', labelAr: 'المياه', icon: <Droplets className="w-5 h-5" /> },
  ];

  const isSecondaryMobilePage =
    activePage === 'analysis' ||
    activePage === 'rotation' ||
    activePage === 'community' ||
    activePage === 'settings';

  return (
    <div className="min-h-screen flex flex-col text-[#1C250C]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Multi-Shade Olive Top Bar */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#3f4816] via-[#535C21] to-[#636e28] text-white border-b border-[#1C250C]/25 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          {/* Left: Brand & Active Farm Selector */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="font-bold tracking-tight text-base sm:text-lg text-white hover:text-[#DBAE83] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <span>THAMRA</span>
              <span className="text-[#DBAE83] font-semibold">ثمرة</span>
            </button>

            {plots.length > 0 && (
              <div className="hidden md:flex items-center gap-1 text-xs bg-[#1C250C]/35 rounded-lg px-2 py-1 border border-white/15">
                <span className="text-white/80 whitespace-nowrap">
                  {isAr ? 'مزرعتي:' : 'Farm:'}
                </span>
                <select
                  aria-label={isAr ? 'اختر المزرعة' : 'Select farm'}
                  value={activePlot?.id ?? plots[0].id}
                  onChange={(e) => onSelectPlot(e.target.value)}
                  className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[130px] truncate"
                >
                  {plots.map((p) => (
                    <option key={p.id} value={p.id} className="text-[#1C250C] bg-white">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Center: Desktop Primary Navigation */}
          <nav
            aria-label={isAr ? 'التنقل الرئيسي' : 'Primary navigation'}
            className="hidden xl:flex items-center gap-1"
          >
            {desktopLinks.map((item) => {
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#1C250C] text-[#DBAE83] shadow-xs'
                      : 'text-white/90 hover:bg-white/12 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{isAr ? item.labelAr : item.labelEn}</span>
                </button>
              );
            })}
          </nav>

          {/* Compact Desktop / Tablet Nav (lg to xl) */}
          <nav
            aria-label={isAr ? 'تنقل سريع' : 'Quick navigation'}
            className="hidden lg:flex xl:hidden items-center gap-1 overflow-x-auto"
          >
            {desktopLinks.map((item) => {
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={isAr ? item.labelAr : item.labelEn}
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active ? 'bg-[#1C250C] text-[#DBAE83]' : 'text-white/90 hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span>{isAr ? item.labelAr : item.labelEn}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Notification Bell, Language Toggle, Settings, Account */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label={isAr ? 'مركز التنبيهات' : 'Open notifications'}
              className="relative p-1.5 rounded-lg bg-[#1C250C]/45 hover:bg-[#1C250C] border border-white/20 text-white transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4 text-[#DBAE83]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -end-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono-tabular flex items-center justify-center border border-[#535C21]">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="px-2.5 py-1 text-xs font-semibold text-[#1C250C] bg-[#DBAE83] hover:bg-[#cfa073] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isAr ? 'EN' : 'العربية'}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label={isAr ? 'الإعدادات' : 'Settings'}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                activePage === 'settings'
                  ? 'bg-[#1C250C] border-[#DBAE83] text-[#DBAE83]'
                  : 'border-white/20 text-white hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate(user ? 'settings' : 'login')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C250C]/60 hover:bg-[#1C250C] border border-white/20 text-xs font-medium text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              {user ? <User className="w-3.5 h-3.5 text-[#DBAE83]" /> : <LogIn className="w-3.5 h-3.5 text-[#DBAE83]" />}
              <span className="hidden sm:inline max-w-[90px] truncate">
                {user ? user.name.split(' ')[0] : isAr ? 'دخول' : 'Login'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area with Subtle Botanical Accent */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 pb-24 lg:pb-8 relative">
        {/* Consistent Back to Home (Dashboard) Bar on every non-Dashboard page */}
        {activePage !== 'dashboard' && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5D5D5] hover:border-[#535C21] hover:bg-[#edf2e2]/60 text-xs font-bold text-[#1C250C] shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft className={`w-3.5 h-3.5 text-[#535C21] ${isAr ? 'rotate-180' : ''}`} />
              <span>{isAr ? 'العودة إلى الرئيسية' : 'Back to Home'}</span>
            </button>

            <div className="flex items-center gap-1.5 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileToolsOpen((v) => !v)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-[#D5D5D5] text-xs font-semibold text-[#535C21] cursor-pointer"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>{isAr ? 'كل الصفحات' : 'All Pages'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Secondary Page Drawer */}
        {mobileToolsOpen && (
          <div className="lg:hidden mb-3 thamra-card p-3 animate-thamra-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#1C250C]">
                {isAr ? 'التنقل السريع في ثمرة' : 'All THAMRA Modules'}
              </span>
              <button
                type="button"
                onClick={() => setMobileToolsOpen(false)}
                className="p-1 rounded-lg text-[#8E7D49] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {desktopLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => {
                    onNavigate(link.id);
                    setMobileToolsOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                    activePage === link.id
                      ? 'bg-[#535C21] text-white border-[#535C21]'
                      : 'bg-[#faf8f4] text-[#1C250C] border-[#D5D5D5]'
                  }`}
                >
                  {link.icon}
                  <span>{isAr ? link.labelAr : link.labelEn}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {children}
      </main>

      {/* Olive Bottom Bar for mobile & tablet */}
      <nav
        aria-label={isAr ? 'شريط التنقل السفلي' : 'Bottom navigation'}
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-gradient-to-r from-[#414a16] via-[#535C21] to-[#4b541d] border-t border-[#1C250C]/25 text-white shadow-lg"
      >
        <div className="max-w-lg mx-auto grid grid-cols-6 h-16">
          {mobileBottomLinks.map((item) => {
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setMobileToolsOpen(false);
                  onNavigate(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                  active ? 'bg-[#1C250C]/75 text-[#DBAE83]' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                {item.icon}
                <span className="truncate max-w-full px-1">
                  {isAr ? item.labelAr : item.labelEn}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileToolsOpen((v) => !v)}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              isSecondaryMobilePage || mobileToolsOpen
                ? 'bg-[#1C250C]/75 text-[#DBAE83]'
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="truncate max-w-full px-1">{isAr ? 'المزيد' : 'More'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
