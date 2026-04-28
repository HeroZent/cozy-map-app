// src/compose/DraftPinMarker.web.tsx — WEB implementation.
import { Marker } from 'react-map-gl/maplibre';
import { DraftPin } from './DraftPin';

export interface DraftPinMarkerProps {
  longitude: number;
  latitude: number;
  onDragEnd: (loc: { lat: number; lng: number }) => void;
}

/**
 * Renders the draggable draft pin on web. The user can fine-tune the
 * compose location by dragging the pin to the exact spot.
 */
export function DraftPinMarker({ longitude, latitude, onDragEnd }: DraftPinMarkerProps) {
  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
      draggable
      onDragEnd={(e) => onDragEnd({ lat: e.lngLat.lat, lng: e.lngLat.lng })}
    >
      <DraftPin />
    </Marker>
  );
}
