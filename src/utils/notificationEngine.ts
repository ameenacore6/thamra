import type {
  AppNotification,
  CareActivity,
  DiseaseDetectionRecord,
  FarmEnvironmentSnapshot,
  FarmPlot,
  PlantHealthObservation,
  SecurityEvent,
  UserSettings,
  WaterTank,
} from '../types/farm';

export function buildFarmNotifications(params: {
  snapshot: FarmEnvironmentSnapshot | null;
  nasaError: string | null;
  plots: FarmPlot[];
  activePlot: FarmPlot | null;
  waterTanks: WaterTank[];
  careSchedules: CareActivity[];
  diseaseDetections: DiseaseDetectionRecord[];
  healthObservations: PlantHealthObservation[];
  securityEvents: SecurityEvent[];
  settings: UserSettings;
  readIds: string[];
  dismissedIds: string[];
}): AppNotification[] {
  const {
    snapshot,
    nasaError,
    plots,
    activePlot,
    waterTanks,
    careSchedules,
    diseaseDetections,
    healthObservations,
    securityEvents,
    settings,
    readIds,
    dismissedIds,
  } = params;

  if (!settings.notificationsEnabled) return [];

  const list: AppNotification[] = [];
  const readSet = new Set(readIds);
  const dismissedSet = new Set(dismissedIds);
  const todayIso = new Date().toISOString().slice(0, 10);
  const twoDaysMs = 2 * 86400_000;

  // 1. WEATHER NOTIFICATIONS (Strictly from live NASA POWER or active error)
  if (settings.notifyWeather !== false && snapshot?.power.latest) {
    const latest = snapshot.power.latest;
    const temp = latest.t2mMax ?? latest.t2m;
    const rain = latest.precipitationMm ?? 0;
    const wind = latest.windSpeedMs ?? 0;
    const rh = latest.humidityPercent;

    if (temp !== null && temp >= 36) {
      list.push({
        id: `weather-heat-${latest.date}`,
        category: 'weather',
        severity: temp >= 41 ? 'critical' : 'warning',
        titleEn: `High heat alert (${Math.round(temp)}°C)`,
        titleAr: `تنبيه ارتفاع الحرارة (${Math.round(temp)}°م)`,
        detailEn: `NASA POWER recorded ${temp}°C near ${snapshot.location.name}. Check shade netting and shift irrigation to dawn/dusk.`,
        detailAr: `سجلت بيانات ناسا ${temp}°م قرب ${snapshot.location.name}. راجع التظليل والري الصباحي.`,
        timestamp: snapshot.fetchedAt,
        targetPage: 'analysis',
        plotId: activePlot?.id,
        read: false,
      });
    }

    if (rain >= 2) {
      list.push({
        id: `weather-rain-${latest.date}`,
        category: 'weather',
        severity: 'info',
        titleEn: `Rainfall observed (${rain.toFixed(1)} mm)`,
        titleAr: `تسجيل هطول أمطار (${rain.toFixed(1)} مم)`,
        detailEn: `Recent rainfall detected in NASA POWER for ${snapshot.location.name}. Consider skipping or reducing drip irrigation.`,
        detailAr: `رصدت بيانات ناسا أمطاراً في ${snapshot.location.name}. يمكنك تقليل أو تأجيل الري.`,
        timestamp: snapshot.fetchedAt,
        targetPage: 'analysis',
        plotId: activePlot?.id,
        read: false,
      });
    }

    if (wind >= 7.5) {
      list.push({
        id: `weather-wind-${latest.date}`,
        category: 'weather',
        severity: 'warning',
        titleEn: `Strong winds detected (${wind.toFixed(1)} m/s)`,
        titleAr: `تنبيه رياح قوية (${wind.toFixed(1)} م/ث)`,
        detailEn: 'Avoid foliar spraying during windy periods and inspect greenhouse ties or shade mesh.',
        detailAr: 'تجنب الرش الورقي أثناء الرياح القوية وتفقد شباك التظليل والدعامات.',
        timestamp: snapshot.fetchedAt,
        targetPage: 'water',
        plotId: activePlot?.id,
        read: false,
      });
    }

    if (rh !== null && rh >= 68 && temp !== null && temp >= 20 && temp <= 34) {
      list.push({
        id: `weather-humidity-${latest.date}`,
        category: 'weather',
        severity: 'warning',
        titleEn: `Humid weather favorable to fungal stress (${Math.round(rh)}% RH)`,
        titleAr: `رطوبة جوية مرتفعة تزيد خطر الفطريات (${Math.round(rh)}%)`,
        detailEn: 'High humidity and mild temperatures raise powdery mildew/blight watch conditions. Improve canopy airflow.',
        detailAr: 'الرطوبة العالية والدفء يرفعان خطر البياض الدقيقي واللفحة؛ حسّن التهوية الصباحية.',
        timestamp: snapshot.fetchedAt,
        targetPage: 'rotation',
        plotId: activePlot?.id,
        read: false,
      });
    }
  }

  // 2. SOIL & WATER NOTIFICATIONS (SMAP soil dryness + real Water Tank sensor readings)
  if (settings.notifySoilWater !== false) {
    if (snapshot) {
      const moisturePct =
        snapshot.smap.available && snapshot.smap.surfacePercent !== null
          ? snapshot.smap.surfacePercent
          : snapshot.power.latest?.gwetTop !== null && snapshot.power.latest?.gwetTop !== undefined
            ? Math.round(snapshot.power.latest.gwetTop * 100)
            : null;

      if (moisturePct !== null && moisturePct <= settings.moistureAlertThreshold) {
        list.push({
          id: `soil-dry-${snapshot.location.name}-${moisturePct}`,
          category: 'soil_water',
          severity: moisturePct <= Math.max(8, settings.moistureAlertThreshold - 6) ? 'critical' : 'warning',
          titleEn: `Soil moisture low (${moisturePct}%)`,
          titleAr: `انخفاض رطوبة التربة (${moisturePct}%)`,
          detailEn: `Regional soil wetness near ${snapshot.location.name} is below your ${settings.moistureAlertThreshold}% threshold. Verify drip emitters in active sections.`,
          detailAr: `مؤشر رطوبة التربة أقل من الحد المحدد (${settings.moistureAlertThreshold}%). تحقق من نقاطات الري في الأقسام.`,
          timestamp: snapshot.fetchedAt,
          targetPage: 'map',
          plotId: activePlot?.id,
          read: false,
        });
      }
    }

    for (const tank of waterTanks) {
      if (tank.status === 'disconnected') {
        list.push({
          id: `tank-disc-${tank.id}`,
          category: 'soil_water',
          severity: 'warning',
          titleEn: `Water sensor not connected: ${tank.name}`,
          titleAr: `مستشعر المياه غير متصل: ${tank.name}`,
          detailEn: 'Connect a physical tank level sensor webhook or verify hardware power to receive live water readings.',
          detailAr: 'يرجى ربط مستشعر الخزان الفعلي أو التحقق من التوصيل لاستقبال قراءات المياه الحية.',
          timestamp: tank.lastUpdatedAt || new Date().toISOString(),
          targetPage: 'water',
          tankId: tank.id,
          read: false,
        });
      } else if (tank.currentLevelPercent !== null) {
        if (tank.currentLevelPercent <= tank.criticalThresholdPercent) {
          list.push({
            id: `tank-crit-${tank.id}-${Math.round(tank.currentLevelPercent)}`,
            category: 'soil_water',
            severity: 'critical',
            titleEn: `CRITICAL water tank level: ${tank.name} (${tank.currentLevelPercent}%)`,
            titleAr: `مستوى مياه حرج في ${tank.name} (${tank.currentLevelPercent}%)`,
            detailEn: `Tank reserve dropped to ${tank.currentVolumeLiters ?? 0} L — below critical ${tank.criticalThresholdPercent}% limit.`,
            detailAr: `انخفض المخزون إلى ${tank.currentVolumeLiters ?? 0} لتر تحت الحد الحرج (${tank.criticalThresholdPercent}%).`,
            timestamp: tank.lastUpdatedAt || new Date().toISOString(),
            targetPage: 'water',
            tankId: tank.id,
            read: false,
          });
        } else if (tank.currentLevelPercent <= tank.minThresholdPercent) {
          list.push({
            id: `tank-low-${tank.id}-${Math.round(tank.currentLevelPercent)}`,
            category: 'soil_water',
            severity: 'warning',
            titleEn: `Low water tank warning: ${tank.name} (${tank.currentLevelPercent}%)`,
            titleAr: `تنبيه انخفاض مياه الخزان: ${tank.name} (${tank.currentLevelPercent}%)`,
            detailEn: `Water level (${tank.currentLevelPercent}%) is below your ${tank.minThresholdPercent}% alert threshold.`,
            detailAr: `مستوى الخزان (${tank.currentLevelPercent}%) أقل من حد التنبيه (${tank.minThresholdPercent}%).`,
            timestamp: tank.lastUpdatedAt || new Date().toISOString(),
            targetPage: 'water',
            tankId: tank.id,
            read: false,
          });
        }
      }
    }
  }

  // 3. PLANT NOTIFICATIONS (Care schedule due/overdue + harvest reminders + recent disease/health findings)
  if (settings.notifyPlantCare !== false) {
    for (const task of careSchedules) {
      if (task.status !== 'scheduled' || !task.reminderEnabled) continue;
      const diffMs = new Date(task.scheduledDate).getTime() - new Date(todayIso).getTime();
      if (task.scheduledDate < todayIso) {
        list.push({
          id: `care-overdue-${task.id}`,
          category: 'plant',
          severity: 'critical',
          titleEn: `Overdue care task: ${task.title}`,
          titleAr: `مهمة رعاية متأخرة: ${task.title}`,
          detailEn: `Scheduled for ${task.scheduledDate} (${task.crop}${task.sectionName ? ` · ${task.sectionName}` : ''}).`,
          detailAr: `كان موعدها ${task.scheduledDate} لمحصول ${task.crop}.`,
          timestamp: `${task.scheduledDate}T08:00:00.000Z`,
          targetPage: 'water',
          plotId: task.plotId,
          sectionId: task.sectionId,
          read: false,
        });
      } else if (task.scheduledDate === todayIso) {
        list.push({
          id: `care-today-${task.id}`,
          category: 'plant',
          severity: 'warning',
          titleEn: `Due today: ${task.title}`,
          titleAr: `مهمة مستحقة اليوم: ${task.title}`,
          detailEn: `${task.crop}${task.sectionName ? ` · ${task.sectionName}` : ''} — ${task.details.slice(0, 90)}`,
          detailAr: `${task.crop}${task.sectionName ? ` · ${task.sectionName}` : ''} — ${task.details.slice(0, 90)}`,
          timestamp: `${task.scheduledDate}T08:00:00.000Z`,
          targetPage: 'water',
          plotId: task.plotId,
          sectionId: task.sectionId,
          read: false,
        });
      } else if (diffMs > 0 && diffMs <= twoDaysMs) {
        list.push({
          id: `care-soon-${task.id}`,
          category: 'plant',
          severity: 'info',
          titleEn: `Upcoming care activity (${task.scheduledDate}): ${task.title}`,
          titleAr: `مهمة قادمة (${task.scheduledDate}): ${task.title}`,
          detailEn: `${task.crop}${task.sectionName ? ` · ${task.sectionName}` : ''}`,
          detailAr: `${task.crop}${task.sectionName ? ` · ${task.sectionName}` : ''}`,
          timestamp: `${task.scheduledDate}T08:00:00.000Z`,
          targetPage: 'water',
          plotId: task.plotId,
          sectionId: task.sectionId,
          read: false,
        });
      }
    }

    // Harvest reminders from mapped sections
    for (const plot of plots) {
      for (const sec of plot.sections) {
        if (!sec.expectedHarvestDate) continue;
        const diffDays = Math.round(
          (new Date(sec.expectedHarvestDate).getTime() - new Date(todayIso).getTime()) / 86400_000,
        );
        if (diffDays >= 0 && diffDays <= 5) {
          list.push({
            id: `harvest-${sec.id}-${sec.expectedHarvestDate}`,
            category: 'plant',
            severity: 'info',
            titleEn: `Harvest window approaching: ${sec.crop} (${sec.name})`,
            titleAr: `اقترب موعد حصاد ${sec.crop} (${sec.name})`,
            detailEn: `Expected harvest date is ${sec.expectedHarvestDate}. Inspect fruit ripeness before picking.`,
            detailAr: `تاريخ الحصاد المتوقع ${sec.expectedHarvestDate}. يمكنك فحص نضج الثمار بالذكاء الاصطناعي.`,
            timestamp: `${sec.expectedHarvestDate}T07:00:00.000Z`,
            targetPage: 'health',
            plotId: plot.id,
            sectionId: sec.id,
            read: false,
          });
        }
      }
    }

    // Recent disease detections
    for (const det of diseaseDetections.slice(0, 3)) {
      if (det.category !== 'unclear') {
        list.push({
          id: `disease-det-${det.id}`,
          category: 'plant',
          severity: det.confidence === 'high' ? 'warning' : 'info',
          titleEn: `Disease watch logged: ${det.suspectedIssue} (${det.crop})`,
          titleAr: `رصد عرض محتمل: ${det.suspectedIssue} (${det.crop})`,
          detailEn: det.treatmentGuidance.slice(0, 110),
          detailAr: det.treatmentGuidance.slice(0, 110),
          timestamp: det.analyzedAt,
          targetPage: 'health',
          plotId: det.plotId,
          sectionId: det.sectionId,
          read: false,
        });
      }
    }

    // Stressed plant health observations
    for (const obs of healthObservations.slice(0, 3)) {
      if (obs.overallStatus === 'stressed') {
        list.push({
          id: `health-obs-${obs.id}`,
          category: 'plant',
          severity: 'warning',
          titleEn: `Plant stress observed on ${obs.crop}`,
          titleAr: `ملاحظة إجهاد نباتي على ${obs.crop}`,
          detailEn: obs.visibleFindings[0] || 'Check soil moisture, nutrients, and root health.',
          detailAr: obs.visibleFindings[0] || 'تحقق من رطوبة التربة والعناصر وصحة الجذور.',
          timestamp: obs.recordedAt,
          targetPage: 'health',
          plotId: obs.plotId,
          sectionId: obs.sectionId,
          read: false,
        });
      }
    }
  }

  // 4. SECURITY & SYSTEM NOTIFICATIONS (Real backend errors & login/account/sensor events)
  if (settings.notifySecurity !== false) {
    if (nasaError) {
      list.push({
        id: `sys-nasa-err-${nasaError.slice(0, 24)}`,
        category: 'security',
        severity: 'critical',
        titleEn: 'NASA data connection warning',
        titleAr: 'تعذر الاتصال بخدمة بيانات ناسا',
        detailEn: nasaError,
        detailAr: nasaError,
        timestamp: new Date().toISOString(),
        targetPage: 'analysis',
        read: false,
      });
    }

    for (const evt of securityEvents.slice(0, 8)) {
      list.push({
        id: `sec-${evt.id}`,
        category: 'security',
        severity: evt.severity,
        titleEn: evt.titleEn,
        titleAr: evt.titleAr,
        detailEn: evt.detailEn,
        detailAr: evt.detailAr,
        timestamp: evt.timestamp,
        targetPage: 'settings',
        read: false,
      });
    }
  }

  return list
    .filter((item) => !dismissedSet.has(item.id))
    .map((item) => ({
      ...item,
      read: readSet.has(item.id),
    }))
    .sort((a, b) => {
      const sevWeight = { critical: 3, warning: 2, info: 1 };
      if (sevWeight[b.severity] !== sevWeight[a.severity]) {
        return sevWeight[b.severity] - sevWeight[a.severity];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
}
