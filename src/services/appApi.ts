import type {
  AgRecommendationResult,
  AppLanguage,
  CareActivity,
  CommunityCategory,
  CommunityPost,
  CropLibraryItem,
  DiseaseDetectionRecord,
  FarmPlot,
  FruitRipenessResult,
  NasaPowerDay,
  PlantHealthObservation,
  SecurityEvent,
  UserProfile,
  UserSettings,
  WaterTank,
} from '../types/farm';

const TOKEN_KEY = 'thamra_auth_token_v1';

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuthToken(token: string | null): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

function authHeaders(): HeadersInit {
  const token = getStoredAuthToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  farmRegion?: string;
}): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { ok: boolean; user?: UserProfile; token?: string; error?: string };
  if (!res.ok || !data.ok || !data.user || !data.token) {
    throw new Error(data.error || 'Registration failed.');
  }
  setStoredAuthToken(data.token);
  return { user: data.user, token: data.token };
}

export async function loginUser(params: {
  email: string;
  password: string;
}): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { ok: boolean; user?: UserProfile; token?: string; error?: string };
  if (!res.ok || !data.ok || !data.user || !data.token) {
    throw new Error(data.error || 'Login failed.');
  }
  setStoredAuthToken(data.token);
  return { user: data.user, token: data.token };
}

export async function requestPasswordReset(email: string): Promise<{
  issued: boolean;
  demoResetCode?: string;
  message: string;
}> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    issued?: boolean;
    demoResetCode?: string;
    message?: string;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Unable to start password reset.');
  }
  return {
    issued: Boolean(data.issued),
    demoResetCode: data.demoResetCode,
    message: data.message || 'Reset request submitted.',
  };
}

export async function resetPasswordWithCode(params: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<UserProfile> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { ok: boolean; user?: UserProfile; error?: string };
  if (!res.ok || !data.ok || !data.user) {
    throw new Error(data.error || 'Unable to reset password.');
  }
  return data.user;
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  const token = getStoredAuthToken();
  if (!token) return null;
  const res = await fetch('/api/auth/me', { headers: authHeaders() });
  if (!res.ok) {
    setStoredAuthToken(null);
    return null;
  }
  const data = (await res.json()) as { ok: boolean; user?: UserProfile };
  return data.ok && data.user ? data.user : null;
}

export async function updateUserProfileApi(updates: {
  name?: string;
  farmRegion?: string;
}): Promise<UserProfile> {
  const res = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const data = (await res.json()) as { ok: boolean; user?: UserProfile; error?: string };
  if (!res.ok || !data.ok || !data.user) {
    throw new Error(data.error || 'Unable to update profile.');
  }
  return data.user;
}

export interface RemoteWorkspace {
  plots: FarmPlot[];
  activePlotId: string | null;
  activeSectionId: string | null;
  customCrops: CropLibraryItem[];
  favoriteCropIds: string[];
  ripenessHistory?: FruitRipenessResult[];
  diseaseDetections?: DiseaseDetectionRecord[];
  healthObservations?: PlantHealthObservation[];
  waterTanks?: WaterTank[];
  careSchedules?: CareActivity[];
  securityEvents?: SecurityEvent[];
  readNotificationIds?: string[];
  dismissedNotificationIds?: string[];
  settings: UserSettings;
}

export async function loadRemoteWorkspace(): Promise<RemoteWorkspace | null> {
  if (!getStoredAuthToken()) return null;
  const res = await fetch('/api/workspace', { headers: authHeaders() });
  if (!res.ok) return null;
  const data = (await res.json()) as { ok: boolean; workspace?: RemoteWorkspace | null };
  return data.ok ? data.workspace ?? null : null;
}

export async function saveRemoteWorkspace(payload: Partial<RemoteWorkspace>): Promise<void> {
  if (!getStoredAuthToken()) return;
  await fetch('/api/workspace', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function fetchNasaPowerDateRange(params: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
}): Promise<{ days: NasaPowerDay[]; dataset: string; startDate: string; endDate: string }> {
  const qs = new URLSearchParams({
    lat: String(params.latitude),
    lon: String(params.longitude),
    start: params.startDate,
    end: params.endDate,
  });
  const res = await fetch(`/api/nasa/power-range?${qs.toString()}`);
  const data = (await res.json()) as {
    ok: boolean;
    data?: { days: NasaPowerDay[]; dataset: string; startDate: string; endDate: string };
    error?: string;
  };
  if (!res.ok || !data.ok || !data.data) {
    throw new Error(data.error || 'Failed to fetch NASA POWER date range.');
  }
  return data.data;
}

export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
  const res = await fetch('/api/community/posts');
  const data = (await res.json()) as { ok: boolean; posts?: CommunityPost[]; error?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Failed to load community posts.');
  }
  return data.posts ?? [];
}

export async function createCommunityPostApi(params: {
  category: CommunityCategory;
  cropTag?: string;
  title: string;
  body: string;
  authorName?: string;
}): Promise<CommunityPost> {
  const res = await fetch('/api/community/posts', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { ok: boolean; post?: CommunityPost; error?: string };
  if (!res.ok || !data.ok || !data.post) {
    throw new Error(data.error || 'Unable to publish post.');
  }
  return data.post;
}

export async function toggleLikePostApi(postId: string, actorId?: string): Promise<CommunityPost> {
  const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/like`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ actorId }),
  });
  const data = (await res.json()) as { ok: boolean; post?: CommunityPost; error?: string };
  if (!res.ok || !data.ok || !data.post) {
    throw new Error(data.error || 'Unable to update like.');
  }
  return data.post;
}

export async function addCommentApi(params: {
  postId: string;
  text: string;
  authorName?: string;
}): Promise<CommunityPost> {
  const res = await fetch(`/api/community/posts/${encodeURIComponent(params.postId)}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text: params.text, authorName: params.authorName }),
  });
  const data = (await res.json()) as { ok: boolean; post?: CommunityPost; error?: string };
  if (!res.ok || !data.ok || !data.post) {
    throw new Error(data.error || 'Unable to add comment.');
  }
  return data.post;
}

/* ============================================================
 * VISION AI, RECOMMENDATIONS & WATER SENSOR APIs
 * ============================================================ */

export async function analyzeFruitRipenessApi(params: {
  imageBase64: string;
  mimeType: string;
  fruitType: string;
  language: AppLanguage;
}): Promise<FruitRipenessResult> {
  const res = await fetch('/api/vision/fruit-ripeness', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { ok: boolean; result?: FruitRipenessResult; error?: string };
  if (!res.ok || !data.ok || !data.result) {
    throw new Error(data.error || 'Fruit ripeness analysis failed.');
  }
  return data.result;
}

export async function analyzePlantDiseaseApi(params: {
  imageBase64: string;
  mimeType: string;
  crop: string;
  language: AppLanguage;
  nasaSummary?: unknown;
}): Promise<DiseaseDetectionRecord> {
  const res = await fetch('/api/vision/plant-disease', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as {
    ok: boolean;
    detection?: DiseaseDetectionRecord;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.detection) {
    throw new Error(data.error || 'Plant disease screening failed.');
  }
  return data.detection;
}

export async function analyzePlantHealthApi(params: {
  imageBase64: string;
  mimeType: string;
  crop: string;
  language: AppLanguage;
  previousImageBase64?: string;
  previousSummary?: string;
}): Promise<PlantHealthObservation> {
  const res = await fetch('/api/vision/plant-health', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as {
    ok: boolean;
    observation?: PlantHealthObservation;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.observation) {
    throw new Error(data.error || 'Plant health analysis failed.');
  }
  return data.observation;
}

export async function fetchAgRecommendationsApi(params: {
  crop: string;
  issue: string;
  soilType?: string;
  language: AppLanguage;
  nasaSummary?: unknown;
}): Promise<AgRecommendationResult> {
  const res = await fetch('/api/recommendations/ag-inputs', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as {
    ok: boolean;
    recommendation?: AgRecommendationResult;
    error?: string;
  };
  if (!res.ok || !data.ok || !data.recommendation) {
    throw new Error(data.error || 'Unable to generate agricultural recommendations.');
  }
  return data.recommendation;
}

export async function fetchWaterTanksApi(): Promise<WaterTank[]> {
  const res = await fetch('/api/sensors/water-tanks', { headers: authHeaders() });
  const data = (await res.json()) as { ok: boolean; tanks?: WaterTank[] };
  return res.ok && data.ok && Array.isArray(data.tanks) ? data.tanks : [];
}

export async function createWaterTankApi(params: {
  name: string;
  plotId?: string;
  capacityLiters: number;
  minThresholdPercent: number;
  criticalThresholdPercent: number;
  sensorModel?: string;
}): Promise<WaterTank> {
  const res = await fetch('/api/sensors/water-tanks', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { ok: boolean; tank?: WaterTank; error?: string };
  if (!res.ok || !data.ok || !data.tank) {
    throw new Error(data.error || 'Unable to register water tank.');
  }
  return data.tank;
}

export async function sendWaterTankReadingApi(params: {
  tankId: string;
  levelPercent: number;
  source: 'sensor_webhook' | 'demo_test_packet';
  webhookKey?: string;
}): Promise<WaterTank> {
  const res = await fetch(`/api/sensors/water-tanks/${encodeURIComponent(params.tankId)}/reading`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      levelPercent: params.levelPercent,
      source: params.source,
      webhookKey: params.webhookKey,
    }),
  });
  const data = (await res.json()) as { ok: boolean; tank?: WaterTank; error?: string };
  if (!res.ok || !data.ok || !data.tank) {
    throw new Error(data.error || 'Unable to update tank reading.');
  }
  return data.tank;
}

export async function disconnectWaterTankApi(tankId: string): Promise<WaterTank> {
  const res = await fetch(`/api/sensors/water-tanks/${encodeURIComponent(tankId)}/disconnect`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const data = (await res.json()) as { ok: boolean; tank?: WaterTank; error?: string };
  if (!res.ok || !data.ok || !data.tank) {
    throw new Error(data.error || 'Unable to disconnect tank sensor.');
  }
  return data.tank;
}
