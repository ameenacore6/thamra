// Exact Bahrain environmental & crop-rotation data extracted from FieldShift Technical Handover CSVs.
// Note: FieldShift FAO GAEZ suitability & rotation scores are national-level screening indicators,
// not field-specific yield predictions; local agronomic & planting-calendar validation is always required.

export interface FieldShiftEnvProfile {
  location: string;
  year: number;
  avgMaxTempC: number;
  avgMinTempC: number;
  avgHumidityPct: number;
  annualRainfallMm: number;
  avgSolarKwhM2Day: number;
  avgNdvi: number;
}

export const FIELDSHIFT_ENV_PROFILE: FieldShiftEnvProfile = {
  location: 'Jasra Organic Farm demonstration area, Bahrain',
  year: 2025,
  avgMaxTempC: 30.09,
  avgMinTempC: 25.26,
  avgHumidityPct: 61.53,
  annualRainfallMm: 25.12,
  avgSolarKwhM2Day: 18.49,
  avgNdvi: 0.208,
};

export interface FieldShiftMonthlyClimate {
  month: number;
  labelEn: string;
  labelAr: string;
  t2mMax: number;
  t2mMin: number;
  rh2m: number;
  precipMm: number;
  solar: number;
}

export const FIELDSHIFT_MONTHLY_CLIMATE_2025: FieldShiftMonthlyClimate[] = [
  { month: 1, labelEn: 'Jan', labelAr: 'يناير', t2mMax: 19.67, t2mMin: 16.07, rh2m: 67.7, precipMm: 0.78, solar: 13.45 },
  { month: 2, labelEn: 'Feb', labelAr: 'فبراير', t2mMax: 19.73, t2mMin: 16.28, rh2m: 69.37, precipMm: 4.49, solar: 12.47 },
  { month: 3, labelEn: 'Mar', labelAr: 'مارس', t2mMax: 23.64, t2mMin: 18.41, rh2m: 68.16, precipMm: 5.35, solar: 17.05 },
  { month: 4, labelEn: 'Apr', labelAr: 'أبريل', t2mMax: 30.76, t2mMin: 24.36, rh2m: 58.44, precipMm: 0.0, solar: 21.6 },
  { month: 5, labelEn: 'May', labelAr: 'مايو', t2mMax: 34.67, t2mMin: 28.24, rh2m: 53.79, precipMm: 0.0, solar: 24.33 },
  { month: 6, labelEn: 'Jun', labelAr: 'يونيو', t2mMax: 36.3, t2mMin: 30.14, rh2m: 53.51, precipMm: 0.0, solar: 24.66 },
  { month: 7, labelEn: 'Jul', labelAr: 'يوليو', t2mMax: 37.94, t2mMin: 32.35, rh2m: 54.8, precipMm: 0.0, solar: 22.94 },
  { month: 8, labelEn: 'Aug', labelAr: 'أغسطس', t2mMax: 38.36, t2mMin: 33.46, rh2m: 61.83, precipMm: 0.0, solar: 21.43 },
  { month: 9, labelEn: 'Sep', labelAr: 'سبتمبر', t2mMax: 36.46, t2mMin: 31.67, rh2m: 60.43, precipMm: 0.0, solar: 20.66 },
  { month: 10, labelEn: 'Oct', labelAr: 'أكتوبر', t2mMax: 32.24, t2mMin: 27.86, rh2m: 60.55, precipMm: 0.01, solar: 18.3 },
  { month: 11, labelEn: 'Nov', labelAr: 'نوفمبر', t2mMax: 27.52, t2mMin: 24.02, rh2m: 60.78, precipMm: 0.0, solar: 13.96 },
  { month: 12, labelEn: 'Dec', labelAr: 'ديسمبر', t2mMax: 23.14, t2mMin: 19.76, rh2m: 69.3, precipMm: 14.49, solar: 10.67 },
];

export interface FieldShiftCropShortlistRow {
  crop: string;
  botanicalFamily: string;
  rotationGroup: string;
  legumeFlag: boolean;
  perennialFlag: boolean;
  suitVs: number;
  suitS: number;
  suitMs: number;
  favourableExtent: number;
  favourableExtentPct: number;
  ymax: number;
  suitabilityTier: string;
}

export const FIELDSHIFT_CROP_SHORTLIST: FieldShiftCropShortlistRow[] = [
  { crop: 'Barley', botanicalFamily: 'Poaceae', rotationGroup: 'Cereal or grass', legumeFlag: false, perennialFlag: false, suitVs: 7.4, suitS: 4.1, suitMs: 0.0, favourableExtent: 11.5, favourableExtentPct: 54.25, ymax: 5396, suitabilityTier: 'Very suitable area available' },
  { crop: 'White potato', botanicalFamily: 'Solanaceae', rotationGroup: 'Solanaceous crop', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 7.8, suitMs: 3.7, favourableExtent: 11.5, favourableExtentPct: 54.25, ymax: 8521, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Biomass sorghum', botanicalFamily: 'Poaceae', rotationGroup: 'Cereal or grass', legumeFlag: false, perennialFlag: false, suitVs: 11.4, suitS: 0.0, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 19371, suitabilityTier: 'Very suitable area available' },
  { crop: 'Sorghum', botanicalFamily: 'Poaceae', rotationGroup: 'Cereal or grass', legumeFlag: false, perennialFlag: false, suitVs: 11.4, suitS: 0.0, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 9071, suitabilityTier: 'Very suitable area available' },
  { crop: 'Sweet potato', botanicalFamily: 'Convolvulaceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: false, suitVs: 6.0, suitS: 5.4, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 9885, suitabilityTier: 'Very suitable area available' },
  { crop: 'Wheat', botanicalFamily: 'Poaceae', rotationGroup: 'Cereal or grass', legumeFlag: false, perennialFlag: false, suitVs: 6.0, suitS: 5.4, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 4843, suitabilityTier: 'Very suitable area available' },
  { crop: 'Dry pea', botanicalFamily: 'Fabaceae', rotationGroup: 'Legume', legumeFlag: true, perennialFlag: false, suitVs: 5.4, suitS: 6.0, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 2780, suitabilityTier: 'Very suitable area available' },
  { crop: 'Gram', botanicalFamily: 'Fabaceae', rotationGroup: 'Legume', legumeFlag: true, perennialFlag: false, suitVs: 5.4, suitS: 6.0, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 2191, suitabilityTier: 'Very suitable area available' },
  { crop: 'Maize', botanicalFamily: 'Poaceae', rotationGroup: 'Cereal or grass', legumeFlag: false, perennialFlag: false, suitVs: 5.4, suitS: 6.0, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 12231, suitabilityTier: 'Very suitable area available' },
  { crop: 'Pearl millet', botanicalFamily: 'Poaceae', rotationGroup: 'Cereal or grass', legumeFlag: false, perennialFlag: false, suitVs: 5.4, suitS: 6.0, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 3675, suitabilityTier: 'Very suitable area available' },
  { crop: 'Sunflower', botanicalFamily: 'Asteraceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: false, suitVs: 5.4, suitS: 6.0, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 4062, suitabilityTier: 'Very suitable area available' },
  { crop: 'Alfalfa', botanicalFamily: 'Fabaceae', rotationGroup: 'Legume', legumeFlag: true, perennialFlag: true, suitVs: 0.0, suitS: 11.4, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 17783, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Buckwheat', botanicalFamily: 'Polygonaceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 11.4, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 1193, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Cabbage', botanicalFamily: 'Brassicaceae', rotationGroup: 'Brassica', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 10.8, suitMs: 0.6, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 3813, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Chickpea', botanicalFamily: 'Fabaceae', rotationGroup: 'Legume', legumeFlag: true, perennialFlag: false, suitVs: 0.0, suitS: 11.4, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 2557, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Cowpea', botanicalFamily: 'Fabaceae', rotationGroup: 'Legume', legumeFlag: true, perennialFlag: false, suitVs: 0.0, suitS: 11.4, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 2217, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Groundnut', botanicalFamily: 'Fabaceae', rotationGroup: 'Legume', legumeFlag: true, perennialFlag: false, suitVs: 0.0, suitS: 11.4, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 2891, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Rapeseed', botanicalFamily: 'Brassicaceae', rotationGroup: 'Brassica', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 11.4, suitMs: 0.0, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 2553, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Carrot', botanicalFamily: 'Apiaceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 7.1, suitMs: 4.3, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 7755, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Onion', botanicalFamily: 'Amaryllidaceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 7.1, suitMs: 4.3, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 8195, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Phaseolus bean', botanicalFamily: 'Fabaceae', rotationGroup: 'Legume', legumeFlag: true, perennialFlag: false, suitVs: 0.0, suitS: 7.1, suitMs: 4.3, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 2847, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Pigeonpea', botanicalFamily: 'Fabaceae', rotationGroup: 'Legume', legumeFlag: true, perennialFlag: false, suitVs: 0.0, suitS: 7.1, suitMs: 4.3, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 2550, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Soybean', botanicalFamily: 'Fabaceae', rotationGroup: 'Legume', legumeFlag: true, perennialFlag: false, suitVs: 0.0, suitS: 7.1, suitMs: 4.3, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 3943, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Tomato', botanicalFamily: 'Solanaceae', rotationGroup: 'Solanaceous crop', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 7.1, suitMs: 4.3, favourableExtent: 11.4, favourableExtentPct: 53.77, ymax: 5523, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Banana', botanicalFamily: 'Musaceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: true, suitVs: 0.0, suitS: 1.1, suitMs: 9.7, favourableExtent: 10.8, favourableExtentPct: 50.94, ymax: 5850, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Citrus', botanicalFamily: 'Rutaceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: true, suitVs: 0.0, suitS: 0.0, suitMs: 7.1, favourableExtent: 7.1, favourableExtentPct: 33.49, ymax: 4252, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Cassava', botanicalFamily: 'Euphorbiaceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 7.1, suitMs: 0.0, favourableExtent: 7.1, favourableExtentPct: 33.49, ymax: 7069, suitabilityTier: 'Has favourable suitability' },
  { crop: 'Olive', botanicalFamily: 'Oleaceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: true, suitVs: 0.0, suitS: 0.0, suitMs: 0.0, favourableExtent: 0.0, favourableExtentPct: 0.0, ymax: 0, suitabilityTier: 'Not suitable / limited' },
  { crop: 'Oat', botanicalFamily: 'Poaceae', rotationGroup: 'Cereal or grass', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 0.0, suitMs: 0.0, favourableExtent: 0.0, favourableExtentPct: 0.0, ymax: 0, suitabilityTier: 'Not suitable / limited' },
  { crop: 'Sugar beet', botanicalFamily: 'Amaranthaceae', rotationGroup: 'Other family', legumeFlag: false, perennialFlag: false, suitVs: 0.0, suitS: 0.0, suitMs: 0.0, favourableExtent: 0.0, favourableExtentPct: 0.0, ymax: 0, suitabilityTier: 'Not suitable / limited' },
];

export interface FieldShiftRotationRecommendation {
  rank: number;
  sequence: string[];
  overallScore: number;
  suitabilityScore: number;
  verySuitableScore: number;
  heatScore: number;
  waterScore: number;
  legumeCrop: string;
  familySequence: string;
  irrigationRequired: string;
  seasonalValidation: string;
}

export const FIELDSHIFT_TOP_ROTATIONS: FieldShiftRotationRecommendation[] = [
  { rank: 1, sequence: ['Cowpea', 'Sorghum', 'Sunflower'], overallScore: 84.94, suitabilityScore: 99.13, verySuitableScore: 49.12, heatScore: 91.67, waterScore: 75.0, legumeCrop: 'Cowpea', familySequence: 'Fabaceae → Poaceae → Asteraceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 2, sequence: ['Cowpea', 'Sunflower', 'Sorghum'], overallScore: 84.94, suitabilityScore: 99.13, verySuitableScore: 49.12, heatScore: 91.67, waterScore: 75.0, legumeCrop: 'Cowpea', familySequence: 'Fabaceae → Asteraceae → Poaceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 3, sequence: ['Cowpea', 'Pearl millet', 'Sunflower'], overallScore: 83.97, suitabilityScore: 99.13, verySuitableScore: 31.58, heatScore: 91.67, waterScore: 83.33, legumeCrop: 'Cowpea', familySequence: 'Fabaceae → Poaceae → Asteraceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 5, sequence: ['Chickpea', 'Sorghum', 'Sunflower'], overallScore: 82.44, suitabilityScore: 99.13, verySuitableScore: 49.12, heatScore: 75.0, waterScore: 83.33, legumeCrop: 'Chickpea', familySequence: 'Fabaceae → Poaceae → Asteraceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 7, sequence: ['Chickpea', 'Pearl millet', 'Sunflower'], overallScore: 81.47, suitabilityScore: 99.13, verySuitableScore: 31.58, heatScore: 75.0, waterScore: 91.67, legumeCrop: 'Chickpea', familySequence: 'Fabaceae → Poaceae → Asteraceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 9, sequence: ['Groundnut', 'Sorghum', 'Sunflower'], overallScore: 81.19, suitabilityScore: 99.13, verySuitableScore: 49.12, heatScore: 83.33, waterScore: 66.67, legumeCrop: 'Groundnut', familySequence: 'Fabaceae → Poaceae → Asteraceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 11, sequence: ['Barley', 'Sunflower', 'Cowpea'], overallScore: 80.8, suitabilityScore: 99.42, verySuitableScore: 37.43, heatScore: 75.0, waterScore: 83.33, legumeCrop: 'Cowpea', familySequence: 'Poaceae → Asteraceae → Fabaceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 15, sequence: ['Barley', 'Chickpea', 'Sunflower'], overallScore: 78.3, suitabilityScore: 99.42, verySuitableScore: 37.43, heatScore: 58.33, waterScore: 91.67, legumeCrop: 'Chickpea', familySequence: 'Poaceae → Fabaceae → Asteraceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 19, sequence: ['Cowpea', 'White potato', 'Sorghum'], overallScore: 76.85, suitabilityScore: 99.42, verySuitableScore: 33.33, heatScore: 75.0, waterScore: 66.67, legumeCrop: 'Cowpea', familySequence: 'Fabaceae → Solanaceae → Poaceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 21, sequence: ['Cowpea', 'White potato', 'Pearl millet'], overallScore: 75.89, suitabilityScore: 99.42, verySuitableScore: 15.79, heatScore: 75.0, waterScore: 75.0, legumeCrop: 'Cowpea', familySequence: 'Fabaceae → Solanaceae → Poaceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 23, sequence: ['Chickpea', 'Sorghum', 'White potato'], overallScore: 74.35, suitabilityScore: 99.42, verySuitableScore: 33.33, heatScore: 58.33, waterScore: 75.0, legumeCrop: 'Chickpea', familySequence: 'Fabaceae → Poaceae → Solanaceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 29, sequence: ['Barley', 'Cowpea', 'White potato'], overallScore: 72.71, suitabilityScore: 99.71, verySuitableScore: 21.64, heatScore: 58.33, waterScore: 75.0, legumeCrop: 'Cowpea', familySequence: 'Poaceae → Fabaceae → Solanaceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 35, sequence: ['Barley', 'White potato', 'Chickpea'], overallScore: 70.21, suitabilityScore: 99.71, verySuitableScore: 21.64, heatScore: 41.67, waterScore: 83.33, legumeCrop: 'Chickpea', familySequence: 'Poaceae → Solanaceae → Fabaceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
  { rank: 41, sequence: ['Groundnut', 'Sunflower', 'White potato'], overallScore: 68.39, suitabilityScore: 99.42, verySuitableScore: 15.79, heatScore: 58.33, waterScore: 58.33, legumeCrop: 'Groundnut', familySequence: 'Fabaceae → Asteraceae → Solanaceae', irrigationRequired: 'Yes - assess availability', seasonalValidation: 'Required' },
];
