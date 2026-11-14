import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Bug,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GitCompare,
  Heart,
  Info,
  Leaf,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  computeIndicativeRotationScore,
  DISEASE_LIBRARY,
  evaluateCropSequenceCompatibility,
  evaluateEnvironmentalRisks,
  findCropInLibrary,
} from '../../data/cropDatabase';
import {
  FIELDSHIFT_CROP_SHORTLIST,
  FIELDSHIFT_TOP_ROTATIONS,
} from '../../data/fieldShiftData';
import type {
  AppLanguage,
  CropCategory,
  CropLibraryItem,
  CropSection,
  DiseaseDetectionRecord,
  FarmEnvironmentSnapshot,
  FarmPlot,
  GrowingStage,
} from '../../types/farm';
import { formatArea, getCropColor } from '../../utils/farmGeometry';

interface PlantRotationPageProps {
  language: AppLanguage;
  plots: FarmPlot[];
  activePlotId: string | null;
  activeSectionId: string | null;
  snapshot: FarmEnvironmentSnapshot | null;
  allCrops: CropLibraryItem[];
  favoriteCropIds: string[];
  diseaseDetections?: DiseaseDetectionRecord[];
  focusedDiseaseId?: string | null;
  onClearFocusedDisease?: () => void;
  onToggleFavoriteCrop: (cropId: string) => void;
  onAddCustomCrop: (crop: CropLibraryItem) => void;
  onUpdatePlot: (plotId: string, updater: (plot: FarmPlot) => FarmPlot) => void;
  onSelectPlot: (plotId: string | null) => void;
  onSelectSection: (sectionId: string | null) => void;
  onAskTamra: (prompt: string) => void;
  onOpenAgRecommendations?: (crop: string, issue: string) => void;
  onOpenDiseaseScreening?: () => void;
}

type RotationTab = 'my_crops' | 'planner' | 'library' | 'diseases' | 'compare';

const GROWING_STAGES: Array<{ id: GrowingStage; en: string; ar: string }> = [
  { id: 'preparing', en: 'Preparing Soil', ar: 'تجهيز التربة' },
  { id: 'planted', en: 'Planted / Seedling', ar: 'مزروع / بادرة' },
  { id: 'vegetative', en: 'Vegetative Growth', ar: 'نمو خضري' },
  { id: 'flowering', en: 'Flowering', ar: 'إزهار' },
  { id: 'fruiting', en: 'Fruiting / Bulking', ar: 'إثمار / نضج' },
  { id: 'ready_to_harvest', en: 'Ready to Harvest', ar: 'جاهز للحصاد' },
  { id: 'fallow', en: 'Fallow / Resting', ar: 'أرض مستريحة' },
];

export const PlantRotationPage: React.FC<PlantRotationPageProps> = ({
  language,
  plots,
  activePlotId,
  activeSectionId,
  snapshot,
  allCrops,
  favoriteCropIds,
  diseaseDetections = [],
  focusedDiseaseId = null,
  onClearFocusedDisease,
  onToggleFavoriteCrop,
  onAddCustomCrop,
  onUpdatePlot,
  onSelectPlot,
  onSelectSection,
  onAskTamra,
  onOpenAgRecommendations,
  onOpenDiseaseScreening,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<RotationTab>(focusedDiseaseId ? 'diseases' : 'my_crops');
  const [expandedDiseaseIds, setExpandedDiseaseIds] = useState<Record<string, boolean>>({});
  const [showMoreCropDetail, setShowMoreCropDetail] = useState(false);

  useEffect(() => {
    if (focusedDiseaseId) {
      setActiveTab('diseases');
      setExpandedDiseaseIds((prev) => ({ ...prev, [focusedDiseaseId]: true }));
    }
  }, [focusedDiseaseId]);

  const activePlot = useMemo(
    () => plots.find((p) => p.id === activePlotId) ?? plots[0] ?? null,
    [plots, activePlotId],
  );
  const activeSection: CropSection | null = useMemo(
    () =>
      activePlot?.sections.find((s) => s.id === activeSectionId) ??
      activePlot?.sections[0] ??
      null,
    [activePlot, activeSectionId],
  );

  // Crop Library Search & Filter + Custom Crop Form
  const [cropSearch, setCropSearch] = useState('');
  const [cropCategoryFilter, setCropCategoryFilter] = useState<'all' | 'favorites' | CropCategory>('all');
  const [selectedCropId, setSelectedCropId] = useState<string>(allCrops[0]?.id ?? 'tomatoes');
  const [showAddCropForm, setShowAddCropForm] = useState(false);
  const [newCropNameEn, setNewCropNameEn] = useState('');
  const [newCropNameAr, setNewCropNameAr] = useState('');
  const [newCropFamily, setNewCropFamily] = useState('Fabaceae');
  const [newCropWater, setNewCropWater] = useState<CropLibraryItem['waterDemand']>('Moderate');
  const [newCropSeason, setNewCropSeason] = useState('Oct – Feb');

  // Disease Search & Filter
  const [diseaseSearch, setDiseaseSearch] = useState('');
  const [diseaseCropFilter, setDiseaseCropFilter] = useState<string>('all');

  // Compare & Compatibility Checker
  const [compareIds, setCompareIds] = useState<string[]>(['tomatoes', 'cowpea', 'barley']);
  const [compatPrev, setCompatPrev] = useState('Tomatoes');
  const [compatNext, setCompatNext] = useState('Cowpea');

  const filteredCrops = useMemo(() => {
    const q = cropSearch.trim().toLowerCase();
    return allCrops.filter((c) => {
      if (cropCategoryFilter === 'favorites' && !favoriteCropIds.includes(c.id)) return false;
      if (
        cropCategoryFilter !== 'all' &&
        cropCategoryFilter !== 'favorites' &&
        c.category !== cropCategoryFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.includes(q) ||
        c.scientificName.toLowerCase().includes(q) ||
        c.botanicalFamily.toLowerCase().includes(q)
      );
    });
  }, [allCrops, cropSearch, cropCategoryFilter, favoriteCropIds]);

  const selectedCropDetail = useMemo(
    () => allCrops.find((c) => c.id === selectedCropId) ?? filteredCrops[0] ?? allCrops[0],
    [allCrops, selectedCropId, filteredCrops],
  );

  const filteredDiseases = useMemo(() => {
    const q = diseaseSearch.trim().toLowerCase();
    return DISEASE_LIBRARY.filter((d) => {
      if (
        diseaseCropFilter !== 'all' &&
        !d.affectedCrops.some((c) => c.toLowerCase() === diseaseCropFilter.toLowerCase())
      ) {
        return false;
      }
      if (!q) return true;
      return (
        d.nameEn.toLowerCase().includes(q) ||
        d.nameAr.includes(q) ||
        d.symptomsEn.toLowerCase().includes(q) ||
        d.affectedCrops.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [diseaseSearch, diseaseCropFilter]);

  const indicativeRotationHealth = useMemo(
    () => computeIndicativeRotationScore(activeSection, snapshot, allCrops),
    [activeSection, snapshot, allCrops],
  );

  const sectionRisks = useMemo(
    () => evaluateEnvironmentalRisks(snapshot, activeSection?.crop || 'Tomatoes', language),
    [snapshot, activeSection, language],
  );

  const compatibilityCheck = useMemo(
    () => evaluateCropSequenceCompatibility(compatPrev, compatNext, allCrops),
    [compatPrev, compatNext, allCrops],
  );

  // Synced section updates (saves directly to Plot state -> persisted to localStorage + backend!)
  const updateSectionField = (sectionId: string, patch: Partial<CropSection>) => {
    if (!activePlot) return;
    onUpdatePlot(activePlot.id, (prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              ...patch,
              color: patch.crop ? getCropColor(patch.crop) : s.color,
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    }));
  };

  const handleMarkHarvested = (sec: CropSection) => {
    if (!activePlot) return;
    const entry = {
      id: `hist-${Date.now()}`,
      crop: sec.crop,
      plantedDate: sec.plantingDate || new Date(Date.now() - 75 * 86400_000).toISOString().slice(0, 10),
      harvestedDate: new Date().toISOString().slice(0, 10),
    };
    const nextCrop = sec.plannedNextCrop || 'Unused / Preparing';
    updateSectionField(sec.id, {
      cropHistory: [...(sec.cropHistory ?? []), entry],
      crop: nextCrop,
      plannedNextCrop: '',
      growingStage: nextCrop.toLowerCase().includes('unused') ? 'preparing' : 'planted',
      plantingDate: new Date().toISOString().slice(0, 10),
      expectedHarvestDate: '',
    });
  };

  const handleCreateCustomCrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCropNameEn.trim()) return;
    const item: CropLibraryItem = {
      id: `custom-${Date.now()}`,
      nameEn: newCropNameEn.trim(),
      nameAr: newCropNameAr.trim() || newCropNameEn.trim(),
      scientificName: 'Custom Farm Cultivar',
      botanicalFamily: newCropFamily,
      category: 'vegetable',
      rotationGroup:
        newCropFamily === 'Fabaceae'
          ? 'Legume'
          : newCropFamily === 'Poaceae'
            ? 'Cereal or grass'
            : newCropFamily === 'Solanaceae'
              ? 'Solanaceous crop'
              : 'Other family',
      isLegume: newCropFamily === 'Fabaceae',
      isPerennial: false,
      climateEn: 'Farmer-added local cultivar configured for farm rotation planning.',
      climateAr: 'صنف مضاف من قبل المزارع لتخطيط الدورة الزراعية.',
      tempMinC: 14,
      tempMaxC: 35,
      optimalSoilEn: 'Well-drained sandy loam with organic compost.',
      optimalSoilAr: 'تربة رملية طينية جيدة الصرف غنية بالكمبوست.',
      waterDemand: newCropWater,
      sunlightEn: 'Full sun',
      sunlightAr: 'شمس كاملة',
      plantingSeasonEn: newCropSeason,
      plantingSeasonAr: newCropSeason,
      growthDurationDays: '60–90 days',
      nutrientNeedsEn: newCropFamily === 'Fabaceae' ? 'Fixes Nitrogen' : 'Balanced NPK',
      nutrientNeedsAr: newCropFamily === 'Fabaceae' ? 'يثبت النيتروجين' : 'تغذية متوازنة',
      commonPestIds: [],
      preventionTipsEn: 'Rotate botanical family every season and inspect drip uniformity.',
      preventionTipsAr: 'بدّل العائلة النباتية كل موسم وافحص انتظام التنقيط.',
      companionCrops: [],
      unsuitableFollowers: [newCropNameEn.trim()],
      isCustom: true,
    };
    onAddCustomCrop(item);
    setSelectedCropId(item.id);
    setNewCropNameEn('');
    setNewCropNameAr('');
    setShowAddCropForm(false);
  };

  const smartRotationCandidates = useMemo(() => {
    const currentItem = activeSection ? findCropInLibrary(activeSection.crop, allCrops) : undefined;
    const candidates = allCrops.filter((c) => c.id !== 'unused');
    return candidates
      .map((cand) => {
        const compat = evaluateCropSequenceCompatibility(
          currentItem?.nameEn || 'Tomatoes',
          cand.nameEn,
          allCrops,
        );
        return { crop: cand, compat };
      })
      .sort((a, b) => b.compat.score - a.compat.score)
      .slice(0, 6);
  }, [activeSection, allCrops]);

  return (
    <div className="space-y-4">
      {/* Header & Section Selector */}
      <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#1C250C] flex items-center gap-2">
            <Leaf className="w-5 h-5 text-[#535C21]" />
            <span>{isAr ? 'الدورة الزراعية ومكتبة المحاصيل' : 'Plant Rotation & Agricultural Knowledge Hub'}</span>
          </h1>
          <p className="text-xs text-[#535C21] mt-0.5">
            {isAr
              ? 'مرتبط مباشرة بأقسام مزرعتك على الخريطة ومدعوم ببيانات ناسا ودراسة البحرين (FieldShift)'
              : 'Synced directly with your Map crop sections, NASA SMAP/POWER data & Bahrain suitability datasets'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {plots.length > 0 && (
            <select
              value={activePlot?.id ?? ''}
              onChange={(e) => onSelectPlot(e.target.value || null)}
              className="px-3 py-1.5 text-xs font-semibold bg-[#faf8f4] border border-[#D5D5D5] rounded-lg"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {activePlot && activePlot.sections.length > 0 && (
            <select
              value={activeSection?.id ?? ''}
              onChange={(e) => onSelectSection(e.target.value || null)}
              className="px-3 py-1.5 text-xs font-semibold bg-[#faf8f4] border border-[#D5D5D5] rounded-lg"
            >
              {activePlot.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.crop}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() =>
              onAskTamra(
                activeSection
                  ? isAr
                    ? `اقترح خطة دورة زراعية من 3 مواسم لقسم "${activeSection.name}" المزروع حالياً بـ ${activeSection.crop}.`
                    : `Recommend a 3-season plant rotation plan for my "${activeSection.name}" section currently growing ${activeSection.crop}.`
                  : isAr
                    ? 'ما هي أفضل خطط الدورة الزراعية للبحرين حسب الموسم؟'
                    : 'What are the best seasonal crop rotation plans for Bahrain?',
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C250C] text-[#DBAE83] text-xs font-semibold cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{isAr ? 'استشر تمرة' : 'Ask Tamra'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: 'my_crops', en: 'My Farm Crops', ar: 'محاصيل مزرعتي' },
            { id: 'planner', en: 'Smart Rotation Planner', ar: 'مخطط الدورة الذكي' },
            { id: 'library', en: 'Crop Library (52+)', ar: 'مكتبة المحاصيل' },
            { id: 'diseases', en: 'Diseases & Pests', ar: 'الأمراض والآفات' },
            { id: 'compare', en: 'Compare & Compatibility', ar: 'المقارنة والتوافق' },
          ] as Array<{ id: RotationTab; en: string; ar: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#535C21] text-white'
                : 'bg-white border border-[#D5D5D5] text-[#1C250C] hover:border-[#535C21]'
            }`}
          >
            {isAr ? tab.ar : tab.en}
          </button>
        ))}
      </div>

      {/* TAB 1: MY FARM CROPS (Synced with Map Sections) */}
      {activeTab === 'my_crops' && (
        <div className="space-y-4">
          {!activePlot || activePlot.sections.length === 0 ? (
            <div className="bg-white border border-[#D5D5D5] rounded-2xl p-6 text-center space-y-2">
              <p className="text-sm font-bold text-[#1C250C]">
                {isAr ? 'لا توجد أقسام محاصيل محفوظة بعد' : 'No crop sections mapped yet'}
              </p>
              <p className="text-xs text-[#535C21]">
                {isAr
                  ? 'اذهب إلى صفحة الخريطة لوضع حدود مزرعتك وإضافة أقسام محاصيل قابلة للتعديل.'
                  : 'Head to the Farm Map page to place your farm boundary rectangle and add adjustable crop sections.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activePlot.sections.map((sec) => {
                const history = sec.cropHistory ?? [];
                return (
                  <div
                    key={sec.id}
                    className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: sec.color }}
                        />
                        <div>
                          <h3 className="text-sm font-bold text-[#1C250C]">{sec.name}</h3>
                          <p className="text-xs text-[#8E7D49]">
                            {formatArea(sec.areaSqMeters, language)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMarkHarvested(sec)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#535C21]/10 hover:bg-[#535C21]/20 text-[#535C21] text-xs font-semibold cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isAr ? 'تسجيل الحصاد ← التاريخ' : 'Mark Harvested'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div>
                        <label className="block font-medium text-[#535C21] mb-1">
                          {isAr ? 'المحصول الحالي' : 'Current Crop'}
                        </label>
                        <select
                          value={sec.crop}
                          onChange={(e) => updateSectionField(sec.id, { crop: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-[#faf8f4] border border-[#D5D5D5] rounded-lg font-medium"
                        >
                          {allCrops.map((c) => (
                            <option key={c.id} value={c.nameEn}>
                              {isAr ? c.nameAr : c.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium text-[#535C21] mb-1">
                          {isAr ? 'مرحلة النمو' : 'Growing Stage'}
                        </label>
                        <select
                          value={sec.growingStage || 'planted'}
                          onChange={(e) =>
                            updateSectionField(sec.id, {
                              growingStage: e.target.value as GrowingStage,
                            })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#faf8f4] border border-[#D5D5D5] rounded-lg"
                        >
                          {GROWING_STAGES.map((st) => (
                            <option key={st.id} value={st.id}>
                              {isAr ? st.ar : st.en}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-medium text-[#535C21] mb-1">
                          {isAr ? 'تاريخ الزراعة' : 'Planting Date'}
                        </label>
                        <input
                          type="date"
                          value={sec.plantingDate || ''}
                          onChange={(e) =>
                            updateSectionField(sec.id, { plantingDate: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#faf8f4] border border-[#D5D5D5] rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-[#535C21] mb-1">
                          {isAr ? 'الحصاد المتوقع' : 'Expected Harvest'}
                        </label>
                        <input
                          type="date"
                          value={sec.expectedHarvestDate || ''}
                          onChange={(e) =>
                            updateSectionField(sec.id, { expectedHarvestDate: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#faf8f4] border border-[#D5D5D5] rounded-lg"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-medium text-[#535C21] mb-1">
                          {isAr ? 'المحصول المخطط للدورة القادمة' : 'Planned Next Rotation Crop'}
                        </label>
                        <select
                          value={sec.plannedNextCrop || ''}
                          onChange={(e) =>
                            updateSectionField(sec.id, { plannedNextCrop: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 bg-[#faf8f4] border border-[#D5D5D5] rounded-lg"
                        >
                          <option value="">{isAr ? '-- اختر محصولاً قادماً --' : '-- Choose planned next crop --'}</option>
                          {allCrops.map((c) => (
                            <option key={c.id} value={c.nameEn}>
                              {isAr ? c.nameAr : c.nameEn} ({c.botanicalFamily})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Crop History Timeline */}
                    <div className="pt-2 border-t border-[#D5D5D5]">
                      <p className="text-[11px] font-semibold text-[#8E7D49] mb-1.5">
                        {isAr ? 'سجل المحاصيل السابقة:' : 'Previous Crop History:'}
                      </p>
                      {history.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {history.map((h) => (
                            <span
                              key={h.id}
                              className="px-2 py-1 rounded bg-[#f3f2ee] border border-[#D5D5D5] text-[11px] text-[#1C250C]"
                            >
                              {h.crop} ({h.harvestedDate})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#AD927E]">
                          {isAr
                            ? 'لا يوجد سجل سابق بعد — اضغط "تسجيل الحصاد" عند نهاية الموسم لحفظ الدورة.'
                            : 'No harvested crops recorded yet — click Mark Harvested when this season finishes.'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SMART ROTATION PLANNER */}
      {activeTab === 'planner' && (
        <div className="space-y-4">
          {/* Indicative Rotation Health Score + Caveat */}
          <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#8E7D49]">
                {isAr ? 'مؤشر تخطيط الدورة (إرشادي)' : 'Indicative Rotation Planning Score'}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono-tabular text-[#535C21]">
                  {indicativeRotationHealth.score}/100
                </span>
                <span className="text-xs font-semibold text-[#1C250C]">
                  {isAr ? indicativeRotationHealth.labelAr : indicativeRotationHealth.labelEn}
                </span>
              </div>
              <p className="text-[11px] text-[#8E7D49]">
                {isAr
                  ? 'مؤشر تخطيطي مبني على تنوع العائلات النباتية والبقوليات، وليس قياساً مخبرياً للتربة.'
                  : 'Indicative diversity planning metric based on crop families & legumes — not a measured soil lab score.'}
              </p>
            </div>

            <div className="lg:col-span-2 space-y-1.5">
              {(isAr ? indicativeRotationHealth.factorsAr : indicativeRotationHealth.factorsEn).map(
                (f, i) => (
                  <p key={i} className="text-xs text-[#1C250C] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#535C21] shrink-0" />
                    <span>{f}</span>
                  </p>
                ),
              )}
              {activeSection && (
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-[#535C21]">
                    {isAr ? 'الخط الزمني للقسم:' : 'Section Visual Timeline:'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#f3f2ee] border border-[#D5D5D5]">
                    {activeSection.cropHistory?.slice(-1)[0]?.crop || (isAr ? 'سابق: غير مسجل' : 'Prev: Unrecorded')}
                  </span>
                  <span>→</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#535C21] text-white font-semibold">
                    {activeSection.crop}
                  </span>
                  <span>→</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#DBAE83]/40 border border-[#AD927E] font-semibold">
                    {activeSection.plannedNextCrop || (isAr ? 'اختر التالي أدناه' : 'Pick next below')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tailored Next-Crop Picks for Active Section */}
          <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#1C250C]">
              {activeSection
                ? isAr
                  ? `أفضل الخيارات التالية لقسم "${activeSection.name}" (بعد ${activeSection.crop})`
                  : `Top Next-Crop Candidates for "${activeSection.name}" (Following ${activeSection.crop})`
                : isAr
                  ? 'خيارات الدورة الزراعية المقترحة'
                  : 'Recommended Next-Crop Candidates'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {smartRotationCandidates.map(({ crop, compat }) => (
                <div
                  key={crop.id}
                  className="rounded-xl border border-[#D5D5D5] bg-[#faf8f4] p-3.5 flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#1C250C]">
                        {isAr ? crop.nameAr : crop.nameEn}
                      </span>
                      <span className="text-xs font-mono-tabular font-bold text-[#535C21]">
                        {compat.score}%
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8E7D49]">
                      {crop.botanicalFamily} · {crop.waterDemand} {isAr ? 'ماء' : 'water'}
                    </p>
                    <p className="mt-1.5 text-xs text-[#535C21]">
                      {(isAr ? compat.reasonsAr : compat.reasonsEn)[0]}
                    </p>
                  </div>
                  {activeSection && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSectionField(activeSection.id, { plannedNextCrop: crop.nameEn })
                      }
                      className="w-full py-1.5 rounded-lg bg-[#535C21] hover:bg-[#414919] text-white text-xs font-semibold cursor-pointer"
                    >
                      {isAr ? 'اعتماد كمحصول قادم' : 'Set as Planned Next Crop'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bahrain FieldShift Precomputed 3-Crop Rotations */}
          <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#535C21]" />
                <span>
                  {isAr
                    ? 'سلاسل الدورات الثلاثية للبحرين (بيانات FieldShift GAEZ)'
                    : 'Bahrain 3-Crop Rotation Benchmarks (FieldShift GAEZ Dataset)'}
                </span>
              </h2>
            </div>
            <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] px-3 py-2 text-[11px] text-[#8E7D49] flex items-start gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? 'درجات التقييم تمثل مؤشرات فحص أولية على مستوى البحرين وتتطلب التحقق من توفر مياه الري والتقويم الزراعي المحلي.'
                  : 'Provisional GAEZ screening scores only — irrigation availability must be assessed and local planting-calendar validation is required before planting.'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="border-b border-[#D5D5D5] text-[#8E7D49]">
                    <th className="py-2 px-2 text-start">#</th>
                    <th className="py-2 px-2 text-start">{isAr ? 'التسلسل' : 'Sequence'}</th>
                    <th className="py-2 px-2 text-start">{isAr ? 'العائلات' : 'Families'}</th>
                    <th className="py-2 px-2 text-start">{isAr ? 'البقول' : 'Legume'}</th>
                    <th className="py-2 px-2 text-end">{isAr ? 'الدرجة' : 'Score'}</th>
                    <th className="py-2 px-2 text-end">{isAr ? 'الحرارة / الماء' : 'Heat / Water'}</th>
                  </tr>
                </thead>
                <tbody>
                  {FIELDSHIFT_TOP_ROTATIONS.map((row) => (
                    <tr key={row.rank} className="border-b border-[#D5D5D5]/50 hover:bg-[#faf8f4]">
                      <td className="py-2 px-2 font-mono-tabular text-[#8E7D49]">{row.rank}</td>
                      <td className="py-2 px-2 font-semibold text-[#1C250C]">
                        {row.sequence.join(' → ')}
                      </td>
                      <td className="py-2 px-2 text-[#535C21]">{row.familySequence}</td>
                      <td className="py-2 px-2">{row.legumeCrop}</td>
                      <td className="py-2 px-2 text-end font-mono-tabular font-bold text-[#535C21]">
                        {row.overallScore}
                      </td>
                      <td className="py-2 px-2 text-end font-mono-tabular text-[#8E7D49]">
                        {row.heatScore} / {row.waterScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CROP LIBRARY */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-[#8E7D49] absolute top-2.5 start-3" />
                <input
                  type="text"
                  value={cropSearch}
                  onChange={(e) => setCropSearch(e.target.value)}
                  placeholder={
                    isAr
                      ? 'ابحث بالاسم العربي، الإنجليزي، أو العائلة النباتية...'
                      : 'Search by crop name, scientific name, or botanical family...'
                  }
                  className="w-full ps-9 pe-3 py-2 text-xs bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>

              <select
                value={cropCategoryFilter}
                onChange={(e) =>
                  setCropCategoryFilter(e.target.value as 'all' | 'favorites' | CropCategory)
                }
                className="px-3 py-2 text-xs font-semibold bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
              >
                <option value="all">{isAr ? 'كل الفئات' : 'All Categories'}</option>
                <option value="favorites">{isAr ? 'المفضلة فقط' : 'Saved Favourites'}</option>
                <option value="vegetable">{isAr ? 'خضروات' : 'Vegetables'}</option>
                <option value="cereal">{isAr ? 'حبوب' : 'Cereals'}</option>
                <option value="legume">{isAr ? 'بقوليات' : 'Legumes'}</option>
                <option value="root">{isAr ? 'جذور وأبصال' : 'Roots & Bulbs'}</option>
                <option value="fruit">{isAr ? 'فواكه ونخيل' : 'Fruits & Palms'}</option>
                <option value="forage">{isAr ? 'أعلاف' : 'Forage'}</option>
                <option value="oilseed">{isAr ? 'بذور زيتية' : 'Oilseed'}</option>
              </select>

              <button
                type="button"
                onClick={() => setShowAddCropForm((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#535C21] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة محصول مخصص' : 'Add Custom Crop'}</span>
              </button>
            </div>

            {showAddCropForm && (
              <form
                onSubmit={handleCreateCustomCrop}
                className="p-3.5 rounded-xl bg-[#faf8f4] border border-[#D5D5D5] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end text-xs"
              >
                <div>
                  <label className="block font-medium mb-1">
                    {isAr ? 'الاسم (إنجليزي)' : 'Crop Name (EN)'}
                  </label>
                  <input
                    required
                    value={newCropNameEn}
                    onChange={(e) => setNewCropNameEn(e.target.value)}
                    placeholder="e.g. Okra"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    {isAr ? 'الاسم (عربي)' : 'Crop Name (AR)'}
                  </label>
                  <input
                    value={newCropNameAr}
                    onChange={(e) => setNewCropNameAr(e.target.value)}
                    placeholder="مثال: بامية"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    {isAr ? 'العائلة النباتية' : 'Botanical Family'}
                  </label>
                  <select
                    value={newCropFamily}
                    onChange={(e) => setNewCropFamily(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                  >
                    <option value="Fabaceae">Fabaceae (Legume)</option>
                    <option value="Poaceae">Poaceae (Cereal)</option>
                    <option value="Solanaceae">Solanaceae</option>
                    <option value="Brassicaceae">Brassicaceae</option>
                    <option value="Malvaceae">Malvaceae</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">{isAr ? 'الماء' : 'Water Need'}</label>
                  <select
                    value={newCropWater}
                    onChange={(e) =>
                      setNewCropWater(e.target.value as CropLibraryItem['waterDemand'])
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                  >
                    <option value="Low">Low</option>
                    <option value="Low to moderate">Low to moderate</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Moderate to high">Moderate to high</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#1C250C] text-white font-semibold cursor-pointer"
                >
                  {isAr ? 'حفظ المحصول' : 'Save Crop'}
                </button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-2 max-h-[540px] overflow-y-auto pe-1">
              {filteredCrops.map((crop) => {
                const fav = favoriteCropIds.includes(crop.id);
                const selected = selectedCropDetail?.id === crop.id;
                return (
                  <div
                    key={crop.id}
                    onClick={() => setSelectedCropId(crop.id)}
                    className={`rounded-xl border p-3 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      selected
                        ? 'bg-[#535C21] text-white border-[#535C21]'
                        : 'bg-white border-[#D5D5D5] hover:border-[#535C21]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {isAr ? crop.nameAr : crop.nameEn}
                      </p>
                      <p className={`text-[11px] truncate ${selected ? 'text-white/80' : 'text-[#8E7D49]'}`}>
                        {crop.scientificName} · {crop.botanicalFamily}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavoriteCrop(crop.id);
                      }}
                      aria-label={isAr ? 'حفظ في المفضلة' : 'Toggle favourite'}
                      className="p-1.5 rounded-lg hover:bg-black/10 cursor-pointer shrink-0"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          fav
                            ? 'fill-[#DBAE83] text-[#DBAE83]'
                            : selected
                              ? 'text-white/75'
                              : 'text-[#AD927E]'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {selectedCropDetail && (
              <div className="lg:col-span-2 bg-white border border-[#D5D5D5] rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D5D5D5] pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#1C250C]">
                      {isAr ? selectedCropDetail.nameAr : selectedCropDetail.nameEn}
                    </h2>
                    <p className="text-xs text-[#8E7D49] italic">
                      {selectedCropDetail.scientificName} · {selectedCropDetail.botanicalFamily}
                      {selectedCropDetail.isLegume &&
                        ` · ${isAr ? 'بقولي مثبت للنيتروجين' : 'Nitrogen-fixing Legume'}`}
                    </p>
                  </div>

                  {activeSection && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSectionField(activeSection.id, { crop: selectedCropDetail.nameEn })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#535C21] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>
                        {isAr
                          ? `تعيين لقسم "${activeSection.name}"`
                          : `Assign to "${activeSection.name}"`}
                      </span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[#faf8f4] p-3 border border-[#D5D5D5]">
                    <p className="font-semibold text-[#535C21]">{isAr ? 'المناخ والحرارة' : 'Climate & Temperature'}</p>
                    <p className="mt-1 text-[#1C250C]">
                      {isAr ? selectedCropDetail.climateAr : selectedCropDetail.climateEn} (
                      {selectedCropDetail.tempMinC}–{selectedCropDetail.tempMaxC}°C)
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#faf8f4] p-3 border border-[#D5D5D5]">
                    <p className="font-semibold text-[#535C21]">{isAr ? 'التربة والاحتياج المائي' : 'Soil & Water Needs'}</p>
                    <p className="mt-1 text-[#1C250C]">
                      {isAr ? selectedCropDetail.optimalSoilAr : selectedCropDetail.optimalSoilEn} ·{' '}
                      <strong>{selectedCropDetail.waterDemand}</strong>
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#faf8f4] p-3 border border-[#D5D5D5]">
                    <p className="font-semibold text-[#535C21]">{isAr ? 'موسم الزراعة والمدة' : 'Season & Growth Duration'}</p>
                    <p className="mt-1 text-[#1C250C]">
                      {isAr ? selectedCropDetail.plantingSeasonAr : selectedCropDetail.plantingSeasonEn} ·{' '}
                      {selectedCropDetail.growthDurationDays}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#faf8f4] p-3 border border-[#D5D5D5]">
                    <p className="font-semibold text-[#535C21]">{isAr ? 'العناصر والوقاية' : 'Nutrients & Prevention'}</p>
                    <p className="mt-1 text-[#1C250C]">
                      {isAr ? selectedCropDetail.nutrientNeedsAr : selectedCropDetail.nutrientNeedsEn}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#D5D5D5] space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowMoreCropDetail((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#535C21] hover:underline cursor-pointer"
                  >
                    {showMoreCropDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>
                      {showMoreCropDetail
                        ? isAr
                          ? 'إخفاء التفاصيل الإضافية'
                          : 'Hide Companions & Bahrain GAEZ Data'
                        : isAr
                          ? 'عرض المحاصيل المصاحبة وبيانات البحرين'
                          : 'More: Companions & Bahrain Suitability'}
                    </span>
                  </button>

                  {showMoreCropDetail && (
                    <div className="text-xs space-y-2 pt-1 animate-thamra-in">
                      <p>
                        <strong className="text-[#535C21]">{isAr ? 'نصائح الوقاية:' : 'Prevention Tips:'}</strong>{' '}
                        {isAr ? selectedCropDetail.preventionTipsAr : selectedCropDetail.preventionTipsEn}
                      </p>
                      {selectedCropDetail.companionCrops.length > 0 && (
                        <p>
                          <strong className="text-[#535C21]">{isAr ? 'محاصيل مصاحبة جيدة:' : 'Companion Crops:'}</strong>{' '}
                          {selectedCropDetail.companionCrops.join(', ')}
                        </p>
                      )}
                      {selectedCropDetail.unsuitableFollowers.length > 0 && (
                        <p>
                          <strong className="text-[#8E7D49]">{isAr ? 'تجنب زراعتها بعده مباشرة:' : 'Avoid Planting Directly After:'}</strong>{' '}
                          {selectedCropDetail.unsuitableFollowers.join(', ')}
                        </p>
                      )}
                      <div className="pt-1 text-[11px] text-[#535C21]">
                        <strong>{isAr ? 'مرجع البحرين (FieldShift GAEZ):' : 'Bahrain FieldShift Screening:'}</strong>{' '}
                        {selectedCropDetail.bahrainSuitabilityTier || 'Local seasonal benchmark'}{' '}
                        {selectedCropDetail.bahrainGaEzExtentPct !== null &&
                        selectedCropDetail.bahrainGaEzExtentPct !== undefined
                          ? `(${selectedCropDetail.bahrainGaEzExtentPct}%)`
                          : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Complete 30+ FieldShift GAEZ Bahrain Screening Summary */}
          <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-[#1C250C]">
              {isAr ? 'ملخص تقييم المحاصيل في البحرين (FieldShift Shortlist)' : 'Bahrain Crop Suitability Shortlist (FieldShift Irrigated Baseline)'}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {FIELDSHIFT_CROP_SHORTLIST.slice(0, 26).map((row) => (
                <span
                  key={row.crop}
                  className="px-2.5 py-1 rounded-lg bg-[#faf8f4] border border-[#D5D5D5] text-[11px] text-[#1C250C]"
                >
                  {row.crop} · {row.favourableExtentPct}% ({row.botanicalFamily})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLANT DISEASES & PESTS */}
      {activeTab === 'diseases' && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[#DBAE83]/25 border border-[#AD927E] px-4 py-3 text-xs text-[#1C250C] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-[240px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#8E7D49]" />
              <span>
                {isAr
                  ? 'تنبيه هام: هذه المعلومات والفحوصات هي للمساعدة في الاكتشاف المبكر والوقاية فقط ولا تُعد تشخيصاً مؤكداً لأي مرض نباتي.'
                  : 'Important Disclaimer: Disease profiles & AI photo screenings are early-warning indicators only — never a confirmed diagnosis.'}
              </span>
            </div>
            {onOpenDiseaseScreening && (
              <button
                type="button"
                onClick={onOpenDiseaseScreening}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1C250C] text-[#DBAE83] font-semibold cursor-pointer shrink-0"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isAr ? 'فحص صورة نبات بالذكاء' : 'Screen Plant Photo'}</span>
              </button>
            )}
          </div>

          {/* Saved AI Disease Screenings linked to Crop Sections */}
          {diseaseDetections.length > 0 && (
            <div className="thamra-card p-4 space-y-2.5">
              <h3 className="text-sm font-bold text-[#1C250C]">
                {isAr ? 'أحدث الفحوصات المرتبطة بأقسامك' : 'Saved AI Plant Disease Screenings'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {diseaseDetections.slice(0, 4).map((det) => (
                  <div
                    key={det.id}
                    className="rounded-xl border border-[#535C21]/30 bg-[#edf2e2]/45 p-3 text-xs flex items-start justify-between gap-2.5"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {det.imageThumb && (
                        <img
                          src={det.imageThumb}
                          alt={det.suspectedIssue}
                          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[#D5D5D5]"
                        />
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-bold text-[#1C250C] truncate">
                          {det.suspectedIssue} ({det.confidencePct}%)
                        </p>
                        <p className="text-[#535C21]">
                          {det.crop} {det.sectionName ? `· ${det.sectionName}` : ''}
                        </p>
                        <p className="text-[11px] text-[#8E7D49] truncate">
                          {det.treatmentGuidance}
                        </p>
                      </div>
                    </div>
                    {onOpenAgRecommendations && (
                      <button
                        type="button"
                        onClick={() => onOpenAgRecommendations(det.crop, det.suspectedIssue)}
                        className="px-2.5 py-1 rounded-lg bg-[#535C21] text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                      >
                        {isAr ? 'خطة العلاج' : 'Safe Plan'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Section Risk Alerts */}
          <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-bold text-[#1C250C]">
              {isAr ? 'تقييم المخاطر الحالية لطقس مزرعتك (ناسا)' : 'Current Weather-Driven Risk Watch (Live NASA Context)'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {sectionRisks.map((risk) => (
                <div key={risk.id} className="rounded-xl border border-[#D5D5D5] bg-[#faf8f4] p-3 text-xs">
                  <p className="font-bold text-[#1C250C]">{isAr ? risk.titleAr : risk.titleEn}</p>
                  <p className="mt-1 text-[#535C21]">{isAr ? risk.detailAr : risk.detailEn}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 flex flex-wrap gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#8E7D49] absolute top-2.5 start-3" />
              <input
                type="text"
                value={diseaseSearch}
                onChange={(e) => {
                  setDiseaseSearch(e.target.value);
                  onClearFocusedDisease?.();
                }}
                placeholder={isAr ? 'ابحث عن مرض أو آفة أو عرض...' : 'Search disease, pest, or symptom...'}
                className="w-full ps-9 pe-3 py-2 text-xs bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
              />
            </div>
            <select
              value={diseaseCropFilter}
              onChange={(e) => setDiseaseCropFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
            >
              <option value="all">{isAr ? 'كل المحاصيل' : 'All Crops'}</option>
              {['Tomatoes', 'Potatoes', 'Cucumbers', 'Peppers', 'Date Palms', 'Cowpea', 'Lettuce'].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDiseases.map((d) => {
              const isFocused = focusedDiseaseId === d.id;
              const isExpanded = Boolean(expandedDiseaseIds[d.id] || isFocused);
              return (
                <div
                  key={d.id}
                  className={`rounded-2xl p-4 space-y-2.5 text-xs transition-all border ${
                    isFocused
                      ? 'bg-[#edf2e2]/65 border-[#535C21] ring-2 ring-[#535C21]/30'
                      : 'bg-white border-[#D5D5D5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#1C250C] flex items-center gap-1.5">
                      <Bug className="w-4 h-4 text-[#8E7D49]" />
                      <span>{isAr ? d.nameAr : d.nameEn}</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-[#f3f2ee] text-[10px] font-semibold uppercase text-[#535C21]">
                      {d.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8E7D49]">
                    {isAr ? 'المحاصيل المتأثرة:' : 'Affected crops:'} {d.affectedCrops.join(', ')}
                  </p>
                  <p>
                    <strong className="text-[#1C250C]">{isAr ? 'الأعراض:' : 'Symptoms:'}</strong>{' '}
                    {isAr ? d.symptomsAr : d.symptomsEn}
                  </p>

                  {isExpanded && (
                    <div className="space-y-1.5 pt-1 border-t border-[#D5D5D5]/70 animate-thamra-in">
                      <p>
                        <strong className="text-[#1C250C]">{isAr ? 'الظروف المسببة للخطر:' : 'Risk Conditions:'}</strong>{' '}
                        {isAr ? d.riskConditionsAr : d.riskConditionsEn}
                      </p>
                      <p>
                        <strong className="text-[#535C21]">{isAr ? 'الوقاية:' : 'Prevention:'}</strong>{' '}
                        {isAr ? d.preventionAr : d.preventionEn}
                      </p>
                      <p>
                        <strong className="text-[#535C21]">{isAr ? 'الإدارة المبدئية:' : 'Management Guidance:'}</strong>{' '}
                        {isAr ? d.managementAr : d.managementEn}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDiseaseIds((prev) => ({ ...prev, [d.id]: !isExpanded }))
                      }
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#535C21] hover:underline cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>
                        {isExpanded
                          ? isAr
                            ? 'إخفاء الوقاية والعلاج'
                            : 'Hide Details'
                          : isAr
                            ? 'عرض الوقاية والعلاج'
                            : 'View Prevention & Treatment'}
                      </span>
                    </button>

                    {onOpenAgRecommendations && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenAgRecommendations(
                            d.affectedCrops[0] || 'Tomatoes',
                            isAr ? d.nameAr : d.nameEn,
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#535C21]/10 hover:bg-[#535C21] text-[#535C21] hover:text-white font-semibold transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isAr ? 'توصيات المكافحة الآمنة' : 'Safe Input Advice'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: COMPARE & COMPATIBILITY */}
      {activeTab === 'compare' && (
        <div className="space-y-4">
          {/* Compatibility Checker */}
          <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#1C250C]">
              {isAr ? 'فاحص توافق تعاقب المحاصيل' : 'Crop Rotation Compatibility Checker'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-[#535C21] mb-1">
                  {isAr ? 'المحصول الحالي / السابق' : 'Current / Previous Crop'}
                </label>
                <select
                  value={compatPrev}
                  onChange={(e) => setCompatPrev(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl font-semibold"
                >
                  {allCrops.filter((c) => c.id !== 'unused').map((c) => (
                    <option key={c.id} value={c.nameEn}>
                      {isAr ? c.nameAr : c.nameEn} ({c.botanicalFamily})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#535C21] mb-1">
                  {isAr ? 'المحصول المقترح التالي' : 'Proposed Next Crop'}
                </label>
                <select
                  value={compatNext}
                  onChange={(e) => setCompatNext(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl font-semibold"
                >
                  {allCrops.filter((c) => c.id !== 'unused').map((c) => (
                    <option key={c.id} value={c.nameEn}>
                      {isAr ? c.nameAr : c.nameEn} ({c.botanicalFamily})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3.5 text-xs space-y-1">
              <p className="font-bold text-[#1C250C]">
                {compatPrev} → {compatNext} ·{' '}
                <span className="text-[#535C21] font-mono-tabular">
                  {compatibilityCheck.score}/100 ({compatibilityCheck.rating.toUpperCase()})
                </span>
              </p>
              {(isAr ? compatibilityCheck.reasonsAr : compatibilityCheck.reasonsEn).map((r, i) => (
                <p key={i} className="text-[#535C21]">
                  {r}
                </p>
              ))}
            </div>
          </div>

          {/* Side-by-Side Crop Comparison */}
          <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-[#1C250C] flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#535C21]" />
              <span>{isAr ? 'مقارنة المحاصيل جنباً إلى جنب' : 'Side-by-Side Crop Rotation Comparison'}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              {[0, 1, 2].map((slot) => (
                <select
                  key={slot}
                  value={compareIds[slot]}
                  onChange={(e) =>
                    setCompareIds((prev) =>
                      prev.map((v, idx) => (idx === slot ? e.target.value : v)),
                    )
                  }
                  className="px-2.5 py-1.5 bg-[#faf8f4] border border-[#D5D5D5] rounded-lg font-semibold"
                >
                  {allCrops.filter((c) => c.id !== 'unused').map((c) => (
                    <option key={c.id} value={c.id}>
                      {isAr ? c.nameAr : c.nameEn}
                    </option>
                  ))}
                </select>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {compareIds.map((id, idx) => {
                const c = allCrops.find((x) => x.id === id) ?? allCrops[0];
                return (
                  <div key={`${id}-${idx}`} className="rounded-xl border border-[#D5D5D5] p-3.5 bg-[#faf8f4] space-y-1.5">
                    <p className="text-sm font-bold text-[#1C250C]">
                      {isAr ? c.nameAr : c.nameEn}
                    </p>
                    <p className="text-[#8E7D49]">{c.botanicalFamily}</p>
                    <p>
                      <strong>{isAr ? 'الماء:' : 'Water:'}</strong> {c.waterDemand}
                    </p>
                    <p>
                      <strong>{isAr ? 'الحرارة:' : 'Temp:'}</strong> {c.tempMinC}–{c.tempMaxC}°C
                    </p>
                    <p>
                      <strong>{isAr ? 'الموسم:' : 'Season:'}</strong>{' '}
                      {isAr ? c.plantingSeasonAr : c.plantingSeasonEn}
                    </p>
                    <p>
                      <strong>{isAr ? 'تثبيت النيتروجين:' : 'Legume:'}</strong>{' '}
                      {c.isLegume ? (isAr ? 'نعم' : 'Yes') : isAr ? 'لا' : 'No'}
                    </p>
                    <p className="text-[#535C21]">{isAr ? c.nutrientNeedsAr : c.nutrientNeedsEn}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
