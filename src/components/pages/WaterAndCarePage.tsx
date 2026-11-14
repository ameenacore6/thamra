import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Droplets,
  Edit3,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
  Unplug,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { generateCropCareSchedule } from '../../data/cropDatabase';
import {
  createWaterTankApi,
  disconnectWaterTankApi,
  sendWaterTankReadingApi,
} from '../../services/appApi';
import type {
  AppLanguage,
  CareActivity,
  CareActivityType,
  CropLibraryItem,
  FarmEnvironmentSnapshot,
  FarmPlot,
  WaterTank,
} from '../../types/farm';

export type WaterCareTab = 'water' | 'care';

interface WaterAndCarePageProps {
  language: AppLanguage;
  plots: FarmPlot[];
  activePlotId: string | null;
  activeSectionId: string | null;
  snapshot: FarmEnvironmentSnapshot | null;
  allCrops: CropLibraryItem[];
  waterTanks: WaterTank[];
  careSchedules: CareActivity[];
  initialTab?: WaterCareTab;
  onTankUpdated: (tank: WaterTank) => void;
  onTankRemovedLocal: (tankId: string) => void;
  onCareSchedulesChange: (next: CareActivity[]) => void;
  onAskTamra: (prompt: string) => void;
  onLogSecurityEvent?: (titleEn: string, titleAr: string, detailEn: string, detailAr: string) => void;
}

export const WaterAndCarePage: React.FC<WaterAndCarePageProps> = ({
  language,
  plots,
  activePlotId,
  activeSectionId,
  snapshot,
  allCrops,
  waterTanks,
  careSchedules,
  initialTab,
  onTankUpdated,
  onTankRemovedLocal,
  onCareSchedulesChange,
  onAskTamra,
  onLogSecurityEvent,
}) => {
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState<WaterCareTab>(initialTab || 'water');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const activePlot = useMemo(
    () => plots.find((p) => p.id === activePlotId) ?? plots[0] ?? null,
    [plots, activePlotId],
  );
  const activeSection = useMemo(
    () => activePlot?.sections.find((s) => s.id === activeSectionId) ?? activePlot?.sections[0] ?? null,
    [activePlot, activeSectionId],
  );

  // ==========================================================
  // WATER TANK MONITOR STATE
  // ==========================================================
  const [selectedTankId, setSelectedTankId] = useState<string>(waterTanks[0]?.id ?? '');
  const selectedTank = useMemo(
    () => waterTanks.find((t) => t.id === selectedTankId) ?? waterTanks[0] ?? null,
    [waterTanks, selectedTankId],
  );

  const [showAddTank, setShowAddTank] = useState(waterTanks.length === 0);
  const [newTankName, setNewTankName] = useState('');
  const [newTankCapacity, setNewTankCapacity] = useState('5000');
  const [newTankMin, setNewTankMin] = useState('25');
  const [newTankCritical, setNewTankCritical] = useState('12');
  const [creatingTank, setCreatingTank] = useState(false);

  const [showSensorSetup, setShowSensorSetup] = useState(false);
  const [demoPercentInput, setDemoPercentInput] = useState('42');
  const [sendingReading, setSendingReading] = useState(false);
  const [tankError, setTankError] = useState<string | null>(null);

  const handleCreateTank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTankName.trim()) return;
    setCreatingTank(true);
    setTankError(null);
    try {
      const tank = await createWaterTankApi({
        name: newTankName.trim(),
        plotId: activePlot?.id,
        capacityLiters: Number(newTankCapacity) || 5000,
        minThresholdPercent: Number(newTankMin) || 25,
        criticalThresholdPercent: Number(newTankCritical) || 12,
      });
      onTankUpdated(tank);
      setSelectedTankId(tank.id);
      setNewTankName('');
      setShowAddTank(false);
    } catch (err) {
      setTankError(err instanceof Error ? err.message : 'Unable to register water tank.');
    } finally {
      setCreatingTank(false);
    }
  };

  const handleSendDemoPacket = async () => {
    if (!selectedTank) return;
    setSendingReading(true);
    setTankError(null);
    try {
      const updated = await sendWaterTankReadingApi({
        tankId: selectedTank.id,
        levelPercent: Math.max(0, Math.min(100, Number(demoPercentInput) || 0)),
        source: 'demo_test_packet',
        webhookKey: selectedTank.webhookKey,
      });
      onTankUpdated(updated);
    } catch (err) {
      setTankError(err instanceof Error ? err.message : 'Unable to send test sensor packet.');
    } finally {
      setSendingReading(false);
    }
  };

  const handleDisconnectTank = async () => {
    if (!selectedTank) return;
    setTankError(null);
    try {
      const updated = await disconnectWaterTankApi(selectedTank.id);
      onTankUpdated(updated);
      onLogSecurityEvent?.(
        `Water sensor disconnected: ${selectedTank.name}`,
        `انفصال مستشعر الخزان: ${selectedTank.name}`,
        'Water tank telemetry paused until the sensor reconnects.',
        'توقفت قراءات الخزان لحين إعادة توصيل المستشعر.',
      );
    } catch (err) {
      setTankError(err instanceof Error ? err.message : 'Unable to disconnect tank.');
    }
  };

  // ==========================================================
  // FERTILISATION & PLANT-CARE SCHEDULING STATE
  // ==========================================================
  const [careView, setCareView] = useState<'agenda' | 'calendar'>('agenda');
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskCrop, setTaskCrop] = useState<string>(activeSection?.crop || 'Tomatoes');
  const [taskType, setTaskType] = useState<CareActivityType>('npk');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taskNpkFormula, setTaskNpkFormula] = useState('');
  const [taskDetails, setTaskDetails] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [productPromptId, setProductPromptId] = useState<string | null>(null);
  const [productRecordedInput, setProductRecordedInput] = useState('');

  const todayIso = new Date().toISOString().slice(0, 10);

  const handleGenerateSmartSchedule = () => {
    const targetCrop = activeSection?.crop || taskCrop;
    const generated = generateCropCareSchedule({
      crop: targetCrop,
      growingStage: activeSection?.growingStage || 'vegetative',
      plotId: activePlot?.id,
      sectionId: activeSection?.id,
      sectionName: activeSection?.name,
      snapshot,
      allCrops,
      language,
    });

    const newTasks: CareActivity[] = generated.map((g, idx) => {
      const d = new Date(Date.now() + g.offsetDays * 86400_000).toISOString().slice(0, 10);
      return {
        id: `care-${Date.now()}-${idx}`,
        plotId: activePlot?.id,
        sectionId: activeSection?.id,
        sectionName: activeSection?.name,
        crop: targetCrop,
        growingStage: activeSection?.growingStage,
        type: g.type,
        title: isAr ? g.titleAr : g.titleEn,
        details: isAr ? g.detailsAr : g.detailsEn,
        scheduledDate: d,
        npkFormula: g.npkFormula,
        status: 'scheduled',
        reminderEnabled: true,
        createdAt: new Date().toISOString(),
      };
    });

    onCareSchedulesChange([...newTasks, ...careSchedules]);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    if (editingTaskId) {
      onCareSchedulesChange(
        careSchedules.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                crop: taskCrop,
                type: taskType,
                title: taskTitle.trim(),
                scheduledDate: taskDate,
                npkFormula: taskNpkFormula.trim() || undefined,
                details: taskDetails.trim() || t.details,
              }
            : t,
        ),
      );
      setEditingTaskId(null);
    } else {
      const item: CareActivity = {
        id: `care-${Date.now()}`,
        plotId: activePlot?.id,
        sectionId: activeSection?.id,
        sectionName: activeSection?.name,
        crop: taskCrop,
        growingStage: activeSection?.growingStage,
        type: taskType,
        title: taskTitle.trim(),
        details: taskDetails.trim() || (isAr ? 'مهمة رعاية مخصصة' : 'Scheduled farm care activity'),
        scheduledDate: taskDate,
        npkFormula: taskNpkFormula.trim() || undefined,
        status: 'scheduled',
        reminderEnabled: true,
        createdAt: new Date().toISOString(),
      };
      onCareSchedulesChange([item, ...careSchedules]);
    }
    setTaskTitle('');
    setTaskNpkFormula('');
    setTaskDetails('');
    setShowAddTask(false);
  };

  const handleMarkTaskDone = (id: string) => {
    onCareSchedulesChange(
      careSchedules.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'completed',
              completedAt: new Date().toISOString(),
              productRecorded: productRecordedInput.trim() || t.productRecorded,
            }
          : t,
      ),
    );
    setProductPromptId(null);
    setProductRecordedInput('');
  };

  const handleRescheduleTask = (id: string, newDate: string) => {
    onCareSchedulesChange(
      careSchedules.map((t) =>
        t.id === id ? { ...t, scheduledDate: newDate, status: 'scheduled' } : t,
      ),
    );
  };

  const handleCancelTask = (id: string) => {
    onCareSchedulesChange(
      careSchedules.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t)),
    );
  };

  const groupedTasks = useMemo(() => {
    const overdue = careSchedules.filter((t) => t.status === 'scheduled' && t.scheduledDate < todayIso);
    const dueToday = careSchedules.filter((t) => t.status === 'scheduled' && t.scheduledDate === todayIso);
    const upcoming = careSchedules
      .filter((t) => t.status === 'scheduled' && t.scheduledDate > todayIso)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    const completed = careSchedules.filter((t) => t.status === 'completed');
    return { overdue, dueToday, upcoming, completed };
  }, [careSchedules, todayIso]);

  // Simple 30-day calendar grid starting from current month start
  const monthDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const total = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: total }, (_, idx) => {
      const dayNum = idx + 1;
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const tasks = careSchedules.filter((t) => t.scheduledDate === iso && t.status !== 'cancelled');
      return { dayNum, iso, tasks };
    });
  }, [careSchedules]);

  return (
    <div className="space-y-4 animate-thamra-in">
      {/* Header */}
      <div className="thamra-card p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#1C250C] flex items-center gap-2">
            <Droplets className="w-5 h-5 text-[#535C21]" />
            <span>
              {isAr ? 'مراقبة خزانات المياه وجدولة التسميد والرعاية' : 'Water-Level Monitor & Care Scheduler'}
            </span>
          </h1>
          <p className="text-xs text-[#535C21] mt-0.5">
            {isAr
              ? 'مراقبة الخزانات عبر الحساسات الحقيقية وجدول تسميد NPK والرش الورقي وإدارة الرطوبة'
              : 'Live IoT water tank monitoring + crop- & stage-specific NPK, foliar & monthly care plans'}
          </p>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('water')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'water'
                ? 'bg-[#535C21] text-white'
                : 'bg-[#faf8f4] border border-[#D5D5D5] text-[#1C250C]'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>{isAr ? 'خزانات المياه' : 'Water Tanks'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('care')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'care'
                ? 'bg-[#535C21] text-white'
                : 'bg-[#faf8f4] border border-[#D5D5D5] text-[#1C250C]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isAr ? 'جدول التسميد والرعاية' : 'Care Schedule'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: WATER-LEVEL MONITORING                             */}
      {/* ========================================================= */}
      {activeTab === 'water' && (
        <div className="space-y-4">
          {/* Tank Selector Bar */}
          <div className="thamra-card p-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {waterTanks.map((tank) => (
                <button
                  key={tank.id}
                  type="button"
                  onClick={() => setSelectedTankId(tank.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                    selectedTank?.id === tank.id
                      ? 'bg-[#535C21] border-[#535C21] text-white'
                      : 'bg-[#faf8f4] border-[#D5D5D5] text-[#1C250C]'
                  }`}
                >
                  {tank.status === 'connected' ? (
                    <Wifi className="w-3.5 h-3.5 text-[#DBAE83]" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 opacity-70" />
                  )}
                  <span>{tank.name}</span>
                  <span className="font-mono-tabular">
                    {tank.status === 'connected' && tank.currentLevelPercent !== null
                      ? `${tank.currentLevelPercent}%`
                      : isAr
                        ? '(غير متصل)'
                        : '(Not connected)'}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddTank((v) => !v)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1C250C] text-[#DBAE83] text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'إضافة خزان مياه' : 'Add Water Tank'}</span>
            </button>
          </div>

          {showAddTank && (
            <form
              onSubmit={(e) => void handleCreateTank(e)}
              className="thamra-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end text-xs animate-thamra-in"
            >
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'اسم الخزان' : 'Tank Name'}
                </label>
                <input
                  required
                  value={newTankName}
                  onChange={(e) => setNewTankName(e.target.value)}
                  placeholder={isAr ? 'مثال: خزان الري الرئيسي' : 'e.g. Main Drip Reservoir'}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'السعة (لتر)' : 'Capacity (Liters)'}
                </label>
                <input
                  type="number"
                  min={100}
                  value={newTankCapacity}
                  onChange={(e) => setNewTankCapacity(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'حد التنبيه المنخفض %' : 'Low Alert Threshold %'}
                </label>
                <input
                  type="number"
                  min={5}
                  max={80}
                  value={newTankMin}
                  onChange={(e) => setNewTankMin(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'الحد الحرج %' : 'Critical Threshold %'}
                </label>
                <input
                  type="number"
                  min={2}
                  max={40}
                  value={newTankCritical}
                  onChange={(e) => setNewTankCritical(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
              <button
                type="submit"
                disabled={creatingTank}
                className="py-2 px-4 rounded-xl bg-[#535C21] text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {creatingTank ? (isAr ? 'حفظ...' : 'Saving...') : isAr ? 'حفظ الخزان' : 'Register Tank'}
              </button>
            </form>
          )}

          {tankError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {tankError}
            </p>
          )}

          {selectedTank ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Visual Tank Graphic */}
              <div className="lg:col-span-5 thamra-card p-5 flex flex-col items-center text-center space-y-3">
                <div className="w-full flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1C250C]">{selectedTank.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-lg font-bold ${
                      selectedTank.status === 'connected'
                        ? 'bg-[#e8f0d8] text-[#3f4a19]'
                        : 'bg-[#DBAE83]/30 text-[#7d4f16]'
                    }`}
                  >
                    {selectedTank.status === 'connected'
                      ? isAr
                        ? 'متصل'
                        : 'Connected'
                      : isAr
                        ? 'المستشعر غير متصل'
                        : 'Sensor not connected'}
                  </span>
                </div>

                {/* Animated Water Tank SVG */}
                <div className="relative w-44 h-56 my-2">
                  <svg viewBox="0 0 160 200" className="w-full h-full">
                    <defs>
                      <clipPath id="tankClip">
                        <rect x="20" y="24" width="120" height="156" rx="18" />
                      </clipPath>
                    </defs>

                    {/* Outer Tank Shell */}
                    <rect
                      x="20"
                      y="24"
                      width="120"
                      height="156"
                      rx="18"
                      fill="#f5f3ee"
                      stroke={selectedTank.status === 'connected' ? '#535C21' : '#AD927E'}
                      strokeWidth="3"
                      strokeDasharray={selectedTank.status === 'disconnected' ? '6 5' : undefined}
                    />
                    {/* Cap */}
                    <rect x="62" y="12" width="36" height="12" rx="4" fill="#535C21" />

                    {/* Water Fill ONLY when real reading exists */}
                    {selectedTank.status === 'connected' && selectedTank.currentLevelPercent !== null && (
                      <g clipPath="url(#tankClip)">
                        {(() => {
                          const fillH = Math.round((selectedTank.currentLevelPercent / 100) * 156);
                          const fillY = 24 + (156 - fillH);
                          const isCrit =
                            selectedTank.currentLevelPercent <= selectedTank.criticalThresholdPercent;
                          const isLow =
                            selectedTank.currentLevelPercent <= selectedTank.minThresholdPercent;
                          const waterColor = isCrit
                            ? '#c94a38'
                            : isLow
                              ? '#d4943a'
                              : '#3d8cb8';
                          return (
                            <>
                              <rect
                                x="20"
                                y={fillY}
                                width="120"
                                height={fillH}
                                fill={waterColor}
                                opacity="0.82"
                              />
                              <path
                                d={`M 20 ${fillY} Q 50 ${fillY - 5} 80 ${fillY} T 140 ${fillY} L 140 180 L 20 180 Z`}
                                fill={waterColor}
                                opacity="0.35"
                              />
                            </>
                          );
                        })()}
                      </g>
                    )}

                    {/* Threshold Dashed Markers */}
                    <line
                      x1="20"
                      y1={24 + (156 * (100 - selectedTank.minThresholdPercent)) / 100}
                      x2="140"
                      y2={24 + (156 * (100 - selectedTank.minThresholdPercent)) / 100}
                      stroke="#8E7D49"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="20"
                      y1={24 + (156 * (100 - selectedTank.criticalThresholdPercent)) / 100}
                      x2="140"
                      y2={24 + (156 * (100 - selectedTank.criticalThresholdPercent)) / 100}
                      stroke="#b91c1c"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  </svg>

                  {/* Center Numeric Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {selectedTank.status === 'connected' && selectedTank.currentLevelPercent !== null ? (
                      <div className="bg-white/90 px-3 py-1.5 rounded-xl border border-[#D5D5D5] shadow-xs">
                        <p className="text-2xl font-bold font-mono-tabular text-[#1C250C]">
                          {selectedTank.currentLevelPercent}%
                        </p>
                        <p className="text-[11px] font-mono-tabular text-[#535C21]">
                          {selectedTank.currentVolumeLiters?.toLocaleString()} /{' '}
                          {selectedTank.capacityLiters.toLocaleString()} L
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white/95 px-3 py-2 rounded-xl border border-[#AD927E] max-w-[140px]">
                        <WifiOff className="w-5 h-5 text-[#8E7D49] mx-auto mb-1" />
                        <p className="text-xs font-bold text-[#1C250C]">
                          {isAr ? 'المستشعر غير متصل' : 'Sensor not connected'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTank.lastUpdatedAt && (
                  <p className="text-[11px] text-[#8E7D49]">
                    {isAr ? 'آخر تحديث:' : 'Last update:'}{' '}
                    <span className="font-mono-tabular">
                      {new Date(selectedTank.lastUpdatedAt).toLocaleString()}
                    </span>
                    {selectedTank.history[0]?.source === 'demo_test_packet' && (
                      <span className="ms-1.5 px-1.5 py-0.5 rounded bg-[#DBAE83]/35 text-[#7d4f16] font-semibold">
                        {isAr ? 'حزمة اختبار تجريبية' : 'Demo Test Packet'}
                      </span>
                    )}
                  </p>
                )}

                <div className="w-full flex flex-wrap justify-center gap-2 pt-1">
                  {selectedTank.status === 'connected' && (
                    <button
                      type="button"
                      onClick={() => void handleDisconnectTank()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#faf8f4] border border-[#D5D5D5] text-xs font-semibold text-[#8E7D49] hover:text-red-700 cursor-pointer"
                    >
                      <Unplug className="w-3.5 h-3.5" />
                      <span>{isAr ? 'فصل المستشعر' : 'Disconnect Sensor'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onTankRemovedLocal(selectedTank.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#faf8f4] border border-[#D5D5D5] text-xs font-semibold text-[#AD927E] hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'حذف' : 'Remove'}</span>
                  </button>
                </div>
              </div>

              {/* Thresholds, History & Honest Sensor Webhook Integration */}
              <div className="lg:col-span-7 space-y-4">
                <div className="thamra-card p-4 space-y-3 text-xs">
                  <h3 className="text-sm font-bold text-[#1C250C]">
                    {isAr ? 'حالة التنبيهات وسجل القراءات' : 'Alert Thresholds & Reading History'}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3">
                      <p className="text-[#8E7D49]">{isAr ? 'تنبيه المستوى المنخفض' : 'Low Water Alert'}</p>
                      <p className="text-base font-bold font-mono-tabular text-[#1C250C] mt-0.5">
                        ≤ {selectedTank.minThresholdPercent}% (
                        {Math.round((selectedTank.minThresholdPercent / 100) * selectedTank.capacityLiters)} L)
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3">
                      <p className="text-[#8E7D49]">{isAr ? 'تنبيه المستوى الحرج' : 'Critical Empty Alert'}</p>
                      <p className="text-base font-bold font-mono-tabular text-red-700 mt-0.5">
                        ≤ {selectedTank.criticalThresholdPercent}% (
                        {Math.round((selectedTank.criticalThresholdPercent / 100) * selectedTank.capacityLiters)} L)
                      </p>
                    </div>
                  </div>

                  {selectedTank.history.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="font-semibold text-[#535C21]">
                        {isAr ? 'آخر القراءات المسجلة:' : 'Recorded Sensor Readings:'}
                      </p>
                      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 items-end h-24 pt-2 border-b border-[#D5D5D5]">
                        {selectedTank.history
                          .slice(0, 10)
                          .reverse()
                          .map((r, i) => (
                            <div
                              key={i}
                              className="flex flex-col items-center justify-end h-full gap-1"
                              title={`${new Date(r.timestamp).toLocaleString()}: ${r.levelPercent}% (${r.source})`}
                            >
                              <span className="text-[9px] font-mono-tabular text-[#535C21]">
                                {r.levelPercent}%
                              </span>
                              <div
                                className="w-full max-w-[20px] rounded-t bg-[#3d8cb8]"
                                style={{ height: `${Math.max(8, r.levelPercent * 0.75)}%` }}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[#faf8f4] border border-dashed border-[#AD927E] p-4 text-center text-[#8E7D49]">
                      {isAr
                        ? 'لا توجد قراءات مسجلة لأن مستشعر الخزان غير متصل بعد. لن تُعرض أي أرقام وهمية.'
                        : 'No historical telemetry recorded yet because the sensor is disconnected. THAMRA never fabricates sensor numbers.'}
                    </div>
                  )}
                </div>

                {/* IoT Webhook & Explicitly Labeled Demo Tester */}
                <div className="thamra-card p-4 space-y-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowSensorSetup((v) => !v)}
                    className="w-full flex items-center justify-between font-bold text-[#1C250C] cursor-pointer"
                  >
                    <span>
                      {isAr
                        ? 'ربط مستشعر IoT الحقيقي (Webhook) أو إرسال حزمة اختبار'
                        : 'Hardware IoT Webhook Setup & Labeled Test Packet'}
                    </span>
                    {showSensorSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showSensorSetup && (
                    <div className="space-y-3 pt-2 border-t border-[#D5D5D5] animate-thamra-in">
                      <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-3 space-y-1">
                        <p className="font-semibold text-[#535C21]">
                          {isAr ? 'نقطة استقبال قراءات المستشعر (ESP32 / Ultrasonic):' : 'Live Sensor Push Endpoint (ESP32 / Ultrasonic / Float):'}
                        </p>
                        <code className="block bg-white border border-[#D5D5D5] rounded-lg p-2 text-[11px] font-mono-tabular break-all text-[#1C250C]">
                          POST /api/sensors/water-tanks/{selectedTank.id}/reading
                          {'\n'}Header: x-sensor-key: {selectedTank.webhookKey}
                          {'\n'}Body: {'{ "levelPercent": 68, "source": "sensor_webhook" }'}
                        </code>
                      </div>

                      <div className="rounded-xl bg-[#DBAE83]/20 border border-[#AD927E] p-3 space-y-2">
                        <p className="font-bold text-[#1C250C]">
                          {isAr
                            ? 'اختبار تجريبي واضح (ليس قراءة مستشعر فعلي):'
                            : 'Send Demo Test Sensor Packet (Clearly Labeled — Not Hardware Data):'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={demoPercentInput}
                            onChange={(e) => setDemoPercentInput(e.target.value)}
                            className="w-24 px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg font-mono-tabular"
                          />
                          <span className="text-[#535C21]">%</span>
                          <button
                            type="button"
                            disabled={sendingReading}
                            onClick={() => void handleSendDemoPacket()}
                            className="px-3.5 py-1.5 rounded-lg bg-[#1C250C] text-[#DBAE83] font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {sendingReading
                              ? isAr
                                ? 'إرسال...'
                                : 'Sending...'
                              : isAr
                                ? 'إرسال حزمة اختبار تجريبية'
                                : 'Send Demo Test Sensor Packet'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="thamra-card p-6 text-center space-y-2">
              <WifiOff className="w-8 h-8 text-[#8E7D49] mx-auto" />
              <p className="text-sm font-bold text-[#1C250C]">
                {isAr ? 'لا توجد خزانات مضافة بعد — المستشعر غير متصل' : 'No Water Tanks Registered Yet — Sensor Not Connected'}
              </p>
              <p className="text-xs text-[#535C21]">
                {isAr
                  ? 'أضف خزان المياه أعلاه لضبط السعة والتنبيهات وربط المستشعر الفعلي.'
                  : 'Register a water tank above to configure tank capacity, low-level alerts, and hardware webhook telemetry.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: FERTILISATION & PLANT-CARE SCHEDULING              */}
      {/* ========================================================= */}
      {activeTab === 'care' && (
        <div className="space-y-4">
          <div className="thamra-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateSmartSchedule}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1C250C] hover:bg-[#2d3b15] text-[#DBAE83] text-xs font-bold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isAr
                    ? `توليد خطة رعاية وتسميد ذكية (${activeSection?.crop || taskCrop})`
                    : `Generate Smart Plan (${activeSection?.crop || taskCrop})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingTaskId(null);
                  setShowAddTask((v) => !v);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#535C21] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة نشاط' : 'Add Activity'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onAskTamra(
                    isAr
                      ? `راجع جدول التسميد والرعاية لمحصول ${activeSection?.crop || taskCrop} في المرحلة الحالية، واقترح تعديلات حسب رطوبة وطقس ناسا.`
                      : `Review my fertilisation & care schedule for ${activeSection?.crop || taskCrop} and suggest adjustments based on live NASA conditions.`,
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#D5D5D5] text-[#1C250C] text-xs font-semibold cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#535C21]" />
                <span>{isAr ? 'استشر تمرة' : 'Ask Tamra'}</span>
              </button>
            </div>

            <div className="flex gap-1 bg-[#faf8f4] p-1 rounded-xl border border-[#D5D5D5] text-xs">
              <button
                type="button"
                onClick={() => setCareView('agenda')}
                className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                  careView === 'agenda' ? 'bg-[#535C21] text-white' : 'text-[#1C250C]'
                }`}
              >
                {isAr ? 'قائمة المهام' : 'Agenda'}
              </button>
              <button
                type="button"
                onClick={() => setCareView('calendar')}
                className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                  careView === 'calendar' ? 'bg-[#535C21] text-white' : 'text-[#1C250C]'
                }`}
              >
                {isAr ? 'التقويم الشهري' : 'Monthly Calendar'}
              </button>
            </div>
          </div>

          {showAddTask && (
            <form
              onSubmit={handleSaveTask}
              className="thamra-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs animate-thamra-in"
            >
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'نوع النشاط' : 'Activity Type'}
                </label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value as CareActivityType)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                >
                  <option value="npk">{isAr ? 'تسميد NPK' : 'NPK Fertilisation'}</option>
                  <option value="foliar">{isAr ? 'رش ورقي' : 'Foliar Spraying'}</option>
                  <option value="humidity">{isAr ? 'إدارة الرطوبة والتهوية' : 'Humidity Management'}</option>
                  <option value="monthly_plan">{isAr ? 'خطة التسميد الشهرية' : 'Monthly Care Plan'}</option>
                  <option value="irrigation">{isAr ? 'فحص التنقيط والري' : 'Irrigation Check'}</option>
                  <option value="custom">{isAr ? 'نشاط مخصص' : 'Custom Activity'}</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'المحصول' : 'Crop'}
                </label>
                <select
                  value={taskCrop}
                  onChange={(e) => setTaskCrop(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
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
                  {isAr ? 'التاريخ المجدول' : 'Scheduled Date'}
                </label>
                <input
                  type="date"
                  required
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'عنوان النشاط' : 'Activity Title'}
                </label>
                <input
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder={isAr ? 'مثال: دفعة بوتاسيوم للثمار' : 'e.g. Flowering K-Boost Feed'}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'تركيبة NPK / المنتج (اختياري)' : 'NPK Formula / Note (Optional)'}
                </label>
                <input
                  value={taskNpkFormula}
                  onChange={(e) => setTaskNpkFormula(e.target.value)}
                  placeholder="e.g. High-K per label"
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#535C21] mb-1">
                  {isAr ? 'تفاصيل إضافية' : 'Details'}
                </label>
                <input
                  value={taskDetails}
                  onChange={(e) => setTaskDetails(e.target.value)}
                  placeholder={isAr ? 'تعليمات التطبيق' : 'Timing & safety instructions'}
                  className="w-full px-3 py-2 bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-3.5 py-2 rounded-xl border border-[#D5D5D5] bg-white cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#535C21] text-white font-bold cursor-pointer"
                >
                  {editingTaskId ? (isAr ? 'تحديث' : 'Update Task') : isAr ? 'حفظ المهمة' : 'Save Activity'}
                </button>
              </div>
            </form>
          )}

          {careView === 'calendar' ? (
            <div className="thamra-card p-4 space-y-3">
              <h2 className="text-sm font-bold text-[#1C250C]">
                {new Date().toLocaleString(isAr ? 'ar-BH' : 'en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {monthDays.map((d) => (
                  <div
                    key={d.iso}
                    className={`min-h-[76px] rounded-xl border p-2 text-[11px] flex flex-col gap-1 ${
                      d.iso === todayIso
                        ? 'border-[#535C21] bg-[#edf2e2]/70'
                        : 'border-[#D5D5D5] bg-[#faf8f4]'
                    }`}
                  >
                    <span className="font-mono-tabular font-bold text-[#1C250C]">{d.dayNum}</span>
                    {d.tasks.map((t) => (
                      <span
                        key={t.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate ${
                          t.status === 'completed'
                            ? 'bg-[#e8f0d8] text-[#3f4a19] line-through'
                            : 'bg-[#535C21] text-white'
                        }`}
                        title={t.title}
                      >
                        {t.title}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {careSchedules.filter((t) => t.status !== 'cancelled').length === 0 && (
                <div className="thamra-card p-6 text-center space-y-2">
                  <Calendar className="w-7 h-7 text-[#535C21] mx-auto" />
                  <p className="text-sm font-bold text-[#1C250C]">
                    {isAr ? 'لا توجد أنشطة مجدولة بعد' : 'No Care Activities Scheduled Yet'}
                  </p>
                  <p className="text-xs text-[#535C21]">
                    {isAr
                      ? 'اضغط "توليد خطة رعاية وتسميد ذكية" أعلاه لإنشاء جدول NPK والرش الورقي وإدارة الرطوبة لمحصولك.'
                      : 'Tap "Generate Smart Plan" above to populate NPK, foliar, humidity & monthly tasks tailored to your crop stage.'}
                  </p>
                </div>
              )}

              {(
                [
                  { key: 'overdue', titleEn: 'Overdue Activities', titleAr: 'أنشطة متأخرة', items: groupedTasks.overdue, accent: 'border-red-300 bg-red-50/40' },
                  { key: 'dueToday', titleEn: 'Due Today', titleAr: 'مستحقة اليوم', items: groupedTasks.dueToday, accent: 'border-[#AD927E] bg-[#DBAE83]/15' },
                  { key: 'upcoming', titleEn: 'Upcoming Activities', titleAr: 'أنشطة قادمة', items: groupedTasks.upcoming, accent: 'border-[#D5D5D5] bg-white' },
                  { key: 'completed', titleEn: 'Completed Care Log', titleAr: 'سجل الأنشطة المكتملة', items: groupedTasks.completed, accent: 'border-[#535C21]/30 bg-[#edf2e2]/40' },
                ] as const
              ).map((group) =>
                group.items.length > 0 ? (
                  <section key={group.key} className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#535C21] flex items-center gap-1.5">
                      {group.key === 'overdue' && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                      <span>{isAr ? group.titleAr : group.titleEn}</span>
                      <span className="font-mono-tabular">({group.items.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.items.map((task) => (
                        <div key={task.id} className={`rounded-2xl border p-4 text-xs space-y-2 ${group.accent}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white border border-[#D5D5D5] text-[#535C21]">
                                {task.type} · {task.crop}
                              </span>
                              <h4 className="mt-1.5 text-sm font-bold text-[#1C250C]">{task.title}</h4>
                            </div>
                            <span className="font-mono-tabular text-[11px] font-semibold text-[#8E7D49]">
                              {task.scheduledDate}
                            </span>
                          </div>

                          <p className="text-[#535C21] leading-relaxed">{task.details}</p>

                          {task.npkFormula && (
                            <p className="text-[11px] font-semibold text-[#1C250C]">
                              {isAr ? 'التركيبة المقترحة: ' : 'Focus: '}{task.npkFormula}
                            </p>
                          )}

                          {task.productRecorded && (
                            <p className="text-[11px] font-semibold text-[#3f4a19]">
                              {isAr ? 'المنتج المسجل: ' : 'Recorded product: '}{task.productRecorded}
                            </p>
                          )}

                          {task.status === 'scheduled' && (
                            <div className="pt-1 space-y-2">
                              {productPromptId === task.id ? (
                                <div className="flex flex-wrap gap-1.5">
                                  <input
                                    type="text"
                                    value={productRecordedInput}
                                    onChange={(e) => setProductRecordedInput(e.target.value)}
                                    placeholder={isAr ? 'اسم السماد أو المنتج المستخدم...' : 'Product / fertiliser applied (optional)'}
                                    className="flex-1 px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleMarkTaskDone(task.id)}
                                    className="px-3 py-1.5 rounded-lg bg-[#535C21] text-white font-semibold cursor-pointer"
                                  >
                                    {isAr ? 'تأكيد الإتمام' : 'Confirm'}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setProductPromptId(task.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#535C21] text-white font-semibold cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{isAr ? 'إتمام' : 'Mark Completed'}</span>
                                  </button>
                                  <input
                                    type="date"
                                    value={task.scheduledDate}
                                    onChange={(e) => handleRescheduleTask(task.id, e.target.value)}
                                    aria-label={isAr ? 'إعادة جدولة' : 'Reschedule date'}
                                    className="px-2 py-1 bg-white border border-[#D5D5D5] rounded-lg text-[11px]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTaskId(task.id);
                                      setTaskCrop(task.crop);
                                      setTaskType(task.type);
                                      setTaskTitle(task.title);
                                      setTaskDate(task.scheduledDate);
                                      setTaskNpkFormula(task.npkFormula || '');
                                      setTaskDetails(task.details);
                                      setShowAddTask(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-white border border-[#D5D5D5] text-[#535C21] cursor-pointer"
                                    title={isAr ? 'تعديل' : 'Edit'}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelTask(task.id)}
                                    className="p-1.5 rounded-lg bg-white border border-[#D5D5D5] text-[#AD927E] hover:text-red-700 cursor-pointer"
                                    title={isAr ? 'إلغاء' : 'Cancel'}
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null,
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
