import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Droplets,
  Info,
  RefreshCw,
  Sparkles,
  Sun,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  evaluateEnvironmentalRisks,
  findCropInLibrary,
} from '../../data/cropDatabase';
import {
  FIELDSHIFT_ENV_PROFILE,
  FIELDSHIFT_MONTHLY_CLIMATE_2025,
} from '../../data/fieldShiftData';
import { fetchNasaPowerDateRange } from '../../services/appApi';
import { analyzeSectionWithTamra } from '../../services/tamraApi';
import type {
  AppLanguage,
  AppPage,
  CropLibraryItem,
  CropSection,
  FarmEnvironmentSnapshot,
  FarmPlot,
  NasaPowerDay,
} from '../../types/farm';
import { describeSectionResolution, formatArea } from '../../utils/farmGeometry';

interface AnalysisPageProps {
  language: AppLanguage;
  plots: FarmPlot[];
  activePlotId: string | null;
  activeSectionId: string | null;
  snapshot: FarmEnvironmentSnapshot | null;
  loadingNasa: boolean;
  nasaError: string | null;
  allCrops: CropLibraryItem[];
  onSelectPlot: (plotId: string | null) => void;
  onSelectSection: (sectionId: string | null) => void;
  onRefreshLive: () => void;
  onUpdatePlot: (plotId: string, updater: (plot: FarmPlot) => FarmPlot) => void;
  onAskTamraAboutSection: (prompt: string) => void;
  onNavigate?: (page: AppPage) => void;
}

type RangeMode = '14d' | '30d' | 'custom' | 'bahrain_2025';

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  language,
  plots,
  activePlotId,
  activeSectionId,
  snapshot,
  loadingNasa,
  nasaError,
  allCrops,
  onSelectPlot,
  onSelectSection,
  onRefreshLive,
  onUpdatePlot,
  onAskTamraAboutSection,
  onNavigate,
}) => {
  const isAr = language === 'ar';
  const [showResolutionDetails, setShowResolutionDetails] = useState(false);
  const activePlot = useMemo(
    () => plots.find((p) => p.id === activePlotId) ?? plots[0] ?? null,
    [plots, activePlotId],
  );
  const activeSection: CropSection | null = useMemo(
    () => activePlot?.sections.find((s) => s.id === activeSectionId) ?? null,
    [activePlot, activeSectionId],
  );

  const effectiveSnapshot = activeSection?.snapshot ?? activePlot?.snapshot ?? snapshot;
  const targetCropName = activeSection?.crop || 'General Farm';
  const targetCropInfo = findCropInLibrary(targetCropName, allCrops);

  const [rangeMode, setRangeMode] = useState<RangeMode>('14d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(Date.now() - 30 * 86400_000);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [rangeDays, setRangeDays] = useState<NasaPowerDay[]>([]);
  const [loadingRange, setLoadingRange] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (rangeMode !== '30d') return;
    if (!effectiveSnapshot) return;
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 32 * 86400_000).toISOString().slice(0, 10);
    setLoadingRange(true);
    setRangeError(null);
    fetchNasaPowerDateRange({
      latitude: effectiveSnapshot.location.latitude,
      longitude: effectiveSnapshot.location.longitude,
      startDate: start,
      endDate: end,
    })
      .then((res) => setRangeDays(res.days))
      .catch((err) => setRangeError(err instanceof Error ? err.message : 'Unable to load 30-day range.'))
      .finally(() => setLoadingRange(false));
  }, [rangeMode, effectiveSnapshot?.location.latitude, effectiveSnapshot?.location.longitude]);

  const handleLoadCustomRange = async () => {
    if (!effectiveSnapshot) return;
    setLoadingRange(true);
    setRangeError(null);
    try {
      const res = await fetchNasaPowerDateRange({
        latitude: effectiveSnapshot.location.latitude,
        longitude: effectiveSnapshot.location.longitude,
        startDate: customStart,
        endDate: customEnd,
      });
      setRangeDays(res.days);
    } catch (err) {
      setRangeError(err instanceof Error ? err.message : 'Failed to load custom NASA POWER dates.');
    } finally {
      setLoadingRange(false);
    }
  };

  const chartDays =
    rangeMode === '14d' ? effectiveSnapshot?.power.days ?? [] : rangeDays;

  const cropConditionCheck = useMemo(() => {
    if (!effectiveSnapshot || !targetCropInfo) return null;
    const t = effectiveSnapshot.power.latest?.t2m ?? null;
    const withinTemp =
      t !== null ? t >= targetCropInfo.tempMinC && t <= targetCropInfo.tempMaxC : null;
    const smap = effectiveSnapshot.smap;
    const irrNeed =
      smap.status === 'very_dry' || smap.status === 'dry'
        ? isAr
          ? 'يُنصح بجدولة ري مبكر (الصباح الباكر) وتقليل فاقد التبخر.'
          : 'Irrigation attention recommended: soil moisture reads dry; schedule early morning drip irrigation.'
        : smap.status === 'optimal'
          ? isAr
            ? 'الرطوبة في نطاق متوازن — استمر على وتيرة الري المعتادة مع الفحص الميداني.'
            : 'Soil moisture is in an optimal regional range; maintain standard drip intervals and inspect field emitters.'
          : smap.status === 'moist' || smap.status === 'saturated'
            ? isAr
              ? 'التربة رطبة/مشبعة نسبياً — تجنب الإفراط في الري لتفادي اختناق الجذور.'
              : 'Soil reads moist/saturated; delay heavy irrigation to avoid root stress.'
            : isAr
              ? 'بيانات SMAP غير متوفرة لهذه النقطة؛ اعتمد على مؤشر GWETTOP من NASA POWER والفحص الحقلـي.'
              : 'SMAP pixel unavailable here; rely on NASA POWER GWETTOP and direct soil probe checks.';

    return { withinTemp, currentTemp: t, irrNeed };
  }, [effectiveSnapshot, targetCropInfo, isAr]);

  const risks = useMemo(
    () => evaluateEnvironmentalRisks(effectiveSnapshot, targetCropName, language),
    [effectiveSnapshot, targetCropName, language],
  );

  const resolutionNote = useMemo(() => {
    if (activeSection && activePlot) {
      return describeSectionResolution(activeSection, activePlot, language).message;
    }
    return isAr
      ? 'ملاحظة دقة القمر الصناعي: تغطي شبكة NASA SMAP خلية ~9 كم وNASA POWER خلية ~50 كم. هذه القراءات تمثل النطاق الإقليمي المحيط بالمزرعة وليست مجسات داخلية لكل حوض.'
      : 'Satellite Spatial Resolution Notice: NASA SMAP provides ~9 km pixels and NASA POWER uses ~50 km grid cells. Readings reflect regional environmental context around your farm rather than plot-level micro-sensors.';
  }, [activeSection, activePlot, language, isAr]);

  const handleRunAiAnalysis = async () => {
    if (!activePlot || !activeSection || !effectiveSnapshot) return;
    setAnalyzingAi(true);
    setAiError(null);
    try {
      const analysis = await analyzeSectionWithTamra({
        language,
        plotName: activePlot.name,
        plotAreaSqMeters: activePlot.areaSqMeters,
        soilType: activePlot.soilType,
        sectionName: activeSection.name,
        crop: activeSection.crop,
        sectionAreaSqMeters: activeSection.areaSqMeters,
        snapshot: effectiveSnapshot,
        resolutionContext: resolutionNote,
      });
      onUpdatePlot(activePlot.id, (prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === activeSection.id ? { ...s, analysis } : s,
        ),
      }));
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Unable to run Tamra section analysis.');
    } finally {
      setAnalyzingAi(false);
    }
  };

  const maxChartTemp = Math.max(
    42,
    ...chartDays.map((d) => d.t2mMax ?? d.t2m ?? 25),
  );

  return (
    <div className="space-y-4">
      {/* Farm & Section Switcher Header */}
      <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#1C250C] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#535C21]" />
            <span>{isAr ? 'تحليل البيئة والمحاصيل (بيانات ناسا)' : 'Farm & Section Environmental Analysis'}</span>
          </h1>
          <p className="text-xs text-[#535C21] mt-0.5">
            {effectiveSnapshot
              ? `${effectiveSnapshot.location.name} (${effectiveSnapshot.location.latitude.toFixed(3)}, ${effectiveSnapshot.location.longitude.toFixed(3)})`
              : isAr
                ? 'حدد مزرعتك على الخريطة لعرض التحليل الكامل'
                : 'Select a farm location on the Map to view detailed NASA readings'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {plots.length > 0 && (
            <select
              value={activePlot?.id ?? ''}
              onChange={(e) => onSelectPlot(e.target.value || null)}
              aria-label={isAr ? 'اختر المزرعة' : 'Select farm'}
              className="px-3 py-1.5 text-xs font-semibold bg-[#faf8f4] border border-[#D5D5D5] rounded-lg text-[#1C250C]"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatArea(p.areaSqMeters, language)})
                </option>
              ))}
            </select>
          )}

          {activePlot && activePlot.sections.length > 0 && (
            <select
              value={activeSection?.id ?? ''}
              onChange={(e) => onSelectSection(e.target.value || null)}
              aria-label={isAr ? 'اختر القسم' : 'Select crop section'}
              className="px-3 py-1.5 text-xs font-semibold bg-[#faf8f4] border border-[#D5D5D5] rounded-lg text-[#1C250C]"
            >
              <option value="">{isAr ? 'المزرعة كاملة' : 'Whole Farm Overview'}</option>
              {activePlot.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.crop}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={onRefreshLive}
            disabled={loadingNasa}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#535C21] hover:bg-[#414919] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingNasa ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث البيانات الحية' : 'Refresh Live NASA'}</span>
          </button>
        </div>
      </div>

      {nasaError && (
        <div className="rounded-xl bg-[#DBAE83]/25 border border-[#AD927E] px-4 py-3 text-xs text-[#1C250C]">
          {nasaError}
        </div>
      )}

      {/* Compact Resolution Disclosure */}
      <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] px-4 py-2.5 text-xs text-[#535C21]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Info className="w-4 h-4 text-[#8E7D49] shrink-0" />
            <span>
              {isAr
                ? 'دقة القمر الصناعي: SMAP ~9 كم · POWER ~50 كم (مؤشر إقليمي)'
                : 'Satellite Scale: NASA SMAP ~9 km · POWER ~50 km (Regional context)'}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setShowResolutionDetails((v) => !v)}
            className="text-xs font-bold text-[#535C21] hover:underline cursor-pointer"
          >
            {showResolutionDetails ? (isAr ? 'إخفاء' : 'Less') : isAr ? 'التفاصيل' : 'View Details'}
          </button>
        </div>
        {showResolutionDetails && (
          <p className="mt-2 pt-2 border-t border-[#D5D5D5] text-[#1C250C]">{resolutionNote}</p>
        )}
      </div>

      {/* SMAP + NASA POWER Core Metrics */}
      {effectiveSnapshot ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* NASA SMAP */}
          <div className="bg-white border border-[#D5D5D5] rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#535C21]">
              <span>NASA SMAP L4</span>
              <Droplets className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-[#1C250C]">
              {effectiveSnapshot.smap.available
                ? `${effectiveSnapshot.smap.surfaceMoistureM3M3?.toFixed(2) ?? '—'} m³/m³`
                : effectiveSnapshot.smap.statusLabel}
            </p>
            <p className="text-xs text-[#8E7D49]">
              {effectiveSnapshot.smap.available
                ? `${isAr ? 'منطقة الجذور:' : 'Root-zone:'} ${effectiveSnapshot.smap.rootZoneMoistureM3M3?.toFixed(2) ?? '—'} m³/m³ · ${effectiveSnapshot.smap.observationDate}`
                : effectiveSnapshot.smap.note || (isAr ? 'غير متوفر لهذه الخلية' : 'Unavailable at this pixel')}
            </p>
          </div>

          {/* Temperature & Humidity */}
          <div className="bg-white border border-[#D5D5D5] rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#535C21]">
              <span>{isAr ? 'الحرارة والرطوبة' : 'Temp & Humidity'}</span>
              <Thermometer className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold font-mono-tabular text-[#1C250C]">
              {effectiveSnapshot.power.latest?.t2m !== null && effectiveSnapshot.power.latest?.t2m !== undefined
                ? `${effectiveSnapshot.power.latest.t2m}°C`
                : '—'}
            </p>
            <p className="text-xs text-[#8E7D49] font-mono-tabular">
              {isAr ? 'عظمى/صغرى:' : 'Max/Min:'}{' '}
              {effectiveSnapshot.power.latest?.t2mMax ?? '—'}° / {effectiveSnapshot.power.latest?.t2mMin ?? '—'}° · RH{' '}
              {effectiveSnapshot.power.latest?.humidityPercent ?? '—'}%
            </p>
          </div>

          {/* Solar & VPD */}
          <div className="bg-white border border-[#D5D5D5] rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#535C21]">
              <span>{isAr ? 'الإشعاع الشمسي والتبخر' : 'Solar & Evap (VPD)'}</span>
              <Sun className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold font-mono-tabular text-[#1C250C]">
              {effectiveSnapshot.power.latestSolarMj !== null
                ? `${effectiveSnapshot.power.latestSolarMj} MJ/m²`
                : '—'}
            </p>
            <p className="text-xs text-[#8E7D49] font-mono-tabular">
              VPD: {effectiveSnapshot.power.vpdKpa ?? '—'} kPa · 7d Avg Temp:{' '}
              {effectiveSnapshot.power.sevenDayAvgTempC ?? '—'}°C
            </p>
          </div>

          {/* Rainfall & Wind */}
          <div className="bg-white border border-[#D5D5D5] rounded-xl p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#535C21]">
              <span>{isAr ? 'الأمطار والرياح ورطوبة POWER' : 'Rain, Wind & POWER Wetness'}</span>
              <Wind className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold font-mono-tabular text-[#1C250C]">
              {effectiveSnapshot.power.sevenDayRainMm ?? 0} mm <span className="text-xs font-normal">(7d)</span>
            </p>
            <p className="text-xs text-[#8E7D49] font-mono-tabular">
              GWETTOP:{' '}
              {effectiveSnapshot.power.latest?.gwetTop !== null &&
              effectiveSnapshot.power.latest?.gwetTop !== undefined
                ? `${Math.round(effectiveSnapshot.power.latest.gwetTop * 100)}%`
                : '—'}{' '}
              · {effectiveSnapshot.power.latest?.windSpeedMs ?? '—'} m/s
            </p>
          </div>
        </div>
      ) : null}

      {/* Selectable Date Ranges & Historical Charts */}
      <section className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#535C21]" />
            <span>{isAr ? 'الرسوم البيانية التاريخية والمدى الزمني' : 'Historical Trends & Selectable Date Ranges'}</span>
          </h2>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: '14d', en: '14 Days (Live)', ar: '14 يوماً (حي)' },
                { id: '30d', en: '30 Days (NASA POWER)', ar: '30 يوماً (ناسا)' },
                { id: 'custom', en: 'Custom Date Range', ar: 'فترة مخصصة' },
                { id: 'bahrain_2025', en: 'Bahrain 2025 Baseline', ar: 'مرجع البحرين 2025' },
              ] as Array<{ id: RangeMode; en: string; ar: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRangeMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  rangeMode === tab.id
                    ? 'bg-[#535C21] text-white'
                    : 'bg-[#faf8f4] border border-[#D5D5D5] text-[#1C250C] hover:border-[#535C21]'
                }`}
              >
                {isAr ? tab.ar : tab.en}
              </button>
            ))}
          </div>
        </div>

        {rangeMode === 'custom' && (
          <div className="flex flex-wrap items-end gap-2 bg-[#faf8f4] p-3 rounded-xl border border-[#D5D5D5]">
            <div>
              <label className="block text-[11px] font-medium text-[#535C21] mb-1">
                {isAr ? 'من تاريخ' : 'Start Date'}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#D5D5D5] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#535C21] mb-1">
                {isAr ? 'إلى تاريخ' : 'End Date'}
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-[#D5D5D5] rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleLoadCustomRange()}
              disabled={loadingRange}
              className="px-3.5 py-1.5 rounded-lg bg-[#1C250C] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {loadingRange
                ? isAr
                  ? 'جاري الجلب...'
                  : 'Loading...'
                : isAr
                  ? 'جلب بيانات ناسا'
                  : 'Fetch NASA POWER'}
            </button>
          </div>
        )}

        {rangeError && (
          <p className="text-xs text-[#8E7D49] bg-[#DBAE83]/20 rounded-lg px-3 py-2">{rangeError}</p>
        )}

        {rangeMode === 'bahrain_2025' ? (
          <div className="space-y-3">
            <p className="text-xs text-[#535C21]">
              {FIELDSHIFT_ENV_PROFILE.location} ({FIELDSHIFT_ENV_PROFILE.year}) ·{' '}
              {isAr ? 'متوسط العظمى:' : 'Avg Max:'} {FIELDSHIFT_ENV_PROFILE.avgMaxTempC}°C ·{' '}
              {isAr ? 'الأمطار السنوية:' : 'Annual Rain:'} {FIELDSHIFT_ENV_PROFILE.annualRainfallMm} mm ·{' '}
              NDVI: {FIELDSHIFT_ENV_PROFILE.avgNdvi}
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 items-end h-36 pt-3 border-b border-[#D5D5D5]">
              {FIELDSHIFT_MONTHLY_CLIMATE_2025.map((m) => (
                <div key={m.month} className="flex flex-col items-center justify-end h-full gap-1">
                  <span className="text-[10px] font-mono-tabular text-[#535C21]">
                    {Math.round(m.t2mMax)}°
                  </span>
                  <div
                    className="w-full max-w-[22px] bg-[#535C21] rounded-t"
                    style={{ height: `${Math.round((m.t2mMax / 42) * 85)}%` }}
                    title={`${m.labelEn}: Max ${m.t2mMax}°C, Rain ${m.precipMm}mm`}
                  />
                  <span className="text-[10px] text-[#8E7D49] pb-1">
                    {isAr ? m.labelAr.slice(0, 3) : m.labelEn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : chartDays.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-end gap-1.5 h-36 pt-3 overflow-x-auto border-b border-[#D5D5D5]">
              {chartDays.map((d) => {
                const temp = d.t2m ?? 0;
                const heightPct = Math.max(10, Math.round((temp / maxChartTemp) * 85));
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-[22px] flex flex-col items-center justify-end h-full gap-1"
                    title={`${d.date}: ${d.t2m ?? '—'}°C, Rain ${d.precipitationMm ?? 0}mm, RH ${d.humidityPercent ?? '—'}%`}
                  >
                    <span className="text-[9px] font-mono-tabular text-[#535C21]">
                      {d.t2m !== null ? `${Math.round(d.t2m)}°` : ''}
                    </span>
                    <div
                      className="w-full max-w-[24px] rounded-t bg-[#535C21] hover:bg-[#8E7D49] transition-colors"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-mono-tabular text-[#8E7D49] pb-1">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[#8E7D49]">
              {isAr
                ? 'مرر المؤشر على أي عمود لعرض الحرارة اليومية، الأمطار، والرطوبة النسبية من NASA POWER.'
                : 'Hover any bar to inspect daily air temperature, precipitation, and humidity from NASA POWER.'}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[#8E7D49] py-4">
            {loadingRange
              ? isAr
                ? 'جاري تحميل السجل التاريخي...'
                : 'Loading historical observations...'
              : isAr
                ? 'اضغط "جلب بيانات ناسا" أو اختر نافذة زمنية.'
                : 'Select a date range above to inspect historical NASA POWER readings.'}
          </p>
        )}
      </section>

      {/* Crop Conditions + Irrigation + Risk Warnings + Tamra AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-[#1C250C]">
            {isAr
              ? `فحص ظروف النمو والري (${targetCropInfo?.nameAr || targetCropName})`
              : `Growing Conditions & Irrigation Check (${targetCropName})`}
          </h2>
          {cropConditionCheck && targetCropInfo && (
            <div className="space-y-2 text-xs">
              <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3 space-y-1">
                <p className="font-semibold text-[#1C250C]">
                  {isAr ? 'نطاق الحرارة المثالي:' : 'Preferred Temperature Window:'}{' '}
                  <span className="font-mono-tabular">
                    {targetCropInfo.tempMinC}°C – {targetCropInfo.tempMaxC}°C
                  </span>{' '}
                  {cropConditionCheck.withinTemp !== null && (
                    <span
                      className={
                        cropConditionCheck.withinTemp ? 'text-[#535C21] font-bold' : 'text-[#8E7D49] font-bold'
                      }
                    >
                      ({cropConditionCheck.withinTemp
                        ? isAr
                          ? 'مناسب حالياً'
                          : 'Within range'
                        : isAr
                          ? 'خارج النطاق المفضل'
                          : 'Outside preferred range'}
                      )
                    </span>
                  )}
                </p>
                <p className="text-[#535C21]">
                  {isAr ? targetCropInfo.climateAr : targetCropInfo.climateEn}
                </p>
              </div>
              <div className="rounded-xl bg-[#f3f2ee] border border-[#D5D5D5] p-3">
                <p className="font-semibold text-[#1C250C] mb-1">
                  {isAr ? 'توصية الري:' : 'Irrigation Guidance:'}
                </p>
                <p className="text-[#535C21]">{cropConditionCheck.irrNeed}</p>
              </div>
            </div>
          )}

          {activeSection && (
            <div className="pt-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleRunAiAnalysis()}
                  disabled={analyzingAi || !effectiveSnapshot}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C250C] hover:bg-[#2c3a14] text-[#DBAE83] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {analyzingAi
                      ? isAr
                        ? 'جاري تحليل القسم...'
                        : 'Analyzing Section...'
                      : isAr
                        ? 'تحليل هذا القسم عبر تمرة'
                        : 'Run Tamra AI Section Analysis'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAskTamraAboutSection(
                      isAr
                        ? `حلل قسم "${activeSection.name}" المزروع بـ ${activeSection.crop} بناءً على بيانات ناسا الحالية.`
                        : `Analyze my "${activeSection.name}" section growing ${activeSection.crop} using current NASA readings.`,
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D5D5D5] hover:border-[#535C21] text-[#1C250C] text-xs font-semibold cursor-pointer"
                >
                  <span>{isAr ? 'اسأل تمرة مباشرة' : 'Ask Tamra in Chat'}</span>
                </button>
              </div>

              {aiError && <p className="text-xs text-[#8E7D49]">{aiError}</p>}

              {activeSection.analysis && (
                <div className="rounded-xl border border-[#535C21]/30 bg-[#535C21]/5 p-3 text-xs space-y-1.5">
                  <p className="font-bold text-[#1C250C]">{activeSection.analysis.summary}</p>
                  <p className="text-[#535C21]">{activeSection.analysis.irrigationAdvice}</p>
                  <p className="text-[#535C21]">{activeSection.analysis.cropSuitability}</p>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#8E7D49]" />
              <span>{isAr ? 'مؤشرات المخاطر البيئية المحتملة' : 'Possible Environmental Risk Indicators'}</span>
            </h2>
          </div>
          <p className="text-[11px] text-[#8E7D49]">
            {isAr
              ? 'هذه تنبيهات إرشادية مبنية على الطقس والرطوبة الإقليمية وليست تشخيصاً مخبرياً أو حقلياً مؤكداً.'
              : 'Indicative weather & moisture risk flags only — not a confirmed plant disease diagnosis.'}
          </p>
          <div className="space-y-2">
            {risks.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border p-3 text-xs ${
                  r.severity === 'elevated'
                    ? 'bg-[#DBAE83]/25 border-[#AD927E]'
                    : 'bg-[#faf8f4] border-[#D5D5D5]'
                }`}
              >
                <p className="font-bold text-[#1C250C]">{isAr ? r.titleAr : r.titleEn}</p>
                <p className="mt-0.5 text-[#535C21]">{isAr ? r.detailAr : r.detailEn}</p>
              </div>
            ))}
          </div>

          {onNavigate && (
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onNavigate('health')}
                className="px-3 py-1.5 rounded-lg bg-[#535C21] text-white text-xs font-semibold cursor-pointer"
              >
                {isAr ? 'فحص النبات والأمراض بالصور' : 'Open Plant Health & Disease Screening'}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('water')}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#D5D5D5] hover:border-[#535C21] text-xs font-semibold text-[#1C250C] cursor-pointer"
              >
                {isAr ? 'جدولة الرطوبة والتسميد' : 'Humidity & Care Schedule'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
