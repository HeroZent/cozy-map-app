// Default-export wrapper so React.lazy() can split MapView into its own chunk.
// The maplibre-gl CSS import inside MapView.tsx only runs in the browser
// (never during static generation) because this module is lazy-loaded.
export { MapView as default, type FlyTarget } from './MapView';
