import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { FarmMapModule } from './components/map/FarmMapModule';
import { NotificationCenterDrawer } from './components/notifications/NotificationCenterDrawer';
import { AnalysisPage } from './components/pages/AnalysisPage';
import { CommunityPage } from './components/pages/CommunityPage';
import {
  CropHealthVisionPage,
  type VisionTab,
} from './components/pages/CropHealthVisionPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { LoadingPage } from './components/pages/LoadingPage';
import { LoginPage } from './components/pages/LoginPage';
import { PlantRotationPage } from './components/pages/PlantRotationPage';
import { SettingsPage } from './components/pages/SettingsPage';
import {
  WaterAndCarePage,
  type WaterCareTab,
} from './components/pages/WaterAndCarePage';
import { TamraAssistant } from './components/tamra/TamraAssistant';
import { CROP_LIBRARY } from './data/cropDatabase';
import { SAMPLE_SCENARIOS } from './data/sampleScenarios';
import {
  fetchCurrentUser,
  fetchWaterTanksApi,
  loadRemoteWorkspace,
  saveRemoteWorkspace,
  setStoredAuthToken,
} from './services/appApi';
import { fetchNasaFarmData } from './services/nasaMapApi';
import { checkBackendHealth } from './services/tamraApi';
import type {
  AppNotification,
  AppPage,
  CareActivity,
  CropLibraryItem,
  DiseaseDetectionRecord,
  FarmEnvironmentSnapshot,
  FarmPlot,
  FruitRipenessResult,
  PlantHealthObservation,
  SecurityEvent,
  UserProfile,
  UserSettings,
  WaterTank,
} from './types/farm';
import { loadPersistedFarms, savePersistedFarms } from './utils/farmStorage';
import { buildFarmNotifications } from './utils/notificationEngine';

const DEFAULT_COORDS = {
  latitude: 26.155,
  longitude: 50.505,
  name: "Buri & A'ali Farms, Bahrain",
};

const DEFAULT_SETTINGS: UserSettings = {
  language: 'en',
  notificationsEnabled: true,
  notifyWeather: true,
  notifySoilWater: true,
  notifyPlantCare: true,
  notifySecurity: true,
  moistureAlertThreshold: 18,
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  tamraAutoSpeak: true,
  tamraContinuousVoice: true,
  tamraSpeechRate: 1.0,
};

const VALID_PAGES: AppPage[] = [
  'loading',
  'dashboard',
  'analysis',
  'map',
  'health',
  'water',
  'tamra',
  'rotation',
  'community',
  'login',
  'settings',
];

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readInitialHashPage(): AppPage | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace('#', '') as AppPage;
  return VALID_PAGES.includes(hash) && hash !== 'loading' ? hash : null;
}

export default function App() {
  const initialWorkspace = useMemo(() => loadPersistedFarms(), []);

  // Show THAMRA Loading Page cleanly on initial entry unless deep-linked via hash
  const [showSplash, setShowSplash] = useState<boolean>(() => readInitialHashPage() === null);
  const [activePage, setActivePage] = useState<AppPage>(
    () => readInitialHashPage() ?? 'dashboard',
  );

  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...readJsonStorage<Partial<UserSettings>>('thamra_settings_v1', {}),
  }));

  const [plots, setPlots] = useState<FarmPlot[]>(() => initialWorkspace?.plots ?? []);
  const [activePlotId, setActivePlotId] = useState<string | null>(
    () => initialWorkspace?.activePlotId ?? initialWorkspace?.plots[0]?.id ?? null,
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    () => initialWorkspace?.activeSectionId ?? null,
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    () => initialWorkspace?.savedAt ?? null,
  );

  const [customCrops, setCustomCrops] = useState<CropLibraryItem[]>(() =>
    readJsonStorage<CropLibraryItem[]>('thamra_custom_crops_v1', []),
  );
  const [favoriteCropIds, setFavoriteCropIds] = useState<string[]>(() =>
    readJsonStorage<string[]>('thamra_fav_crops_v1', ['tomatoes', 'cowpea', 'barley']),
  );

  // New agricultural features state
  const [ripenessHistory, setRipenessHistory] = useState<FruitRipenessResult[]>(() =>
    readJsonStorage<FruitRipenessResult[]>('thamra_ripeness_v1', []),
  );
  const [diseaseDetections, setDiseaseDetections] = useState<DiseaseDetectionRecord[]>(() =>
    readJsonStorage<DiseaseDetectionRecord[]>('thamra_diseases_v1', []),
  );
  const [healthObservations, setHealthObservations] = useState<PlantHealthObservation[]>(() =>
    readJsonStorage<PlantHealthObservation[]>('thamra_health_v1', []),
  );
  const [waterTanks, setWaterTanks] = useState<WaterTank[]>(() =>
    readJsonStorage<WaterTank[]>('thamra_tanks_v1', []),
  );
  const [careSchedules, setCareSchedules] = useState<CareActivity[]>(() =>
    readJsonStorage<CareActivity[]>('thamra_care_v1', []),
  );
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(() =>
    readJsonStorage<SecurityEvent[]>('thamra_security_v1', []),
  );
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    readJsonStorage<string[]>('thamra_read_notifs_v1', []),
  );
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() =>
    readJsonStorage<string[]>('thamra_dismissed_notifs_v1', []),
  );

  const [pendingTamraPrompt, setPendingTamraPrompt] = useState<string | null>(null);
  const [healthTab, setHealthTab] = useState<VisionTab>('ripeness');
  const [waterCareTab, setWaterCareTab] = useState<WaterCareTab>('water');
  const [focusedDiseaseId, setFocusedDiseaseId] = useState<string | null>(null);
  const [prefillRecommendation, setPrefillRecommendation] = useState<{
    crop: string;
    issue: string;
  } | null>(null);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  const allCrops = useMemo(() => [...CROP_LIBRARY, ...customCrops], [customCrops]);

  const activePlot = useMemo(
    () => plots.find((p) => p.id === activePlotId) ?? plots[0] ?? null,
    [plots, activePlotId],
  );
  const activeSection = useMemo(
    () => activePlot?.sections.find((s) => s.id === activeSectionId) ?? null,
    [activePlot, activeSectionId],
  );

  const [coords, setCoords] = useState(() => {
    const p =
      initialWorkspace?.plots.find((pl) => pl.id === initialWorkspace.activePlotId) ??
      initialWorkspace?.plots[0];
    if (p) {
      return { latitude: p.centroid.lat, longitude: p.centroid.lon, name: p.name };
    }
    return DEFAULT_COORDS;
  });

  const [snapshot, setSnapshot] = useState<FarmEnvironmentSnapshot | null>(
    () => activeSection?.snapshot ?? activePlot?.snapshot ?? null,
  );
  const [loadingNasa, setLoadingNasa] = useState<boolean>(true);
  const [nasaError, setNasaError] = useState<string | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(true);

  const [cropType, setCropType] = useState<string>('Date Palms & Tomatoes');
  const [soilType, setSoilType] = useState<string>(() => activePlot?.soilType || 'Sandy Loam');

  const logSecurityEvent = useCallback(
    (evt: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
      const entry: SecurityEvent = {
        ...evt,
        id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      setSecurityEvents((prev) => [entry, ...prev].slice(0, 30));
    },
    [],
  );

  const navigateTo = useCallback((page: AppPage) => {
    if (page === 'loading') {
      setShowSplash(true);
      return;
    }
    setShowSplash(false);
    setActivePage(page);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${page}`);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const p = readInitialHashPage();
      if (p) {
        setShowSplash(false);
        setActivePage(p);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Restore session, remote workspace & registered water tanks
  useEffect(() => {
    fetchCurrentUser()
      .then(async (profile) => {
        if (!profile) {
          const publicTanks = await fetchWaterTanksApi().catch(() => []);
          if (publicTanks.length > 0) setWaterTanks(publicTanks);
          return;
        }
        setUser(profile);
        const [remote, tanks] = await Promise.all([
          loadRemoteWorkspace().catch(() => null),
          fetchWaterTanksApi().catch(() => []),
        ]);
        if (remote) {
          if (remote.plots.length > 0) {
            setPlots(remote.plots);
            setActivePlotId(remote.activePlotId ?? remote.plots[0]?.id ?? null);
            setActiveSectionId(remote.activeSectionId ?? null);
          }
          if (remote.customCrops.length > 0) setCustomCrops(remote.customCrops);
          if (remote.favoriteCropIds.length > 0) setFavoriteCropIds(remote.favoriteCropIds);
          if (remote.ripenessHistory?.length) setRipenessHistory(remote.ripenessHistory);
          if (remote.diseaseDetections?.length) setDiseaseDetections(remote.diseaseDetections);
          if (remote.healthObservations?.length) setHealthObservations(remote.healthObservations);
          if (remote.careSchedules?.length) setCareSchedules(remote.careSchedules);
          if (remote.securityEvents?.length) setSecurityEvents(remote.securityEvents);
          if (remote.readNotificationIds?.length) setReadNotificationIds(remote.readNotificationIds);
          if (remote.dismissedNotificationIds?.length) {
            setDismissedNotificationIds(remote.dismissedNotificationIds);
          }
          if (remote.settings) setSettings((prev) => ({ ...prev, ...remote.settings }));
        }
        if (tanks.length > 0) {
          setWaterTanks(tanks);
        } else if (remote?.waterTanks?.length) {
          setWaterTanks(remote.waterTanks);
        }
      })
      .catch(() => {});
  }, []);

  // Persist workspace locally + to backend when authenticated
  useEffect(() => {
    const savedAt = savePersistedFarms({ plots, activePlotId, activeSectionId });
    setLastSavedAt(savedAt);
    try {
      window.localStorage?.setItem('thamra_settings_v1', JSON.stringify(settings));
      window.localStorage?.setItem('thamra_custom_crops_v1', JSON.stringify(customCrops));
      window.localStorage?.setItem('thamra_fav_crops_v1', JSON.stringify(favoriteCropIds));
      window.localStorage?.setItem('thamra_ripeness_v1', JSON.stringify(ripenessHistory));
      window.localStorage?.setItem('thamra_diseases_v1', JSON.stringify(diseaseDetections));
      window.localStorage?.setItem('thamra_health_v1', JSON.stringify(healthObservations));
      window.localStorage?.setItem('thamra_tanks_v1', JSON.stringify(waterTanks));
      window.localStorage?.setItem('thamra_care_v1', JSON.stringify(careSchedules));
      window.localStorage?.setItem('thamra_security_v1', JSON.stringify(securityEvents));
      window.localStorage?.setItem('thamra_read_notifs_v1', JSON.stringify(readNotificationIds));
      window.localStorage?.setItem(
        'thamra_dismissed_notifs_v1',
        JSON.stringify(dismissedNotificationIds),
      );
    } catch {
      // ignore storage errors
    }
    if (user) {
      void saveRemoteWorkspace({
        plots,
        activePlotId,
        activeSectionId,
        customCrops,
        favoriteCropIds,
        ripenessHistory,
        diseaseDetections,
        healthObservations,
        waterTanks,
        careSchedules,
        securityEvents,
        readNotificationIds,
        dismissedNotificationIds,
        settings,
      }).catch(() => {});
    }
  }, [
    plots,
    activePlotId,
    activeSectionId,
    settings,
    customCrops,
    favoriteCropIds,
    ripenessHistory,
    diseaseDetections,
    healthObservations,
    waterTanks,
    careSchedules,
    securityEvents,
    readNotificationIds,
    dismissedNotificationIds,
    user,
  ]);

  const loadLiveNasa = useCallback(
    async (lat: number, lon: number, name?: string, forceRefresh = false) => {
      setLoadingNasa(true);
      setNasaError(null);
      try {
        const data = await fetchNasaFarmData({
          latitude: lat,
          longitude: lon,
          name,
          forceRefresh,
        });
        setSnapshot(data);
        return data;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to fetch live NASA environmental data.';
        setNasaError(msg);
        logSecurityEvent({
          type: 'api_error',
          severity: 'warning',
          titleEn: 'NASA data fetch error',
          titleAr: 'تعذر جلب بيانات ناسا',
          detailEn: msg,
          detailAr: msg,
        });
        return null;
      } finally {
        setLoadingNasa(false);
      }
    },
    [logSecurityEvent],
  );

  useEffect(() => {
    void loadLiveNasa(coords.latitude, coords.longitude, coords.name);
    checkBackendHealth()
      .then((res) => setGeminiConfigured(res.geminiConfigured))
      .catch(() => setGeminiConfigured(true));
  }, []);

  const handleSelectCoordinates = (lat: number, lon: number, label?: string) => {
    const resolvedName = label || `Farm (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
    setCoords({ latitude: lat, longitude: lon, name: resolvedName });
    void loadLiveNasa(lat, lon, resolvedName, false);
  };

  const handleRefreshLive = async () => {
    const targetLat = activeSection?.centroid.lat ?? activePlot?.centroid.lat ?? coords.latitude;
    const targetLon = activeSection?.centroid.lon ?? activePlot?.centroid.lon ?? coords.longitude;
    const targetName = activeSection
      ? `${activePlot?.name} — ${activeSection.name}`
      : activePlot?.name ?? coords.name;

    const fresh = await loadLiveNasa(targetLat, targetLon, targetName, true);
    if (fresh && activePlot) {
      setPlots((prev) =>
        prev.map((plot) => {
          if (plot.id !== activePlot.id) return plot;
          if (activeSection) {
            return {
              ...plot,
              sections: plot.sections.map((s) =>
                s.id === activeSection.id ? { ...s, snapshot: fresh } : s,
              ),
            };
          }
          return { ...plot, snapshot: fresh };
        }),
      );
    }
  };

  const handleSelectSampleScenario = (scenarioId: string) => {
    const found = SAMPLE_SCENARIOS.find((s) => s.id === scenarioId);
    if (!found) return;
    setNasaError(null);
    setSnapshot(found.snapshot);
    setCropType(found.cropType);
    setSoilType(found.soilType);
    setCoords({
      latitude: found.snapshot.location.latitude,
      longitude: found.snapshot.location.longitude,
      name: found.snapshot.location.name,
    });
  };

  const handleCreatePlot = useCallback((plot: FarmPlot) => {
    setPlots((prev) => [...prev, plot]);
    setActivePlotId(plot.id);
    setActiveSectionId(null);
    setCoords({
      latitude: plot.centroid.lat,
      longitude: plot.centroid.lon,
      name: plot.name,
    });
  }, []);

  const handleUpdatePlot = useCallback(
    (plotId: string, updater: (plot: FarmPlot) => FarmPlot) => {
      setPlots((prev) => prev.map((p) => (p.id === plotId ? updater(p) : p)));
    },
    [],
  );

  const handleDeletePlot = useCallback(
    (plotId: string) => {
      setPlots((prev) => {
        const remaining = prev.filter((p) => p.id !== plotId);
        if (activePlotId === plotId) {
          const next = remaining[0] ?? null;
          setActivePlotId(next?.id ?? null);
          setActiveSectionId(null);
        }
        return remaining;
      });
    },
    [activePlotId],
  );

  const handleSelectPlot = useCallback(
    (plotId: string | null) => {
      setActivePlotId(plotId);
      setActiveSectionId(null);
      const found = plots.find((p) => p.id === plotId);
      if (found) {
        setCoords({
          latitude: found.centroid.lat,
          longitude: found.centroid.lon,
          name: found.name,
        });
        if (found.snapshot) {
          setSnapshot(found.snapshot);
        } else {
          void loadLiveNasa(found.centroid.lat, found.centroid.lon, found.name, false);
        }
      }
    },
    [plots, loadLiveNasa],
  );

  const handleSelectSection = useCallback(
    (sectionId: string | null) => {
      setActiveSectionId(sectionId);
      if (!sectionId || !activePlot) return;
      const found = activePlot.sections.find((s) => s.id === sectionId);
      if (found) {
        setCoords({
          latitude: found.centroid.lat,
          longitude: found.centroid.lon,
          name: `${activePlot.name} — ${found.name}`,
        });
        if (found.snapshot) {
          setSnapshot(found.snapshot);
        }
      }
    },
    [activePlot],
  );

  const handleSaveNow = useCallback(() => {
    const savedAt = savePersistedFarms({ plots, activePlotId, activeSectionId });
    setLastSavedAt(savedAt);
  }, [plots, activePlotId, activeSectionId]);

  const handleUpdateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleLogout = useCallback(() => {
    setStoredAuthToken(null);
    setUser(null);
    navigateTo('login');
  }, [navigateTo]);

  const effectiveSnapshot = activeSection?.snapshot ?? activePlot?.snapshot ?? snapshot;
  const effectiveCropType = activeSection?.crop ?? cropType;
  const effectiveSoilType = activePlot?.soilType ?? soilType;

  // Dynamic Notification Center list
  const notifications = useMemo(
    () =>
      buildFarmNotifications({
        snapshot: effectiveSnapshot,
        nasaError,
        plots,
        activePlot,
        waterTanks,
        careSchedules,
        diseaseDetections,
        healthObservations,
        securityEvents,
        settings,
        readIds: readNotificationIds,
        dismissedIds: dismissedNotificationIds,
      }),
    [
      effectiveSnapshot,
      nasaError,
      plots,
      activePlot,
      waterTanks,
      careSchedules,
      diseaseDetections,
      healthObservations,
      securityEvents,
      settings,
      readNotificationIds,
      dismissedNotificationIds,
    ],
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  // Extra agricultural context passed into Tamra AI so responses reflect water tanks, care tasks, and recent vision scans
  const farmSummaryExtra = useMemo(() => {
    const lines: string[] = [];
    if (waterTanks.length > 0) {
      const tankStr = waterTanks
        .map((t) =>
          t.status === 'connected' && t.currentLevelPercent !== null
            ? `${t.name}: ${t.currentLevelPercent}% (${t.currentVolumeLiters}/${t.capacityLiters} L)`
            : `${t.name}: Sensor not connected`,
        )
        .join(' | ');
      lines.push(`Water Tanks: ${tankStr}`);
    } else {
      lines.push('Water Tanks: No sensor connected yet.');
    }

    const pendingCare = careSchedules.filter((c) => c.status === 'scheduled').slice(0, 5);
    if (pendingCare.length > 0) {
      lines.push(
        `Scheduled Care/Fertilisation Tasks: ${pendingCare
          .map((c) => `${c.scheduledDate} ${c.title} (${c.crop}${c.npkFormula ? `, ${c.npkFormula}` : ''})`)
          .join('; ')}`,
      );
    }

    if (ripenessHistory[0]) {
      const r = ripenessHistory[0];
      lines.push(
        `Latest Fruit Ripeness Check: ${r.fruitType} -> ${r.ripenessStage} (${r.confidencePct}% confidence, ${r.harvestRecommendation})`,
      );
    }
    if (diseaseDetections[0]) {
      const d = diseaseDetections[0];
      lines.push(
        `Latest Plant Disease/Injury Screening: ${d.crop} -> ${d.suspectedIssue} (${d.category}, ${d.confidence} confidence — indicative screening only)`,
      );
    }
    if (healthObservations[0]) {
      const h = healthObservations[0];
      lines.push(
        `Latest Plant Health Observation: ${h.crop} -> ${h.overallStatus} (${h.visibleFindings.slice(0, 2).join(', ')})`,
      );
    }
    return lines.join('\n');
  }, [waterTanks, careSchedules, ripenessHistory, diseaseDetections, healthObservations]);

  const handleOpenNotificationTarget = (n: AppNotification) => {
    setReadNotificationIds((prev) => (prev.includes(n.id) ? prev : [...prev, n.id]));
    if (n.plotId) handleSelectPlot(n.plotId);
    if (n.sectionId) handleSelectSection(n.sectionId);
    if (n.targetPage === 'water') {
      setWaterCareTab(n.category === 'plant' ? 'care' : 'water');
    } else if (n.targetPage === 'health') {
      setHealthTab(n.id.startsWith('harvest-') ? 'ripeness' : n.id.startsWith('disease-') ? 'disease' : 'health');
    }
    setNotificationDrawerOpen(false);
    navigateTo(n.targetPage);
  };

  const accessibilityClasses = [
    settings.largeText ? 'thamra-large-text' : '',
    settings.highContrast ? 'thamra-high-contrast' : '',
    settings.reducedMotion ? 'thamra-reduced-motion' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (showSplash) {
    return (
      <LoadingPage
        language={settings.language}
        onComplete={() => setShowSplash(false)}
      />
    );
  }

  return (
    <div className={accessibilityClasses}>
      <AppShell
        activePage={activePage}
        onNavigate={navigateTo}
        language={settings.language}
        onToggleLanguage={() =>
          handleUpdateSettings({ language: settings.language === 'en' ? 'ar' : 'en' })
        }
        activePlot={activePlot}
        plots={plots}
        onSelectPlot={(id) => handleSelectPlot(id)}
        user={user}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setNotificationDrawerOpen(true)}
      >
        {!geminiConfigured && (
          <div className="mb-3 bg-[#DBAE83]/30 border border-[#AD927E] rounded-xl px-4 py-2.5 text-xs text-[#1C250C]">
            {settings.language === 'ar'
              ? 'مفتاح GEMINI_API_KEY غير مهيأ على الخادم. أضفه لتفعيل ذكاء تمرة والمحادثة الصوتية وفحص الصور.'
              : 'GEMINI_API_KEY is not configured on the server yet. Add it in Secrets to enable Tamra AI chat, voice, and vision checks.'}
          </div>
        )}

        {activePage === 'dashboard' && (
          <DashboardPage
            language={settings.language}
            user={user}
            plots={plots}
            activePlot={activePlot}
            snapshot={effectiveSnapshot}
            loadingNasa={loadingNasa}
            nasaError={nasaError}
            notifications={notifications}
            waterTanks={waterTanks}
            careSchedules={careSchedules}
            onSelectPlot={(id) => handleSelectPlot(id)}
            onRefreshLive={() => void handleRefreshLive()}
            onNavigate={navigateTo}
            onOpenNotifications={() => setNotificationDrawerOpen(true)}
            onOpenHealthTab={(tab) => {
              setHealthTab(tab);
              navigateTo('health');
            }}
            onOpenWaterCareTab={(tab) => {
              setWaterCareTab(tab);
              navigateTo('water');
            }}
          />
        )}

        {activePage === 'analysis' && (
          <AnalysisPage
            language={settings.language}
            plots={plots}
            activePlotId={activePlotId}
            activeSectionId={activeSectionId}
            snapshot={effectiveSnapshot}
            loadingNasa={loadingNasa}
            nasaError={nasaError}
            allCrops={allCrops}
            onSelectPlot={handleSelectPlot}
            onSelectSection={handleSelectSection}
            onRefreshLive={() => void handleRefreshLive()}
            onUpdatePlot={handleUpdatePlot}
            onAskTamraAboutSection={(prompt) => {
              setPendingTamraPrompt(prompt);
              navigateTo('tamra');
            }}
            onNavigate={navigateTo}
          />
        )}

        {activePage === 'map' && (
          <FarmMapModule
            language={settings.language}
            snapshot={effectiveSnapshot}
            loading={loadingNasa}
            error={nasaError}
            cropType={cropType}
            soilType={soilType}
            onCropTypeChange={setCropType}
            onSoilTypeChange={setSoilType}
            onSelectCoordinates={handleSelectCoordinates}
            onRefreshLive={() => void handleRefreshLive()}
            onSelectSampleScenario={handleSelectSampleScenario}
            plots={plots}
            activePlotId={activePlotId}
            activeSectionId={activeSectionId}
            lastSavedAt={lastSavedAt}
            onSelectPlot={handleSelectPlot}
            onSelectSection={handleSelectSection}
            onCreatePlot={handleCreatePlot}
            onUpdatePlot={handleUpdatePlot}
            onDeletePlot={handleDeletePlot}
            onSaveNow={handleSaveNow}
            onAskTamra={(secId) => {
              if (secId !== undefined) setActiveSectionId(secId);
              navigateTo('tamra');
            }}
            onOpenAnalysis={(secId) => {
              if (secId !== undefined) setActiveSectionId(secId);
              navigateTo('analysis');
            }}
            onOpenRotation={(secId) => {
              if (secId !== undefined) setActiveSectionId(secId);
              navigateTo('rotation');
            }}
          />
        )}

        {activePage === 'health' && (
          <CropHealthVisionPage
            language={settings.language}
            plots={plots}
            activePlotId={activePlotId}
            activeSectionId={activeSectionId}
            snapshot={effectiveSnapshot}
            allCrops={allCrops}
            ripenessHistory={ripenessHistory}
            diseaseDetections={diseaseDetections}
            healthObservations={healthObservations}
            initialTab={healthTab}
            prefillRecommendation={prefillRecommendation}
            onClearPrefillRecommendation={() => setPrefillRecommendation(null)}
            onSaveRipeness={(item) =>
              setRipenessHistory((prev) => [item, ...prev].slice(0, 20))
            }
            onSaveDisease={(item) =>
              setDiseaseDetections((prev) => [item, ...prev].slice(0, 25))
            }
            onSaveHealthObservation={(item) =>
              setHealthObservations((prev) => [item, ...prev].slice(0, 30))
            }
            onOpenDiseaseInRotation={(diseaseId) => {
              setFocusedDiseaseId(diseaseId ?? null);
              navigateTo('rotation');
            }}
            onAskTamra={(prompt) => {
              setPendingTamraPrompt(prompt);
              navigateTo('tamra');
            }}
            onLogApiError={(title, detail) =>
              logSecurityEvent({
                type: 'api_error',
                severity: 'warning',
                titleEn: title,
                titleAr: title,
                detailEn: detail,
                detailAr: detail,
              })
            }
          />
        )}

        {activePage === 'water' && (
          <WaterAndCarePage
            language={settings.language}
            plots={plots}
            activePlotId={activePlotId}
            activeSectionId={activeSectionId}
            snapshot={effectiveSnapshot}
            allCrops={allCrops}
            waterTanks={waterTanks}
            careSchedules={careSchedules}
            initialTab={waterCareTab}
            onTankUpdated={(tank) =>
              setWaterTanks((prev) => {
                const exists = prev.some((t) => t.id === tank.id);
                return exists ? prev.map((t) => (t.id === tank.id ? tank : t)) : [tank, ...prev];
              })
            }
            onTankRemovedLocal={(tankId) =>
              setWaterTanks((prev) => prev.filter((t) => t.id !== tankId))
            }
            onCareSchedulesChange={setCareSchedules}
            onAskTamra={(prompt) => {
              setPendingTamraPrompt(prompt);
              navigateTo('tamra');
            }}
            onLogSecurityEvent={(titleEn, titleAr, detailEn, detailAr) =>
              logSecurityEvent({
                type: 'sensor_disconnect',
                severity: 'warning',
                titleEn,
                titleAr,
                detailEn,
                detailAr,
              })
            }
          />
        )}

        {activePage === 'tamra' && (
          <div className="max-w-3xl mx-auto">
            <TamraAssistant
              language={settings.language}
              onLanguageChange={(lang) => handleUpdateSettings({ language: lang })}
              farmSnapshot={effectiveSnapshot}
              cropType={effectiveCropType}
              soilType={effectiveSoilType}
              farmPlots={plots}
              activePlotId={activePlotId}
              activeSectionId={activeSectionId}
              farmSummaryExtra={farmSummaryExtra}
              onSelectSectionFocus={handleSelectSection}
              onOpenMapPage={() => navigateTo('map')}
              autoSpeakDefault={settings.tamraAutoSpeak}
              continuousVoiceDefault={settings.tamraContinuousVoice}
              speechRate={settings.tamraSpeechRate}
              initialPrompt={pendingTamraPrompt}
              onClearInitialPrompt={() => setPendingTamraPrompt(null)}
            />
          </div>
        )}

        {activePage === 'rotation' && (
          <PlantRotationPage
            language={settings.language}
            plots={plots}
            activePlotId={activePlotId}
            activeSectionId={activeSectionId}
            snapshot={effectiveSnapshot}
            allCrops={allCrops}
            favoriteCropIds={favoriteCropIds}
            diseaseDetections={diseaseDetections}
            focusedDiseaseId={focusedDiseaseId}
            onClearFocusedDisease={() => setFocusedDiseaseId(null)}
            onToggleFavoriteCrop={(id) =>
              setFavoriteCropIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              )
            }
            onAddCustomCrop={(item) => setCustomCrops((prev) => [...prev, item])}
            onUpdatePlot={handleUpdatePlot}
            onSelectPlot={handleSelectPlot}
            onSelectSection={handleSelectSection}
            onAskTamra={(prompt) => {
              setPendingTamraPrompt(prompt);
              navigateTo('tamra');
            }}
            onOpenAgRecommendations={(crop, issue) => {
              setPrefillRecommendation({ crop, issue });
              setHealthTab('health');
              navigateTo('health');
            }}
            onOpenDiseaseScreening={() => {
              setHealthTab('disease');
              navigateTo('health');
            }}
          />
        )}

        {activePage === 'community' && (
          <CommunityPage language={settings.language} user={user} />
        )}

        {activePage === 'login' && (
          <LoginPage
            language={settings.language}
            onAuthenticated={async (profile) => {
              setUser(profile);
              logSecurityEvent({
                type: 'login',
                severity: 'info',
                titleEn: 'Account signed in',
                titleAr: 'تم تسجيل الدخول إلى الحساب',
                detailEn: `Signed in as ${profile.email}.`,
                detailAr: `تم تسجيل الدخول بالحساب ${profile.email}.`,
              });
              const [remote, tanks] = await Promise.all([
                loadRemoteWorkspace().catch(() => null),
                fetchWaterTanksApi().catch(() => []),
              ]);
              if (remote && remote.plots.length > 0 && plots.length === 0) {
                setPlots(remote.plots);
                setActivePlotId(remote.activePlotId ?? remote.plots[0]?.id ?? null);
              }
              if (remote?.careSchedules?.length && careSchedules.length === 0) {
                setCareSchedules(remote.careSchedules);
              }
              if (tanks.length > 0) setWaterTanks(tanks);
            }}
            onBackDashboard={() => navigateTo('dashboard')}
          />
        )}

        {activePage === 'settings' && (
          <SettingsPage
            language={settings.language}
            user={user}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onUserUpdated={setUser}
            onLogout={handleLogout}
            onGoLogin={() => navigateTo('login')}
          />
        )}
      </AppShell>

      <NotificationCenterDrawer
        open={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        language={settings.language}
        notifications={notifications}
        onMarkRead={(id) =>
          setReadNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
        }
        onMarkAllRead={() => setReadNotificationIds(notifications.map((n) => n.id))}
        onDismiss={(id) =>
          setDismissedNotificationIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
        }
        onClearAll={() =>
          setDismissedNotificationIds((prev) => [
            ...new Set([...prev, ...notifications.map((n) => n.id)]),
          ])
        }
        onOpenTarget={handleOpenNotificationTarget}
        onOpenSettings={(page) => {
          setNotificationDrawerOpen(false);
          navigateTo(page);
        }}
      />
    </div>
  );
}
