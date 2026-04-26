import { roundTo500m, geocodeCity } from '@/lib/geo';

describe('roundTo500m', () => {
  test('rounds latitude/longitude to ~500m grid', () => {
    const r = roundTo500m({ lat: 14.59951234, lng: 120.98421234 });
    // 500m at the equator ≈ 0.0045 degrees
    expect(r.lat).toBeCloseTo(14.5995, 3);
    expect(r.lng).toBeCloseTo(120.9842, 3);
  });
});

describe('geocodeCity', () => {
  // Skip in unit run if no network; this is a real API call to Photon.
  test.skip('returns plausible result for "Cebu City"', async () => {
    const r = await geocodeCity('Cebu City');
    expect(r[0]?.label).toMatch(/Cebu/i);
    expect(r[0]?.lat).toBeGreaterThan(10);
    expect(r[0]?.lat).toBeLessThan(11);
  });
});
