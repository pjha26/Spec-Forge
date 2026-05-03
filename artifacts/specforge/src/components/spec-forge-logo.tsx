import { useId } from "react";

interface SpecForgeLogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
  showBeta?: boolean;
  className?: string;
  textClassName?: string;
  onMouseEnter?: () => void;
}

export function SpecForgeLogo({
  size = 36,
  showText = true,
  textSize = "text-base",
  showBeta = false,
  className = "",
  textClassName = "",
  onMouseEnter,
}: SpecForgeLogoProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `sfGrad_${uid}`;
  const glowId = `sfGlow_${uid}`;
  const coreId = `sfCore_${uid}`;

  return (
    <div
      className={`flex items-center gap-2.5 ${className}`}
      onMouseEnter={onMouseEnter}
    >
      <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
        <style>{`
          @keyframes sfSpin   { from { transform: rotate(0deg);    } to { transform: rotate(360deg);  } }
          @keyframes sfSpinR  { from { transform: rotate(0deg);    } to { transform: rotate(-360deg); } }
          @keyframes sfPulse  { 0%,100% { opacity:1; transform:scale(1);    } 50% { opacity:.65; transform:scale(1.18); } }
          @keyframes sfRipple { 0% { r:7; opacity:.45; } 100% { r:13; opacity:0; } }
          @keyframes sfDash   { 0% { stroke-dashoffset:0; } 100% { stroke-dashoffset:-60; } }
          @keyframes sfDashR  { 0% { stroke-dashoffset:0; } 100% { stroke-dashoffset:60;  } }
          @keyframes sfNodePulse {
            0%,100% { opacity:.7; r:1.4; }
            50%      { opacity:1;  r:2;   }
          }
          @keyframes sfFlow1  {
            0%   { stroke-dashoffset: 40; opacity: 0;   }
            15%  { opacity: .7; }
            85%  { opacity: .7; }
            100% { stroke-dashoffset: 0;  opacity: 0;   }
          }
          @keyframes sfFlow2  {
            0%   { stroke-dashoffset: 40; opacity: 0;   }
            15%  { opacity: .5; }
            85%  { opacity: .5; }
            100% { stroke-dashoffset: 0;  opacity: 0;   }
          }
          .sf-spin    { animation: sfSpin   9s  linear infinite; transform-origin: 20px 20px; }
          .sf-spin-r  { animation: sfSpinR  14s linear infinite; transform-origin: 20px 20px; }
          .sf-pulse   { animation: sfPulse  2.6s ease-in-out infinite; transform-origin: 20px 20px; }
          .sf-ripple  { animation: sfRipple 2.6s ease-out infinite; }
          .sf-dash    { animation: sfDash   3s  linear infinite; }
          .sf-dash-r  { animation: sfDashR  4s  linear infinite; }
          .sf-flow1   { animation: sfFlow1  2.8s ease-in-out infinite; }
          .sf-flow2   { animation: sfFlow2  2.8s ease-in-out 1.4s infinite; }
          .sf-n1      { animation: sfNodePulse 2s ease-in-out 0.0s infinite; }
          .sf-n2      { animation: sfNodePulse 2s ease-in-out 0.3s infinite; }
          .sf-n3      { animation: sfNodePulse 2s ease-in-out 0.6s infinite; }
          .sf-n4      { animation: sfNodePulse 2s ease-in-out 0.9s infinite; }
          .sf-n5      { animation: sfNodePulse 2s ease-in-out 1.2s infinite; }
          .sf-n6      { animation: sfNodePulse 2s ease-in-out 1.5s infinite; }
        `}</style>

        <svg viewBox="0 0 40 40" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#00b4d8" stopOpacity="0.9" />
              <stop offset="60%"  stopColor="#0891b2" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0"   />
            </radialGradient>
            <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="40%"  stopColor="#22d3ee" stopOpacity="1"   />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="1"   />
            </radialGradient>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>

          {/* ── Outermost ambient glow ── */}
          <circle cx="20" cy="20" r="18" fill={`url(#${glowId})`} opacity="0.08" />

          {/* ── Outer spinning dashed ring ── */}
          <circle
            cx="20" cy="20" r="17.5"
            stroke="#00b4d8" strokeWidth="0.7"
            strokeDasharray="4 5"
            opacity="0.32"
            className="sf-spin"
          />

          {/* ── Counter-spinning middle dashed ring ── */}
          <circle
            cx="20" cy="20" r="13.5"
            stroke="#22d3ee" strokeWidth="0.5"
            strokeDasharray="2 7"
            opacity="0.18"
            className="sf-spin-r"
          />

          {/* ── Hexagon outer frame ── */}
          <polygon
            points="20,2.5 34.5,10.75 34.5,27.25 20,35.5 5.5,27.25 5.5,10.75"
            stroke="#0891b2" strokeWidth="1.2" opacity="0.7"
            fill="rgba(0,180,216,0.03)"
          />

          {/* ── Hexagon vertex nodes ── */}
          <circle cx="20"   cy="2.5"  r="1.4" fill="#0891b2" className="sf-n1" />
          <circle cx="34.5" cy="10.75" r="1.4" fill="#0891b2" className="sf-n2" />
          <circle cx="34.5" cy="27.25" r="1.4" fill="#0891b2" className="sf-n3" />
          <circle cx="20"   cy="35.5"  r="1.4" fill="#0891b2" className="sf-n4" />
          <circle cx="5.5"  cy="27.25" r="1.4" fill="#0891b2" className="sf-n5" />
          <circle cx="5.5"  cy="10.75" r="1.4" fill="#0891b2" className="sf-n6" />

          {/* ── Circuit spurs from hex to inner diamond ── */}
          <line x1="20"   y1="2.5"   x2="20"   y2="9"  stroke="#00b4d8" strokeWidth="0.6" opacity="0.4" />
          <line x1="34.5" y1="10.75" x2="30"   y2="14" stroke="#00b4d8" strokeWidth="0.6" opacity="0.4" />
          <line x1="34.5" y1="27.25"  x2="30"   y2="25" stroke="#00b4d8" strokeWidth="0.6" opacity="0.4" />
          <line x1="20"   y1="35.5"  x2="20"   y2="31" stroke="#00b4d8" strokeWidth="0.6" opacity="0.4" />
          <line x1="5.5"  y1="27.25"  x2="10"   y2="25" stroke="#00b4d8" strokeWidth="0.6" opacity="0.4" />
          <line x1="5.5"  y1="10.75"  x2="10"   y2="14" stroke="#00b4d8" strokeWidth="0.6" opacity="0.4" />

          {/* ── Animated data flow on top + bottom spurs ── */}
          <line
            x1="20" y1="2.5" x2="20" y2="9"
            stroke="#22d3ee" strokeWidth="1.2"
            strokeDasharray="6 40"
            className="sf-flow1"
          />
          <line
            x1="20" y1="35.5" x2="20" y2="31"
            stroke="#22d3ee" strokeWidth="1.2"
            strokeDasharray="6 40"
            className="sf-flow2"
          />

          {/* ── Inner diamond frame ── */}
          <polygon
            points="20,9 31,20 20,31 9,20"
            stroke={`url(#${gradId})`} strokeWidth="1.1"
            fill="rgba(34,211,238,0.04)"
            opacity="0.9"
          />

          {/* ── Inner diamond vertex nodes ── */}
          <circle cx="20" cy="9"  r="1.2" fill="#22d3ee" opacity="0.95" />
          <circle cx="31" cy="20" r="1.2" fill="#22d3ee" opacity="0.95" />
          <circle cx="20" cy="31" r="1.2" fill="#22d3ee" opacity="0.95" />
          <circle cx="9"  cy="20" r="1.2" fill="#22d3ee" opacity="0.95" />

          {/* ── Cross-hairs inside diamond ── */}
          <line x1="20" y1="9"  x2="20" y2="31" stroke="#00b4d8" strokeWidth="0.4" opacity="0.18" />
          <line x1="9"  y1="20" x2="31" y2="20" stroke="#00b4d8" strokeWidth="0.4" opacity="0.18" />

          {/* ── Ripple ring around center ── */}
          <circle cx="20" cy="20" r="7" stroke="#22d3ee" strokeWidth="0.7" opacity="0.35" className="sf-ripple" />

          {/* ── Center core glow disc ── */}
          <circle cx="20" cy="20" r="5.5" fill={`url(#${glowId})`} opacity="0.5" />

          {/* ── Center core ── */}
          <circle cx="20" cy="20" r="3.8" fill={`url(#${coreId})`} className="sf-pulse"
            style={{ filter: "drop-shadow(0 0 4px #00b4d8)" }} />

          {/* ── Core highlight dot ── */}
          <circle cx="18.8" cy="18.8" r="1" fill="white" opacity="0.55" />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-1.5">
          <span
            className={`font-mono font-bold tracking-tight text-white select-none ${textSize} ${textClassName}`}
          >
            SpecForge
          </span>
          {showBeta && (
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                background: "rgba(0,180,216,0.12)",
                color: "hsl(191,100%,65%)",
                border: "1px solid rgba(0,180,216,0.25)",
              }}
            >
              BETA
            </span>
          )}
        </div>
      )}
    </div>
  );
}
