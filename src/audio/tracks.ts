/**
 * Background music manifest.
 *
 * Add one entry per MP3 file in assets/audio/. Display name is hand-set in the
 * manifest at the same time the require() is added (so capitalization can be
 * exact — e.g. "Lo-Fi Night" rather than auto-title-cased).
 *
 * Convention: id mirrors the filename (without .mp3); displayName mirrors
 * filename with hyphens turned into spaces and proper title case.
 *
 * Empty array is supported — the BackgroundMusicProvider gracefully exposes
 * no-op API and hides the speaker icon when isAudioAvailable === false.
 */
export type Track = { id: string; displayName: string; source: number };

export const TRACKS: Track[] = [
  { id: 'bawat-piyesa', displayName: 'Bawat Piyesa', source: require('../../assets/audio/Bawat Piyesa.mp3') },
  { id: 'kalapastangan', displayName: 'Kalapastangan', source: require('../../assets/audio/Kalapastangan.mp3') },
  { id: 'multo-stripped-down', displayName: 'Multo (Stripped Down)', source: require('../../assets/audio/Multo (Stripped Down).mp3') },
  { id: 'ride-home', displayName: 'Ride Home', source: require('../../assets/audio/Ride Home.mp3') },
];
