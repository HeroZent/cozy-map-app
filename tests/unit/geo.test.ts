import { roundTo500m, geocodeCity } from '@/lib/geo';

describe('roundTo500m', () => {
  test('rounds latitude/longitude to ~500m grid', () => {
    const r = roundTo500m({ lat: 14.59951234, lng: 120.98421234 });
    // With GRID = 0.0045:
    // lat: Math.round(14.59951234 / 0.0045) * 0.0045 = 3244 * 0.0045 = 14.598
    // lng: Math.round(120.98421234 / 0.0045) * 0.0045 = 26885 * 0.0045 = 120.9825
    expect(r.lat).toBeCloseTo(14.598, 2);
    expect(r.lng).toBeCloseTo(120.9825, 2);
  });

  test('output is a multiple of grid step', () => {
    const r = roundTo500m({ lat: 14.59951234, lng: 120.98421234 });
    // Result should be a grid-aligned value
    // Verify by dividing by grid and checking it's close to a whole number
    const latGrids = r.lat / 0.0045;
    const lngGrids = r.lng / 0.0045;
    expect(Math.round(latGrids)).toBeCloseTo(latGrids, 10);
    expect(Math.round(lngGrids)).toBeCloseTo(lngGrids, 10);
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
