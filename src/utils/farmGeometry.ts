import type { AppLanguage, CropSection, FarmPlot, LatLngPoint } from '../types/farm';

export interface CropPreset {
  id: string;
  nameEn: string;
  nameAr: string;
  color: string;
}

export const CROP_PRESETS: CropPreset[] = [
  { id: 'tomatoes', nameEn: 'Tomatoes', nameAr: 'طماطم', color: '#C85A32' },
  { id: 'potatoes', nameEn: 'Potatoes', nameAr: 'بطاطس', color: '#C28B37' },
  { id: 'wheat', nameEn: 'Wheat', nameAr: 'قمح', color: '#D4A82A' },
  { id: 'barley', nameEn: 'Barley', nameAr: 'شعير', color: '#9E8227' },
  { id: 'lettuce', nameEn: 'Lettuce', nameAr: 'خس', color: '#4B8B3B' },
  { id: 'cucumbers', nameEn: 'Cucumbers', nameAr: 'خيار', color: '#2F7D4C' },
  { id: 'peppers', nameEn: 'Peppers', nameAr: 'فلفل', color: '#B84B6E' },
  { id: 'date_palms', nameEn: 'Date Palms', nameAr: 'نخيل التمر', color: '#535C21' },
  { id: 'alfalfa', nameEn: 'Alfalfa / Forage', nameAr: 'برسيم / أعلاف', color: '#3E7A72' },
  { id: 'cowpea', nameEn: 'Cowpea', nameAr: 'لوبيا', color: '#4A6FA5' },
  { id: 'unused', nameEn: 'Unused / Preparing', nameAr: 'أرض غير مزروعة / قيد التجهيز', color: '#8E7D49' },
];

export const FALLBACK_SECTION_COLORS = [
  '#C85A32',
  '#3E7A72',
  '#C28B37',
  '#2F7D4C',
  '#6E5A9E',
  '#B84B6E',
  '#4A6FA5',
  '#8E7D49',
];

export function getCropColor(crop: string, fallbackIndex = 0): string {
  const lower = crop.trim().toLowerCase();
  for (const preset of CROP_PRESETS) {
    if (
      lower === preset.nameEn.toLowerCase() ||
      lower === preset.nameAr.toLowerCase() ||
      lower.includes(preset.id.replace('_', ' ')) ||
      (preset.id === 'tomatoes' && (lower.includes('tomato') || lower.includes('طماطم'))) ||
      (preset.id === 'potatoes' && (lower.includes('potato') || lower.includes('بطاط'))) ||
      (preset.id === 'wheat' && (lower.includes('wheat') || lower.includes('قمح'))) ||
      (preset.id === 'date_palms' && (lower.includes('palm') || lower.includes('date') || lower.includes('نخل') || lower.includes('نخيل'))) ||
      (preset.id === 'leafy_greens' && (lower.includes('herb') || lower.includes('green') || lower.includes('ورق'))) ||
      (preset.id === 'alfalfa' && (lower.includes('alfalfa') || lower.includes('برسيم'))) ||
      (preset.id === 'unused' && (lower.includes('unused') || lower.includes('fallow') || lower.includes('prepar') || lower.includes('غير مزروع') || lower.includes('تجهيز')))
    ) {
      return preset.color;
    }
  }
  return FALLBACK_SECTION_COLORS[fallbackIndex % FALLBACK_SECTION_COLORS.length];
}

export function computePolygonCentroid(points: LatLngPoint[]): LatLngPoint {
  if (points.length === 0) return { lat: 26.155, lon: 50.505 };
  if (points.length < 3) {
    const lat = points.reduce((acc, p) => acc + p.lat, 0) / points.length;
    const lon = points.reduce((acc, p) => acc + p.lon, 0) / points.length;
    return {
      lat: Math.round(lat * 100000) / 100000,
      lon: Math.round(lon * 100000) / 100000,
    };
  }

  let areaSum = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const cross = p1.lon * p2.lat - p2.lon * p1.lat;
    areaSum += cross;
    cx += (p1.lon + p2.lon) * cross;
    cy += (p1.lat + p2.lat) * cross;
  }

  if (Math.abs(areaSum) < 1e-12) {
    const lat = points.reduce((acc, p) => acc + p.lat, 0) / points.length;
    const lon = points.reduce((acc, p) => acc + p.lon, 0) / points.length;
    return {
      lat: Math.round(lat * 100000) / 100000,
      lon: Math.round(lon * 100000) / 100000,
    };
  }

  const factor = 1 / (3 * areaSum);
  return {
    lat: Math.round(cy * factor * 100000) / 100000,
    lon: Math.round(cx * factor * 100000) / 100000,
  };
}

export function computePolygonAreaSqMeters(points: LatLngPoint[]): number {
  if (points.length < 3) return 0;
  const R = 6378137;
  const refLatRad =
    (points.reduce((acc, p) => acc + p.lat, 0) / points.length) * (Math.PI / 180);
  const cosLat = Math.cos(refLatRad);

  const projected = points.map((p) => ({
    x: p.lon * (Math.PI / 180) * R * cosLat,
    y: p.lat * (Math.PI / 180) * R,
  }));

  let twiceArea = 0;
  for (let i = 0; i < projected.length; i += 1) {
    const a = projected[i];
    const b = projected[(i + 1) % projected.length];
    twiceArea += a.x * b.y - b.x * a.y;
  }

  return Math.round(Math.abs(twiceArea) / 2);
}

export function formatArea(sqMeters: number, lang: AppLanguage): string {
  const safe = Math.max(0, Math.round(sqMeters));
  const hectares = safe / 10000;
  if (lang === 'ar') {
    if (safe >= 10000) {
      return `${safe.toLocaleString('en-US')} م² (${hectares.toFixed(2)} هكتار)`;
    }
    return `${safe.toLocaleString('en-US')} م²`;
  }
  if (safe >= 10000) {
    return `${safe.toLocaleString('en-US')} m² (${hectares.toFixed(2)} ha)`;
  }
  return `${safe.toLocaleString('en-US')} m² (${hectares.toFixed(2)} ha)`;
}

export function pointInPolygon(point: LatLngPoint, polygon: LatLngPoint[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon;
    const yi = polygon[i].lat;
    const xj = polygon[j].lon;
    const yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lon < ((xj - xi) * (point.lat - yi)) / (yj - yi + 1e-15) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function orientation(a: LatLngPoint, b: LatLngPoint, c: LatLngPoint): number {
  const val = (b.lon - a.lon) * (c.lat - b.lat) - (b.lat - a.lat) * (c.lon - b.lon);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(a: LatLngPoint, b: LatLngPoint, c: LatLngPoint): boolean {
  return (
    b.lon <= Math.max(a.lon, c.lon) + 1e-10 &&
    b.lon >= Math.min(a.lon, c.lon) - 1e-10 &&
    b.lat <= Math.max(a.lat, c.lat) + 1e-10 &&
    b.lat >= Math.min(a.lat, c.lat) - 1e-10
  );
}

export function segmentsProperlyIntersect(
  p1: LatLngPoint,
  q1: LatLngPoint,
  p2: LatLngPoint,
  q2: LatLngPoint,
): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) {
    return true;
  }
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}

export function isPolygonInsidePolygon(
  inner: LatLngPoint[],
  outer: LatLngPoint[],
): boolean {
  if (inner.length < 3 || outer.length < 3) return false;

  for (let i = 0; i < inner.length; i += 1) {
    const a = inner[i];
    const b = inner[(i + 1) % inner.length];
    if (!pointInPolygon(a, outer)) return false;
    const mid: LatLngPoint = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
    if (!pointInPolygon(mid, outer)) return false;

    for (let j = 0; j < outer.length; j += 1) {
      const c = outer[j];
      const d = outer[(j + 1) % outer.length];
      if (segmentsProperlyIntersect(a, b, c, d)) {
        return false;
      }
    }
  }

  return true;
}

export function polygonsOverlap(
  polyA: LatLngPoint[],
  polyB: LatLngPoint[],
): boolean {
  if (polyA.length < 3 || polyB.length < 3) return false;

  for (let i = 0; i < polyA.length; i += 1) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    if (pointInPolygon(a1, polyB)) return true;
    const midA: LatLngPoint = { lat: (a1.lat + a2.lat) / 2, lon: (a1.lon + a2.lon) / 2 };
    if (pointInPolygon(midA, polyB)) return true;

    for (let j = 0; j < polyB.length; j += 1) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      if (segmentsProperlyIntersect(a1, a2, b1, b2)) return true;
    }
  }

  for (const ptB of polyB) {
    if (pointInPolygon(ptB, polyA)) return true;
  }

  const cA = computePolygonCentroid(polyA);
  const cB = computePolygonCentroid(polyB);
  if (pointInPolygon(cA, polyB) || pointInPolygon(cB, polyA)) return true;

  return false;
}

export function pointHitsAnySection(
  point: LatLngPoint,
  sections: CropSection[],
  ignoreSectionId?: string,
): CropSection | null {
  for (const sec of sections) {
    if (ignoreSectionId && sec.id === ignoreSectionId) continue;
    if (pointInPolygon(point, sec.points)) return sec;
  }
  return null;
}

export function segmentIntersectsAnySection(
  p1: LatLngPoint,
  p2: LatLngPoint,
  sections: CropSection[],
  ignoreSectionId?: string,
): CropSection | null {
  for (const sec of sections) {
    if (ignoreSectionId && sec.id === ignoreSectionId) continue;
    for (let j = 0; j < sec.points.length; j += 1) {
      const b1 = sec.points[j];
      const b2 = sec.points[(j + 1) % sec.points.length];
      if (segmentsProperlyIntersect(p1, p2, b1, b2)) return sec;
    }
  }
  return null;
}

export function describeSectionResolution(
  section: CropSection,
  plot: FarmPlot,
  lang: AppLanguage,
): { sharedWithPlot: boolean; sharedSectionNames: string[]; message: string } {
  const secSnap = section.snapshot;
  const plotSnap = plot.snapshot;
  const secSmapKey = secSnap?.spatialMeta?.smapPixelKey ?? null;
  const secPowerKey = secSnap?.spatialMeta?.powerCellKey ?? null;

  const sharedSiblings = plot.sections.filter((other) => {
    if (other.id === section.id || !other.snapshot?.spatialMeta) return false;
    const sameSmap =
      Boolean(secSmapKey) && other.snapshot.spatialMeta.smapPixelKey === secSmapKey;
    const samePower =
      Boolean(secPowerKey) && other.snapshot.spatialMeta.powerCellKey === secPowerKey;
    return sameSmap || samePower;
  });

  const sharedWithPlot = Boolean(
    plotSnap?.spatialMeta &&
      ((secSmapKey && plotSnap.spatialMeta.smapPixelKey === secSmapKey) ||
        (secPowerKey && plotSnap.spatialMeta.powerCellKey === secPowerKey)),
  );

  const sharedSectionNames = sharedSiblings.map((s) => s.name);

  if (lang === 'ar') {
    const scopeNote =
      sharedSectionNames.length > 0
        ? `يشترك هذا القسم مع (${sharedSectionNames.join('، ')}) في نفس خلية القمر الصناعي.`
        : sharedWithPlot
          ? 'يقع هذا القسم ضمن نفس خلية القياس الخاصة بحدود المزرعة الرئيسية.'
          : 'توجد قراءة مستقلة نسبياً لموقع هذا القسم.';
    return {
      sharedWithPlot,
      sharedSectionNames,
      message: `تنبيه دقة بيانات ناسا: تغطي قراءة NASA SMAP مساحة ~9 كم وتغطي NASA POWER خلية ~50 كم. ${scopeNote} لذلك تُعرض قياسات الأقمار الصناعية الفعلية كما هي، بينما تُخصّص التوصيات الزراعية لكل قسم حسب محصوله ومساحته.`,
    };
  }

  const scopeNote =
    sharedSectionNames.length > 0
      ? `This section falls inside the same satellite grid cell as ${sharedSectionNames.join(', ')}.`
      : sharedWithPlot
        ? 'This section shares the same satellite grid cell as your main farm boundary.'
        : 'This section sits in a distinct satellite grid pixel.';

  return {
    sharedWithPlot,
    sharedSectionNames,
    message: `NASA Resolution Note: SMAP L4 has ~9 km grid resolution and NASA POWER uses ~50 km cells. ${scopeNote} Satellite measurements are reported honestly without fabricating micro-differences, while agricultural advice is tailored specifically to ${section.crop} and this section's ${formatArea(section.areaSqMeters, 'en')}.`,
  };
}

export interface LatLngBoundsBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function getPolygonBoundsBox(points: LatLngPoint[]): LatLngBoundsBox {
  if (points.length === 0) {
    return { north: 26.156, south: 26.154, east: 50.506, west: 50.504 };
  }
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const p of points) {
    if (p.lat > north) north = p.lat;
    if (p.lat < south) south = p.lat;
    if (p.lon > east) east = p.lon;
    if (p.lon < west) west = p.lon;
  }
  return { north, south, east, west };
}

export function boundsBoxToPolygon(box: LatLngBoundsBox): LatLngPoint[] {
  const n = Math.round(box.north * 1_000_000) / 1_000_000;
  const s = Math.round(box.south * 1_000_000) / 1_000_000;
  const e = Math.round(box.east * 1_000_000) / 1_000_000;
  const w = Math.round(box.west * 1_000_000) / 1_000_000;
  return [
    { lat: n, lon: w }, // NW
    { lat: n, lon: e }, // NE
    { lat: s, lon: e }, // SE
    { lat: s, lon: w }, // SW
  ];
}

export function createRectangleAroundPoint(
  center: LatLngPoint,
  halfWidthMeters = 110,
  halfHeightMeters = 80,
): LatLngPoint[] {
  const metersPerDegLat = 111_320;
  const metersPerDegLon = 111_320 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180));
  const dLat = halfHeightMeters / metersPerDegLat;
  const dLon = halfWidthMeters / metersPerDegLon;
  return boundsBoxToPolygon({
    north: center.lat + dLat,
    south: center.lat - dLat,
    east: center.lon + dLon,
    west: center.lon - dLon,
  });
}

export function createInitialSectionInsidePlot(plot: FarmPlot): LatLngPoint[] {
  const box = getPolygonBoundsBox(plot.points);
  const latSpan = Math.max(0.0002, box.north - box.south);
  const lonSpan = Math.max(0.0002, box.east - box.west);
  const existingCount = plot.sections.length;
  // Place tidy sub-rectangles inside the main farm boundary depending on how many sections exist
  const cols = 2;
  const rows = Math.max(2, Math.ceil((existingCount + 1) / cols));
  const col = existingCount % cols;
  const row = Math.floor(existingCount / cols) % rows;

  const padLat = latSpan * 0.06;
  const padLon = lonSpan * 0.06;
  const cellH = (latSpan - padLat * (rows + 1)) / rows;
  const cellW = (lonSpan - padLon * (cols + 1)) / cols;

  const north = box.north - padLat - row * (cellH + padLat);
  const south = Math.max(box.south + padLat * 0.4, north - Math.max(cellH, latSpan * 0.16));
  const west = box.west + padLon + col * (cellW + padLon);
  const east = Math.min(box.east - padLon * 0.4, west + Math.max(cellW, lonSpan * 0.18));

  const candidate = boundsBoxToPolygon({ north, south, east, west });
  if (
    isPolygonInsidePolygon(candidate, plot.points) &&
    !plot.sections.some((sec) => polygonsOverlap(candidate, sec.points))
  ) {
    return candidate;
  }

  // Fallback compact square around centroid
  const fallback = createRectangleAroundPoint(
    plot.centroid,
    Math.max(15, Math.sqrt(plot.areaSqMeters) * 0.16),
    Math.max(15, Math.sqrt(plot.areaSqMeters) * 0.16),
  );
  return fallback;
}

export function translatePolygon(
  points: LatLngPoint[],
  dLat: number,
  dLon: number,
): LatLngPoint[] {
  return points.map((p) => ({
    lat: Math.round((p.lat + dLat) * 1_000_000) / 1_000_000,
    lon: Math.round((p.lon + dLon) * 1_000_000) / 1_000_000,
  }));
}

