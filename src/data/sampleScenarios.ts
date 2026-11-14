import { FarmEnvironmentSnapshot } from '../types/farm';

export interface SampleScenario {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  cropType: string;
  soilType: string;
  snapshot: FarmEnvironmentSnapshot;
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    id: 'sample-arid-dry',
    title: 'Sample: Bahrain Dry Sandy Plot (Test)',
    titleAr: 'عينة اختبار: مزرعة بحرينية جافة (اختبار)',
    description: 'Offline test scenario simulating dry sandy soil and high heat in Bahrain for irrigation testing.',
    descriptionAr: 'بيانات اختبارية غير حية تحاكي جفاف التربة وارتفاع الحرارة في البحرين لاختبار توصيات الري.',
    cropType: 'Date Palms & Tomatoes',
    soilType: 'Sandy Loam',
    snapshot: {
      isSampleData: true,
      sampleLabel: 'Sample Test Data — Bahrain Dry Stress Scenario (Not Live NASA)',
      fetchedAt: '2026-11-14T00:00:00.000Z',
      location: {
        name: 'Sample Buri Dry Plot (Test)',
        latitude: 26.155,
        longitude: 50.505,
      },
      smap: {
        available: true,
        observationDate: 'Sample-2026-11-10',
        surfaceMoistureM3M3: 0.068,
        rootZoneMoistureM3M3: 0.105,
        surfacePercent: 14,
        status: 'very_dry',
        statusLabel: 'Very Dry',
        dataset: 'Sample Test Profile (Simulated SMAP L4)',
        note: 'Sample test data for offline evaluation — switch back to Live NASA mode for real satellite readings.',
      },
      power: {
        available: true,
        dataset: 'Sample Test Profile (Simulated NASA POWER)',
        latestDate: 'Sample-2026-11-10',
        latestSolarMj: 23.4,
        sevenDayRainMm: 0.0,
        sevenDayAvgTempC: 34.8,
        sevenDayAvgSolarMj: 23.1,
        vpdKpa: 3.12,
        latest: {
          date: '2026-11-10',
          t2m: 35.4,
          t2mMax: 39.2,
          t2mMin: 28.6,
          precipitationMm: 0.0,
          humidityPercent: 32.0,
          solarRadiationMj: 23.4,
          windSpeedMs: 4.8,
          gwetTop: 0.11,
          gwetRoot: 0.18,
        },
        days: [
          { date: '2026-11-04', t2m: 34.1, t2mMax: 38.0, t2mMin: 27.5, precipitationMm: 0, humidityPercent: 35, solarRadiationMj: 22.7, windSpeedMs: 4.1, gwetTop: 0.14, gwetRoot: 0.21 },
          { date: '2026-11-05', t2m: 34.6, t2mMax: 38.4, t2mMin: 28.0, precipitationMm: 0, humidityPercent: 34, solarRadiationMj: 23.0, windSpeedMs: 4.3, gwetTop: 0.13, gwetRoot: 0.20 },
          { date: '2026-11-06', t2m: 34.9, t2mMax: 38.9, t2mMin: 28.1, precipitationMm: 0, humidityPercent: 33, solarRadiationMj: 23.0, windSpeedMs: 4.5, gwetTop: 0.13, gwetRoot: 0.20 },
          { date: '2026-11-07', t2m: 35.0, t2mMax: 39.0, t2mMin: 28.4, precipitationMm: 0, humidityPercent: 31, solarRadiationMj: 23.4, windSpeedMs: 4.6, gwetTop: 0.12, gwetRoot: 0.19 },
          { date: '2026-11-08', t2m: 34.7, t2mMax: 38.6, t2mMin: 28.2, precipitationMm: 0, humidityPercent: 33, solarRadiationMj: 23.0, windSpeedMs: 4.4, gwetTop: 0.12, gwetRoot: 0.19 },
          { date: '2026-11-09', t2m: 35.1, t2mMax: 39.1, t2mMin: 28.5, precipitationMm: 0, humidityPercent: 31, solarRadiationMj: 23.1, windSpeedMs: 4.7, gwetTop: 0.11, gwetRoot: 0.18 },
          { date: '2026-11-10', t2m: 35.4, t2mMax: 39.2, t2mMin: 28.6, precipitationMm: 0, humidityPercent: 32, solarRadiationMj: 23.4, windSpeedMs: 4.8, gwetTop: 0.11, gwetRoot: 0.18 },
        ],
      },
    },
  },
  {
    id: 'sample-optimal-loam',
    title: 'Sample: Bahrain Well-Watered Plot (Test)',
    titleAr: 'عينة اختبار: مزرعة بحرينية متوازنة الرطوبة (اختبار)',
    description: 'Offline test scenario with balanced moisture and mild winter temperatures in Bahrain.',
    descriptionAr: 'بيانات اختبارية غير حية تحاكي رطوبة متوازنة وطقساً معتدلاً في البحرين ومناسبة للزراعة.',
    cropType: 'Leafy Greens & Herbs',
    soilType: 'Irrigated Loam',
    snapshot: {
      isSampleData: true,
      sampleLabel: 'Sample Test Data — Bahrain Optimal Moisture Scenario (Not Live NASA)',
      fetchedAt: '2026-11-14T00:00:00.000Z',
      location: {
        name: 'Sample Budaiya Irrigated Plot (Test)',
        latitude: 26.215,
        longitude: 50.453,
      },
      smap: {
        available: true,
        observationDate: 'Sample-2026-11-10',
        surfaceMoistureM3M3: 0.255,
        rootZoneMoistureM3M3: 0.278,
        surfacePercent: 51,
        status: 'optimal',
        statusLabel: 'Optimal',
        dataset: 'Sample Test Profile (Simulated SMAP L4)',
        note: 'Sample test data for offline evaluation — switch back to Live NASA mode for real satellite readings.',
      },
      power: {
        available: true,
        dataset: 'Sample Test Profile (Simulated NASA POWER)',
        latestDate: 'Sample-2026-11-10',
        latestSolarMj: 15.8,
        sevenDayRainMm: 14.2,
        sevenDayAvgTempC: 23.4,
        sevenDayAvgSolarMj: 15.2,
        vpdKpa: 0.85,
        latest: {
          date: '2026-11-10',
          t2m: 23.1,
          t2mMax: 26.8,
          t2mMin: 19.4,
          precipitationMm: 2.2,
          humidityPercent: 68.0,
          solarRadiationMj: 15.8,
          windSpeedMs: 3.1,
          gwetTop: 0.52,
          gwetRoot: 0.56,
        },
        days: [
          { date: '2026-11-04', t2m: 24.5, t2mMax: 28.0, t2mMin: 20.1, precipitationMm: 0.0, humidityPercent: 60, solarRadiationMj: 16.0, windSpeedMs: 3.2, gwetTop: 0.45, gwetRoot: 0.51 },
          { date: '2026-11-05', t2m: 23.8, t2mMax: 27.1, t2mMin: 19.6, precipitationMm: 5.4, humidityPercent: 72, solarRadiationMj: 13.5, windSpeedMs: 3.4, gwetTop: 0.51, gwetRoot: 0.54 },
          { date: '2026-11-06', t2m: 23.2, t2mMax: 26.5, t2mMin: 19.2, precipitationMm: 4.1, humidityPercent: 73, solarRadiationMj: 14.0, windSpeedMs: 2.9, gwetTop: 0.53, gwetRoot: 0.56 },
          { date: '2026-11-07', t2m: 23.4, t2mMax: 26.9, t2mMin: 19.5, precipitationMm: 1.5, humidityPercent: 69, solarRadiationMj: 15.3, windSpeedMs: 2.8, gwetTop: 0.53, gwetRoot: 0.56 },
          { date: '2026-11-08', t2m: 23.0, t2mMax: 26.4, t2mMin: 19.1, precipitationMm: 0.0, humidityPercent: 65, solarRadiationMj: 16.2, windSpeedMs: 2.9, gwetTop: 0.52, gwetRoot: 0.55 },
          { date: '2026-11-09', t2m: 23.3, t2mMax: 27.0, t2mMin: 19.3, precipitationMm: 1.0, humidityPercent: 67, solarRadiationMj: 15.6, windSpeedMs: 3.0, gwetTop: 0.52, gwetRoot: 0.56 },
          { date: '2026-11-10', t2m: 23.1, t2mMax: 26.8, t2mMin: 19.4, precipitationMm: 2.2, humidityPercent: 68, solarRadiationMj: 15.8, windSpeedMs: 3.1, gwetTop: 0.52, gwetRoot: 0.56 },
        ],
      },
    },
  },
];
