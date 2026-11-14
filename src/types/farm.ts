export type AppLanguage = 'en' | 'ar';

export type AppPage =
  | 'loading'
  | 'dashboard'
  | 'analysis'
  | 'map'
  | 'health'
  | 'water'
  | 'tamra'
  | 'rotation'
  | 'community'
  | 'login'
  | 'settings';

export type TamraEmotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'confused'
  | 'surprised'
  | 'concerned'
  | 'laughing'
  | 'sad'
  | 'tired'
  | 'wink'
  | 'proud'
  | 'love';

export interface FarmLocation {
  name: string;
  latitude: number;
  longitude: number;
  cropType?: string;
  soilType?: string;
}

export interface NasaPowerDay {
  date: string; // YYYY-MM-DD
  t2m: number | null; // Temperature at 2m (°C)
  t2mMax: number | null; // Max temperature (°C)
  t2mMin: number | null; // Min temperature (°C)
  precipitationMm: number | null; // PRECTOTCORR (mm/day)
  humidityPercent: number | null; // RH2M (%)
  solarRadiationMj: number | null; // ALLSKY_SFC_SW_DWN (MJ/m²/day or kWh/m²/day in AG community)
  windSpeedMs: number | null; // WS2M (m/s)
  gwetTop: number | null; // NASA POWER topsoil wetness (0-1)
  gwetRoot: number | null; // NASA POWER root-zone wetness (0-1)
}

export type MoistureCategory =
  | 'very_dry'
  | 'dry'
  | 'optimal'
  | 'moist'
  | 'saturated'
  | 'unavailable';

export interface NasaSmapReading {
  available: boolean;
  observationDate: string | null;
  surfaceMoistureM3M3: number | null; // 0-5 cm volumetric m³/m³
  rootZoneMoistureM3M3: number | null; // 0-100 cm volumetric m³/m³
  surfacePercent: number | null;
  status: MoistureCategory;
  statusLabel: string;
  dataset: string;
  note?: string;
}

export interface FarmEnvironmentSnapshot {
  isSampleData: boolean;
  sampleLabel?: string;
  fetchedAt: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };
  spatialMeta?: {
    smapPixelKey: string | null;
    smapResolutionKm: number;
    powerCellKey: string;
    powerResolutionKm: number;
  };
  smap: NasaSmapReading;
  power: {
    available: boolean;
    dataset: string;
    latestDate: string | null;
    latest: NasaPowerDay | null;
    latestSolarMj: number | null;
    sevenDayRainMm: number | null;
    sevenDayAvgTempC: number | null;
    sevenDayAvgSolarMj: number | null;
    vpdKpa: number | null;
    days: NasaPowerDay[];
    note?: string;
  };
}

export interface LatLngPoint {
  lat: number;
  lon: number;
}

export interface SectionAiAnalysis {
  generatedAt: string;
  summary: string;
  irrigationAdvice: string;
  cropSuitability: string;
  resolutionNote: string;
  emotion?: TamraEmotion;
}

export type GrowingStage =
  | 'preparing'
  | 'planted'
  | 'vegetative'
  | 'flowering'
  | 'fruiting'
  | 'ready_to_harvest'
  | 'fallow';

export interface CropHistoryEntry {
  id: string;
  crop: string;
  plantedDate: string;
  harvestedDate: string;
  notes?: string;
}

export interface CropSection {
  id: string;
  plotId: string;
  name: string;
  crop: string;
  color: string;
  points: LatLngPoint[];
  areaSqMeters: number;
  centroid: LatLngPoint;
  snapshot: FarmEnvironmentSnapshot | null;
  analysis?: SectionAiAnalysis | null;
  plantingDate?: string;
  expectedHarvestDate?: string;
  growingStage?: GrowingStage;
  plannedNextCrop?: string;
  cropHistory?: CropHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface FarmPlot {
  id: string;
  name: string;
  points: LatLngPoint[];
  areaSqMeters: number;
  centroid: LatLngPoint;
  soilType?: string;
  snapshot: FarmEnvironmentSnapshot | null;
  sections: CropSection[];
  createdAt: string;
  updatedAt: string;
}

export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
}

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'tamra';
  text: string;
  timestamp: string;
  emotion?: TamraEmotion;
  viaVoice?: boolean;
  dataContextLabel?: string;
  isSampleContext?: boolean;
}

export type CropCategory =
  | 'vegetable'
  | 'fruit'
  | 'cereal'
  | 'legume'
  | 'forage'
  | 'herb'
  | 'oilseed'
  | 'root';

export interface CropLibraryItem {
  id: string;
  nameEn: string;
  nameAr: string;
  scientificName: string;
  botanicalFamily: string;
  category: CropCategory;
  rotationGroup: 'Legume' | 'Cereal or grass' | 'Solanaceous crop' | 'Brassica' | 'Root & bulb' | 'Cucurbit' | 'Perennial / Tree' | 'Other family';
  isLegume: boolean;
  isPerennial: boolean;
  climateEn: string;
  climateAr: string;
  tempMinC: number;
  tempMaxC: number;
  optimalSoilEn: string;
  optimalSoilAr: string;
  waterDemand: 'Low' | 'Low to moderate' | 'Moderate' | 'Moderate to high' | 'High';
  sunlightEn: string;
  sunlightAr: string;
  plantingSeasonEn: string;
  plantingSeasonAr: string;
  growthDurationDays: string;
  nutrientNeedsEn: string;
  nutrientNeedsAr: string;
  commonPestIds: string[];
  preventionTipsEn: string;
  preventionTipsAr: string;
  companionCrops: string[];
  unsuitableFollowers: string[];
  bahrainGaEzExtentPct?: number | null;
  bahrainSuitabilityTier?: string;
  isCustom?: boolean;
}

export interface DiseaseProfile {
  id: string;
  nameEn: string;
  nameAr: string;
  type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'abiotic';
  affectedCrops: string[];
  symptomsEn: string;
  symptomsAr: string;
  causesEn: string;
  causesAr: string;
  riskConditionsEn: string;
  riskConditionsAr: string;
  humidityTriggerMin?: number;
  tempTriggerMin?: number;
  tempTriggerMax?: number;
  preventionEn: string;
  preventionAr: string;
  managementEn: string;
  managementAr: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  farmRegion?: string;
  createdAt: string;
}

export interface UserSettings {
  language: AppLanguage;
  notificationsEnabled: boolean;
  notifyWeather?: boolean;
  notifySoilWater?: boolean;
  notifyPlantCare?: boolean;
  notifySecurity?: boolean;
  moistureAlertThreshold: number;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  tamraAutoSpeak: boolean;
  tamraContinuousVoice: boolean;
  tamraSpeechRate: number;
}

export interface CommunityComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export type CommunityCategory = 'qa' | 'tip' | 'crop_discussion' | 'announcement';

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRegion?: string;
  category: CommunityCategory;
  cropTag?: string;
  title: string;
  body: string;
  likes: number;
  likedByUserIds: string[];
  comments: CommunityComment[];
  createdAt: string;
}

/* ============================================================
 * NEW THAMRA AGRICULTURAL FEATURES & NOTIFICATION SYSTEM TYPES
 * ============================================================ */

export type RipenessStage = 'unripe' | 'ripe' | 'overripe' | 'unclear';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface FruitRipenessResult {
  id: string;
  fruitType: string;
  ripenessStage: RipenessStage;
  confidence: ConfidenceLevel;
  confidencePct: number;
  explanation: string;
  harvestRecommendation: string;
  visualCues: string[];
  uncertaintyNote?: string;
  analyzedAt: string;
  imageThumb?: string;
}

export type DetectionIssueCategory =
  | 'fungal'
  | 'pest'
  | 'bacterial'
  | 'viral'
  | 'injury'
  | 'nutrient'
  | 'unclear';

export interface DiseaseDetectionRecord {
  id: string;
  plotId?: string;
  sectionId?: string;
  sectionName?: string;
  crop: string;
  suspectedIssue: string;
  category: DetectionIssueCategory;
  confidence: ConfidenceLevel;
  confidencePct: number;
  visibleSymptoms: string[];
  possibleCauses: string[];
  recommendedNextSteps: string[];
  preventionMethods: string[];
  treatmentGuidance: string;
  matchedDiseaseId?: string;
  uncertaintyNote?: string;
  analyzedAt: string;
  imageThumb?: string;
}

export type PlantHealthStatus = 'healthy' | 'watch' | 'stressed' | 'unclear';

export interface PlantHealthObservation {
  id: string;
  plotId?: string;
  sectionId?: string;
  sectionName?: string;
  crop: string;
  overallStatus: PlantHealthStatus;
  confidence: ConfidenceLevel;
  visibleFindings: string[];
  possibleCauses: string[];
  recommendedChecks: string[];
  comparisonNote?: string;
  recommendations: string[];
  uncertaintyNote?: string;
  notes?: string;
  imageThumb?: string;
  recordedAt: string;
}

export interface AgRecommendationResult {
  id: string;
  crop: string;
  issue: string;
  organicAlternatives: Array<{
    title: string;
    whyHelpful: string;
    howToUseSafely: string;
  }>;
  pesticideOptions: Array<{
    activeIngredientOrClass: string;
    targetProblem: string;
    suitableCrops: string;
    labelAndApplicationGuidance: string;
    safetyPrecautions: string;
    localLabelRestrictionNote: string;
  }>;
  preventionMethods: string[];
  fertilizerGuidance: Array<{
    type: string;
    purpose: string;
    timingNote: string;
  }>;
  equipmentSuggestions: Array<{
    item: string;
    category: 'irrigation' | 'pipe_accessory' | 'monitoring' | 'protection';
    whyUseful: string;
  }>;
  disclaimer: string;
  generatedAt: string;
}

export interface WaterTankReading {
  timestamp: string;
  levelPercent: number;
  volumeLiters: number;
  source: 'sensor_webhook' | 'demo_test_packet';
}

export interface WaterTank {
  id: string;
  name: string;
  plotId?: string;
  capacityLiters: number;
  minThresholdPercent: number;
  criticalThresholdPercent: number;
  status: 'disconnected' | 'connected';
  sensorModel?: string;
  webhookKey: string;
  currentLevelPercent: number | null;
  currentVolumeLiters: number | null;
  lastUpdatedAt: string | null;
  history: WaterTankReading[];
}

export type CareActivityType =
  | 'npk'
  | 'foliar'
  | 'humidity'
  | 'irrigation'
  | 'monthly_plan'
  | 'custom';

export type CareActivityStatus = 'scheduled' | 'completed' | 'cancelled';

export interface CareActivity {
  id: string;
  plotId?: string;
  sectionId?: string;
  sectionName?: string;
  crop: string;
  growingStage?: GrowingStage;
  type: CareActivityType;
  title: string;
  details: string;
  scheduledDate: string; // YYYY-MM-DD
  npkFormula?: string;
  productRecorded?: string;
  status: CareActivityStatus;
  completedAt?: string;
  reminderEnabled: boolean;
  notes?: string;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'register' | 'password_reset' | 'profile_update' | 'sensor_disconnect' | 'api_error';
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}

export type NotificationCategory = 'weather' | 'soil_water' | 'plant' | 'security';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  titleEn: string;
  titleAr: string;
  detailEn: string;
  detailAr: string;
  timestamp: string;
  targetPage: AppPage;
  plotId?: string;
  sectionId?: string;
  tankId?: string;
  read: boolean;
}
