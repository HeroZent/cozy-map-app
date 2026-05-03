// Logo explorations for "sulat"
// Palette pulled from the source app: deep navy, warm amber, soft gold glow.

const SULAT_INK = '#0B1326';
const SULAT_INK_DEEP = '#070D1B';
const SULAT_AMBER = '#E8B86A';
const SULAT_AMBER_SOFT = '#F2D08C';
const SULAT_ROSE = '#C97A8A';
const SULAT_FOG = 'rgba(232,184,106,0.18)';

// ──────────────────────────────────────────────────
// Shared backdrop wrapper for logo cards
// ──────────────────────────────────────────────────
function LogoCard({ children, label, sub, height = 220, bg = SULAT_INK }) {
  return (
    <div style={{
      width: '100%', height,
      background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      fontFamily: '"Cormorant Garamond", "Crimson Pro", Georgia, serif',
    }}>
      {/* faint star/dust */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 30% 40%, rgba(232,184,106,0.08), transparent 50%), radial-gradient(circle at 70% 70%, rgba(201,122,138,0.06), transparent 45%)',
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
      {label && (
        <div style={{
          position: 'absolute', bottom: 10, left: 12,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase',
          color: 'rgba(232,184,106,0.5)',
        }}>
          {label}{sub ? ` · ${sub}` : ''}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────
// 01 · Wordmark with glowing dot (closest to the source UI)
// ──────────────────────────────────────────────────
function LogoWordmarkDot({ size = 92, glow = true }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'baseline',
      color: SULAT_AMBER,
      fontSize: size, lineHeight: 1, fontWeight: 500,
      letterSpacing: '-0.02em',
      fontStyle: 'italic',
      fontFamily: '"Cormorant Garamond", "Crimson Pro", Georgia, serif',
    }}>
      <span>sulat</span>
      <span style={{
        display: 'inline-block',
        width: size * 0.13, height: size * 0.13,
        borderRadius: '50%',
        background: SULAT_AMBER_SOFT,
        marginLeft: size * 0.04,
        boxShadow: glow
          ? `0 0 ${size * 0.18}px ${size * 0.04}px rgba(242,208,140,0.7), 0 0 ${size * 0.5}px ${size * 0.1}px rgba(232,184,106,0.4)`
          : 'none',
      }} />
    </div>
  );
}

// ──────────────────────────────────────────────────
// 02 · Wordmark + lantern mark
// A small paper-lantern glyph replaces the dot
// ──────────────────────────────────────────────────
function LanternGlyph({ size = 28, animate = false }) {
  const id = React.useId();
  return (
    <svg width={size} height={size * 1.35} viewBox="0 0 28 38" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`lant-${id}`} cx="50%" cy="55%" r="55%">
          <stop offset="0%" stopColor={SULAT_AMBER_SOFT} />
          <stop offset="60%" stopColor={SULAT_AMBER} />
          <stop offset="100%" stopColor="#9C7338" />
        </radialGradient>
      </defs>
      {/* string */}
      <line x1="14" y1="0" x2="14" y2="6" stroke={SULAT_AMBER} strokeWidth="0.6" opacity="0.6" />
      {/* top cap */}
      <rect x="9" y="5" width="10" height="2" rx="0.5" fill={SULAT_AMBER} opacity="0.85" />
      {/* body */}
      <ellipse cx="14" cy="19" rx="10" ry="11" fill={`url(#lant-${id})`} />
      {/* horizontal ribs */}
      <path d="M5,15 Q14,17 23,15" stroke={SULAT_INK_DEEP} strokeWidth="0.4" fill="none" opacity="0.35" />
      <path d="M4.2,19 Q14,21 23.8,19" stroke={SULAT_INK_DEEP} strokeWidth="0.4" fill="none" opacity="0.35" />
      <path d="M5,23 Q14,25 23,23" stroke={SULAT_INK_DEEP} strokeWidth="0.4" fill="none" opacity="0.35" />
      {/* bottom cap */}
      <rect x="10" y="29" width="8" height="1.6" rx="0.4" fill={SULAT_AMBER} opacity="0.85" />
      {/* tassel */}
      <line x1="14" y1="30.6" x2="14" y2="36" stroke={SULAT_AMBER} strokeWidth="0.6" opacity="0.7" />
      {/* glow */}
      <ellipse cx="14" cy="19" rx="14" ry="14" fill={SULAT_AMBER} opacity="0.18" style={{ filter: 'blur(4px)' }}>
        {animate && <animate attributeName="opacity" values="0.18;0.32;0.18" dur="3s" repeatCount="indefinite" />}
      </ellipse>
    </svg>
  );
}

function LogoWordmarkLantern({ size = 78 }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: size * 0.16,
      color: SULAT_AMBER,
      fontSize: size, lineHeight: 1, fontWeight: 500,
      letterSpacing: '-0.02em',
      fontStyle: 'italic',
    }}>
      <span>sulat</span>
      <LanternGlyph size={size * 0.42} />
    </div>
  );
}

// ──────────────────────────────────────────────────
// 03 · Monogram "s" — folded paper crease
// ──────────────────────────────────────────────────
function LogoMonogramFold({ size = 140 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.18 }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="fold-light" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={SULAT_AMBER_SOFT} />
            <stop offset="100%" stopColor={SULAT_AMBER} />
          </linearGradient>
          <linearGradient id="fold-shade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#B98640" />
            <stop offset="100%" stopColor="#7A5526" />
          </linearGradient>
        </defs>
        {/* envelope-like 's' built from folded triangles */}
        <path d="M20,22 L80,22 L80,38 L36,38 L36,52 L80,52 L80,78 L20,78 L20,62 L64,62 L64,48 L20,48 Z"
              fill="url(#fold-light)" />
        <path d="M20,22 L80,22 L80,38 L36,38 Z" fill="url(#fold-shade)" opacity="0.35" />
        <path d="M36,52 L80,52 L80,78 L20,78 L20,62 L64,62 L64,48 Z" fill="url(#fold-shade)" opacity="0.18" />
        {/* fold creases */}
        <line x1="36" y1="38" x2="36" y2="52" stroke={SULAT_INK_DEEP} strokeWidth="0.6" opacity="0.4" />
        <line x1="64" y1="48" x2="64" y2="62" stroke={SULAT_INK_DEEP} strokeWidth="0.6" opacity="0.4" />
        {/* tiny seal dot */}
        <circle cx="50" cy="50" r="2.4" fill={SULAT_ROSE} opacity="0.9" />
      </svg>
      <div style={{
        color: SULAT_AMBER, fontSize: size * 0.5, fontStyle: 'italic',
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        sulat<span style={{ color: SULAT_AMBER_SOFT }}>.</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// 04 · Stamped / circular emblem
// ──────────────────────────────────────────────────
function LogoStamp({ size = 180 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `1px solid ${SULAT_AMBER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      boxShadow: `0 0 60px 10px rgba(232,184,106,0.18), inset 0 0 30px rgba(232,184,106,0.08)`,
    }}>
      <div style={{
        position: 'absolute', inset: 8, borderRadius: '50%',
        border: `1px dashed rgba(232,184,106,0.35)`,
      }} />
      {/* curved top text */}
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0 }} viewBox="0 0 200 200">
        <defs>
          <path id="stamp-top" d="M 30 100 A 70 70 0 0 1 170 100" fill="none" />
          <path id="stamp-bot" d="M 30 100 A 70 70 0 0 0 170 100" fill="none" />
        </defs>
        <text fill={SULAT_AMBER} fontSize="9" letterSpacing="6" fontFamily="ui-monospace, monospace" opacity="0.7">
          <textPath href="#stamp-top" startOffset="50%" textAnchor="middle">EST · MMXXVI · LANTERNS</textPath>
        </text>
        <text fill={SULAT_AMBER} fontSize="9" letterSpacing="6" fontFamily="ui-monospace, monospace" opacity="0.7">
          <textPath href="#stamp-bot" startOffset="50%" textAnchor="middle">PHILIPPINES · NIGHT POST</textPath>
        </text>
      </svg>
      <div style={{
        color: SULAT_AMBER, fontSize: size * 0.27, fontStyle: 'italic',
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        sulat<span>.</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// 05 · Paper-airplane mark (sent message)
// ──────────────────────────────────────────────────
function LogoPaperPlane({ size = 130 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.12 }}>
      <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 80 80">
        <defs>
          <linearGradient id="plane-l" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={SULAT_AMBER_SOFT} />
            <stop offset="100%" stopColor={SULAT_AMBER} />
          </linearGradient>
        </defs>
        {/* trail */}
        <path d="M8,68 Q24,62 38,52" stroke={SULAT_AMBER} strokeWidth="0.8" fill="none" strokeDasharray="2 3" opacity="0.4" />
        {/* plane body, light face */}
        <path d="M70,10 L10,38 L34,42 L40,68 Z" fill="url(#plane-l)" />
        {/* fold shade */}
        <path d="M70,10 L34,42 L40,68 Z" fill={SULAT_INK_DEEP} opacity="0.2" />
        <path d="M70,10 L34,42 L10,38 Z" fill={SULAT_AMBER_SOFT} opacity="0.25" />
      </svg>
      <div style={{
        color: SULAT_AMBER, fontSize: size * 0.42, fontStyle: 'italic',
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        sulat<span>.</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────
// 06 · Light/inverted lockup
// ──────────────────────────────────────────────────
function LogoInverse({ size = 92 }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'baseline',
      color: SULAT_INK,
      fontSize: size, lineHeight: 1, fontWeight: 500,
      letterSpacing: '-0.02em', fontStyle: 'italic',
    }}>
      <span>sulat</span>
      <span style={{
        display: 'inline-block',
        width: size * 0.13, height: size * 0.13,
        borderRadius: '50%',
        background: '#C97A18',
        marginLeft: size * 0.04,
      }} />
    </div>
  );
}

Object.assign(window, {
  SULAT_INK, SULAT_INK_DEEP, SULAT_AMBER, SULAT_AMBER_SOFT, SULAT_ROSE, SULAT_FOG,
  LogoCard, LanternGlyph,
  LogoWordmarkDot, LogoWordmarkLantern, LogoMonogramFold,
  LogoStamp, LogoPaperPlane, LogoInverse,
});
