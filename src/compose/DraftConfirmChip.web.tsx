// src/compose/DraftConfirmChip.web.tsx — WEB implementation.
// On native targets Metro picks `DraftConfirmChip.tsx` instead.
// Uses react-map-gl's <Popup> rather than <Marker> because Marker can
// intercept pointer events that interfere with Pressable taps inside it.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Popup } from 'react-map-gl/maplibre';
import './DraftConfirmChip.web.css';
import { reverseGeocode } from '@/lib/reverseGeocode';
import { useTheme } from '@/theme/ThemeContext';

export interface DraftConfirmChipProps {
  coords: { lat: number; lng: number };
  onWrite: () => void;
  onCancel: () => void;
}

/** Floating chip shown during the placing phase, anchored near the
 *  draft pin:  📍 <location-label>   Write   ✕
 *  - Resolves the location label via reverseGeocode (returns
 *    `{ short, full } | null` — the chip displays `short`).
 *  - "Locating…" while pending; "Dropped pin" on null/error.
 *  - Write commits the location and lets the parent open ComposeSheet.
 *  - ✕ cancels (parent transitions placing → idle).
 *
 *  Edge-flipping (so the chip never falls off-screen) is deferred per the
 *  plan's "Open follow-ups" — for now the chip anchors above the pin via
 *  the Popup's `anchor="bottom"`, mirroring the native variant. */
export function DraftConfirmChip({ coords, onWrite, onCancel }: DraftConfirmChipProps) {
  const theme = useTheme();
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLabel(null);
    setError(false);
    reverseGeocode(coords.lat, coords.lng)
      .then((result) => {
        if (cancelled) return;
        if (!result || !result.short) {
          setError(true);
          return;
        }
        setLabel(result.short);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [coords.lat, coords.lng]);

  const display = error ? 'Dropped pin' : (label ?? 'Locating…');

  return (
    <Popup
      longitude={coords.lng}
      latitude={coords.lat}
      anchor="bottom"
      offset={28}
      closeButton={false}
      closeOnClick={false}
      className="draft-confirm-chip-popup"
    >
      <View style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textPrimary }]} numberOfLines={1}>
          {`📍 ${display}`}
        </Text>
        <Pressable
          onPress={onWrite}
          style={[styles.action, { backgroundColor: theme.accentDim, borderColor: theme.accent }]}
          accessibilityLabel="Write a sulat at this location"
        >
          <Text style={[styles.actionText, { color: theme.accent }]}>Write</Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={[styles.cancel, { borderColor: theme.border }]}
          accessibilityLabel="Cancel and remove pin"
        >
          <Text style={[styles.cancelText, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 180,
  },
  action: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cancel: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  cancelText: {
    fontSize: 11,
    lineHeight: 13,
  },
});
