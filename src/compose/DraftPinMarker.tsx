// src/compose/DraftPinMarker.tsx — NATIVE (iOS/Android) implementation.
// On the web target Metro picks `DraftPinMarker.web.tsx`.
import { Marker } from '@maplibre/maplibre-react-native';
import { DraftPin } from './DraftPin';

export interface DraftPinMarkerProps {
  longitude: number;
  latitude: number;
  /**
   * Drag-end handler. NOTE: native MapLibre Marker doesn't expose a
   * `draggable` prop — on iOS/Android the user can't currently drag the
   * draft pin. They tap a different spot on the map to re-place it.
   * Tracked as future native feature: implement custom long-press →
   * follow-touch behaviour or migrate to `ViewAnnotation`.
   */
  onDragEnd: (loc: { lat: number; lng: number }) => void;
}

/**
 * Renders the draft pin on native. Same visual as web — but no drag
 * yet (see prop comment). The pin is still useful as a confirmation
 * that "this is where the sulat will land" before posting.
 */
export function DraftPinMarker({ longitude, latitude }: DraftPinMarkerProps) {
  return (
    <Marker lngLat={[longitude, latitude]} anchor="bottom">
      <DraftPin />
    </Marker>
  );
}
