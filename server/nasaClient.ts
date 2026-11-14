import { PNG } from 'pngjs';
import type {
  FarmEnvironmentSnapshot,
  GeocodeResult,
  MoistureCategory,
  NasaPowerDay,
  NasaSmapReading,
} from '../src/types/farm';

interface ColormapEntry {
  r: number;
  g: number;
  b: number;
  midpoint: number;
}

const SMAP_COLORMAP_URL =
  'https://gibs.earthdata.nasa.gov/colormaps/v1.3/SMAP_Analyzed_Soil_Moisture.xml';

let cachedColormap: ColormapEntry[] | null = null;
const snapshotCache = new Map<string, { expiresAt: number; data: FarmEnvironmentSnapshot }>();

function formatYmdCompact(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatYmdIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseNasaVal(val: unknown): number | null {
  if (typeof val !== 'number' || Number.isNaN(val) || val <= -900) return null;
  return Math.round(val * 100) / 100;
}

function calculateVpdKpa(tempC: number | null, rhPercent: number | null): number | null {
  if (tempC === null || rhPercent === null) return null;
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const vpd = svp * (1 - Math.max(0, Math.min(100, rhPercent)) / 100);
  return Math.round(vpd * 100) / 100;
}

async function getSmapColormap(): Promise<ColormapEntry[]> {
  if (cachedColormap) return cachedColormap;

  const res = await fetch(SMAP_COLORMAP_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch NASA GIBS SMAP colormap (${res.status})`);
  }
  const xml = await res.text();
  const entries: ColormapEntry[] = [];
  const regex =
    /<ColorMapEntry\s+rgb="(\d+),(\d+),(\d+)"[^>]*value="\[([0-9.]+),([0-9.]+)[)\]]"[^>]*\/>/g;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    const low = Number(match[4]);
    const high = Number(match[5]);
    if (!Number.isNaN(low) && !Number.isNaN(high)) {
      entries.push({ r, g, b, midpoint: Math.round(((low + high) / 2) * 1000) / 1000 });
    }
  }

  // Handle upper-bound entry like ">=0.50" or ">0.5" if present
  const highRegex =
    /<ColorMapEntry\s+rgb="(\d+),(\d+),(\d+)"[^>]*value="[>≥]=?\s*([0-9.]+)"[^>]*\/>/g;
  while ((match = highRegex.exec(xml)) !== null) {
    const r = Number(match[1]);
    const g = Number(match[2]);
    const b = Number(match[3]);
    const val = Number(match[4]);
    if (!Number.isNaN(val)) {
      entries.push({ r, g, b, midpoint: val });
    }
  }

  cachedColormap = entries;
  return entries;
}

function latLonToTilePixel(lat: number, lon: number, zoom: number) {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const clampedLon = ((lon + 180) % 360 + 360) % 360 - 180;
  const n = 2 ** zoom;
  const xFloat = ((clampedLon + 180) / 360) * n;
  const latRad = (clampedLat * Math.PI) / 180;
  const yFloat =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const tileX = Math.max(0, Math.min(n - 1, Math.floor(xFloat)));
  const tileY = Math.max(0, Math.min(n - 1, Math.floor(yFloat)));
  const px = Math.max(0, Math.min(255, Math.floor((xFloat - tileX) * 256)));
  const py = Math.max(0, Math.min(255, Math.floor((yFloat - tileY) * 256)));

  return { tileX, tileY, px, py };
}

function matchRgbToMoisture(
  r: number,
  g: number,
  b: number,
  colormap: ColormapEntry[],
): number | null {
  if (colormap.length === 0) return null;
  let bestDist = Infinity;
  let bestVal: number | null = null;

  for (const entry of colormap) {
    const dr = entry.r - r;
    const dg = entry.g - g;
    const db = entry.b - b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestVal = entry.midpoint;
    }
  }

  // Only accept reasonably close colormap matches (avoids false positives on black/nodata/white borders)
  if (bestDist > 2400) return null;
  return bestVal;
}

function sampleTileMoisture(
  png: PNG,
  px: number,
  py: number,
  colormap: ColormapEntry[],
): number | null {
  const offsets: Array<[number, number]> = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ];

  for (const [dx, dy] of offsets) {
    const sx = px + dx;
    const sy = py + dy;
    if (sx < 0 || sx >= png.width || sy < 0 || sy >= png.height) continue;
    const idx = (png.width * sy + sx) << 2;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];
    if (a < 30 || (r === 0 && g === 0 && b === 0)) continue;
    const val = matchRgbToMoisture(r, g, b, colormap);
    if (val !== null) return val;
  }
  return null;
}

function classifySmapMoisture(val: number | null): {
  status: MoistureCategory;
  statusLabel: string;
} {
  if (val === null) return { status: 'unavailable', statusLabel: 'No SMAP Pixel' };
  if (val < 0.1) return { status: 'very_dry', statusLabel: 'Very Dry' };
  if (val < 0.18) return { status: 'dry', statusLabel: 'Dry' };
  if (val <= 0.35) return { status: 'optimal', statusLabel: 'Optimal' };
  if (val <= 0.45) return { status: 'moist', statusLabel: 'Moist' };
  return { status: 'saturated', statusLabel: 'Saturated' };
}

async function fetchSmapTileValue(
  layerId: string,
  dateStr: string,
  zoom: number,
  tileX: number,
  tileY: number,
  px: number,
  py: number,
  colormap: ColormapEntry[],
): Promise<number | null> {
  const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layerId}/default/${dateStr}/GoogleMapsCompatible_Level6/${zoom}/${tileY}/${tileX}.png`;
  const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const png = PNG.sync.read(buf);
  return sampleTileMoisture(png, px, py, colormap);
}

async function fetchNasaSmapPoint(lat: number, lon: number): Promise<NasaSmapReading> {
  try {
    const colormap = await getSmapColormap();
    const zoom = 6;
    const { tileX, tileY, px, py } = latLonToTilePixel(lat, lon, zoom);

    // SMAP L4 has ~3-4 day latency in GIBS; check days -3 through -8 for latest valid pixel
    const now = new Date();
    for (let daysAgo = 3; daysAgo <= 8; daysAgo += 1) {
      const target = new Date(now.getTime() - daysAgo * 86400_000);
      const dateStr = formatYmdIso(target);

      const [surfaceVal, rootVal] = await Promise.all([
        fetchSmapTileValue(
          'SMAP_L4_Analyzed_Surface_Soil_Moisture',
          dateStr,
          zoom,
          tileX,
          tileY,
          px,
          py,
          colormap,
        ),
        fetchSmapTileValue(
          'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture',
          dateStr,
          zoom,
          tileX,
          tileY,
          px,
          py,
          colormap,
        ),
      ]);

      if (surfaceVal !== null || rootVal !== null) {
        const primaryVal = surfaceVal ?? rootVal;
        const classification = classifySmapMoisture(primaryVal);
        return {
          available: true,
          observationDate: dateStr,
          surfaceMoistureM3M3: surfaceVal,
          rootZoneMoistureM3M3: rootVal,
          surfacePercent:
            primaryVal !== null ? Math.min(100, Math.round((primaryVal / 0.5) * 100)) : null,
          status: classification.status,
          statusLabel: classification.statusLabel,
          dataset: 'NASA SMAP L4 (GIBS 9km Grid)',
        };
      }
    }

    return {
      available: false,
      observationDate: null,
      surfaceMoistureM3M3: null,
      rootZoneMoistureM3M3: null,
      surfacePercent: null,
      status: 'unavailable',
      statusLabel: 'No Land Pixel',
      dataset: 'NASA SMAP L4 (GIBS 9km Grid)',
      note: 'No SMAP land-grid reading at this exact coordinate (for example, ocean or narrow island coastline). NASA POWER land-surface wetness is still provided below.',
    };
  } catch (error) {
    return {
      available: false,
      observationDate: null,
      surfaceMoistureM3M3: null,
      rootZoneMoistureM3M3: null,
      surfacePercent: null,
      status: 'unavailable',
      statusLabel: 'SMAP Unavailable',
      dataset: 'NASA SMAP L4 (GIBS 9km Grid)',
      note:
        error instanceof Error
          ? `SMAP tile lookup failed: ${error.message}`
          : 'Unable to read NASA SMAP GIBS layer right now.',
    };
  }
}

async function fetchNasaPowerPoint(lat: number, lon: number) {
  const now = new Date();
  const end = formatYmdCompact(now);
  const start = formatYmdCompact(new Date(now.getTime() - 18 * 86400_000));

  const params = new URLSearchParams({
    parameters:
      'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,WS2M,GWETTOP,GWETROOT',
    community: 'AG',
    longitude: lon.toFixed(4),
    latitude: lat.toFixed(4),
    start,
    end,
    format: 'JSON',
  });

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });

  if (!res.ok) {
    throw new Error(`NASA POWER API returned status ${res.status}`);
  }

  const json = (await res.json()) as {
    properties?: {
      parameter?: Record<string, Record<string, number>>;
    };
  };

  const p = json.properties?.parameter;
  if (!p || !p.T2M) {
    throw new Error('NASA POWER response missing parameter data.');
  }

  const rawDates = Object.keys(p.T2M).sort();
  const days: NasaPowerDay[] = [];

  for (const key of rawDates) {
    const t2m = parseNasaVal(p.T2M?.[key]);
    const rh2m = parseNasaVal(p.RH2M?.[key]);
    const precip = parseNasaVal(p.PRECTOTCORR?.[key]);
    const solar = parseNasaVal(p.ALLSKY_SFC_SW_DWN?.[key]);

    // Skip trailing unpublished dates where core meteorological parameters are -999
    if (t2m === null && rh2m === null && precip === null) continue;

    days.push({
      date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`,
      t2m,
      t2mMax: parseNasaVal(p.T2M_MAX?.[key]),
      t2mMin: parseNasaVal(p.T2M_MIN?.[key]),
      precipitationMm: precip,
      humidityPercent: rh2m,
      solarRadiationMj: solar,
      windSpeedMs: parseNasaVal(p.WS2M?.[key]),
      gwetTop: parseNasaVal(p.GWETTOP?.[key]),
      gwetRoot: parseNasaVal(p.GWETROOT?.[key]),
    });
  }

  const recentDays = days.slice(-14);
  const latest = recentDays.length > 0 ? recentDays[recentDays.length - 1] : null;
  const last7 = recentDays.slice(-7);

  const rainValues = last7
    .map((d) => d.precipitationMm)
    .filter((v): v is number => v !== null);
  const tempValues = last7.map((d) => d.t2m).filter((v): v is number => v !== null);
  const allSolarValues = recentDays
    .map((d) => d.solarRadiationMj)
    .filter((v): v is number => v !== null);
  const solarValues = last7
    .map((d) => d.solarRadiationMj)
    .filter((v): v is number => v !== null);

  const sevenDayRainMm =
    rainValues.length > 0
      ? Math.round(rainValues.reduce((acc, v) => acc + v, 0) * 10) / 10
      : null;
  const sevenDayAvgTempC =
    tempValues.length > 0
      ? Math.round((tempValues.reduce((acc, v) => acc + v, 0) / tempValues.length) * 10) / 10
      : null;
  const sevenDayAvgSolarMj =
    solarValues.length > 0
      ? Math.round((solarValues.reduce((acc, v) => acc + v, 0) / solarValues.length) * 100) / 100
      : null;
  const latestSolarMj =
    allSolarValues.length > 0 ? allSolarValues[allSolarValues.length - 1] : null;

  return {
    available: recentDays.length > 0,
    dataset: 'NASA POWER Agroclimatology (AG)',
    latestDate: latest?.date ?? null,
    latest,
    latestSolarMj,
    sevenDayRainMm,
    sevenDayAvgTempC,
    sevenDayAvgSolarMj,
    vpdKpa: calculateVpdKpa(latest?.t2m ?? null, latest?.humidityPercent ?? null),
    days: recentDays,
  };
}

export async function getNasaFarmEnvironment(params: {
  latitude: number;
  longitude: number;
  name?: string;
  forceRefresh?: boolean;
}): Promise<FarmEnvironmentSnapshot> {
  const lat = Math.max(-85, Math.min(85, params.latitude));
  const lon = Math.max(-180, Math.min(180, params.longitude));
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  if (!params.forceRefresh) {
    const cached = snapshotCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.data,
        location: {
          ...cached.data.location,
          name: params.name || cached.data.location.name,
        },
      };
    }
  }

  const [smapResult, powerResult] = await Promise.allSettled([
    fetchNasaSmapPoint(lat, lon),
    fetchNasaPowerPoint(lat, lon),
  ]);

  const smap: NasaSmapReading =
    smapResult.status === 'fulfilled'
      ? smapResult.value
      : {
          available: false,
          observationDate: null,
          surfaceMoistureM3M3: null,
          rootZoneMoistureM3M3: null,
          surfacePercent: null,
          status: 'unavailable',
          statusLabel: 'SMAP Unavailable',
          dataset: 'NASA SMAP L4 (GIBS 9km Grid)',
          note: 'Unable to fetch NASA SMAP layer right now.',
        };

  const power =
    powerResult.status === 'fulfilled'
      ? powerResult.value
      : {
          available: false,
          dataset: 'NASA POWER Agroclimatology (AG)',
          latestDate: null,
          latest: null,
          latestSolarMj: null,
          sevenDayRainMm: null,
          sevenDayAvgTempC: null,
          sevenDayAvgSolarMj: null,
          vpdKpa: null,
          days: [],
          note:
            powerResult.reason instanceof Error
              ? powerResult.reason.message
              : 'Unable to reach NASA POWER API.',
        };

  const smapPixelInfo = latLonToTilePixel(lat, lon, 6);
  const powerCellKey = `${Math.round(lat * 2) / 2},${Math.round(lon * 1.6) / 1.6}`;

  const snapshot: FarmEnvironmentSnapshot = {
    isSampleData: false,
    fetchedAt: new Date().toISOString(),
    location: {
      name: params.name || `Farm (${lat.toFixed(3)}, ${lon.toFixed(3)})`,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
    },
    spatialMeta: {
      smapPixelKey: smap.available
        ? `6:${smapPixelInfo.tileX}:${smapPixelInfo.tileY}:${smapPixelInfo.px}:${smapPixelInfo.py}`
        : null,
      smapResolutionKm: 9,
      powerCellKey,
      powerResolutionKm: 50,
    },
    smap,
    power,
  };

  snapshotCache.set(cacheKey, {
    expiresAt: Date.now() + 10 * 60 * 1000, // 10-minute cache
    data: snapshot,
  });

  return snapshot;
}

export async function geocodeLocation(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(
    query,
  )}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'TamraFarmApp/1.0 (hackathon-agritech-prototype)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!res.ok) {
    throw new Error(`Geocoding service returned status ${res.status}`);
  }

  const items = (await res.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
    address?: { country?: string };
  }>;

  return items
    .map((item) => ({
      name: item.display_name || query,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      country: item.address?.country,
    }))
    .filter((item) => !Number.isNaN(item.latitude) && !Number.isNaN(item.longitude));
}

export async function fetchNasaPowerRange(params: {
  latitude: number;
  longitude: number;
  startYmd: string; // YYYYMMDD or YYYY-MM-DD
  endYmd: string; // YYYYMMDD or YYYY-MM-DD
}): Promise<{ days: NasaPowerDay[]; dataset: string; startDate: string; endDate: string }> {
  const start = params.startYmd.replace(/-/g, '').slice(0, 8);
  const end = params.endYmd.replace(/-/g, '').slice(0, 8);

  const qs = new URLSearchParams({
    parameters:
      'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,WS2M,GWETTOP,GWETROOT',
    community: 'AG',
    longitude: params.longitude.toFixed(4),
    latitude: params.latitude.toFixed(4),
    start,
    end,
    format: 'JSON',
  });

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?${qs.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(14000) });
  if (!res.ok) {
    throw new Error(`NASA POWER date-range API returned status ${res.status}`);
  }

  const json = (await res.json()) as {
    properties?: {
      parameter?: Record<string, Record<string, number>>;
    };
  };
  const p = json.properties?.parameter;
  if (!p || !p.T2M) {
    throw new Error('NASA POWER date-range response missing data.');
  }

  const rawDates = Object.keys(p.T2M).sort();
  const days: NasaPowerDay[] = [];
  for (const key of rawDates) {
    const t2m = parseNasaVal(p.T2M?.[key]);
    const rh2m = parseNasaVal(p.RH2M?.[key]);
    const precip = parseNasaVal(p.PRECTOTCORR?.[key]);
    if (t2m === null && rh2m === null && precip === null) continue;
    days.push({
      date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`,
      t2m,
      t2mMax: parseNasaVal(p.T2M_MAX?.[key]),
      t2mMin: parseNasaVal(p.T2M_MIN?.[key]),
      precipitationMm: precip,
      humidityPercent: rh2m,
      solarRadiationMj: parseNasaVal(p.ALLSKY_SFC_SW_DWN?.[key]),
      windSpeedMs: parseNasaVal(p.WS2M?.[key]),
      gwetTop: parseNasaVal(p.GWETTOP?.[key]),
      gwetRoot: parseNasaVal(p.GWETROOT?.[key]),
    });
  }

  return {
    days,
    dataset: 'NASA POWER Agroclimatology (AG)',
    startDate: `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`,
    endDate: `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`,
  };
}

