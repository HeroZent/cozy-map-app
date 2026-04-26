export interface PlaceLabel {
  short: string;   // "Manila, Philippines"
  full: string;    // raw display_name from Nominatim
}

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceLabel | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'sulat-app/0.1 (ph.sulat.app)' },
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      display_name: string;
      address: Record<string, string>;
    };

    const a = data.address;
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '';
    const country = a.country ?? '';
    const short = [city, country].filter(Boolean).join(', ');

    return { short: short || data.display_name, full: data.display_name };
  } catch {
    return null;
  }
}
