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
  // Example entry once a track is added:
  // { id: 'quiet-night', displayName: 'Quiet Night', source: require('../../assets/audio/quiet-night.mp3') },
];
