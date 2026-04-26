import { Source, Layer } from 'react-map-gl/maplibre';

// ─── Simplified Philippine island outlines ────────────────────────────────────
// Each island is wound CW (clockwise) so it acts as a "hole" cut from the world
// polygon below. Resolution is tuned for zoom 5-6; we'll remove/swap this for
// a global-ready layer once the app goes worldwide.

const LUZON = [
  [121.5, 18.7], [122.5, 17.8], [122.2, 16.5], [122.1, 15.8],
  [122.3, 14.1], [124.1, 13.7], [124.0, 12.6], [122.9, 13.2],
  [121.0, 13.8], [120.3, 14.8], [119.9, 16.0], [119.9, 17.6],
  [120.4, 18.6], [121.5, 18.7],
];

const MINDANAO = [
  [124.3, 9.0],  [125.7, 9.7],  [126.6, 8.5],  [126.2, 7.0],
  [126.0, 6.3],  [125.3, 5.7],  [124.5, 6.0],  [123.5, 6.5],
  [122.4, 7.7],  [122.0, 8.2],  [123.0, 8.8],  [124.3, 9.0],
];

const PALAWAN = [
  [119.9, 11.8], [120.5, 11.2], [120.1, 10.0], [119.2, 8.9],
  [117.5, 8.4],  [117.3, 8.6],  [118.0, 9.2],  [118.9, 10.5],
  [119.4, 11.5], [119.9, 11.8],
];

const SAMAR = [
  [124.2, 12.6], [125.2, 12.2], [125.5, 11.4], [125.2, 10.5],
  [124.6, 10.7], [124.0, 11.0], [123.9, 12.1], [124.2, 12.6],
];

const LEYTE = [
  [124.6, 11.3], [124.9, 11.0], [125.1, 10.2], [124.9, 9.8],
  [124.3, 9.9],  [124.2, 10.5], [124.4, 11.0], [124.6, 11.3],
];

const PANAY = [
  [122.1, 11.9], [122.9, 11.5], [122.7, 11.0], [122.2, 10.5],
  [121.8, 10.7], [121.6, 11.2], [121.8, 11.7], [122.1, 11.9],
];

const NEGROS = [
  [123.1, 11.2], [123.4, 10.7], [123.4, 10.0], [122.9, 9.2],
  [122.5, 9.5],  [122.3, 10.2], [122.6, 10.8], [123.1, 11.2],
];

const CEBU = [
  [124.0, 11.3], [124.2, 10.8], [124.1, 10.2], [123.8, 9.6],
  [123.5, 10.0], [123.5, 10.6], [123.8, 11.0], [124.0, 11.3],
];

const BOHOL = [
  [124.2, 10.1], [124.5, 9.9],  [124.5, 9.6],  [124.0, 9.5],
  [123.7, 9.7],  [123.8, 10.0], [124.2, 10.1],
];

const MINDORO = [
  [121.5, 13.3], [121.9, 12.8], [121.7, 12.1], [121.1, 12.3],
  [120.5, 12.8], [120.9, 13.2], [121.5, 13.3],
];

// ─── World polygon with PH islands as holes ───────────────────────────────────
// Outer ring (CCW) covers the entire world. Inner rings (CW islands) punch
// through to reveal the map underneath — creating the fog effect.
const FOG_GEOJSON = {
  type: 'Feature' as const,
  properties: {},
  geometry: {
    type: 'Polygon' as const,
    coordinates: [
      // Outer ring — whole world, CCW
      [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]],
      // Holes — Philippine islands, CW
      LUZON, MINDANAO, PALAWAN, SAMAR, LEYTE,
      PANAY, NEGROS, CEBU, BOHOL, MINDORO,
    ],
  },
};

export function FogLayer() {
  return (
    <Source id="ph-fog-source" type="geojson" data={FOG_GEOJSON}>
      <Layer
        id="ph-fog"
        type="fill"
        paint={{
          'fill-color': '#080c1a',
          'fill-opacity': 0.78,
        }}
      />
    </Source>
  );
}
