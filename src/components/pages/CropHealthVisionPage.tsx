import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  HelpCircle,
  HeartPulse,
  Leaf,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { CROP_LIBRARY, SUPPORTED_RIPE_FRUITS } from '../../data/cropDatabase';
import {
  analyzeFruitRipenessApi,
  analyzePlantDiseaseApi,
  analyzePlantHealthApi,
  fetchAgRecommendationsApi,
} from '../../services/appApi';
import type {
  AgRecommendationResult,
  AppLanguage,
  CropLibraryItem,
  DiseaseDetectionRecord,
  FarmEnvironmentSnapshot,
  FarmPlot,
  FruitRipenessResult,
  PlantHealthObservation,
} from '../../types/farm';
import {
  type CapturedImagePayload,
  ImageCaptureInput,
} from '../common/ImageCaptureInput';

export type VisionTab = 'ripeness' | 'disease' | 'health';

interface CropHealthVisionPageProps {
  language: AppLanguage;
  plots: FarmPlot[];
  activePlotId: string | null;
  activeSectionId: string | null;
  snapshot: FarmEnvironmentSnapshot | null;
  allCrops: CropLibraryItem[];
  ripenessHistory: FruitRipenessResult[];
  diseaseDetections: DiseaseDetectionRecord[];
  healthObservations: PlantHealthObservation[];
  initialTab?: VisionTab;
  prefillRecommendation?: { crop: string; issue: string } | null;
  onClearPrefillRecommendation?: () => void;
  onSaveRipeness: (item: FruitRipenessResult) => void;
  onSaveDisease: (item: DiseaseDetectionRecord) => void;
  onSaveHealthObservation: (item: PlantHealthObservation) => void;
  onOpenDiseaseInRotation: (diseaseId?: string) => void;
  onAskTamra: (prompt: string) => void;
  onLogApiError?: (title: string, detail: string) => void;
}

export const CropHealthVisionPage: React.FC<CropHealthVisionPageProps> = ({
  language,
  plots,
  activePlotId,
  activeSectionId,
  snapshot,
  allCrops,
  ripenessHistory,
  diseaseDetections,
  healthObservations,
  initialTab,
  prefillRecommendation,
  onClearPrefillRecommendation,
  onSaveRipeness,
  onSaveDisease,
  onSaveHealthObservation,
  onOpenDiseaseInRotation,
  onAskTamra,
  onLogApiError,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<VisionTab>(initialTab || 'ripeness');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const activePlot = useMemo(
    () => plots.find((p) => p.id === activePlotId) ?? plots[0] ?? null,
    [plots, activePlotId],
  );
  const defaultSection = useMemo(
    () =>
      activePlot?.sections.find((s) => s.id === activeSectionId) ??
      activePlot?.sections[0] ??
      null,
    [activePlot, activeSectionId],
  );

  // 1. Fruit Ripeness State
  const [fruitChoice, setFruitChoice] = useState<string>(SUPPORTED_RIPE_FRUITS[0].nameEn);
  const [customFruit, setCustomFruit] = useState('');
  const [ripenessImg, setRipenessImg] = useState<CapturedImagePayload | null>(null);
  const [analyzingRipeness, setAnalyzingRipeness] = useState(false);
  const [ripenessError, setRipenessError] = useState<string | null>(null);
  const [latestRipeness, setLatestRipeness] = useState<FruitRipenessResult | null>(
    ripenessHistory[0] ?? null,
  );
  const [showRipenessDetails, setShowRipenessDetails] = useState(false);

  // 2. Plant Disease & Injury State
  const [diseaseSectionId, setDiseaseSectionId] = useState<string>(defaultSection?.id ?? '');
  const [diseaseCrop, setDiseaseCrop] = useState<string>(
    defaultSection?.crop || CROP_LIBRARY[0].nameEn,
  );
  const [diseaseImg, setDiseaseImg] = useState<CapturedImagePayload | null>(null);
  const [analyzingDisease, setAnalyzingDisease] = useState(false);
  const [diseaseError, setDiseaseError] = useState<string | null>(null);
  const [latestDisease, setLatestDisease] = useState<DiseaseDetectionRecord | null>(
    diseaseDetections[0] ?? null,
  );
  const [showDiseaseDetails, setShowDiseaseDetails] = useState(false);

  // 3. Plant Health Monitoring State
  const [healthSectionId, setHealthSectionId] = useState<string>(defaultSection?.id ?? '');
  const [healthCrop, setHealthCrop] = useState<string>(
    defaultSection?.crop || CROP_LIBRARY[0].nameEn,
  );
  const [healthNotes, setHealthNotes] = useState('');
  const [healthImg, setHealthImg] = useState<CapturedImagePayload | null>(null);
  const [analyzingHealth, setAnalyzingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [latestHealth, setLatestHealth] = useState<PlantHealthObservation | null>(
    healthObservations[0] ?? null,
  );
  const [showHealthDetails, setShowHealthDetails] = useState(false);

  // 4. Pesticide, Organic & Equipment Recommendations State
  const [recCrop, setRecCrop] = useState<string>(defaultSection?.crop || 'Tomatoes');
  const [recIssue, setRecIssue] = useState<string>('Powdery Mildew / Early Leaf Spots');
  const [loadingRec, setLoadingRec] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [agRec, setAgRec] = useState<AgRecommendationResult | null>(null);
  const [showChemicalLabels, setShowChemicalLabels] = useState(false);

  useEffect(() => {
    if (defaultSection) {
      setDiseaseSectionId(defaultSection.id);
      setDiseaseCrop(defaultSection.crop);
      setHealthSectionId(defaultSection.id);
      setHealthCrop(defaultSection.crop);
      setRecCrop(defaultSection.crop);
    }
  }, [defaultSection?.id]);

  useEffect(() => {
    if (prefillRecommendation) {
      setRecCrop(prefillRecommendation.crop);
      setRecIssue(prefillRecommendation.issue);
      setActiveTab('health');
      onClearPrefillRecommendation?.();
    }
  }, [prefillRecommendation, onClearPrefillRecommendation]);

  const effectiveFruitName =
    fruitChoice === '__custom__' ? customFruit.trim() || 'Fruit' : fruitChoice;

  const handleAnalyzeRipeness = async () => {
    if (!ripenessImg) return;
    setAnalyzingRipeness(true);
    setRipenessError(null);
    try {
      const res = await analyzeFruitRipenessApi({
        imageBase64: ripenessImg.base64,
        mimeType: ripenessImg.mimeType,
        fruitType: effectiveFruitName,
        language,
      });
      const enriched: FruitRipenessResult = {
        ...res,
        imageThumb: ripenessImg.thumbDataUrl,
      };
      setLatestRipeness(enriched);
      onSaveRipeness(enriched);
      setShowRipenessDetails(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to analyze fruit ripeness.';
      setRipenessError(msg);
      onLogApiError?.('Fruit Ripeness Vision Error', msg);
    } finally {
      setAnalyzingRipeness(false);
    }
  };

  const handleAnalyzeDisease = async () => {
    if (!diseaseImg) return;
    setAnalyzingDisease(true);
    setDiseaseError(null);
    const matchedSection = activePlot?.sections.find((s) => s.id === diseaseSectionId);
    try {
      const det = await analyzePlantDiseaseApi({
        imageBase64: diseaseImg.base64,
        mimeType: diseaseImg.mimeType,
        crop: diseaseCrop,
        language,
        nasaSummary: snapshot
          ? {
              location: snapshot.location.name,
              tempC: snapshot.power.latest?.t2m,
              humidityPct: snapshot.power.latest?.humidityPercent,
              smapStatus: snapshot.smap.statusLabel,
            }
          : undefined,
      });
      const enriched: DiseaseDetectionRecord = {
        ...det,
        plotId: activePlot?.id,
        sectionId: matchedSection?.id,
        sectionName: matchedSection?.name,
        imageThumb: diseaseImg.thumbDataUrl,
      };
      setLatestDisease(enriched);
      onSaveDisease(enriched);
      setShowDiseaseDetails(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to screen plant image.';
      setDiseaseError(msg);
      onLogApiError?.('Plant Disease Screening Error', msg);
    } finally {
      setAnalyzingDisease(false);
    }
  };

  const previousSectionObservation = useMemo(() => {
    return (
      healthObservations.find(
        (o) =>
          (healthSectionId && o.sectionId === healthSectionId) ||
          o.crop.toLowerCase() === healthCrop.toLowerCase(),
      ) ?? null
    );
  }, [healthObservations, healthSectionId, healthCrop]);

  const handleAnalyzePlantHealth = async () => {
    if (!healthImg) return;
    setAnalyzingHealth(true);
    setHealthError(null);
    const matchedSection = activePlot?.sections.find((s) => s.id === healthSectionId);

    const prevThumb = previousSectionObservation?.imageThumb;
    const prevBase64 =
      prevThumb && prevThumb.includes(',') ? prevThumb.slice(prevThumb.indexOf(',') + 1) : undefined;

    try {
      const obs = await analyzePlantHealthApi({
        imageBase64: healthImg.base64,
        mimeType: healthImg.mimeType,
        crop: healthCrop,
        language,
        previousImageBase64: prevBase64,
        previousSummary: previousSectionObservation
          ? `${previousSectionObservation.recordedAt.slice(0, 10)}: ${previousSectionObservation.overallStatus} (${previousSectionObservation.visibleFindings[0] || ''})`
          : undefined,
      });
      const enriched: PlantHealthObservation = {
        ...obs,
        plotId: activePlot?.id,
        sectionId: matchedSection?.id,
        sectionName: matchedSection?.name,
        notes: healthNotes.trim() || undefined,
        imageThumb: healthImg.thumbDataUrl,
      };
      setLatestHealth(enriched);
      onSaveHealthObservation(enriched);
      setHealthNotes('');
      setShowHealthDetails(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to analyze plant health.';
      setHealthError(msg);
      onLogApiError?.('Plant Health Vision Error', msg);
    } finally {
      setAnalyzingHealth(false);
    }
  };

  const handleFetchAgRecommendations = async (overrideCrop?: string, overrideIssue?: string) => {
    const targetCrop = (overrideCrop || recCrop).trim() || 'Tomatoes';
    const targetIssue = (overrideIssue || recIssue).trim() || 'General crop care';
    setRecCrop(targetCrop);
    setRecIssue(targetIssue);
    setLoadingRec(true);
    setRecError(null);
    try {
      const rec = await fetchAgRecommendationsApi({
        crop: targetCrop,
        issue: targetIssue,
        soilType: activePlot?.soilType || 'Sandy Loam',
        language,
        nasaSummary: snapshot
          ? {
              location: snapshot.location.name,
              tempC: snapshot.power.latest?.t2m,
              humidityPct: snapshot.power.latest?.humidityPercent,
              smapStatus: snapshot.smap.statusLabel,
            }
          : undefined,
      });
      setAgRec(rec);
      setShowChemicalLabels(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate recommendations.';
      setRecError(msg);
      onLogApiError?.('Recommendations Error', msg);
    } finally {
      setLoadingRec(false);
    }
  };

  const getRipenessVisual = (stage: FruitRipenessResult['ripenessStage']) => {
    switch (stage) {
      case 'unripe':
        return {
          pct: 28,
          bar: 'bg-[#7d9c3b]',
          box: 'bg-[#eef4df] border-[#7d9c3b]/40 text-[#3c4a16]',
          label: isAr ? 'غير ناضج (مبكر)' : 'Unripe',
        };
      case 'ripe':
        return {
          pct: 66,
          bar: 'bg-[#535C21]',
          box: 'bg-[#e8f0d8] border-[#535C21] text-[#1C250C]',
          label: isAr ? 'ناضج — مثالي للقطف' : 'Ripe — Harvest Ready',
        };
      case 'overripe':
        return {
          pct: 94,
          bar: 'bg-[#a65d2a]',
          box: 'bg-[#DBAE83]/35 border-[#a65d2a]/50 text-[#5c2b0e]',
          label: isAr ? 'زائد النضج — استهلاك فوري' : 'Overripe — Use Soon',
        };
      default:
        return {
          pct: 12,
          bar: 'bg-[#8E7D49]',
          box: 'bg-[#f4f2ec] border-[#AD927E] text-[#1C250C]',
          label: isAr ? 'غير واضح — يرجى إعادة التصوير' : 'Unclear Image',
        };
    }
  };

  const getHealthBadge = (status: PlantHealthObservation['overallStatus']) => {
    if (status === 'healthy') {
      return {
        cls: 'bg-[#e8f0d8] text-[#3f4a19] border-[#535C21]/40',
        label: isAr ? 'نمو جيد' : 'Healthy Appearance',
      };
    }
    if (status === 'watch') {
      return {
        cls: 'bg-[#DBAE83]/30 text-[#6e4618] border-[#AD927E]',
        label: isAr ? 'يحتاج متابعة' : 'Needs Watch',
      };
    }
    if (status === 'stressed') {
      return {
        cls: 'bg-red-50 text-red-800 border-red-300',
        label: isAr ? 'إجهاد ملحوظ' : 'Visible Stress',
      };
    }
    return {
      cls: 'bg-[#f4f2ec] text-[#535C21] border-[#D5D5D5]',
      label: isAr ? 'صورة غير واضحة' : 'Unclear Photo',
    };
  };

  return (
    <div className="space-y-4 animate-thamra-in">
      {/* Page Header */}
      <div className="thamra-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-lg font-bold text-[#1C250C] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#535C21]" />
            <span>
              {isAr ? 'مختبر فحص المحاصيل بالذكاء الاصطناعي' : 'AI Crop Inspection & Advisory Lab'}
            </span>
          </h1>
          <p className="text-xs text-[#535C21] mt-0.5">
            {isAr
              ? 'فحص نضج الثمار، التحقق المبدئي من الأمراض والإصابات، متابعة صحة النبات، وتوصيات المكافحة الآمنة'
              : 'Fruit ripeness, indicative disease screening, multi-date plant health tracking & safe input advice'}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 relative z-10">
          {(
            [
              { id: 'ripeness', en: 'Fruit Ripeness', ar: 'نضج الثمار', icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'disease', en: 'Disease & Injury', ar: 'الأمراض والإصابات', icon: <Bug className="w-3.5 h-3.5" /> },
              { id: 'health', en: 'Plant Health & Inputs', ar: 'صحة النبات والتوصيات', icon: <HeartPulse className="w-3.5 h-3.5" /> },
            ] as Array<{ id: VisionTab; en: string; ar: string; icon: React.ReactNode }>
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === t.id
                  ? 'bg-[#535C21] text-white shadow-xs'
                  : 'bg-[#faf8f4] border border-[#D5D5D5] text-[#1C250C] hover:border-[#535C21]'
              }`}
            >
              {t.icon}
              <span>{isAr ? t.ar : t.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: FRUIT RIPENESS DETECTION                           */}
      {/* ========================================================= */}
      {activeTab === 'ripeness' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 thamra-card p-4 space-y-3.5">
            <h2 className="text-sm font-bold text-[#1C250C]">
              {isAr ? '1. اختر نوع الثمرة والتقط الصورة' : '1. Select Fruit & Capture Photo'}
            </h2>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-[#535C21]">
                {isAr ? 'نوع الثمرة' : 'Fruit Type'}
              </label>
              <select
                value={fruitChoice}
                onChange={(e) => setFruitChoice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#faf8f4] border border-[#D5D5D5] font-medium"
              >
                {SUPPORTED_RIPE_FRUITS.map((f) => (
                  <option key={f.id} value={f.nameEn}>
                    {isAr ? f.nameAr : f.nameEn}
                  </option>
                ))}
                <option value="__custom__">
                  {isAr ? '+ نوع ثمرة آخر (مخصص)' : '+ Other / Expandable Fruit Type'}
                </option>
              </select>

              {fruitChoice === '__custom__' && (
                <input
                  type="text"
                  value={customFruit}
                  onChange={(e) => setCustomFruit(e.target.value)}
                  placeholder={isAr ? 'اكتب اسم الثمرة (مثال: رمان، جوافة)' : 'Enter fruit name (e.g. Guava, Loquat)'}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#535C21]/40 text-xs"
                />
              )}
            </div>

            <ImageCaptureInput
              language={language}
              currentPreview={ripenessImg?.previewDataUrl ?? null}
              onImageSelected={setRipenessImg}
              labelEn="Upload or photograph a fruit close-up in clear daylight"
              labelAr="ارفع صورة واضحة للثمرة في إضاءة طبيعية"
            />

            {ripenessError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {ripenessError}
              </p>
            )}

            <button
              type="button"
              disabled={!ripenessImg || analyzingRipeness}
              onClick={() => void handleAnalyzeRipeness()}
              className="w-full py-2.5 rounded-xl bg-[#1C250C] hover:bg-[#2d3b15] text-[#DBAE83] font-bold text-xs cursor-pointer disabled:opacity-45 transition-colors"
            >
              {analyzingRipeness
                ? isAr
                  ? 'جاري تحليل نضج الثمرة...'
                  : 'Analyzing Fruit Ripeness...'
                : isAr
                  ? 'تحليل درجة النضج بالذكاء الاصطناعي'
                  : 'Analyze Ripeness with AI'}
            </button>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {latestRipeness ? (
              (() => {
                const vis = getRipenessVisual(latestRipeness.ripenessStage);
                return (
                  <div className="thamra-card p-5 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-[#8E7D49] uppercase">
                          {latestRipeness.fruitType}
                        </span>
                        <h3 className="text-base font-bold text-[#1C250C]">{vis.label}</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-xl border text-xs font-bold font-mono-tabular ${vis.box}`}>
                        {isAr ? 'الثقة:' : 'Confidence:'} {latestRipeness.confidencePct}%
                      </span>
                    </div>

                    {/* Visual Ripeness Spectrum Bar */}
                    <div className="space-y-1">
                      <div className="h-3 rounded-full bg-[#e8e5dd] overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${vis.bar}`}
                          style={{ width: `${vis.pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-semibold text-[#8E7D49]">
                        <span>{isAr ? 'غير ناضج' : 'Unripe'}</span>
                        <span>{isAr ? 'ناضج مثالي' : 'Ripe'}</span>
                        <span>{isAr ? 'نضج زائد' : 'Overripe'}</span>
                      </div>
                    </div>

                    {latestRipeness.ripenessStage === 'unclear' && (
                      <div className="rounded-xl bg-[#DBAE83]/25 border border-[#AD927E] p-3 text-xs text-[#1C250C] flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-[#8E7D49] shrink-0 mt-0.5" />
                        <span>
                          {latestRipeness.uncertaintyNote ||
                            (isAr
                              ? 'الصورة غير واضحة بما يكفي لتحديد النضج بثقة. يرجى التقاط صورة أقرب في إضاءة نهارية جيدة.'
                              : 'Image is too unclear to determine ripeness reliably. Please capture a sharper close-up in daylight.')}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-[#1C250C] leading-relaxed">
                      {latestRipeness.explanation}
                    </p>

                    <div className="rounded-xl bg-[#edf2e2]/70 border border-[#535C21]/30 p-3 text-xs">
                      <p className="font-bold text-[#535C21]">
                        {isAr ? 'توصية الحصاد والاستخدام:' : 'Harvest & Use Recommendation:'}
                      </p>
                      <p className="mt-0.5 text-[#1C250C]">{latestRipeness.harvestRecommendation}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRipenessDetails((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#535C21] hover:underline cursor-pointer"
                      >
                        {showRipenessDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>{showRipenessDetails ? (isAr ? 'إخفاء المؤشرات البصرية' : 'Hide Visual Cues') : isAr ? 'عرض التفاصيل والمؤشرات البصرية' : 'View Visual Cues'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onAskTamra(
                            isAr
                              ? `فحصت ثمرة "${latestRipeness.fruitType}" والنتيجة كانت "${vis.label}" (${latestRipeness.explanation}). متى يفضل أن أقطف أو أتصرف؟`
                              : `I scanned "${latestRipeness.fruitType}" and got "${vis.label}" (${latestRipeness.explanation}). What harvest or storage steps do you recommend?`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#535C21] text-white text-xs font-semibold cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{isAr ? 'اسأل تمرة' : 'Ask Tamra'}</span>
                      </button>
                    </div>

                    {showRipenessDetails && (
                      <div className="pt-2 border-t border-[#D5D5D5] text-xs space-y-1.5 animate-thamra-in">
                        <p className="font-semibold text-[#535C21]">
                          {isAr ? 'المؤشرات المرصودة في الصورة:' : 'Detected Visual Cues:'}
                        </p>
                        <ul className="list-disc ps-5 text-[#1C250C] space-y-0.5">
                          {latestRipeness.visualCues.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                        {latestRipeness.uncertaintyNote && latestRipeness.ripenessStage !== 'unclear' && (
                          <p className="text-[11px] text-[#8E7D49]">{latestRipeness.uncertaintyNote}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="thamra-card p-6 text-center space-y-2">
                <Sparkles className="w-7 h-7 text-[#535C21] mx-auto" />
                <p className="text-sm font-bold text-[#1C250C]">
                  {isAr ? 'جاهز لفحص نضج الثمار' : 'Ready to Assess Fruit Ripeness'}
                </p>
                <p className="text-xs text-[#535C21] max-w-md mx-auto">
                  {isAr
                    ? 'يدعم التمر/الرطب، الطماطم، الفلفل، الخيار، الفراولة، التين والحمضيات — أو أي ثمرة تكتبها.'
                    : 'Supports Bahrain dates (Khalal/Rutab/Tamar), tomatoes, peppers, cucumbers, strawberries, figs, citrus, or custom fruits.'}
                </p>
              </div>
            )}

            {/* Recent Ripeness History */}
            {ripenessHistory.length > 0 && (
              <div className="thamra-card p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-[#1C250C]">
                  {isAr ? 'سجل فحوصات النضج المحفوظة' : 'Recent Ripeness Checks'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ripenessHistory.slice(0, 4).map((item) => {
                    const v = getRipenessVisual(item.ripenessStage);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLatestRipeness(item)}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-[#D5D5D5] bg-[#faf8f4] hover:border-[#535C21] text-start cursor-pointer"
                      >
                        {item.imageThumb && (
                          <img
                            src={item.imageThumb}
                            alt={item.fruitType}
                            className="w-11 h-11 rounded-lg object-cover shrink-0 border border-[#D5D5D5]"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1C250C] truncate">{item.fruitType}</p>
                          <p className="text-[11px] font-semibold text-[#535C21]">{v.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: COMMON PLANT DISEASES & INJURIES SCREENING         */}
      {/* ========================================================= */}
      {activeTab === 'disease' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 thamra-card p-4 space-y-3.5">
            <div className="rounded-xl bg-[#DBAE83]/25 border border-[#AD927E] p-3 text-[11px] text-[#1C250C] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#8E7D49] shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? 'هذا الفحص استرشادي مبدئي لاكتشاف الأعراض المحتملة (فطريات، حشرات، إصابات أو نقص عناصر) وليس تشخيصاً مخبرياً مؤكداً.'
                  : 'Indicative visual screening only — highlights possible fungal, pest, or physical injury patterns, never a confirmed laboratory diagnosis.'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {activePlot && activePlot.sections.length > 0 && (
                <div>
                  <label className="block font-semibold text-[#535C21] mb-1">
                    {isAr ? 'القسم الزراعي' : 'Farm Section'}
                  </label>
                  <select
                    value={diseaseSectionId}
                    onChange={(e) => {
                      const secId = e.target.value;
                      setDiseaseSectionId(secId);
                      const sec = activePlot.sections.find((s) => s.id === secId);
                      if (sec) setDiseaseCrop(sec.crop);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#faf8f4] border border-[#D5D5D5]"
                  >
                    <option value="">{isAr ? 'مزرعة عامة' : 'General Farm'}</option>
                    {activePlot.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.crop})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={activePlot?.sections.length ? '' : 'sm:col-span-2'}>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'المحصول المصاب' : 'Affected Crop'}
                </label>
                <select
                  value={diseaseCrop}
                  onChange={(e) => setDiseaseCrop(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#faf8f4] border border-[#D5D5D5] font-medium"
                >
                  {allCrops.filter((c) => c.id !== 'unused').map((c) => (
                    <option key={c.id} value={c.nameEn}>
                      {isAr ? c.nameAr : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ImageCaptureInput
              language={language}
              currentPreview={diseaseImg?.previewDataUrl ?? null}
              onImageSelected={setDiseaseImg}
              labelEn="Photo affected leaves, spots, pests, or stem injury"
              labelAr="التقط أو ارفع صورة واضحة للأوراق أو البقع أو الإصابة"
            />

            {diseaseError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {diseaseError}
              </p>
            )}

            <button
              type="button"
              disabled={!diseaseImg || analyzingDisease}
              onClick={() => void handleAnalyzeDisease()}
              className="w-full py-2.5 rounded-xl bg-[#1C250C] hover:bg-[#2d3b15] text-[#DBAE83] font-bold text-xs cursor-pointer disabled:opacity-45"
            >
              {analyzingDisease
                ? isAr
                  ? 'جاري فحص الأعراض...'
                  : 'Screening Plant Symptoms...'
                : isAr
                  ? 'فحص الأعراض بالذكاء الاصطناعي'
                  : 'Screen Plant Image'}
            </button>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {latestDisease ? (
              <div className="thamra-card p-5 space-y-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#8E7D49]">
                      <span>{latestDisease.crop}</span>
                      {latestDisease.sectionName && <span>· {latestDisease.sectionName}</span>}
                      <span className="px-2 py-0.5 rounded bg-[#edf2e2] text-[#535C21] uppercase">
                        {latestDisease.category}
                      </span>
                    </div>
                    <h3 className="mt-1 text-base font-bold text-[#1C250C]">
                      {isAr ? 'احتمال مرصود: ' : 'Possible Issue: '}
                      {latestDisease.suspectedIssue}
                    </h3>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-[#faf8f4] border border-[#D5D5D5] text-xs font-bold font-mono-tabular text-[#535C21]">
                    {latestDisease.confidencePct}% ({latestDisease.confidence})
                  </span>
                </div>

                {latestDisease.uncertaintyNote && (
                  <div className="rounded-xl bg-[#DBAE83]/25 border border-[#AD927E] p-3 text-xs text-[#1C250C]">
                    {latestDisease.uncertaintyNote}
                  </div>
                )}

                <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3 text-xs space-y-1">
                  <p className="font-bold text-[#535C21]">
                    {isAr ? 'التوجيه المبدئي للتعامل:' : 'Initial Handling Guidance:'}
                  </p>
                  <p className="text-[#1C250C] leading-relaxed">{latestDisease.treatmentGuidance}</p>
                </div>

                {/* Action Linkages */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDiseaseDetails((v) => !v)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#faf8f4] border border-[#D5D5D5] text-xs font-semibold text-[#1C250C] cursor-pointer"
                  >
                    {showDiseaseDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showDiseaseDetails ? (isAr ? 'تفاصيل أقل' : 'Less Details') : isAr ? 'المزيد (الأعراض والوقاية)' : 'View Details & Prevention'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecCrop(latestDisease.crop);
                      setRecIssue(latestDisease.suspectedIssue);
                      setActiveTab('health');
                      void handleFetchAgRecommendations(latestDisease.crop, latestDisease.suspectedIssue);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#535C21] text-white text-xs font-semibold cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isAr ? 'توصيات المبيدات والبدائل العضوية' : 'Safe Treatment & Input Options'}</span>
                  </button>

                  {latestDisease.matchedDiseaseId && (
                    <button
                      type="button"
                      onClick={() => onOpenDiseaseInRotation(latestDisease.matchedDiseaseId)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#535C21]/40 text-xs font-semibold text-[#535C21] hover:bg-[#edf2e2] cursor-pointer"
                    >
                      <span>{isAr ? 'فتح في دليل الأمراض والدورة' : 'Open in Diseases & Rotation'}</span>
                      <ArrowRight className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onAskTamra(
                        isAr
                          ? `فحصت محصول ${latestDisease.crop} وظهرت علامات "${latestDisease.suspectedIssue}". ما الخطوات العملية التالية؟`
                          : `I screened my ${latestDisease.crop} and spotted possible "${latestDisease.suspectedIssue}". What next checks and preventive steps should I take?`,
                      )
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1C250C] text-[#DBAE83] text-xs font-semibold cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{isAr ? 'اسأل تمرة' : 'Ask Tamra'}</span>
                  </button>
                </div>

                {showDiseaseDetails && (
                  <div className="pt-3 border-t border-[#D5D5D5] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-thamra-in">
                    <div className="space-y-1">
                      <p className="font-bold text-[#1C250C]">{isAr ? 'الأعراض المرئية' : 'Visible Symptoms'}</p>
                      <ul className="list-disc ps-4 text-[#535C21] space-y-0.5">
                        {latestDisease.visibleSymptoms.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-[#1C250C]">{isAr ? 'الأسباب المحتملة' : 'Possible Causes'}</p>
                      <ul className="list-disc ps-4 text-[#535C21] space-y-0.5">
                        {latestDisease.possibleCauses.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-[#1C250C]">{isAr ? 'الخطوات الفورية' : 'Recommended Next Steps'}</p>
                      <ul className="list-disc ps-4 text-[#535C21] space-y-0.5">
                        {latestDisease.recommendedNextSteps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-[#1C250C]">{isAr ? 'طرق الوقاية' : 'Prevention Methods'}</p>
                      <ul className="list-disc ps-4 text-[#535C21] space-y-0.5">
                        {latestDisease.preventionMethods.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="thamra-card p-6 text-center space-y-2">
                <Bug className="w-7 h-7 text-[#8E7D49] mx-auto" />
                <p className="text-sm font-bold text-[#1C250C]">
                  {isAr ? 'ارفع صورة نبات لفحص الأمراض والإصابات' : 'Upload a Plant Photo to Screen Symptoms'}
                </p>
                <p className="text-xs text-[#535C21] max-w-md mx-auto">
                  {isAr
                    ? 'يرتبط الفحص مباشرة بأقسام مزرعتك وبدليل الأمراض في صفحة الدورة الزراعية.'
                    : 'Screenings link to your farm sections and connect straight into Plant Rotation Diseases & Safe Input Advice.'}
                </p>
              </div>
            )}

            {diseaseDetections.length > 0 && (
              <div className="thamra-card p-4 space-y-2">
                <h3 className="text-xs font-bold text-[#1C250C]">
                  {isAr ? 'الفحوصات المحفوظة' : 'Saved Plant Screenings'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {diseaseDetections.slice(0, 4).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setLatestDisease(d)}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-[#D5D5D5] bg-[#faf8f4] hover:border-[#535C21] text-start cursor-pointer"
                    >
                      {d.imageThumb && (
                        <img
                          src={d.imageThumb}
                          alt={d.suspectedIssue}
                          className="w-11 h-11 rounded-lg object-cover shrink-0 border border-[#D5D5D5]"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1C250C] truncate">{d.suspectedIssue}</p>
                        <p className="text-[11px] text-[#535C21] truncate">
                          {d.crop} {d.sectionName ? `· ${d.sectionName}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PLANT HEALTH MONITORING & AG INPUT RECOMMENDATIONS */}
      {/* ========================================================= */}
      {activeTab === 'health' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Plant Health Capture & Multi-Date Comparison */}
            <div className="lg:col-span-5 thamra-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#535C21]" />
                <span>{isAr ? 'متابعة صحة النبات عبر الزمن' : 'Plant Health Observation Check'}</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {activePlot && activePlot.sections.length > 0 && (
                  <div>
                    <label className="block font-semibold text-[#535C21] mb-1">
                      {isAr ? 'القسم' : 'Section'}
                    </label>
                    <select
                      value={healthSectionId}
                      onChange={(e) => {
                        const secId = e.target.value;
                        setHealthSectionId(secId);
                        const sec = activePlot.sections.find((s) => s.id === secId);
                        if (sec) setHealthCrop(sec.crop);
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#faf8f4] border border-[#D5D5D5]"
                    >
                      <option value="">{isAr ? 'ملاحظة عامة' : 'Whole Farm'}</option>
                      {activePlot.sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.crop})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={activePlot?.sections.length ? '' : 'sm:col-span-2'}>
                  <label className="block font-semibold text-[#535C21] mb-1">
                    {isAr ? 'المحصول' : 'Crop'}
                  </label>
                  <select
                    value={healthCrop}
                    onChange={(e) => setHealthCrop(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#faf8f4] border border-[#D5D5D5] font-medium"
                  >
                    {allCrops.filter((c) => c.id !== 'unused').map((c) => (
                      <option key={c.id} value={c.nameEn}>
                        {isAr ? c.nameAr : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {previousSectionObservation && (
                <div className="rounded-xl bg-[#edf2e2]/70 border border-[#535C21]/30 p-2.5 flex items-center gap-2.5 text-xs">
                  {previousSectionObservation.imageThumb && (
                    <img
                      src={previousSectionObservation.imageThumb}
                      alt="Baseline"
                      className="w-11 h-11 rounded-lg object-cover shrink-0 border border-[#D5D5D5]"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-[#1C250C]">
                      {isAr ? 'سيتم المقارنة مع الملاحظة السابقة:' : 'Will compare with prior check:'}
                    </p>
                    <p className="text-[11px] text-[#535C21] truncate">
                      {previousSectionObservation.recordedAt.slice(0, 10)} ·{' '}
                      {previousSectionObservation.visibleFindings[0] || previousSectionObservation.overallStatus}
                    </p>
                  </div>
                </div>
              )}

              <ImageCaptureInput
                language={language}
                currentPreview={healthImg?.previewDataUrl ?? null}
                onImageSelected={setHealthImg}
                labelEn="Upload or take a photo of plant foliage / canopy"
                labelAr="ارفع أو التقط صورة للمجموع الخضري للنبات"
              />

              <input
                type="text"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder={isAr ? 'ملاحظات إضافية (اختياري)...' : 'Optional field observation notes...'}
                className="w-full px-3 py-2 text-xs bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
              />

              {healthError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {healthError}
                </p>
              )}

              <button
                type="button"
                disabled={!healthImg || analyzingHealth}
                onClick={() => void handleAnalyzePlantHealth()}
                className="w-full py-2.5 rounded-xl bg-[#535C21] hover:bg-[#414919] text-white font-bold text-xs cursor-pointer disabled:opacity-45"
              >
                {analyzingHealth
                  ? isAr
                    ? 'جاري فحص صحة النبات...'
                    : 'Analyzing Plant Health...'
                  : previousSectionObservation
                    ? isAr
                      ? 'تسجيل ومقارنة بالصورة السابقة'
                      : 'Record & Compare with Baseline'
                    : isAr
                      ? 'تحليل وحفظ الملاحظة'
                      : 'Analyze & Save Observation'}
              </button>
            </div>

            {/* Latest Observation Result */}
            <div className="lg:col-span-7 space-y-4">
              {latestHealth ? (
                (() => {
                  const badge = getHealthBadge(latestHealth.overallStatus);
                  return (
                    <div className="thamra-card p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold text-[#8E7D49]">
                            {latestHealth.crop} {latestHealth.sectionName ? `· ${latestHealth.sectionName}` : ''}
                          </span>
                          <h3 className="text-base font-bold text-[#1C250C] mt-0.5">
                            {isAr ? 'تقرير ملاحظة صحة النبات' : 'Plant Health Assessment'}
                          </h3>
                        </div>
                        <span className={`px-3 py-1 rounded-xl border text-xs font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {latestHealth.comparisonNote && (
                        <div className="rounded-xl bg-[#edf2e2]/70 border border-[#535C21]/30 p-3 text-xs text-[#1C250C]">
                          <strong className="text-[#535C21]">
                            {isAr ? 'مقارنة بالتاريخ السابق: ' : 'Comparison over time: '}
                          </strong>
                          {latestHealth.comparisonNote}
                        </div>
                      )}

                      <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3 text-xs space-y-1.5">
                        <p className="font-bold text-[#1C250C]">
                          {isAr ? 'الأسباب المحتملة المتعددة (تُذكر دون افتراض سبب واحد):' : 'Multiple Possible Causes to Check:'}
                        </p>
                        <ul className="list-disc ps-4 text-[#535C21] space-y-0.5">
                          {latestHealth.possibleCauses.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowHealthDetails((v) => !v)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#faf8f4] border border-[#D5D5D5] text-xs font-semibold text-[#1C250C] cursor-pointer"
                        >
                          {showHealthDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>{showHealthDetails ? (isAr ? 'إخفاء الفحوصات الميدانية' : 'Hide Field Checks') : isAr ? 'المزيد (الفحوصات والتوصيات)' : 'View Field Checks & Tips'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleFetchAgRecommendations(
                              latestHealth.crop,
                              latestHealth.visibleFindings[0] || 'Nutrient / canopy stress',
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#535C21] text-white text-xs font-semibold cursor-pointer"
                        >
                          <Leaf className="w-3.5 h-3.5" />
                          <span>{isAr ? 'الحصول على توصيات الأسمدة والمعدات' : 'Generate Input & Care Plan'}</span>
                        </button>
                      </div>

                      {showHealthDetails && (
                        <div className="pt-2 border-t border-[#D5D5D5] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-thamra-in">
                          <div>
                            <p className="font-bold text-[#1C250C] mb-1">
                              {isAr ? 'ما رُصد في الصورة' : 'Visible Findings'}
                            </p>
                            <ul className="list-disc ps-4 text-[#535C21] space-y-0.5">
                              {latestHealth.visibleFindings.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-bold text-[#1C250C] mb-1">
                              {isAr ? 'فحوصات ميدانية مقترحة' : 'Suggested Field Checks'}
                            </p>
                            <ul className="list-disc ps-4 text-[#535C21] space-y-0.5">
                              {latestHealth.recommendedChecks.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="thamra-card p-6 text-center space-y-1.5">
                  <HeartPulse className="w-7 h-7 text-[#535C21] mx-auto" />
                  <p className="text-sm font-bold text-[#1C250C]">
                    {isAr ? 'سجل ملاحظات صحة النبات بمرور الوقت' : 'Track Plant Health Observations Over Time'}
                  </p>
                  <p className="text-xs text-[#535C21]">
                    {isAr
                      ? 'ارفع صورة لإصفرار الأوراق أو ذبولها أو حوافها البنية للحصول على قائمة أسباب متعددة محتملة ومقارنة زمنية.'
                      : 'Upload foliage photos to evaluate multiple causes for yellowing/wilting and compare growth across dates.'}
                  </p>
                </div>
              )}

              {healthObservations.length > 0 && (
                <div className="thamra-card p-4 space-y-2">
                  <h3 className="text-xs font-bold text-[#1C250C]">
                    {isAr ? 'السجل الزمني لصحة النبات' : 'Observation Timeline'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {healthObservations.slice(0, 4).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setLatestHealth(o)}
                        className="flex items-center gap-2.5 p-2 rounded-xl border border-[#D5D5D5] bg-[#faf8f4] hover:border-[#535C21] text-start cursor-pointer"
                      >
                        {o.imageThumb && (
                          <img
                            src={o.imageThumb}
                            alt={o.crop}
                            className="w-11 h-11 rounded-lg object-cover shrink-0 border border-[#D5D5D5]"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#1C250C] truncate">
                            {o.crop} · {o.recordedAt.slice(0, 10)}
                          </p>
                          <p className="text-[11px] text-[#535C21] truncate">
                            {o.visibleFindings[0] || o.overallStatus}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* PESTICIDE, ORGANIC, FERTILISER & IRRIGATION ADVISOR       */}
          {/* ========================================================= */}
          <section className="thamra-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#1C250C] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#535C21]" />
                  <span>
                    {isAr
                      ? 'توصيات المكافحة الآمنة، الأسمدة، وأنابيب ومعدات الري'
                      : 'Pesticide, Organic Control, Fertiliser & Equipment Advisor'}
                  </span>
                </h2>
                <p className="text-xs text-[#535C21] mt-0.5">
                  {isAr
                    ? 'الأولوية للحلول العضوية والوقائية، مع عرض المواد الفعالة المعتمدة دون اختراع جرعات تجارية'
                    : 'Organic options first, approved active ingredients with label/PPE reminders (zero invented dosages), plus reasoned tools.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs items-end">
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'المحصول' : 'Crop'}
                </label>
                <select
                  value={recCrop}
                  onChange={(e) => setRecCrop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#faf8f4] border border-[#D5D5D5] font-medium"
                >
                  {allCrops.filter((c) => c.id !== 'unused').map((c) => (
                    <option key={c.id} value={c.nameEn}>
                      {isAr ? c.nameAr : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'المشكلة أو العرض المستهدف' : 'Target Problem / Condition'}
                </label>
                <input
                  type="text"
                  value={recIssue}
                  onChange={(e) => setRecIssue(e.target.value)}
                  placeholder={isAr ? 'مثال: بياض دقيقي، ذبابة بيضاء، نقص حديد' : 'e.g. Powdery Mildew, Whitefly, Salt stress'}
                  className="w-full px-3 py-2 rounded-xl bg-[#faf8f4] border border-[#D5D5D5]"
                />
              </div>
              <button
                type="button"
                disabled={loadingRec}
                onClick={() => void handleFetchAgRecommendations()}
                className="py-2 px-4 rounded-xl bg-[#1C250C] hover:bg-[#2d3b15] text-[#DBAE83] font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {loadingRec
                  ? isAr
                    ? 'جاري إعداد الخطة...'
                    : 'Generating Safe Plan...'
                  : isAr
                    ? 'إنشاء توصيات شاملة'
                    : 'Get Tailored Recommendations'}
              </button>
            </div>

            {recError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {recError}
              </p>
            )}

            {agRec && (
              <div className="space-y-4 pt-2 animate-thamra-in">
                <div className="rounded-xl bg-[#DBAE83]/20 border border-[#AD927E] p-3 text-xs text-[#1C250C]">
                  {agRec.disclaimer}
                </div>

                {/* 1. Organic / Non-Chemical Alternatives First */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-[#535C21] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? '1. الخيارات العضوية والوقائية أولاً' : '1. Organic & Non-Chemical First'}</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {agRec.organicAlternatives.map((opt, idx) => (
                      <div key={idx} className="rounded-xl border border-[#535C21]/30 bg-[#edf2e2]/45 p-3 text-xs space-y-1">
                        <p className="font-bold text-[#1C250C]">{opt.title}</p>
                        <p className="text-[#535C21]">{opt.whyHelpful}</p>
                        <p className="text-[11px] text-[#1C250C]/80">{opt.howToUseSafely}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Fertilisers & Reasoned Irrigation/Pipe/Equipment Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#535C21] flex items-center gap-1.5">
                      <Droplets className="w-4 h-4" />
                      <span>{isAr ? '2. توجيه الأسمدة' : '2. Fertiliser Guidance'}</span>
                    </h3>
                    <div className="space-y-2">
                      {agRec.fertilizerGuidance.map((f, idx) => (
                        <div key={idx} className="rounded-xl border border-[#D5D5D5] bg-[#faf8f4] p-3 text-xs space-y-0.5">
                          <p className="font-bold text-[#1C250C]">{f.type}</p>
                          <p className="text-[#535C21]">{f.purpose}</p>
                          <p className="text-[11px] text-[#8E7D49]">{f.timingNote}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#535C21] flex items-center gap-1.5">
                      <Wrench className="w-4 h-4" />
                      <span>{isAr ? '3. أنابيب الري والمعدات المقترحة (مع السبب)' : '3. Irrigation Pipes & Tools (With Why Useful)'}</span>
                    </h3>
                    <div className="space-y-2">
                      {agRec.equipmentSuggestions.map((eq, idx) => (
                        <div key={idx} className="rounded-xl border border-[#D5D5D5] bg-[#faf8f4] p-3 text-xs space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-[#1C250C]">{eq.item}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#D5D5D5] text-[#535C21]">
                              {eq.category}
                            </span>
                          </div>
                          <p className="text-[#535C21]">
                            <strong>{isAr ? 'الفائدة: ' : 'Why useful: '}</strong>
                            {eq.whyUseful}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Progressive Disclosure for Approved Pesticide Active Ingredients */}
                <div className="border-t border-[#D5D5D5] pt-3">
                  <button
                    type="button"
                    onClick={() => setShowChemicalLabels((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#535C21] hover:underline cursor-pointer"
                  >
                    {showChemicalLabels ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    <span>
                      {showChemicalLabels
                        ? isAr
                          ? 'إخفاء المواد الفعالة للمبيدات وإرشادات السلامة'
                          : 'Hide Approved Active Ingredients & Safety Labels'
                        : isAr
                          ? 'عرض خيارات المواد الفعالة وإرشادات الأمان والملصق المحلي'
                          : 'View Approved Active Ingredients, Safety PPE & Bahrain Label Rules'}
                    </span>
                  </button>

                  {showChemicalLabels && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 animate-thamra-in">
                      {agRec.pesticideOptions.map((p, idx) => (
                        <div key={idx} className="rounded-xl border border-[#AD927E]/60 bg-white p-3 text-xs space-y-1">
                          <p className="font-bold text-[#1C250C]">{p.activeIngredientOrClass}</p>
                          <p className="text-[#535C21]">
                            <strong>{isAr ? 'الهدف: ' : 'Target: '}</strong>{p.targetProblem} ·{' '}
                            <strong>{isAr ? 'المحاصيل: ' : 'Crops: '}</strong>{p.suitableCrops}
                          </p>
                          <p className="text-[#1C250C]">{p.labelAndApplicationGuidance}</p>
                          <p className="text-[11px] text-[#8a5519]">
                            <strong>{isAr ? 'السلامة: ' : 'Safety/PPE: '}</strong>{p.safetyPrecautions}
                          </p>
                          <p className="text-[11px] text-[#8E7D49]">{p.localLabelRestrictionNote}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
