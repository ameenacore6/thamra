import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Cloud,
  Droplets,
  HeartPulse,
  Leaf,
  MapPin,
  MessageCircle,
  RefreshCw,
  Sprout,
  Sparkles,
  Sun,
  Thermometer,
  WifiOff,
} from 'lucide-react';
import { evaluateEnvironmentalRisks } from '../../data/cropDatabase';
import type {
  AppLanguage,
  AppNotification,
  AppPage,
  CareActivity,
  FarmEnvironmentSnapshot,
  FarmPlot,
  UserProfile,
  WaterTank,
} from '../../types/farm';
import { formatArea } from '../../utils/farmGeometry';
import { TamraCharacter } from '../tamra/TamraCharacter';

interface DashboardPageProps {
  language: AppLanguage;
  user: UserProfile | null;
  plots: FarmPlot[];
  activePlot: FarmPlot | null;
  snapshot: FarmEnvironmentSnapshot | null;
  loadingNasa: boolean;
  nasaError: string | null;
  notifications?: AppNotification[];
  waterTanks?: WaterTank[];
  careSchedules?: CareActivity[];
  onSelectPlot: (plotId: string) => void;
  onRefreshLive: () => void;
  onNavigate: (page: AppPage) => void;
  onOpenNotifications?: () => void;
  onOpenHealthTab?: (tab: 'ripeness' | 'disease' | 'health') => void;
  onOpenWaterCareTab?: (tab: 'water' | 'care') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  language,
  user,
  plots,
  activePlot,
  snapshot,
  loadingNasa,
  nasaError,
  notifications = [],
  waterTanks = [],
  careSchedules = [],
  onSelectPlot,
  onRefreshLive,
  onNavigate,
  onOpenNotifications,
  onOpenHealthTab,
  onOpenWaterCareTab,
}) => {
  const isAr = language === 'ar';
  const [showMoreAlerts, setShowMoreAlerts] = useState(false);

  const totalSections = useMemo(
    () => plots.reduce((acc, p) => acc + p.sections.length, 0),
    [plots],
  );

  const uniqueCrops = useMemo(() => {
    const set = new Set<string>();
    plots.forEach((p) => p.sections.forEach((s) => set.add(s.crop)));
    return Array.from(set);
  }, [plots]);

  const sixDayForecast = useMemo(() => {
    const days = snapshot?.power.days ?? [];
    return days.slice(-6);
  }, [snapshot]);

  const soilHealthBars = useMemo(() => {
    const days = snapshot?.power.days?.slice(-5) ?? [];
    if (days.length > 0) {
      return days.map((d) => {
        const pct =
          d.gwetTop !== null
            ? Math.max(12, Math.min(100, Math.round(d.gwetTop * 100)))
            : snapshot?.smap.surfacePercent ?? 0;
        return { date: d.date.slice(5), pct, raw: d.gwetTop };
      });
    }
    return [];
  }, [snapshot]);

  const latestTemp = snapshot?.power.latest?.t2m ?? null;
  const latestHumidity = snapshot?.power.latest?.humidityPercent ?? null;
  const smapLabel = snapshot?.smap.available
    ? snapshot.smap.statusLabel
    : snapshot?.power.latest?.gwetTop !== null && snapshot?.power.latest?.gwetTop !== undefined
      ? `${Math.round(snapshot.power.latest.gwetTop * 100)}%`
      : isAr
        ? 'غير متوفر'
        : 'Unavailable';

  const latestSectionAnalysis = useMemo(() => {
    if (!activePlot) return null;
    for (const sec of activePlot.sections) {
      if (sec.analysis) return { section: sec, analysis: sec.analysis };
    }
    return null;
  }, [activePlot]);

  const alerts = useMemo(
    () => evaluateEnvironmentalRisks(snapshot, activePlot?.sections[0]?.crop || 'Farm', language),
    [snapshot, activePlot, language],
  );

  const unreadAlerts = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications],
  );

  const primaryTank = waterTanks[0] ?? null;
  const pendingCareCount = useMemo(
    () => careSchedules.filter((c) => c.status === 'scheduled').length,
    [careSchedules],
  );

  return (
    <div className="space-y-4 animate-thamra-in">
      {/* Main Hero Card with Multi-Shade Depth & Subtle Botanical Accents */}
      <div className="thamra-card overflow-hidden">
        {/* Top Context Strip */}
        <div className="px-4 py-3 bg-gradient-to-r from-[#f8f6f2] via-[#f4f6ed] to-[#f8f6f2] border-b border-[#D5D5D5] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1C250C]">
            <MapPin className="w-4 h-4 text-[#535C21]" />
            <span>
              {activePlot
                ? activePlot.name
                : snapshot?.location.name || (isAr ? 'مزارع البحرين' : 'Bahrain Farm Overview')}
            </span>
            {plots.length > 1 && (
              <select
                value={activePlot?.id ?? ''}
                onChange={(e) => onSelectPlot(e.target.value)}
                aria-label={isAr ? 'تبديل المزرعة' : 'Switch farm'}
                className="text-xs px-2 py-1 bg-white border border-[#D5D5D5] rounded-lg"
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {user && (
              <span className="text-[#535C21] font-medium">
                {isAr ? `أهلاً ${user.name}` : `Welcome, ${user.name}`}
              </span>
            )}
            <button
              type="button"
              onClick={onRefreshLive}
              disabled={loadingNasa}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D5D5D5] hover:border-[#535C21] text-[#1C250C] font-medium cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingNasa ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث ناسا' : 'Refresh NASA'}</span>
            </button>
          </div>
        </div>

        {/* Live Notification Summary Strip */}
        {notifications.length > 0 && onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-full px-4 py-2 bg-gradient-to-r from-[#edf2e2] via-[#f7f4eb] to-[#DBAE83]/25 border-b border-[#D5D5D5] flex items-center justify-between gap-2 text-xs hover:brightness-98 cursor-pointer text-start"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-3.5 h-3.5 text-[#535C21] shrink-0" />
              <span className="font-bold text-[#1C250C] truncate">
                {isAr ? notifications[0].titleAr : notifications[0].titleEn}
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#535C21] whitespace-nowrap shrink-0">
              {unreadAlerts.length > 0
                ? isAr
                  ? `${unreadAlerts.length} تنبيه جديد`
                  : `${unreadAlerts.length} alerts`
                : isAr
                  ? 'فتح المركز'
                  : 'View all'}
            </span>
          </button>
        )}

        {/* Centerpiece Tamra Greeting with Subtle Botanical Framing */}
        <div
          className="px-4 py-6 flex flex-col items-center text-center relative overflow-hidden"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, #eef3e1 0%, #faf8f4 56%, #ffffff 100%)',
          }}
        >
          {/* Decorative SVG corner leaf silhouettes */}
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="w-24 h-24 text-[#535C21]/10 absolute -top-2 -start-2 pointer-events-none"
          >
            <path fill="currentColor" d="M12 108 C12 46, 52 14, 108 12 C96 68, 60 104, 12 108 Z" />
          </svg>
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="w-24 h-24 text-[#8E7D49]/10 absolute -bottom-3 -end-2 pointer-events-none rotate-180"
          >
            <path fill="currentColor" d="M12 108 C12 46, 52 14, 108 12 C96 68, 60 104, 12 108 Z" />
          </svg>

          <div className="p-2.5 rounded-full bg-[#535C21]/15 border border-[#535C21]/25 shadow-sm relative z-10">
            <TamraCharacter
              emotion={alerts[0]?.severity === 'elevated' ? 'concerned' : 'proud'}
              avatarState="idle"
              size={98}
              onClick={() => onNavigate('tamra')}
            />
          </div>
          <h2 className="mt-2.5 text-lg font-bold text-[#1C250C] relative z-10">
            {isAr ? 'تمرة تراقب مزرعتك' : 'Tamra is watching over your farm'}
          </h2>
          <p className="mt-1 text-xs text-[#535C21] max-w-md relative z-10">
            {snapshot?.isSampleData
              ? isAr
                ? `بيانات نموذجية: ${snapshot.sampleLabel || snapshot.location.name}`
                : `Demo Scenario: ${snapshot.sampleLabel || snapshot.location.name}`
              : snapshot
                ? isAr
                  ? `قراءة ناسا الحية (${snapshot.location.name})`
                  : `Live NASA satellite context (${snapshot.location.name})`
                : isAr
                  ? 'حدد موقع مزرعتك على الخريطة للبدء.'
                  : 'Select your farm on the Map to display live NASA data.'}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 relative z-10">
            <button
              type="button"
              onClick={() => onNavigate('tamra')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#535C21] hover:bg-[#414919] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحدث مع تمرة' : 'Talk to Tamra'}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-[#DBAE83]/20 text-[#1C250C] border border-[#D5D5D5] text-xs font-semibold transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[#535C21]" />
              <span>{isAr ? 'خريطة المزرعة' : 'Farm Map'}</span>
            </button>
          </div>
        </div>

        {/* 6-Day NASA POWER Weather Card */}
        <div className="px-4 pb-4 space-y-3.5">
          {nasaError && (
            <div className="rounded-xl bg-[#DBAE83]/25 border border-[#AD927E] px-3.5 py-2.5 text-xs text-[#1C250C]">
              {nasaError}
            </div>
          )}

          <div className="rounded-2xl border border-[#8E7D49]/35 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#1C250C]">
                {isAr ? 'سجل طقس ناسا (آخر 6 أيام)' : 'Recent NASA Weather (Last 6 Days)'}
              </span>
              <span className="text-[11px] text-[#8E7D49]">NASA POWER AG</span>
            </div>

            {sixDayForecast.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                {sixDayForecast.map((day) => {
                  const rainy = (day.precipitationMm ?? 0) >= 0.5;
                  const cloudy = (day.solarRadiationMj ?? 20) < 14;
                  return (
                    <div
                      key={day.date}
                      className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5]/70 py-2.5 px-1.5 flex flex-col items-center gap-1"
                    >
                      <span className="text-[10px] font-mono-tabular text-[#8E7D49]">
                        {day.date.slice(5)}
                      </span>
                      {rainy || cloudy ? (
                        <Cloud className="w-6 h-6 text-[#68a9db]" />
                      ) : (day.t2mMax ?? 30) >= 34 ? (
                        <Sun className="w-6 h-6 text-[#f5b727]" />
                      ) : (
                        <Sun className="w-6 h-6 text-[#e2a829]" />
                      )}
                      <span className="text-xs font-bold font-mono-tabular text-[#1C250C]">
                        {day.t2m !== null ? `${Math.round(day.t2m)}°C` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#8E7D49]">
                {loadingNasa
                  ? isAr
                    ? 'جاري تحميل بيانات NASA POWER...'
                    : 'Loading NASA POWER weather observations...'
                  : isAr
                    ? 'البيانات المناخية غير متوفرة حالياً.'
                    : 'Weather data is currently unavailable.'}
              </p>
            )}
          </div>

          {/* 2-Column Temperature & Soil Health Bar Chart Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-[#8E7D49]/35 bg-gradient-to-br from-white to-[#faf8f4] p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#1C250C]">
                  {isAr ? 'درجة الحرارة' : 'Temperature'}
                </p>
                <p className="mt-1 text-4xl font-bold font-mono-tabular text-[#1C250C]">
                  {latestTemp !== null ? `${Math.round(latestTemp)}°` : '—'}
                </p>
                <p className="mt-1.5 text-xs text-[#535C21]">
                  {latestHumidity !== null
                    ? isAr
                      ? `الرطوبة ${Math.round(latestHumidity)}% · VPD ${snapshot?.power.vpdKpa ?? '—'} kPa`
                      : `Humidity ${Math.round(latestHumidity)}% · VPD ${snapshot?.power.vpdKpa ?? '—'} kPa`
                    : isAr
                      ? 'بانتظار قراءة ناسا'
                      : 'Awaiting NASA POWER reading'}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#edf2e2] border border-[#535C21]/25 flex items-center justify-center shrink-0">
                <Thermometer className="w-8 h-8 text-[#535C21]" />
              </div>
            </div>

            <div className="rounded-2xl border border-[#8E7D49]/35 bg-gradient-to-br from-white to-[#f6f8ef] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-semibold text-[#1C250C]">
                    {isAr ? 'مؤشر رطوبة التربة (ناسا)' : 'Soil Moisture Trend'}
                  </p>
                  <p className="text-[11px] text-[#535C21]">
                    SMAP: <span className="font-semibold">{smapLabel}</span>
                  </p>
                </div>
                <Droplets className="w-4 h-4 text-[#535C21]" />
              </div>

              {soilHealthBars.length > 0 ? (
                <div className="grid grid-cols-5 gap-2 items-end h-20 pt-2 border-b border-dashed border-[#D5D5D5]">
                  {soilHealthBars.map((bar) => (
                    <div key={bar.date} className="flex flex-col items-center justify-end h-full">
                      <div
                        className="w-full max-w-[30px] rounded-t-md bg-gradient-to-t from-[#535C21] to-[#7a8932] transition-all"
                        style={{ height: `${bar.pct}%` }}
                        title={`${bar.date}: ${bar.pct}%`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#8E7D49] py-4">
                  {isAr ? 'مؤشر التربة غير متاح حالياً.' : 'Soil wetness trend unavailable.'}
                </p>
              )}
            </div>
          </div>

          {/* Satellite Farm Preview Strip */}
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="w-full rounded-2xl overflow-hidden border border-[#8E7D49]/50 relative h-24 bg-gradient-to-r from-[#2c3a14] via-[#535C21] to-[#3f4a19] text-white flex items-center justify-between px-5 cursor-pointer group shadow-xs"
          >
            <div className="text-start z-10">
              <p className="text-[11px] uppercase tracking-wider text-[#DBAE83] font-semibold">
                {isAr ? 'معاينة حدود المزرعة' : 'Farm Boundary & Crop Sections'}
              </p>
              <p className="text-sm sm:text-base font-bold mt-0.5">
                {activePlot
                  ? `${activePlot.name} · ${formatArea(activePlot.areaSqMeters, language)}`
                  : isAr
                    ? 'افتح خريطة الأقمار الصناعية لتحديد مزرعتك'
                    : 'Open Satellite Map & Mark Farm Boundaries'}
              </p>
            </div>
            <div className="z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 text-[#1C250C] text-xs font-semibold group-hover:bg-[#DBAE83] transition-colors shrink-0">
              <span>{isAr ? 'الخريطة' : 'Open Map'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </div>

        {/* Grassy Horizon Strip */}
        <div
          className="h-4 w-full"
          style={{
            background:
              'repeating-linear-gradient(105deg, #535C21 0px, #687a24 4px, #414b16 8px, #7b8d2d 12px)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Quick Launch Cards for AI Lab, Water Tank, Care Schedule & Farm Portfolio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => (onOpenHealthTab ? onOpenHealthTab('ripeness') : onNavigate('health'))}
          className="thamra-card-interactive p-4 text-start cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#8E7D49] font-semibold">
            <span>{isAr ? 'مختبر الصور والذكاء' : 'Crop AI Vision Lab'}</span>
            <Sparkles className="w-4 h-4 text-[#535C21]" />
          </div>
          <p className="mt-2 text-sm font-bold text-[#1C250C]">
            {isAr ? 'نضج الثمار والأمراض' : 'Ripeness, Disease & Health'}
          </p>
          <p className="mt-1 text-xs text-[#535C21]">
            {isAr ? 'افحص الثمار والأوراق بالكاميرا' : 'Analyze fruit or leaf photos'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => (onOpenWaterCareTab ? onOpenWaterCareTab('water') : onNavigate('water'))}
          className="thamra-card-interactive p-4 text-start cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#8E7D49] font-semibold">
            <span>{isAr ? 'مراقبة خزانات المياه' : 'Water Tank Monitor'}</span>
            {primaryTank?.status === 'connected' ? (
              <Droplets className="w-4 h-4 text-[#3d8cb8]" />
            ) : (
              <WifiOff className="w-4 h-4 text-[#AD927E]" />
            )}
          </div>
          <p className="mt-2 text-lg font-bold font-mono-tabular text-[#1C250C]">
            {primaryTank?.status === 'connected' && primaryTank.currentLevelPercent !== null
              ? `${primaryTank.currentLevelPercent}%`
              : isAr
                ? 'غير متصل'
                : 'Sensor not connected'}
          </p>
          <p className="mt-1 text-xs text-[#535C21]">
            {primaryTank ? primaryTank.name : isAr ? 'أضف خزان مياه للمتابعة' : 'Configure tank & webhook'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => (onOpenWaterCareTab ? onOpenWaterCareTab('care') : onNavigate('water'))}
          className="thamra-card-interactive p-4 text-start cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#8E7D49] font-semibold">
            <span>{isAr ? 'جدولة التسميد والرعاية' : 'Fertilisation & Care'}</span>
            <Calendar className="w-4 h-4 text-[#535C21]" />
          </div>
          <p className="mt-2 text-lg font-bold font-mono-tabular text-[#1C250C]">
            {pendingCareCount}{' '}
            <span className="text-xs font-semibold text-[#535C21]">
              {isAr ? 'مهام مجدولة' : 'scheduled'}
            </span>
          </p>
          <p className="mt-1 text-xs text-[#535C21]">
            {isAr ? 'NPK والرش الورقي والرطوبة' : 'NPK, foliar & monthly calendar'}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('rotation')}
          className="thamra-card-interactive p-4 text-start cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs text-[#8E7D49] font-semibold">
            <span>{isAr ? 'المزارع والأقسام' : 'Farms & Rotation'}</span>
            <Sprout className="w-4 h-4 text-[#535C21]" />
          </div>
          <p className="mt-2 text-lg font-bold font-mono-tabular text-[#1C250C]">
            {plots.length} / {totalSections}{' '}
            <span className="text-xs font-semibold text-[#535C21]">
              {isAr ? 'أقسام' : 'sections'}
            </span>
          </p>
          <p className="mt-1 text-xs text-[#535C21] truncate">
            {uniqueCrops.length > 0
              ? uniqueCrops.slice(0, 3).join(' · ')
              : isAr
                ? 'تخطيط الدورة ومكتبة المحاصيل'
                : 'Rotation planner & crop library'}
          </p>
        </button>
      </div>

      {/* Condensed Alerts & Latest Advice with Progressive Disclosure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="thamra-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#8E7D49]" />
              <span>{isAr ? 'تنبيهات زراعية (إرشادية)' : 'Agricultural Alerts (Indicative)'}</span>
            </h3>
            {alerts.length > 1 && (
              <button
                type="button"
                onClick={() => setShowMoreAlerts((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#535C21] hover:underline cursor-pointer"
              >
                {showMoreAlerts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showMoreAlerts ? (isAr ? 'أقل' : 'Less') : isAr ? `المزيد (${alerts.length})` : `More (${alerts.length})`}</span>
              </button>
            )}
          </div>

          {(showMoreAlerts ? alerts : alerts.slice(0, 1)).map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl border px-3 py-2.5 text-xs ${
                alert.severity === 'elevated'
                  ? 'bg-[#DBAE83]/25 border-[#AD927E]'
                  : 'bg-[#faf8f4] border-[#D5D5D5]'
              }`}
            >
              <p className="font-semibold text-[#1C250C]">
                {isAr ? alert.titleAr : alert.titleEn}
              </p>
              <p className="mt-0.5 text-[#535C21]">
                {isAr ? alert.detailAr : alert.detailEn}
              </p>
            </div>
          ))}
        </section>

        <section className="thamra-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-[#535C21]" />
              <span>{isAr ? 'أحدث توصيات تمرة' : 'Latest Tamra Insight'}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('analysis')}
              className="text-xs font-semibold text-[#535C21] hover:underline cursor-pointer"
            >
              {isAr ? 'التحليل الكامل ←' : 'Full Analysis →'}
            </button>
          </div>
          {latestSectionAnalysis ? (
            <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3 text-xs space-y-1">
              <p className="font-semibold text-[#535C21]">
                {latestSectionAnalysis.section.name} · {latestSectionAnalysis.section.crop}
              </p>
              <p className="text-[#1C250C]">{latestSectionAnalysis.analysis.summary}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3 text-xs text-[#535C21]">
              {isAr
                ? 'اسأل تمرة أو افتح التحليل على الخريطة للحصول على توصية مخصصة لقسمك.'
                : 'Ask Tamra or run a section analysis on your farm map to save tailored insights here.'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
