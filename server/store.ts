import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  CareActivity,
  CommunityCategory,
  CommunityComment,
  CommunityPost,
  CropLibraryItem,
  DiseaseDetectionRecord,
  FarmPlot,
  FruitRipenessResult,
  PlantHealthObservation,
  SecurityEvent,
  UserProfile,
  UserSettings,
  WaterTank,
} from '../src/types/farm';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_PATH = path.join(DATA_DIR, 'thamra-store.json');

// Session signing secret persisted/derived deterministically from env or random process secret
const SESSION_SECRET =
  process.env.THAMRA_SESSION_SECRET ||
  process.env.GEMINI_API_KEY ||
  'thamra-local-dev-hmac-secret-2025';

export interface StoredUserRecord {
  id: string;
  name: string;
  email: string;
  farmRegion?: string;
  passwordSalt: string;
  passwordHash: string;
  resetCodeHash?: string | null;
  resetCodeExpiresAt?: number | null;
  createdAt: string;
}

export interface UserWorkspaceRecord {
  plots: FarmPlot[];
  activePlotId: string | null;
  activeSectionId: string | null;
  customCrops: CropLibraryItem[];
  favoriteCropIds: string[];
  ripenessHistory: FruitRipenessResult[];
  diseaseDetections: DiseaseDetectionRecord[];
  healthObservations: PlantHealthObservation[];
  waterTanks: WaterTank[];
  careSchedules: CareActivity[];
  securityEvents: SecurityEvent[];
  readNotificationIds: string[];
  dismissedNotificationIds: string[];
  settings: UserSettings;
  updatedAt: string;
}

interface ThamraStoreData {
  users: StoredUserRecord[];
  workspaces: Record<string, UserWorkspaceRecord>;
  publicTanks: WaterTank[];
  communityPosts: CommunityPost[];
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
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

function createSeedPosts(): CommunityPost[] {
  const now = Date.now();
  return [
    {
      id: 'post-seed-1',
      authorId: 'seed-farmer-1',
      authorName: 'Hassan Al-Dossary',
      authorRegion: "Buri & A'ali, Bahrain",
      category: 'tip',
      cropTag: 'Tomatoes',
      title: 'Morning drip cycles + Cowpea break cut summer salt stress in Buri',
      body: 'Switching tomatoes in Section A to early 5:30 AM split drip pulses and rotating the bed with heat-hardy Cowpea in late spring kept our sandy loam much healthier and lowered afternoon leaf scorch.',
      likes: 14,
      likedByUserIds: [],
      comments: [
        {
          id: 'c-seed-1',
          authorId: 'seed-farmer-2',
          authorName: 'Mariam Al-Khalifa',
          text: 'Did the exact same sequence from the Bahrain rotation planner—Barley after Cowpea worked great too!',
          createdAt: new Date(now - 3600_000 * 14).toISOString(),
        },
      ],
      createdAt: new Date(now - 3600_000 * 30).toISOString(),
    },
    {
      id: 'post-seed-2',
      authorId: 'seed-farmer-2',
      authorName: 'Mariam Al-Khalifa',
      authorRegion: 'Budaiya Farms',
      category: 'qa',
      cropTag: 'Potatoes',
      title: 'When do you schedule pre-planting soil flush before October white potatoes?',
      body: 'NASA POWER humidity starts dropping in October while daytime peaks can still cross 32°C. How many days before planting potato tubers do fellow Bahrain growers flush salts on sandy beds?',
      likes: 9,
      likedByUserIds: [],
      comments: [],
      createdAt: new Date(now - 3600_000 * 18).toISOString(),
    },
    {
      id: 'post-seed-3',
      authorId: 'seed-advisor-1',
      authorName: 'THAMRA Extension Note',
      authorRegion: 'Jasra / National',
      category: 'announcement',
      cropTag: 'Date Palms',
      title: 'Post-pruning Red Palm Weevil inspection reminder',
      body: 'Remember to keep palm trunk bases free of pooled irrigation water and seal fresh frond pruning cuts immediately. If you notice oozing sap or chewed fibers, contact local agricultural extension teams promptly.',
      likes: 21,
      likedByUserIds: [],
      comments: [],
      createdAt: new Date(now - 3600_000 * 6).toISOString(),
    },
  ];
}

let memoryStore: ThamraStoreData | null = null;

function ensureStoreLoaded(): ThamraStoreData {
  if (memoryStore) return memoryStore;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<ThamraStoreData>;
      memoryStore = {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        workspaces: parsed.workspaces && typeof parsed.workspaces === 'object' ? parsed.workspaces : {},
        publicTanks: Array.isArray(parsed.publicTanks) ? parsed.publicTanks : [],
        communityPosts:
          Array.isArray(parsed.communityPosts) && parsed.communityPosts.length > 0
            ? parsed.communityPosts
            : createSeedPosts(),
      };
      return memoryStore;
    }
  } catch (err) {
    console.warn('[store] Initializing fresh store:', err instanceof Error ? err.message : err);
  }

  memoryStore = {
    users: [],
    workspaces: {},
    publicTanks: [],
    communityPosts: createSeedPosts(),
  };
  persistStore();
  return memoryStore;
}

function persistStore(): void {
  if (!memoryStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(memoryStore, null, 2), 'utf8');
    fs.renameSync(tmp, STORE_PATH);
  } catch (err) {
    console.warn('[store] Unable to write store:', err instanceof Error ? err.message : err);
  }
}

export function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { salt: actualSalt, hash: derived };
}

export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signAuthToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, iat: Date.now(), exp: Date.now() + 14 * 86400_000 }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAuthToken(token: string | undefined): string | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid?: string;
      exp?: number;
    };
    if (!parsed.uid || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed.uid;
  } catch {
    return null;
  }
}

export function toPublicUser(u: StoredUserRecord): UserProfile {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    farmRegion: u.farmRegion,
    createdAt: u.createdAt,
  };
}

function appendSecurityEventToWorkspace(userId: string, evt: Omit<SecurityEvent, 'id' | 'timestamp'>) {
  const store = ensureStoreLoaded();
  const prev = store.workspaces[userId];
  const fullEvent: SecurityEvent = {
    ...evt,
    id: `sec-${crypto.randomUUID().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
  };
  const next: UserWorkspaceRecord = {
    plots: prev?.plots ?? [],
    activePlotId: prev?.activePlotId ?? null,
    activeSectionId: prev?.activeSectionId ?? null,
    customCrops: prev?.customCrops ?? [],
    favoriteCropIds: prev?.favoriteCropIds ?? [],
    ripenessHistory: prev?.ripenessHistory ?? [],
    diseaseDetections: prev?.diseaseDetections ?? [],
    healthObservations: prev?.healthObservations ?? [],
    waterTanks: prev?.waterTanks ?? [],
    careSchedules: prev?.careSchedules ?? [],
    securityEvents: [fullEvent, ...(prev?.securityEvents ?? [])].slice(0, 25),
    readNotificationIds: prev?.readNotificationIds ?? [],
    dismissedNotificationIds: prev?.dismissedNotificationIds ?? [],
    settings: prev?.settings ?? DEFAULT_USER_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
  store.workspaces[userId] = next;
  persistStore();
}

export function registerUserAccount(params: {
  name: string;
  email: string;
  password: string;
  farmRegion?: string;
}): { user: UserProfile; token: string } {
  const store = ensureStoreLoaded();
  const normalizedEmail = params.email.trim().toLowerCase();
  if (store.users.some((u) => u.email === normalizedEmail)) {
    throw new Error('An account with this email already exists.');
  }

  const { salt, hash } = hashPassword(params.password);
  const record: StoredUserRecord = {
    id: `usr-${crypto.randomUUID().slice(0, 8)}`,
    name: params.name.trim(),
    email: normalizedEmail,
    farmRegion: params.farmRegion?.trim() || 'Bahrain',
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };
  store.users.push(record);
  appendSecurityEventToWorkspace(record.id, {
    type: 'register',
    titleEn: 'Account created',
    titleAr: 'تم إنشاء الحساب',
    detailEn: `Registered THAMRA farmer account (${normalizedEmail}).`,
    detailAr: `تم تسجيل حساب ثمرة الجديد (${normalizedEmail}).`,
    severity: 'info',
  });
  persistStore();
  return { user: toPublicUser(record), token: signAuthToken(record.id) };
}

export function loginUserAccount(params: {
  email: string;
  password: string;
}): { user: UserProfile; token: string } {
  const store = ensureStoreLoaded();
  const normalizedEmail = params.email.trim().toLowerCase();
  const found = store.users.find((u) => u.email === normalizedEmail);
  if (!found || !verifyPassword(params.password, found.passwordSalt, found.passwordHash)) {
    throw new Error('Invalid email or password.');
  }
  appendSecurityEventToWorkspace(found.id, {
    type: 'login',
    titleEn: 'New account sign-in',
    titleAr: 'تسجيل دخول جديد للحساب',
    detailEn: `Signed in to THAMRA account (${found.email}).`,
    detailAr: `تم تسجيل الدخول إلى حساب ثمرة (${found.email}).`,
    severity: 'info',
  });
  return { user: toPublicUser(found), token: signAuthToken(found.id) };
}

export function getUserById(userId: string): UserProfile | null {
  const store = ensureStoreLoaded();
  const found = store.users.find((u) => u.id === userId);
  return found ? toPublicUser(found) : null;
}

export function updateUserProfile(
  userId: string,
  updates: { name?: string; farmRegion?: string },
): UserProfile {
  const store = ensureStoreLoaded();
  const found = store.users.find((u) => u.id === userId);
  if (!found) throw new Error('User account not found.');
  if (updates.name && updates.name.trim()) found.name = updates.name.trim();
  if (updates.farmRegion !== undefined) found.farmRegion = updates.farmRegion.trim();
  appendSecurityEventToWorkspace(userId, {
    type: 'profile_update',
    titleEn: 'Profile details updated',
    titleAr: 'تم تحديث بيانات الملف الشخصي',
    detailEn: `Account profile (${found.name}, ${found.farmRegion || 'Bahrain'}) was updated.`,
    detailAr: `تم تحديث بيانات الحساب (${found.name}).`,
    severity: 'info',
  });
  persistStore();
  return toPublicUser(found);
}

export function createPasswordResetRequest(email: string): {
  issued: boolean;
  demoResetCode?: string;
} {
  const store = ensureStoreLoaded();
  const normalizedEmail = email.trim().toLowerCase();
  const found = store.users.find((u) => u.email === normalizedEmail);
  if (!found) {
    return { issued: false };
  }
  const code = String(crypto.randomInt(100000, 999999));
  found.resetCodeHash = crypto.createHash('sha256').update(code).digest('hex');
  found.resetCodeExpiresAt = Date.now() + 15 * 60_000;
  appendSecurityEventToWorkspace(found.id, {
    type: 'password_reset',
    titleEn: 'Password reset requested',
    titleAr: 'طلب إعادة تعيين كلمة المرور',
    detailEn: `A 6-digit password reset code was requested for ${found.email}.`,
    detailAr: `تم طلب رمز استعادة كلمة المرور للحساب ${found.email}.`,
    severity: 'warning',
  });
  persistStore();
  return { issued: true, demoResetCode: code };
}

export function completePasswordReset(params: {
  email: string;
  code: string;
  newPassword: string;
}): UserProfile {
  const store = ensureStoreLoaded();
  const normalizedEmail = params.email.trim().toLowerCase();
  const found = store.users.find((u) => u.email === normalizedEmail);
  if (!found || !found.resetCodeHash || !found.resetCodeExpiresAt) {
    throw new Error('No active password reset request for this email.');
  }
  if (found.resetCodeExpiresAt < Date.now()) {
    throw new Error('Reset code has expired. Request a new one.');
  }
  const candidateHash = crypto.createHash('sha256').update(params.code.trim()).digest('hex');
  if (candidateHash !== found.resetCodeHash) {
    throw new Error('Incorrect reset verification code.');
  }
  const { salt, hash } = hashPassword(params.newPassword);
  found.passwordSalt = salt;
  found.passwordHash = hash;
  found.resetCodeHash = null;
  found.resetCodeExpiresAt = null;
  appendSecurityEventToWorkspace(found.id, {
    type: 'password_reset',
    titleEn: 'Password changed',
    titleAr: 'تم تغيير كلمة المرور',
    detailEn: `Password was successfully reset for ${found.email}.`,
    detailAr: `تم تحديث كلمة المرور بنجاح للحساب ${found.email}.`,
    severity: 'warning',
  });
  persistStore();
  return toPublicUser(found);
}

export function getUserWorkspace(userId: string): UserWorkspaceRecord | null {
  const store = ensureStoreLoaded();
  return store.workspaces[userId] ?? null;
}

export function saveUserWorkspace(
  userId: string,
  payload: Partial<UserWorkspaceRecord>,
): UserWorkspaceRecord {
  const store = ensureStoreLoaded();
  const prev = store.workspaces[userId];
  const next: UserWorkspaceRecord = {
    plots: Array.isArray(payload.plots) ? payload.plots : prev?.plots ?? [],
    activePlotId:
      payload.activePlotId !== undefined ? payload.activePlotId : prev?.activePlotId ?? null,
    activeSectionId:
      payload.activeSectionId !== undefined
        ? payload.activeSectionId
        : prev?.activeSectionId ?? null,
    customCrops: Array.isArray(payload.customCrops) ? payload.customCrops : prev?.customCrops ?? [],
    favoriteCropIds: Array.isArray(payload.favoriteCropIds)
      ? payload.favoriteCropIds
      : prev?.favoriteCropIds ?? [],
    ripenessHistory: Array.isArray(payload.ripenessHistory)
      ? payload.ripenessHistory.slice(0, 30)
      : prev?.ripenessHistory ?? [],
    diseaseDetections: Array.isArray(payload.diseaseDetections)
      ? payload.diseaseDetections.slice(0, 40)
      : prev?.diseaseDetections ?? [],
    healthObservations: Array.isArray(payload.healthObservations)
      ? payload.healthObservations.slice(0, 40)
      : prev?.healthObservations ?? [],
    waterTanks: Array.isArray(payload.waterTanks)
      ? payload.waterTanks.slice(0, 20)
      : prev?.waterTanks ?? [],
    careSchedules: Array.isArray(payload.careSchedules)
      ? payload.careSchedules.slice(0, 120)
      : prev?.careSchedules ?? [],
    securityEvents: Array.isArray(payload.securityEvents)
      ? payload.securityEvents.slice(0, 25)
      : prev?.securityEvents ?? [],
    readNotificationIds: Array.isArray(payload.readNotificationIds)
      ? payload.readNotificationIds.slice(-200)
      : prev?.readNotificationIds ?? [],
    dismissedNotificationIds: Array.isArray(payload.dismissedNotificationIds)
      ? payload.dismissedNotificationIds.slice(-200)
      : prev?.dismissedNotificationIds ?? [],
    settings: {
      ...DEFAULT_USER_SETTINGS,
      ...(prev?.settings ?? {}),
      ...(payload.settings ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
  store.workspaces[userId] = next;
  persistStore();
  return next;
}

export function listPublicWaterTanks(userId?: string | null): WaterTank[] {
  const store = ensureStoreLoaded();
  if (userId && store.workspaces[userId]?.waterTanks) {
    return store.workspaces[userId].waterTanks;
  }
  return store.publicTanks;
}

export function upsertWaterTankRecord(tank: WaterTank, userId?: string | null): WaterTank {
  const store = ensureStoreLoaded();
  if (userId) {
    const ws = getUserWorkspace(userId);
    const list = ws?.waterTanks ?? [];
    const idx = list.findIndex((t) => t.id === tank.id);
    const updated = idx >= 0 ? list.map((t) => (t.id === tank.id ? tank : t)) : [...list, tank];
    saveUserWorkspace(userId, { waterTanks: updated });
    return tank;
  }
  const idx = store.publicTanks.findIndex((t) => t.id === tank.id);
  if (idx >= 0) {
    store.publicTanks[idx] = tank;
  } else {
    store.publicTanks.push(tank);
  }
  persistStore();
  return tank;
}

export function recordWaterTankReading(params: {
  tankId: string;
  levelPercent: number;
  source: 'sensor_webhook' | 'demo_test_packet';
  webhookKey?: string;
  userId?: string | null;
}): WaterTank {
  const store = ensureStoreLoaded();
  const clampedPct = Math.max(0, Math.min(100, Math.round(params.levelPercent * 10) / 10));

  const applyReading = (tank: WaterTank): WaterTank => {
    if (params.source === 'sensor_webhook' && params.webhookKey !== tank.webhookKey) {
      throw new Error('Invalid sensor webhook key.');
    }
    const now = new Date().toISOString();
    const volumeLiters = Math.round((clampedPct / 100) * tank.capacityLiters);
    const reading = {
      timestamp: now,
      levelPercent: clampedPct,
      volumeLiters,
      source: params.source,
    };
    return {
      ...tank,
      status: 'connected',
      currentLevelPercent: clampedPct,
      currentVolumeLiters: volumeLiters,
      lastUpdatedAt: now,
      history: [...tank.history, reading].slice(-48),
    };
  };

  if (params.userId && store.workspaces[params.userId]) {
    const ws = store.workspaces[params.userId];
    const target = ws.waterTanks.find((t) => t.id === params.tankId);
    if (target) {
      const updatedTank = applyReading(target);
      ws.waterTanks = ws.waterTanks.map((t) => (t.id === params.tankId ? updatedTank : t));
      ws.updatedAt = new Date().toISOString();
      persistStore();
      return updatedTank;
    }
  }

  // Search workspaces by tankId + webhookKey for IoT devices pushing without user bearer token
  for (const ws of Object.values(store.workspaces)) {
    const found = ws.waterTanks.find((t) => t.id === params.tankId);
    if (found) {
      const updatedTank = applyReading(found);
      ws.waterTanks = ws.waterTanks.map((t) => (t.id === params.tankId ? updatedTank : t));
      ws.updatedAt = new Date().toISOString();
      persistStore();
      return updatedTank;
    }
  }

  const pubIdx = store.publicTanks.findIndex((t) => t.id === params.tankId);
  if (pubIdx >= 0) {
    const updatedTank = applyReading(store.publicTanks[pubIdx]);
    store.publicTanks[pubIdx] = updatedTank;
    persistStore();
    return updatedTank;
  }

  throw new Error('Water tank not found.');
}

export function disconnectWaterTankSensor(tankId: string, userId?: string | null): WaterTank {
  const store = ensureStoreLoaded();
  const markDisconnected = (tank: WaterTank): WaterTank => ({
    ...tank,
    status: 'disconnected',
  });

  if (userId && store.workspaces[userId]) {
    const ws = store.workspaces[userId];
    const target = ws.waterTanks.find((t) => t.id === tankId);
    if (target) {
      const updated = markDisconnected(target);
      ws.waterTanks = ws.waterTanks.map((t) => (t.id === tankId ? updated : t));
      appendSecurityEventToWorkspace(userId, {
        type: 'sensor_disconnect',
        titleEn: `Water sensor disconnected (${target.name})`,
        titleAr: `انقطاع مستشعر المياه (${target.name})`,
        detailEn: `Water tank "${target.name}" sensor was disconnected.`,
        detailAr: `تم فصل مستشعر مستوى المياه لخزان "${target.name}".`,
        severity: 'warning',
      });
      persistStore();
      return updated;
    }
  }

  const pubIdx = store.publicTanks.findIndex((t) => t.id === tankId);
  if (pubIdx >= 0) {
    store.publicTanks[pubIdx] = markDisconnected(store.publicTanks[pubIdx]);
    persistStore();
    return store.publicTanks[pubIdx];
  }

  throw new Error('Water tank not found.');
}

export function listCommunityPosts(): CommunityPost[] {
  const store = ensureStoreLoaded();
  return [...store.communityPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function createCommunityPost(params: {
  authorId: string;
  authorName: string;
  authorRegion?: string;
  category: CommunityCategory;
  cropTag?: string;
  title: string;
  body: string;
}): CommunityPost {
  const store = ensureStoreLoaded();
  const post: CommunityPost = {
    id: `post-${crypto.randomUUID().slice(0, 8)}`,
    authorId: params.authorId,
    authorName: params.authorName.trim() || 'Bahrain Farmer',
    authorRegion: params.authorRegion?.trim() || 'Bahrain',
    category: params.category,
    cropTag: params.cropTag?.trim() || undefined,
    title: params.title.trim(),
    body: params.body.trim(),
    likes: 0,
    likedByUserIds: [],
    comments: [],
    createdAt: new Date().toISOString(),
  };
  store.communityPosts.unshift(post);
  persistStore();
  return post;
}

export function toggleCommunityPostLike(postId: string, actorId: string): CommunityPost {
  const store = ensureStoreLoaded();
  const found = store.communityPosts.find((p) => p.id === postId);
  if (!found) throw new Error('Post not found.');
  const exists = found.likedByUserIds.includes(actorId);
  if (exists) {
    found.likedByUserIds = found.likedByUserIds.filter((id) => id !== actorId);
    found.likes = Math.max(0, found.likes - 1);
  } else {
    found.likedByUserIds.push(actorId);
    found.likes += 1;
  }
  persistStore();
  return found;
}

export function addCommunityComment(params: {
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
}): CommunityPost {
  const store = ensureStoreLoaded();
  const found = store.communityPosts.find((p) => p.id === params.postId);
  if (!found) throw new Error('Post not found.');
  const comment: CommunityComment = {
    id: `cmt-${crypto.randomUUID().slice(0, 8)}`,
    authorId: params.authorId,
    authorName: params.authorName.trim() || 'Farmer',
    text: params.text.trim(),
    createdAt: new Date().toISOString(),
  };
  found.comments.push(comment);
  persistStore();
  return found;
}
