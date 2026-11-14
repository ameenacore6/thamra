import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  BarChart3,
  Check,
  Compass,
  Droplets,
  Edit3,
  Layers,
  Leaf,
  Maximize2,
  Move,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Sun,
  Thermometer,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { SAMPLE_SCENARIOS } from '../../data/sampleScenarios';
import { fetchNasaFarmData, searchPlaceOnMap } from '../../services/nasaMapApi';
import { analyzeSectionWithTamra } from '../../services/tamraApi';
import type {
  AppLanguage,
  CropSection,
  FarmEnvironmentSnapshot,
  FarmPlot,
  GeocodeResult,
  LatLngPoint,
  MoistureCategory,
} from '../../types/farm';
import {
  boundsBoxToPolygon,
  computePolygonAreaSqMeters,
  computePolygonCentroid,
  createInitialSectionInsidePlot,
  createRectangleAroundPoint,
  CROP_PRESETS,
  describeSectionResolution,
  formatArea,
  getCropColor,
  getPolygonBoundsBox,
  isPolygonInsidePolygon,
  polygonsOverlap,
  translatePolygon,
} from '../../utils/farmGeometry';

interface FarmMapModuleProps {
  language: AppLanguage;
  snapshot: FarmEnvironmentSnapshot | null;
  loading: boolean;
  error: string | null;
  cropType: string;
  soilType: string;
  onCropTypeChange: (value: string) => void;
  onSoilTypeChange: (value: string) => void;
  onSelectCoordinates: (lat: number, lon: number, label?: string) => void;
  onRefreshLive: () => void;
  onSelectSampleScenario: (scenarioId: string) => void;
  plots: FarmPlot[];
  activePlotId: string | null;
  activeSectionId: string | null;
  lastSavedAt: string | null;
  onSelectPlot: (plotId: string | null) => void;
  onSelectSection: (sectionId: string | null) => void;
  onCreatePlot: (plot: FarmPlot) => void;
  onUpdatePlot: (plotId: string, updater: (plot: FarmPlot) => FarmPlot) => void;
  onDeletePlot: (plotId: string) => void;
  onSaveNow: () => void;
  onAskTamra: (sectionId?: string | null) => void;
  onOpenAnalysis: (sectionId?: string | null) => void;
  onOpenRotation: (sectionId?: string | null) => void;
}

type BaseMapStyle = 'satellite' | 'street';
type NasaOverlayLayer = 'none' | 'smap_surface' | 'power_temp' | 'power_rain' | 'power_solar';
type DrawMode = 'none' | 'place_plot' | 'place_section' | 'edit_plot' | 'edit_section';

const BAHRAIN_CENTER = { lat: 26.155, lon: 50.505, name: "Buri & A'ali Farms, Bahrain" };

const BAHRAIN_FARM_REGIONS = [
  { nameEn: "Buri & A'ali", nameAr: 'بوري وعالي', lat: 26.155, lon: 50.505 },
  { nameEn: 'Budaiya Farms', nameAr: 'مزارع البديع', lat: 26.215, lon: 50.453 },
  { nameEn: 'Hamala & Janabiyah', nameAr: 'الهملة والجنبية', lat: 26.168, lon: 50.458 },
  { nameEn: 'Zallaq & Sakhir', nameAr: 'الزلاق والصخير', lat: 26.046, lon: 50.495 },
  { nameEn: 'Muharraq / Galali', nameAr: 'المحرق / قلالي', lat: 26.271, lon: 50.642 },
  { nameEn: 'Riffa', nameAr: 'الرفاع', lat: 26.115, lon: 50.555 },
];

function getDefaultGibsDate(): string {
  const d = new Date(Date.now() - 4 * 86400_000);
  return d.toISOString().slice(0, 10);
}

function getMoistureBadge(status: MoistureCategory, isAr: boolean): { label: string; color: string } {
  switch (status) {
    case 'very_dry':
      return { label: isAr ? 'جافة جداً' : 'Very Dry', color: 'text-[#8E7D49]' };
    case 'dry':
      return { label: isAr ? 'جافة' : 'Dry', color: 'text-[#8E7D49]' };
    case 'optimal':
      return { label: isAr ? 'مثالية' : 'Optimal', color: 'text-[#535C21]' };
    case 'moist':
      return { label: isAr ? 'رطبة' : 'Moist', color: 'text-[#1C250C]' };
    case 'saturated':
      return { label: isAr ? 'مشبعة' : 'Saturated', color: 'text-[#1C250C]' };
    default:
      return { label: isAr ? 'غير متوفر' : 'Unavailable', color: 'text-[#AD927E]' };
  }
}

export const FarmMapModule: React.FC<FarmMapModuleProps> = ({
  language,
  snapshot,
  loading,
  error,
  soilType,
  onSoilTypeChange,
  onSelectCoordinates,
  onRefreshLive,
  onSelectSampleScenario,
  plots,
  activePlotId,
  activeSectionId,
  lastSavedAt,
  onSelectPlot,
  onSelectSection,
  onCreatePlot,
  onUpdatePlot,
  onDeletePlot,
  onSaveNow,
  onAskTamra,
  onOpenAnalysis,
  onOpenRotation,
}) => {
  const isAr = language === 'ar';

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const nasaLayerRef = useRef<L.TileLayer | null>(null);
  const envGridLayerRef = useRef<L.LayerGroup | null>(null);
  const vectorLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const pointMarkerRef = useRef<L.CircleMarker | null>(null);

  const [baseStyle, setBaseStyle] = useState<BaseMapStyle>('satellite');
  const [nasaOverlay, setNasaOverlay] = useState<NasaOverlayLayer>('none');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);

  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [draftRect, setDraftRect] = useState<LatLngPoint[]>([]);
  const [drawError, setDrawError] = useState<string | null>(null);

  const [newPlotName, setNewPlotName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionCrop, setNewSectionCrop] = useState('Tomatoes');
  const [cropSearchFilter, setCropSearchFilter] = useState('');
  const [customSectionCrop, setCustomSectionCrop] = useState('');
  const [newSectionPlantingDate, setNewSectionPlantingDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const [renamingPlotId, setRenamingPlotId] = useState<string | null>(null);
  const [renamePlotText, setRenamePlotText] = useState('');
  const [analyzingSectionId, setAnalyzingSectionId] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const activePlot = useMemo(
    () => plots.find((p) => p.id === activePlotId) ?? null,
    [plots, activePlotId],
  );
  const activeSection = useMemo(
    () => activePlot?.sections.find((s) => s.id === activeSectionId) ?? null,
    [activePlot, activeSectionId],
  );

  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;
  const activePlotRef = useRef(activePlot);
  activePlotRef.current = activePlot;
  const onSelectCoordsRef = useRef(onSelectCoordinates);
  onSelectCoordsRef.current = onSelectCoordinates;

  const activeLat =
    activeSection?.centroid.lat ??
    activePlot?.centroid.lat ??
    snapshot?.location.latitude ??
    BAHRAIN_CENTER.lat;
  const activeLon =
    activeSection?.centroid.lon ??
    activePlot?.centroid.lon ??
    snapshot?.location.longitude ??
    BAHRAIN_CENTER.lon;

  const resolvedNewCrop = () =>
    newSectionCrop === '__custom__'
      ? customSectionCrop.trim() || 'Custom Crop'
      : newSectionCrop;

  const filteredCropPresets = useMemo(() => {
    const q = cropSearchFilter.trim().toLowerCase();
    if (!q) return CROP_PRESETS;
    return CROP_PRESETS.filter(
      (c) => c.nameEn.toLowerCase().includes(q) || c.nameAr.includes(q),
    );
  }, [cropSearchFilter]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [activeLat, activeLon],
      zoom: activePlot ? 16 : 12,
      zoomControl: false,
    });

    envGridLayerRef.current = L.layerGroup().addTo(map);
    vectorLayerGroupRef.current = L.layerGroup().addTo(map);
    drawLayerGroupRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const mode = drawModeRef.current;
      const pt: LatLngPoint = {
        lat: Math.round(e.latlng.lat * 1_000_000) / 1_000_000,
        lon: Math.round(e.latlng.lng * 1_000_000) / 1_000_000,
      };

      if (mode === 'place_plot') {
        setDrawError(null);
        setDraftRect(createRectangleAroundPoint(pt, 95, 70));
        return;
      }

      if (mode === 'none') {
        onSelectCoordsRef.current(
          Math.round(pt.lat * 10000) / 10000,
          Math.round(pt.lon * 10000) / 10000,
        );
      }
    });

    mapRef.current = map;

    if (activePlot && activePlot.points.length >= 3) {
      const bounds = L.latLngBounds(activePlot.points.map((p) => [p.lat, p.lon] as [number, number]));
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 18 });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      nasaLayerRef.current = null;
      envGridLayerRef.current = null;
      vectorLayerGroupRef.current = null;
      drawLayerGroupRef.current = null;
      pointMarkerRef.current = null;
    };
  }, []);

  // Base tile layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }

    const tileUrl =
      baseStyle === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png';
    const attribution =
      baseStyle === 'satellite' ? 'Imagery © Esri' : '© OpenStreetMap contributors';

    const layer = L.tileLayer(tileUrl, { attribution, maxZoom: 19 });
    layer.addTo(map);
    layer.bringToBack();
    baseLayerRef.current = layer;
  }, [baseStyle]);

  // Selectable NASA Environmental Overlay Layer (SMAP GIBS WMTS + POWER regional cell visualizer)
  useEffect(() => {
    const map = mapRef.current;
    const envGroup = envGridLayerRef.current;
    if (!map || !envGroup) return;

    if (nasaLayerRef.current) {
      map.removeLayer(nasaLayerRef.current);
      nasaLayerRef.current = null;
    }
    envGroup.clearLayers();

    if (nasaOverlay === 'none') return;

    if (nasaOverlay === 'smap_surface') {
      const gibsDate =
        snapshot && !snapshot.isSampleData && snapshot.smap.observationDate
          ? snapshot.smap.observationDate
          : getDefaultGibsDate();

      const gibsUrl = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Analyzed_Surface_Soil_Moisture/default/${gibsDate}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
      const overlay = L.tileLayer(gibsUrl, {
        attribution: 'NASA GIBS SMAP L4 (~9 km)',
        maxNativeZoom: 6,
        maxZoom: 19,
        opacity: 0.55,
        tileSize: 256,
      });
      overlay.addTo(map);
      nasaLayerRef.current = overlay;
      return;
    }

    // For NASA POWER regional ~50 km parameters (Temperature, Precipitation, Solar Radiation)
    // Display the actual regional grid cell boundary + real retrieved value around the active coordinate
    const centerLat = activeLat;
    const centerLon = activeLon;
    const halfSpan = 0.22; // ~24km radius representing ~50km POWER cell footprint
    let color = '#C85A32';
    let valueLabel = '';

    if (nasaOverlay === 'power_temp') {
      const t = snapshot?.power.latest?.t2m;
      color = t !== null && t !== undefined && t >= 34 ? '#C85A32' : '#D4A82A';
      valueLabel = `NASA POWER Temp (~50 km cell): ${t !== null && t !== undefined ? `${t}°C` : 'N/A'}`;
    } else if (nasaOverlay === 'power_rain') {
      const r = snapshot?.power.sevenDayRainMm ?? 0;
      color = r > 5 ? '#3E7A72' : '#4A6FA5';
      valueLabel = `NASA POWER 7d Rain (~50 km cell): ${r} mm`;
    } else if (nasaOverlay === 'power_solar') {
      const s = snapshot?.power.latestSolarMj;
      color = '#D4A82A';
      valueLabel = `NASA POWER Solar (~50 km cell): ${s !== null && s !== undefined ? `${s} MJ/m²/d` : 'N/A'}`;
    }

    const cellRect = L.rectangle(
      [
        [centerLat - halfSpan, centerLon - halfSpan],
        [centerLat + halfSpan, centerLon + halfSpan],
      ],
      {
        color,
        weight: 2,
        dashArray: '8 6',
        fillColor: color,
        fillOpacity: 0.12,
        interactive: false,
      },
    ).addTo(envGroup);
    cellRect.bindTooltip(valueLabel, { sticky: false });
  }, [nasaOverlay, snapshot, activeLat, activeLon]);

  const fitPoints = (points: LatLngPoint[], maxZoom = 18) => {
    const map = mapRef.current;
    if (!map || points.length < 2) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [44, 44], maxZoom, animate: true });
  };

  useEffect(() => {
    if (drawMode !== 'none') return;
    if (activeSection && activeSection.points.length >= 3) {
      fitPoints(activeSection.points, 18);
    } else if (activePlot && activePlot.points.length >= 3) {
      fitPoints(activePlot.points, 18);
    }
  }, [activePlotId, activeSectionId]);

  // Render saved farm plots & crop sections
  useEffect(() => {
    const map = mapRef.current;
    const vectorGroup = vectorLayerGroupRef.current;
    if (!map || !vectorGroup) return;

    vectorGroup.clearLayers();
    if (pointMarkerRef.current) {
      map.removeLayer(pointMarkerRef.current);
      pointMarkerRef.current = null;
    }

    if (plots.length === 0 && snapshot) {
      pointMarkerRef.current = L.circleMarker(
        [snapshot.location.latitude, snapshot.location.longitude],
        {
          radius: 8,
          color: '#ffffff',
          weight: 2.5,
          fillColor: snapshot.isSampleData ? '#DBAE83' : '#535C21',
          fillOpacity: 0.95,
        },
      ).addTo(map);
      pointMarkerRef.current.bindTooltip(snapshot.location.name, { direction: 'top', offset: [0, -8] });
    }

    for (const plot of plots) {
      const isPlotActive = plot.id === activePlotId;
      const latlngs = plot.points.map((p) => [p.lat, p.lon] as [number, number]);

      const plotPoly = L.polygon(latlngs, {
        color: isPlotActive ? '#DBAE83' : '#AD927E',
        weight: isPlotActive ? 3 : 2,
        dashArray: isPlotActive ? undefined : '6 4',
        fillColor: isPlotActive ? '#DBAE83' : '#AD927E',
        fillOpacity: isPlotActive ? 0.16 : 0.08,
      }).addTo(vectorGroup);

      plotPoly.bindTooltip(`${plot.name} (${formatArea(plot.areaSqMeters, language)})`, {
        sticky: true,
      });

      plotPoly.on('click', (e) => {
        if (drawModeRef.current !== 'none') return;
        L.DomEvent.stopPropagation(e);
        onSelectPlot(plot.id);
        onSelectSection(null);
      });

      for (const sec of plot.sections) {
        const isSecActive = isPlotActive && sec.id === activeSectionId;
        const secLatLngs = sec.points.map((p) => [p.lat, p.lon] as [number, number]);

        const secPoly = L.polygon(secLatLngs, {
          color: isSecActive ? '#FFFFFF' : sec.color,
          weight: isSecActive ? 3 : 2,
          fillColor: sec.color,
          fillOpacity: isSecActive ? 0.6 : 0.38,
        }).addTo(vectorGroup);

        secPoly.bindTooltip(
          `${sec.name} · ${sec.crop} (${formatArea(sec.areaSqMeters, language)})`,
          { sticky: true },
        );

        secPoly.on('click', (e) => {
          if (drawModeRef.current !== 'none') return;
          L.DomEvent.stopPropagation(e);
          onSelectPlot(plot.id);
          onSelectSection(sec.id);
        });
      }
    }
  }, [plots, activePlotId, activeSectionId, snapshot, language]);

  // Helper to validate a candidate section rectangle against parent farm & sibling sections
  const validateSectionRect = (
    candidate: LatLngPoint[],
    plot: FarmPlot,
    ignoreSectionId?: string,
  ): string | null => {
    if (!isPolygonInsidePolygon(candidate, plot.points)) {
      return isAr
        ? 'يجب أن يظل القسم بالكامل داخل حدود المزرعة الرئيسية.'
        : 'Keep the crop section rectangle completely inside your main farm boundary.';
    }
    const overlap = plot.sections.find(
      (s) => s.id !== ignoreSectionId && polygonsOverlap(candidate, s.points),
    );
    if (overlap) {
      return isAr
        ? `يتداخل هذا المستطيل مع قسم "${overlap.name}". حرّكه أو صغّر حجمه.`
        : `Overlaps with "${overlap.name}". Drag or resize to avoid overlap.`;
    }
    return null;
  };

  // Render interactive Rectangle Resize (4 corners) + Drag-Move (center handle) on Leaflet
  useEffect(() => {
    const drawGroup = drawLayerGroupRef.current;
    if (!drawGroup) return;
    drawGroup.clearLayers();

    const attachRectangleControls = (
      currentPts: LatLngPoint[],
      color: string,
      onChangePts: (nextPts: LatLngPoint[]) => void,
    ) => {
      if (currentPts.length < 4) return;
      const box = getPolygonBoundsBox(currentPts);

      L.polygon(
        currentPts.map((p) => [p.lat, p.lon] as [number, number]),
        {
          color,
          weight: 2.5,
          dashArray: '5 4',
          fillColor: color,
          fillOpacity: 0.25,
        },
      ).addTo(drawGroup);

      // 4 Corner Resize Handles (NW=0, NE=1, SE=2, SW=3)
      const corners: Array<{ lat: number; lon: number; role: 'nw' | 'ne' | 'se' | 'sw' }> = [
        { lat: box.north, lon: box.west, role: 'nw' },
        { lat: box.north, lon: box.east, role: 'ne' },
        { lat: box.south, lon: box.east, role: 'se' },
        { lat: box.south, lon: box.west, role: 'sw' },
      ];

      corners.forEach((corner) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;border-radius:4px;background:#FFFFFF;border:2.5px solid #1C250C;box-shadow:0 1px 4px rgba(0,0,0,0.45);cursor:nwse-resize;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const handle = L.marker([corner.lat, corner.lon], { icon, draggable: true }).addTo(drawGroup);
        handle.bindTooltip(isAr ? 'اسحب لتغيير الحجم' : 'Drag corner to resize');

        handle.on('dragend', () => {
          const ll = handle.getLatLng();
          const minGap = 0.00008;
          let { north, south, east, west } = box;
          if (corner.role === 'nw') {
            north = Math.max(south + minGap, ll.lat);
            west = Math.min(east - minGap, ll.lng);
          } else if (corner.role === 'ne') {
            north = Math.max(south + minGap, ll.lat);
            east = Math.max(west + minGap, ll.lng);
          } else if (corner.role === 'se') {
            south = Math.min(north - minGap, ll.lat);
            east = Math.max(west + minGap, ll.lng);
          } else if (corner.role === 'sw') {
            south = Math.min(north - minGap, ll.lat);
            west = Math.min(east - minGap, ll.lng);
          }
          onChangePts(boundsBoxToPolygon({ north, south, east, west }));
        });
      });

      // Center Move Handle
      const center = computePolygonCentroid(currentPts);
      const moveIcon = L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:9999px;background:#1C250C;color:#DBAE83;border:2px solid #FFFFFF;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.4);cursor:move;">✥</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const moveHandle = L.marker([center.lat, center.lon], {
        icon: moveIcon,
        draggable: true,
      }).addTo(drawGroup);
      moveHandle.bindTooltip(isAr ? 'اسحب لنقل المربع' : 'Drag center to move rectangle');

      moveHandle.on('dragend', () => {
        const ll = moveHandle.getLatLng();
        const dLat = ll.lat - center.lat;
        const dLon = ll.lng - center.lon;
        onChangePts(translatePolygon(currentPts, dLat, dLon));
      });
    };

    if (drawMode === 'place_plot' && draftRect.length >= 4) {
      attachRectangleControls(draftRect, '#DBAE83', (next) => {
        setDrawError(null);
        setDraftRect(next);
      });
    } else if (drawMode === 'place_section' && draftRect.length >= 4 && activePlot) {
      attachRectangleControls(draftRect, getCropColor(resolvedNewCrop(), 0), (next) => {
        const err = validateSectionRect(next, activePlot);
        if (err) {
          setDrawError(err);
          // Re-render at last valid rect
          setDraftRect([...draftRect]);
          return;
        }
        setDrawError(null);
        setDraftRect(next);
      });
    } else if (drawMode === 'edit_plot' && activePlot) {
      attachRectangleControls(activePlot.points, '#DBAE83', (next) => {
        const allSecsInside = activePlot.sections.every((s) =>
          isPolygonInsidePolygon(s.points, next),
        );
        if (!allSecsInside) {
          setDrawError(
            isAr
              ? 'لا يمكن تصغير المزرعة بحيث يخرج أحد الأقسام المزروعة عن حدودها.'
              : 'Cannot shrink farm boundary outside an existing crop section.',
          );
          return;
        }
        setDrawError(null);
        onUpdatePlot(activePlot.id, (prev) => ({
          ...prev,
          points: next,
          areaSqMeters: computePolygonAreaSqMeters(next),
          centroid: computePolygonCentroid(next),
          updatedAt: new Date().toISOString(),
        }));
      });
    } else if (drawMode === 'edit_section' && activePlot && activeSection) {
      attachRectangleControls(activeSection.points, activeSection.color, (next) => {
        const err = validateSectionRect(next, activePlot, activeSection.id);
        if (err) {
          setDrawError(err);
          return;
        }
        setDrawError(null);
        onUpdatePlot(activePlot.id, (prev) => ({
          ...prev,
          updatedAt: new Date().toISOString(),
          sections: prev.sections.map((s) =>
            s.id === activeSection.id
              ? {
                  ...s,
                  points: next,
                  areaSqMeters: computePolygonAreaSqMeters(next),
                  centroid: computePolygonCentroid(next),
                  updatedAt: new Date().toISOString(),
                }
              : s,
          ),
        }));
      });
    }
  }, [drawMode, draftRect, activePlot, activeSection, newSectionCrop, customSectionCrop, isAr]);

  const startPlaceFarmRectangle = () => {
    const map = mapRef.current;
    const center = map
      ? {
          lat: Math.round(map.getCenter().lat * 1_000_000) / 1_000_000,
          lon: Math.round(map.getCenter().lng * 1_000_000) / 1_000_000,
        }
      : { lat: activeLat, lon: activeLon };

    setDrawError(null);
    setNewPlotName(isAr ? `مزرعة ${plots.length + 1}` : `My Farm ${plots.length + 1}`);
    setDraftRect(createRectangleAroundPoint(center, 95, 70));
    setDrawMode('place_plot');
    if (map && map.getZoom() < 15) {
      map.setView([center.lat, center.lon], 16, { animate: true });
    }
  };

  const startPlaceSectionRectangle = () => {
    if (!activePlot) return;
    setDrawError(null);
    setNewSectionName(
      isAr ? `قسم ${activePlot.sections.length + 1}` : `Section ${String.fromCharCode(65 + activePlot.sections.length)}`,
    );
    const rect = createInitialSectionInsidePlot(activePlot);
    setDraftRect(rect);
    setDrawMode('place_section');
    fitPoints(activePlot.points, 18);
  };

  const saveDraftPlot = async () => {
    if (draftRect.length < 4) return;
    const centroid = computePolygonCentroid(draftRect);
    const areaSqMeters = computePolygonAreaSqMeters(draftRect);
    const label =
      newPlotName.trim() || (isAr ? `مزرعة ${plots.length + 1}` : `My Farm ${plots.length + 1}`);

    setDrawMode('none');
    setDraftRect([]);
    setDrawError(null);

    let plotSnap = snapshot;
    try {
      plotSnap = await fetchNasaFarmData({
        latitude: centroid.lat,
        longitude: centroid.lon,
        name: label,
      });
    } catch {
      // Fallback to current snapshot if offline
    }

    const now = new Date().toISOString();
    const plot: FarmPlot = {
      id: `plot-${Date.now()}`,
      name: label,
      points: draftRect,
      areaSqMeters,
      centroid,
      soilType,
      snapshot: plotSnap,
      sections: [],
      createdAt: now,
      updatedAt: now,
    };

    onCreatePlot(plot);
    fitPoints(draftRect, 17);
  };

  const saveDraftSection = async () => {
    if (!activePlot || draftRect.length < 4) return;
    const err = validateSectionRect(draftRect, activePlot);
    if (err) {
      setDrawError(err);
      return;
    }

    const crop = resolvedNewCrop();
    const label =
      newSectionName.trim() ||
      (isAr ? `قسم ${activePlot.sections.length + 1}` : `Section ${String.fromCharCode(65 + activePlot.sections.length)}`);
    const centroid = computePolygonCentroid(draftRect);
    const areaSqMeters = computePolygonAreaSqMeters(draftRect);
    const color = getCropColor(crop, activePlot.sections.length);

    setDrawMode('none');
    setDraftRect([]);
    setDrawError(null);

    let secSnap = activePlot.snapshot ?? snapshot;
    try {
      secSnap = await fetchNasaFarmData({
        latitude: centroid.lat,
        longitude: centroid.lon,
        name: `${activePlot.name} — ${label}`,
      });
    } catch {
      // Keep parent plot snapshot if transient error
    }

    const now = new Date().toISOString();
    const newSec: CropSection = {
      id: `sec-${Date.now()}`,
      plotId: activePlot.id,
      name: label,
      crop,
      color,
      points: draftRect,
      areaSqMeters,
      centroid,
      snapshot: secSnap,
      plantingDate: newSectionPlantingDate,
      growingStage: crop.toLowerCase().includes('unused') ? 'preparing' : 'planted',
      cropHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    onUpdatePlot(activePlot.id, (prev) => ({
      ...prev,
      updatedAt: now,
      sections: [...prev.sections, newSec],
    }));
    onSelectSection(newSec.id);
  };

  const runSectionAnalysis = async (plot: FarmPlot, section: CropSection) => {
    setAnalyzingSectionId(section.id);
    setSectionError(null);
    try {
      const freshSnap =
        section.snapshot ??
        (await fetchNasaFarmData({
          latitude: section.centroid.lat,
          longitude: section.centroid.lon,
          name: `${plot.name} — ${section.name}`,
        }));
      const resInfo = describeSectionResolution({ ...section, snapshot: freshSnap }, plot, language);
      const analysis = await analyzeSectionWithTamra({
        language,
        plotName: plot.name,
        plotAreaSqMeters: plot.areaSqMeters,
        soilType: plot.soilType || soilType,
        sectionName: section.name,
        crop: section.crop,
        sectionAreaSqMeters: section.areaSqMeters,
        snapshot: freshSnap,
        resolutionContext: resInfo.message,
      });

      onUpdatePlot(plot.id, (prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === section.id ? { ...s, snapshot: freshSnap, analysis } : s,
        ),
      }));
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : 'Unable to analyze section.');
    } finally {
      setAnalyzingSectionId(null);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchPlaceOnMap(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError(isAr ? 'لم يتم العثور على نتائج لهذا البحث.' : 'No locations matched your search.');
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Location search failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (item: GeocodeResult) => {
    setSearchResults([]);
    setSearchQuery(item.name);
    mapRef.current?.setView([item.latitude, item.longitude], 16, { animate: true });
    onSelectCoordinates(item.latitude, item.longitude, item.name);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        mapRef.current?.setView([lat, lon], 16, { animate: true });
        onSelectCoordinates(lat, lon, isAr ? 'موقعي الحالي' : 'My Current Farm');
      },
      () => {
        setGeoBusy(false);
        setSearchError(isAr ? 'تعذر تحديد موقعك عبر المتصفح.' : 'Unable to read GPS location.');
      },
      { timeout: 8000 },
    );
  };

  const moistureBadge = snapshot
    ? getMoistureBadge(snapshot.smap.status, isAr)
    : { label: '—', color: 'text-[#8E7D49]' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Interactive Satellite Map + Rectangle Controls + NASA Layers */}
      <div className="lg:col-span-8 space-y-3">
        {/* Location Search & Bahrain Regions */}
        <div className="bg-white border border-[#D5D5D5] rounded-2xl p-3.5 space-y-2.5">
          <form onSubmit={(e) => void handleSearch(e)} className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#8E7D49] absolute top-2.5 start-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'ابحث عن مزرعتك أو منطقة في البحرين...' : 'Search farm address or Bahrain region...'}
                className="w-full ps-9 pe-3 py-2 text-xs bg-[#faf8f4] border border-[#D5D5D5] rounded-xl"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 rounded-xl bg-[#535C21] text-white text-xs font-semibold cursor-pointer"
            >
              {searching ? (isAr ? 'بحث...' : 'Searching...') : isAr ? 'بحث' : 'Search'}
            </button>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={geoBusy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#faf8f4] border border-[#D5D5D5] text-xs font-semibold text-[#1C250C] cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#535C21]" />
              <span>{geoBusy ? '...' : isAr ? 'موقعي' : 'GPS'}</span>
            </button>
          </form>

          {searchError && <p className="text-xs text-[#8E7D49]">{searchError}</p>}

          {searchResults.length > 0 && (
            <div className="rounded-xl border border-[#D5D5D5] bg-[#faf8f4] divide-y divide-[#D5D5D5]">
              {searchResults.map((r, i) => (
                <button
                  key={`${r.latitude}-${r.longitude}-${i}`}
                  type="button"
                  onClick={() => handleSelectSearchResult(r)}
                  className="w-full text-start px-3 py-2 text-xs hover:bg-[#DBAE83]/20 cursor-pointer"
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          {/* Bahrain Quick Regions + Sample Scenarios */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-[#8E7D49] font-semibold">
              {isAr ? 'مناطق البحرين:' : 'Bahrain:'}
            </span>
            {BAHRAIN_FARM_REGIONS.map((reg) => (
              <button
                key={reg.nameEn}
                type="button"
                onClick={() => {
                  mapRef.current?.setView([reg.lat, reg.lon], 15, { animate: true });
                  onSelectCoordinates(reg.lat, reg.lon, isAr ? reg.nameAr : reg.nameEn);
                }}
                className="px-2 py-1 rounded-lg bg-[#f3f2ee] hover:bg-[#DBAE83]/30 text-[#1C250C] font-medium cursor-pointer"
              >
                {isAr ? reg.nameAr : reg.nameEn}
              </button>
            ))}

            <select
              defaultValue=""
              aria-label={isAr ? 'سيناريو تجريبي' : 'Load test scenario'}
              onChange={(e) => {
                if (e.target.value) {
                  onSelectSampleScenario(e.target.value);
                  const found = SAMPLE_SCENARIOS.find((s) => s.id === e.target.value);
                  if (found) {
                    mapRef.current?.setView(
                      [found.snapshot.location.latitude, found.snapshot.location.longitude],
                      15,
                    );
                  }
                  e.target.value = '';
                }
              }}
              className="ms-auto px-2 py-1 rounded-lg bg-[#faf8f4] border border-[#D5D5D5] text-[#535C21] font-medium"
            >
              <option value="">{isAr ? 'سيناريو اختبار...' : 'Sample Scenarios...'}</option>
              {SAMPLE_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {isAr ? s.titleAr : s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Map Canvas + Floating Controls */}
        <div className="relative bg-white border border-[#D5D5D5] rounded-2xl overflow-hidden shadow-sm">
          {/* Toolbar above map */}
          <div className="px-3.5 py-2.5 bg-[#faf8f4] border-b border-[#D5D5D5] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {drawMode === 'none' ? (
                <>
                  <button
                    type="button"
                    onClick={startPlaceFarmRectangle}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C250C] text-[#DBAE83] font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? 'وضع مستطيل المزرعة' : 'Mark Farm Rectangle'}</span>
                  </button>

                  {activePlot && (
                    <button
                      type="button"
                      onClick={startPlaceSectionRectangle}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#535C21] text-white font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إضافة قسم محصول' : 'Add Crop Section'}</span>
                    </button>
                  )}

                  {activePlot && (
                    <button
                      type="button"
                      onClick={() => setDrawMode('edit_plot')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#D5D5D5] text-[#1C250C] font-medium cursor-pointer"
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تعديل حدود المزرعة' : 'Resize Farm'}</span>
                    </button>
                  )}

                  {activeSection && (
                    <button
                      type="button"
                      onClick={() => setDrawMode('edit_section')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#D5D5D5] text-[#1C250C] font-medium cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تعديل القسم' : 'Resize Section'}</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#535C21]">
                    {drawMode === 'place_plot' || drawMode === 'edit_plot'
                      ? isAr
                        ? 'اسحب الزوايا لتغيير الحجم والمركز لنقل المربع'
                        : 'Drag white corners to resize · Drag center to move farm box'
                      : isAr
                        ? 'اسحب الزوايا والمركز داخل حدود المزرعة'
                        : 'Drag corners/center inside main farm boundary'}
                  </span>
                  {(drawMode === 'edit_plot' || drawMode === 'edit_section') && (
                    <button
                      type="button"
                      onClick={() => {
                        setDrawMode('none');
                        setDrawError(null);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#535C21] text-white font-semibold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إنهاء التعديل' : 'Done Resizing'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBaseStyle((s) => (s === 'satellite' ? 'street' : 'satellite'))}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#D5D5D5] text-[#1C250C] font-medium cursor-pointer"
              >
                {baseStyle === 'satellite' ? (isAr ? 'خريطة شوارع' : 'Street Map') : isAr ? 'قمر صناعي' : 'Satellite'}
              </button>

              <div className="inline-flex items-center gap-1 bg-white border border-[#D5D5D5] rounded-lg px-2 py-1">
                <Layers className="w-3.5 h-3.5 text-[#535C21]" />
                <select
                  aria-label={isAr ? 'طبقة بيانات ناسا' : 'NASA Environmental Map Layer'}
                  value={nasaOverlay}
                  onChange={(e) => setNasaOverlay(e.target.value as NasaOverlayLayer)}
                  className="bg-transparent text-xs font-medium text-[#1C250C] focus:outline-none cursor-pointer"
                >
                  <option value="none">{isAr ? 'بدون طبقة ناسا' : 'Layer: None'}</option>
                  <option value="smap_surface">{isAr ? 'رطوبة التربة SMAP' : 'Layer: Soil Moisture (SMAP)'}</option>
                  <option value="power_temp">{isAr ? 'الحرارة (POWER)' : 'Layer: Temperature (POWER)'}</option>
                  <option value="power_rain">{isAr ? 'الأمطار (POWER)' : 'Layer: Precipitation (POWER)'}</option>
                  <option value="power_solar">{isAr ? 'الإشعاع الشمسي (POWER)' : 'Layer: Solar Radiation'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rectangle Draft Confirmation Form */}
          {(drawMode === 'place_plot' || drawMode === 'place_section') && (
            <div className="px-3.5 py-3 bg-[#f3f2ee] border-b border-[#D5D5D5] space-y-2.5 text-xs">
              {drawError && (
                <p className="text-[#8E7D49] font-semibold bg-white rounded-lg px-3 py-1.5 border border-[#AD927E]">
                  {drawError}
                </p>
              )}

              {drawMode === 'place_plot' ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[160px]">
                    <label className="block font-semibold text-[#1C250C] mb-1">
                      {isAr ? 'اسم المزرعة' : 'Farm Name'}
                    </label>
                    <input
                      value={newPlotName}
                      onChange={(e) => setNewPlotName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                    />
                  </div>
                  <div className="text-[#535C21] font-mono-tabular py-1.5">
                    {formatArea(computePolygonAreaSqMeters(draftRect), language)}
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveDraftPlot()}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#535C21] text-white font-semibold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAr ? 'حفظ المزرعة' : 'Save Farm'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawMode('none');
                      setDraftRect([]);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#D5D5D5] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
                  <div>
                    <label className="block font-semibold text-[#1C250C] mb-1">
                      {isAr ? 'اسم القسم' : 'Section Name'}
                    </label>
                    <input
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1C250C] mb-1">
                      {isAr ? 'بحث / اختر المحصول' : 'Crop'}
                    </label>
                    <input
                      value={cropSearchFilter}
                      onChange={(e) => setCropSearchFilter(e.target.value)}
                      placeholder={isAr ? 'تصفية المحاصيل...' : 'Filter crop...'}
                      className="w-full px-2 py-1 mb-1 bg-white border border-[#D5D5D5] rounded text-[11px]"
                    />
                    <select
                      value={newSectionCrop}
                      onChange={(e) => setNewSectionCrop(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                    >
                      {filteredCropPresets.map((c) => (
                        <option key={c.id} value={c.nameEn}>
                          {isAr ? c.nameAr : c.nameEn}
                        </option>
                      ))}
                      <option value="__custom__">{isAr ? 'محصول مخصص...' : 'Custom Crop...'}</option>
                    </select>
                  </div>
                  {newSectionCrop === '__custom__' ? (
                    <div>
                      <label className="block font-semibold text-[#1C250C] mb-1">
                        {isAr ? 'اسم المحصول المخصص' : 'Custom Crop Name'}
                      </label>
                      <input
                        value={customSectionCrop}
                        onChange={(e) => setCustomSectionCrop(e.target.value)}
                        placeholder={isAr ? 'مثال: باذنجان' : 'e.g. Eggplant'}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold text-[#1C250C] mb-1">
                        {isAr ? 'تاريخ الزراعة' : 'Planting Date'}
                      </label>
                      <input
                        type="date"
                        value={newSectionPlantingDate}
                        onChange={(e) => setNewSectionPlantingDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-[#D5D5D5] rounded-lg"
                      />
                    </div>
                  )}
                  <div className="text-[#535C21] font-mono-tabular py-1.5">
                    {formatArea(computePolygonAreaSqMeters(draftRect), language)}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => void saveDraftSection()}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#535C21] text-white font-semibold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حفظ' : 'Save'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawMode('none');
                        setDraftRect([]);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D5D5D5] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leaflet Map Container */}
          <div className="relative h-[430px] sm:h-[500px] w-full">
            <div ref={mapContainerRef} className="h-full w-full" />

            {/* Zoom + Fit Controls */}
            <div className="absolute top-3 end-3 z-20 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn()}
                aria-label="Zoom in"
                className="w-9 h-9 rounded-xl bg-white/95 border border-[#D5D5D5] shadow flex items-center justify-center text-[#1C250C] hover:bg-[#DBAE83]/30 cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut()}
                aria-label="Zoom out"
                className="w-9 h-9 rounded-xl bg-white/95 border border-[#D5D5D5] shadow flex items-center justify-center text-[#1C250C] hover:bg-[#DBAE83]/30 cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              {activePlot && (
                <button
                  type="button"
                  onClick={() => fitPoints(activePlot.points, 17)}
                  aria-label="Fit farm boundary"
                  className="w-9 h-9 rounded-xl bg-white/95 border border-[#D5D5D5] shadow flex items-center justify-center text-[#1C250C] hover:bg-[#DBAE83]/30 cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Layer Legend & Spatial Resolution Bar */}
          <div className="px-3.5 py-2.5 bg-[#faf8f4] border-t border-[#D5D5D5] text-[11px] flex flex-wrap items-center justify-between gap-2 text-[#535C21]">
            <div>
              {nasaOverlay === 'none'
                ? isAr
                  ? 'انقر على أي مكان بالخريطة لجلب بيانات ناسا، أو استخدم "وضع مستطيل المزرعة".'
                  : 'Click anywhere on the map to read live NASA data, or use Mark Farm Rectangle.'
                : nasaOverlay === 'smap_surface'
                  ? isAr
                    ? 'طبقة NASA SMAP L4: الأزرق/الأخضر الداكن = رطوبة أعلى · الأصفر/البني = تربة أكثر جفافاً (دقة ~9 كم).'
                    : 'NASA SMAP L4 Legend: Deep blue/green = wetter soil · Tan/yellow = drier soil (~9 km grid resolution).'
                  : isAr
                    ? 'طبقة NASA POWER الإقليمية (~50 كم): الإطار يوضح مساحة الخلية التي تغطي مزرعتك.'
                    : 'NASA POWER Regional Cell (~50 km): Dashed box reflects regional satellite grid scale around your farm.'}
            </div>
            <span className="font-mono-tabular text-[#8E7D49]">
              {activeLat.toFixed(4)}, {activeLon.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Saved Farms, Sections, Crop & NASA Summary */}
      <div className="lg:col-span-4 space-y-3">
        {/* Saved Farms Manager */}
        <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C250C]">
              {isAr ? 'مزارعي وأقسـامي' : 'My Farms & Sections'}
            </h2>
            <button
              type="button"
              onClick={() => {
                onSaveNow();
                setSavedFlash(true);
                window.setTimeout(() => setSavedFlash(false), 1500);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f3f2ee] hover:bg-[#DBAE83]/30 text-xs font-semibold text-[#1C250C] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savedFlash ? (isAr ? 'تم الحفظ' : 'Saved') : isAr ? 'حفظ' : 'Save'}</span>
            </button>
          </div>

          {plots.length === 0 ? (
            <p className="text-xs text-[#8E7D49]">
              {isAr
                ? 'اضغط "وضع مستطيل المزرعة" فوق الخريطة ثم حرّك الزوايا فوق أرضك واضغط حفظ.'
                : 'Click "Mark Farm Rectangle" above the map, adjust corners over your land, and save.'}
            </p>
          ) : (
            <div className="space-y-2">
              {plots.map((plot) => {
                const isSelected = plot.id === activePlotId;
                return (
                  <div
                    key={plot.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      isSelected ? 'border-[#535C21] bg-[#535C21]/5' : 'border-[#D5D5D5] bg-[#faf8f4]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {renamingPlotId === plot.id ? (
                        <div className="flex-1 flex gap-1">
                          <input
                            value={renamePlotText}
                            onChange={(e) => setRenamePlotText(e.target.value)}
                            className="flex-1 px-2 py-1 text-xs bg-white border border-[#D5D5D5] rounded"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (renamePlotText.trim()) {
                                onUpdatePlot(plot.id, (p) => ({ ...p, name: renamePlotText.trim() }));
                              }
                              setRenamingPlotId(null);
                            }}
                            className="px-2 py-1 text-xs bg-[#535C21] text-white rounded cursor-pointer"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectPlot(plot.id)}
                          className="text-start flex-1 min-w-0 cursor-pointer"
                        >
                          <p className="text-xs font-bold text-[#1C250C] truncate">{plot.name}</p>
                          <p className="text-[11px] text-[#8E7D49] font-mono-tabular">
                            {formatArea(plot.areaSqMeters, language)} · {plot.sections.length}{' '}
                            {isAr ? 'أقسام' : 'sections'}
                          </p>
                        </button>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingPlotId(plot.id);
                            setRenamePlotText(plot.name);
                          }}
                          aria-label="Rename farm"
                          className="p-1 text-[#8E7D49] hover:text-[#1C250C] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePlot(plot.id)}
                          aria-label="Delete farm"
                          className="p-1 text-[#8E7D49] hover:text-[#C85A32] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Sections inside active plot */}
                    {isSelected && plot.sections.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[#D5D5D5] space-y-1.5">
                        {plot.sections.map((sec) => {
                          const secSelected = sec.id === activeSectionId;
                          return (
                            <div
                              key={sec.id}
                              onClick={() => onSelectSection(sec.id)}
                              className={`rounded-lg px-2.5 py-2 text-xs cursor-pointer border transition-colors ${
                                secSelected
                                  ? 'bg-white border-[#535C21] shadow-xs'
                                  : 'bg-white/70 border-transparent hover:border-[#D5D5D5]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: sec.color }}
                                  />
                                  <span className="font-bold truncate text-[#1C250C]">
                                    {sec.name}
                                  </span>
                                  <span className="text-[#535C21] truncate">· {sec.crop}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdatePlot(plot.id, (p) => ({
                                      ...p,
                                      sections: p.sections.filter((s) => s.id !== sec.id),
                                    }));
                                    if (activeSectionId === sec.id) onSelectSection(null);
                                  }}
                                  aria-label="Delete section"
                                  className="text-[#AD927E] hover:text-[#C85A32] cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {lastSavedAt && (
            <p className="text-[10px] text-[#AD927E]">
              {isAr ? 'آخر حفظ:' : 'Saved:'} {new Date(lastSavedAt).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Selected Section Actions (Open Analysis, Rotation, or Ask Tamra) */}
        {activePlot && activeSection && (
          <div className="bg-white border border-[#535C21]/40 rounded-2xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1C250C]">
                {activeSection.name} · {activeSection.crop}
              </h3>
              <span className="font-mono-tabular text-[#8E7D49]">
                {formatArea(activeSection.areaSqMeters, language)}
              </span>
            </div>

            {sectionError && <p className="text-[#8E7D49]">{sectionError}</p>}

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => void runSectionAnalysis(activePlot, activeSection)}
                disabled={analyzingSectionId === activeSection.id}
                className="inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-[#1C250C] text-[#DBAE83] font-semibold cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {analyzingSectionId === activeSection.id
                    ? isAr
                      ? 'جاري...'
                      : 'Running...'
                    : isAr
                      ? 'تحليل سريع'
                      : 'Quick AI Check'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onAskTamra(activeSection.id)}
                className="inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-[#535C21] text-white font-semibold cursor-pointer"
              >
                <span>{isAr ? 'اسأل تمرة' : 'Ask Tamra'}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAnalysis(activeSection.id)}
                className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#faf8f4] border border-[#D5D5D5] text-[#1C250C] font-semibold cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#535C21]" />
                <span>{isAr ? 'صفحة التحليل' : 'Full Analysis'}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenRotation(activeSection.id)}
                className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#faf8f4] border border-[#D5D5D5] text-[#1C250C] font-semibold cursor-pointer"
              >
                <Leaf className="w-3.5 h-3.5 text-[#535C21]" />
                <span>{isAr ? 'الدورة الزراعية' : 'Crop Rotation'}</span>
              </button>
            </div>

            {activeSection.analysis && (
              <div className="rounded-xl bg-[#faf8f4] border border-[#D5D5D5] p-2.5 space-y-1">
                <p className="font-semibold text-[#1C250C]">{activeSection.analysis.summary}</p>
                <p className="text-[#535C21]">{activeSection.analysis.irrigationAdvice}</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Live NASA Snapshot Summary Card */}
        <div className="bg-white border border-[#D5D5D5] rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#1C250C]">
              {isAr ? 'قراءات ناسا للموقع' : 'NASA Environmental Summary'}
            </span>
            <button
              type="button"
              onClick={onRefreshLive}
              disabled={loading}
              className="inline-flex items-center gap-1 text-[#535C21] font-semibold cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{isAr ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>

          {error && <p className="text-[#8E7D49]">{error}</p>}

          {snapshot ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#faf8f4] p-2 border border-[#D5D5D5]">
                <Droplets className="w-3.5 h-3.5 mx-auto text-[#535C21]" />
                <p className={`mt-1 font-bold ${moistureBadge.color}`}>{moistureBadge.label}</p>
                <p className="text-[10px] text-[#8E7D49]">SMAP</p>
              </div>
              <div className="rounded-xl bg-[#faf8f4] p-2 border border-[#D5D5D5]">
                <Thermometer className="w-3.5 h-3.5 mx-auto text-[#535C21]" />
                <p className="mt-1 font-bold font-mono-tabular">
                  {snapshot.power.latest?.t2m !== null && snapshot.power.latest?.t2m !== undefined
                    ? `${Math.round(snapshot.power.latest.t2m)}°C`
                    : '—'}
                </p>
                <p className="text-[10px] text-[#8E7D49]">POWER</p>
              </div>
              <div className="rounded-xl bg-[#faf8f4] p-2 border border-[#D5D5D5]">
                <Sun className="w-3.5 h-3.5 mx-auto text-[#535C21]" />
                <p className="mt-1 font-bold font-mono-tabular">
                  {snapshot.power.latestSolarMj !== null
                    ? `${snapshot.power.latestSolarMj}`
                    : '—'}
                </p>
                <p className="text-[10px] text-[#8E7D49]">MJ/m²</p>
              </div>
            </div>
          ) : null}

          <div className="pt-1 flex items-center justify-between gap-2">
            <label className="text-[#535C21] font-medium">{isAr ? 'نوع التربة:' : 'Soil Type:'}</label>
            <select
              value={soilType}
              onChange={(e) => onSoilTypeChange(e.target.value)}
              className="px-2 py-1 bg-[#faf8f4] border border-[#D5D5D5] rounded-lg"
            >
              <option value="Sandy Loam">{isAr ? 'رملية طينية' : 'Sandy Loam'}</option>
              <option value="Sandy">{isAr ? 'رملية' : 'Sandy'}</option>
              <option value="Clay Loam">{isAr ? 'طينية' : 'Clay Loam'}</option>
              <option value="Saline Coastal">{isAr ? 'ساحلية مالحة' : 'Saline Coastal'}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
