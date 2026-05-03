// Loading screen variations for "sulat"
// Each screen is a self-contained 360x780 mobile mockup designed to be shown
// inside an iOS-frame-shaped artboard.

// ──────────────────────────────────────────────────
// Shared phone-frame wrapper (no chrome — flush bleed)
// ──────────────────────────────────────────────────
function PhoneCanvas({ children, bg = SULAT_INK, w = 360, h = 780 }) {
  return (
    <div style={{
      width: w, height: h,
      background: bg,
      position: 'relative', overflow: 'hidden',
      fontFamily: '"Cormorant Garamond", "Crimson Pro", Georgia, serif',
      color: SULAT_AMBER,
    }}>
      {/* status bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 22px', zIndex: 10,
        fontFamily: 'ui-rounded, -apple-system, system-ui, sans-serif',
        fontSize: 14, fontWeight: 600,
        color: 'rgba(242,208,140,0.85)',
      }}>
        <span>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* signal */}
          <svg width="16" height="10" viewBox="0 0 16 10"><g fill="currentColor"><rect x="0" y="6" width="2.5" height="4" rx="0.5"/><rect x="3.5" y="4" width="2.5" height="6" rx="0.5"/><rect x="7" y="2" width="2.5" height="8" rx="0.5"/><rect x="10.5" y="0" width="2.5" height="10" rx="0.5"/></g></svg>
          {/* battery */}
          <svg width="22" height="10" viewBox="0 0 22 10"><rect x="0.5" y="0.5" width="18" height="9" rx="2" fill="none" stroke="currentColor" opacity="0.6"/><rect x="2" y="2" width="15" height="6" rx="1" fill="currentColor"/><rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor" opacity="0.6"/></svg>
        </div>
      </div>
      {children}
    </div>
  );
}

// Floating up-drifting lantern primitives shared by some variants
function FloatingLanterns({ count = 14, seed = 0 }) {
  const lanterns = React.useMemo(() => {
    const arr = [];
    let s = seed + 1;
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < count; i++) {
      arr.push({
        x: r() * 100,
        startY: 100 + r() * 30,
        size: 6 + r() * 12,
        delay: -r() * 14,
        duration: 12 + r() * 10,
        sway: r() * 8 - 4,
        opacity: 0.5 + r() * 0.5,
      });
    }
    return arr;
  }, [count, seed]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {lanterns.map((l, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${l.x}%`,
          top: `${l.startY}%`,
          opacity: l.opacity,
          animation: `sulat-rise-${seed} ${l.duration}s linear ${l.delay}s infinite`,
          ['--sway']: `${l.sway}px`,
        }}>
          <LanternGlyph size={l.size} animate />
        </div>
      ))}
      <style>{`
        @keyframes sulat-rise-${seed} {
          0%   { transform: translate(0, 0); opacity: 0; }
          10%  { opacity: var(--start-opacity, 0.7); }
          90%  { opacity: var(--start-opacity, 0.7); }
          100% { transform: translate(var(--sway, 0), -130vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────
// Loading 01 · Centered wordmark with breathing glow
// "Quiet, almost like the source app"
// ──────────────────────────────────────────────────
function LoadingCentered() {
  return (
    <PhoneCanvas>
      {/* radial glow from center */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(232,184,106,0.18), transparent 55%), radial-gradient(circle at 50% 90%, rgba(201,122,138,0.08), transparent 50%)',
      }} />
      {/* faint constellation dots */}
      <Constellation count={40} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 22,
      }}>
        <div style={{ animation: 'sulat-breathe 3.4s ease-in-out infinite' }}>
          <LogoWordmarkDot size={72} />
        </div>
        <div style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 10, letterSpacing: 4, textTransform: 'uppercase',
          color: 'rgba(232,184,106,0.5)',
        }}>
          lighting the lanterns
        </div>
      </div>

      {/* bottom progress dots */}
      <div style={{
        position: 'absolute', bottom: 64, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 8,
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: SULAT_AMBER,
            animation: `sulat-pulse 1.4s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes sulat-breathe {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50%      { transform: scale(1.03); filter: brightness(1.15); }
        }
        @keyframes sulat-pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40%           { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </PhoneCanvas>
  );
}

function Constellation({ count = 40, seed = 7 }) {
  const dots = React.useMemo(() => {
    const arr = [];
    let s = seed;
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < count; i++) {
      arr.push({ x: r() * 100, y: r() * 100, size: r() * 1.6 + 0.4, op: r() * 0.5 + 0.1, delay: r() * 4 });
    }
    return arr;
  }, [count, seed]);
  return (
    <>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: 'absolute', left: `${d.x}%`, top: `${d.y}%`,
          width: d.size, height: d.size, borderRadius: '50%',
          background: SULAT_AMBER_SOFT,
          opacity: d.op,
          animation: `sulat-twinkle 3s ease-in-out ${d.delay}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes sulat-twinkle {
          0%, 100% { opacity: 0.15; }
          50%      { opacity: 0.7; }
        }
      `}</style>
    </>
  );
}

// ──────────────────────────────────────────────────
// Loading 02 · Lanterns rising past the wordmark
// More cinematic, festival vibe
// ──────────────────────────────────────────────────
function LoadingRisingLanterns() {
  return (
    <PhoneCanvas bg={SULAT_INK_DEEP}>
      {/* deep gradient sky */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #06091A 0%, #0D1A30 60%, #1A2440 100%)',
      }} />
      {/* horizon haze */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 200,
        background: 'radial-gradient(ellipse at 50% 100%, rgba(232,184,106,0.25), transparent 70%)',
      }} />
      <Constellation count={30} seed={3} />
      <FloatingLanterns count={11} seed={1} />

      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, zIndex: 5,
      }}>
        <LogoWordmarkDot size={60} />
        <div style={{
          fontStyle: 'italic',
          fontSize: 14, letterSpacing: 0.3,
          color: 'rgba(242,208,140,0.7)',
        }}>
          a place for letters in the dark
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 56, left: 0, right: 0, textAlign: 'center',
        fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: 3,
        color: 'rgba(232,184,106,0.4)', textTransform: 'uppercase',
      }}>
        finding nearby lanterns…
      </div>
    </PhoneCanvas>
  );
}

// ──────────────────────────────────────────────────
// Loading 03 · Map ink-bleed reveal
// The Philippines silhouette draws in with amber pins lighting up
// ──────────────────────────────────────────────────
function LoadingMapReveal() {
  return (
    <PhoneCanvas>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 60%, rgba(232,184,106,0.10), transparent 60%)',
      }} />
      <Constellation count={26} seed={11} />

      {/* abstract archipelago — stylised dots/blobs forming a vertical curve */}
      <svg
        viewBox="0 0 200 380"
        width="220"
        height="420"
        style={{
          position: 'absolute', top: 130, left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0.8,
        }}
      >
        <defs>
          <radialGradient id="pin-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={SULAT_AMBER_SOFT} stopOpacity="0.9" />
            <stop offset="60%" stopColor={SULAT_AMBER} stopOpacity="0.3" />
            <stop offset="100%" stopColor={SULAT_AMBER} stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* abstract islands */}
        <g fill="rgba(232,184,106,0.12)" stroke="rgba(232,184,106,0.25)" strokeWidth="0.6">
          <path d="M85,30 Q110,40 105,80 Q95,110 110,140 Q120,170 100,210 Q80,235 95,270 Q105,305 80,340" fill="none" strokeDasharray="2 4" />
        </g>
        {/* island silhouettes */}
        <g fill="rgba(232,184,106,0.08)">
          <ellipse cx="95" cy="50" rx="14" ry="20" />
          <path d="M80,90 Q110,85 115,130 Q108,170 95,200 Q82,180 78,150 Q75,115 80,90 Z" />
          <ellipse cx="60" cy="220" rx="22" ry="14" transform="rotate(-20 60 220)" />
          <ellipse cx="120" cy="240" rx="16" ry="11" />
          <ellipse cx="135" cy="280" rx="20" ry="13" transform="rotate(15 135 280)" />
          <ellipse cx="85" cy="320" rx="18" ry="10" />
        </g>
        {/* pulsing pins */}
        {[
          { cx: 95, cy: 50, d: 0 },
          { cx: 100, cy: 130, d: 0.4 },
          { cx: 60, cy: 220, d: 0.8 },
          { cx: 125, cy: 245, d: 1.2 },
          { cx: 135, cy: 285, d: 1.6 },
          { cx: 85, cy: 320, d: 2.0 },
        ].map((p, i) => (
          <g key={i}>
            <circle cx={p.cx} cy={p.cy} r="14" fill="url(#pin-glow)">
              <animate attributeName="r" values="6;18;6" dur="2.6s" begin={`${p.d}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.9;0" dur="2.6s" begin={`${p.d}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={p.cx} cy={p.cy} r="2.6" fill={SULAT_AMBER_SOFT}>
              <animate attributeName="opacity" values="0.4;1;0.4" dur="2.6s" begin={`${p.d}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>

      {/* logo top */}
      <div style={{
        position: 'absolute', top: 78, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <LogoWordmarkDot size={48} />
      </div>

      {/* progress bar */}
      <div style={{
        position: 'absolute', bottom: 110, left: 40, right: 40,
        height: 1.5, background: 'rgba(232,184,106,0.15)', borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: '40%',
          background: `linear-gradient(90deg, transparent, ${SULAT_AMBER}, transparent)`,
          animation: 'sulat-bar 1.8s linear infinite',
        }} />
      </div>
      <div style={{
        position: 'absolute', bottom: 76, left: 0, right: 0, textAlign: 'center',
        fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: 3,
        color: 'rgba(232,184,106,0.45)', textTransform: 'uppercase',
      }}>
        gathering letters · 7,128 islands
      </div>
      <style>{`
        @keyframes sulat-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </PhoneCanvas>
  );
}

// ──────────────────────────────────────────────────
// Loading 04 · Single lantern lighting up (slow, intimate)
// ──────────────────────────────────────────────────
function LoadingSingleLantern() {
  return (
    <PhoneCanvas bg="#05091A">
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 42%, rgba(232,184,106,0.28), transparent 50%)',
        animation: 'sulat-breathe 3.4s ease-in-out infinite',
      }} />
      <Constellation count={50} seed={13} />

      <div style={{
        position: 'absolute', top: '34%', left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'sulat-bob 4s ease-in-out infinite',
      }}>
        <LanternGlyph size={88} animate />
      </div>

      <div style={{
        position: 'absolute', top: '60%', left: 0, right: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <LogoWordmarkDot size={54} />
        <div style={{
          fontStyle: 'italic', fontSize: 13,
          color: 'rgba(242,208,140,0.7)',
        }}>
          every glow is someone's hello
        </div>
      </div>

      {/* signature ring loader */}
      <div style={{
        position: 'absolute', bottom: 72, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ animation: 'sulat-spin 2.4s linear infinite' }}>
          <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(232,184,106,0.15)" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="14" fill="none" stroke={SULAT_AMBER} strokeWidth="1.5"
                  strokeDasharray="20 88" strokeLinecap="round" />
        </svg>
      </div>

      <style>{`
        @keyframes sulat-bob {
          0%, 100% { transform: translate(-50%, -50%); }
          50%      { transform: translate(-50%, calc(-50% - 6px)); }
        }
        @keyframes sulat-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PhoneCanvas>
  );
}

// ──────────────────────────────────────────────────
// Loading 05 · Handwritten greeting fades in
// Each letter of "sulat" hand-strokes on
// ──────────────────────────────────────────────────
function LoadingHandwritten() {
  return (
    <PhoneCanvas>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 30% 30%, rgba(201,122,138,0.10), transparent 60%), radial-gradient(circle at 75% 75%, rgba(232,184,106,0.10), transparent 60%)',
      }} />
      <Constellation count={20} seed={42} />

      {/* paper card */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%) rotate(-2deg)',
        width: 232, height: 300,
        background: 'linear-gradient(180deg, #1A2238 0%, #131A2C 100%)',
        border: '1px solid rgba(232,184,106,0.18)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 80px rgba(232,184,106,0.08)',
        padding: '28px 26px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 9, letterSpacing: 2,
          color: 'rgba(232,184,106,0.45)', textTransform: 'uppercase',
        }}>
          to: anyone · from: nearby
        </div>

        {/* animated handwriting */}
        <svg viewBox="0 0 180 60" width="180" height="60" style={{ alignSelf: 'center' }}>
          <path
            d="M20,40 Q14,28 28,22 Q40,22 36,32 Q30,42 22,42 M50,18 L50,42 Q50,50 60,46 L60,22
               M72,28 L72,46 M72,28 Q78,18 88,28 L88,46
               M102,20 L102,46 M96,32 L108,32
               M118,30 Q124,22 132,30 Q138,40 130,46 Q120,46 118,38 L138,38"
            fill="none" stroke={SULAT_AMBER} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="400" strokeDashoffset="400"
            style={{ animation: 'sulat-write 3.2s ease-in-out infinite' }}
          />
          {/* dot */}
          <circle cx="148" cy="44" r="2.6" fill={SULAT_AMBER_SOFT}
                  style={{ animation: 'sulat-dot-appear 3.2s ease-in-out infinite' }} />
        </svg>

        <div style={{
          fontStyle: 'italic', fontSize: 11,
          color: 'rgba(242,208,140,0.5)', textAlign: 'right',
        }}>
          — preparing your lantern
        </div>
      </div>

      <style>{`
        @keyframes sulat-write {
          0%   { stroke-dashoffset: 400; }
          70%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes sulat-dot-appear {
          0%, 70% { opacity: 0; transform: scale(0); transform-origin: 148px 44px; }
          80%     { opacity: 1; transform: scale(1.5); }
          100%    { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </PhoneCanvas>
  );
}

Object.assign(window, {
  PhoneCanvas, FloatingLanterns, Constellation,
  LoadingCentered, LoadingRisingLanterns, LoadingMapReveal,
  LoadingSingleLantern, LoadingHandwritten,
});
