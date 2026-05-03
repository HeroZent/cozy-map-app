import { View } from 'react-native';

const SVG = `
<svg viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sulatLanternBody" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F2D08C"/>
      <stop offset="60%" stop-color="#E8B86A"/>
      <stop offset="100%" stop-color="#9C7338"/>
    </radialGradient>
  </defs>
  <!-- Halo glow -->
  <ellipse cx="14" cy="19" rx="14" ry="14" fill="#E8B86A" opacity="0.18" />
  <!-- String -->
  <line x1="14" y1="0" x2="14" y2="6" stroke="#E8B86A" stroke-width="0.4" opacity="0.6" />
  <!-- Top cap -->
  <rect x="9" y="5" width="10" height="2" rx="0.5" fill="#E8B86A" opacity="0.85" />
  <!-- Body -->
  <ellipse cx="14" cy="19" rx="10" ry="11" fill="url(#sulatLanternBody)" />
  <!-- Ribs -->
  <line x1="5" y1="14" x2="23" y2="14" stroke="#070D1B" stroke-width="0.4" opacity="0.35" />
  <line x1="4" y1="19" x2="24" y2="19" stroke="#070D1B" stroke-width="0.4" opacity="0.35" />
  <line x1="5" y1="24" x2="23" y2="24" stroke="#070D1B" stroke-width="0.4" opacity="0.35" />
  <!-- Bottom cap -->
  <rect x="10" y="29" width="8" height="1.6" fill="#E8B86A" opacity="0.85" />
  <!-- Tassel -->
  <line x1="14" y1="30.6" x2="14" y2="36" stroke="#E8B86A" stroke-width="0.5" opacity="0.7" />
</svg>
`.trim();

export interface SulatLanternProps {
  /** Width in px; height scales to maintain 28:38 aspect ratio. */
  width: number;
}

export function SulatLantern({ width }: SulatLanternProps) {
  const height = Math.round(width * 38 / 28);
  // dangerouslySetInnerHTML on a View — under react-native-web this becomes a div, which honors the prop.
  // Web-only by design; on native this renders an empty wrapper (acceptable until the deferred native pass).
  return (
    <View
      testID="sulat-lantern"
      style={{ width, height }}
      // @ts-ignore — RN-Web's View accepts dangerouslySetInnerHTML on web; native ignores.
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  );
}
