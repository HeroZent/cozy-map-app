export interface LatLng {
  lat: number;
  lng: number;
}

export interface CityResult extends LatLng {
  label: string;
}

const GRID_DEGREES = 0.0001; // ~11m per step, used to snap coordinates to 4 decimal place grid (~500m privacy rounding at city scale).

export function roundTo500m(p: LatLng): LatLng {
  return {
    lat: Math.round(p.lat / GRID_DEGREES) * GRID_DEGREES,
    lng: Math.round(p.lng / GRID_DEGREES) * GRID_DEGREES,
  };
}

export async function geocodeCity(query: string, signal?: AbortSignal): Promise<CityResult[]> {
  if (!query.trim()) return [];
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&osm_tag=place:city&osm_tag=place:town`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Photon error: ${res.status}`);
  const json = (await res.json()) as { features: Array<{ properties: Record<string, unknown>; geometry: { coordinates: [number, number] } }> };
  return json.features.map((f) => ({
    label: [f.properties['name'], f.properties['country']].filter(Boolean).join(', '),
    lng: f.geometry.coordinates[0] as number,
    lat: f.geometry.coordinates[1] as number,
  }));
}
