import type { FarmEnvironmentSnapshot, GeocodeResult } from '../types/farm';

export async function fetchNasaFarmData(params: {
  latitude: number;
  longitude: number;
  name?: string;
  forceRefresh?: boolean;
}): Promise<FarmEnvironmentSnapshot> {
  const qs = new URLSearchParams({
    lat: String(params.latitude),
    lon: String(params.longitude),
  });
  if (params.name) qs.set('name', params.name);
  if (params.forceRefresh) qs.set('refresh', 'true');

  const res = await fetch(`/api/nasa/farm-data?${qs.toString()}`);
  const payload = (await res.json()) as {
    ok: boolean;
    data?: FarmEnvironmentSnapshot;
    error?: string;
  };

  if (!res.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error || 'Failed to retrieve NASA farm data.');
  }

  return payload.data;
}

export async function searchPlaceOnMap(query: string): Promise<GeocodeResult[]> {
  const qs = new URLSearchParams({ q: query });
  const res = await fetch(`/api/geocode?${qs.toString()}`);
  const payload = (await res.json()) as {
    ok: boolean;
    results?: GeocodeResult[];
    error?: string;
  };

  if (!res.ok || !payload.ok) {
    throw new Error(payload.error || 'Unable to search for that location.');
  }

  return payload.results ?? [];
}
