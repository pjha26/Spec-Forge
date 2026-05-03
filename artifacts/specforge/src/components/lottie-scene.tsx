/**
 * Lottie animation components.
 *
 * Uses lottie-react with hand-crafted inline Lottie JSON data so
 * animations always load — no network dependency.
 *
 * Included animations:
 *  - AIRadarPulse     — concentric rings expanding outward (hero badge)
 *  - DocGenLottie     — document lines being "written" (terminal area)
 *  - SuccessCheck     — self-drawing checkmark (CTA / features)
 *  - OrbitNodes       — 3 dots orbiting a central node (feature section)
 */

import { useRef } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";

// ── AI Radar Pulse ──────────────────────────────────────────────────────────
// Concentric rings that expand outward and fade, like a sonar/radar ping.
// Color: purple theme (#8B5CF6)
const AI_RADAR_DATA = {
  v: "5.9.4", fr: 30, ip: 0, op: 90, w: 300, h: 300,
  nm: "AI Radar", ddd: 0, assets: [],
  layers: [
    // Central glowing dot
    {
      ddd: 0, ind: 5, ty: 4, nm: "Core", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [60] }, { t: 45, s: [100] }, { t: 90, s: [60] }] },
        p: { a: 0, k: [150, 150, 0] }, a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] }, o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] }, t: 0, s: [90, 90, 100] },
          { i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] }, o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] }, t: 45, s: [110, 110, 100] },
          { t: 90, s: [90, 90, 100] },
        ]},
      },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [18, 18] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 }, r: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 0, op: 90, st: 0, bm: 0,
    },
    // Ring 1 – starts first, smallest
    {
      ddd: 0, ind: 1, ty: 4, nm: "Ring1", sr: 1,
      ks: {
        o: { a: 1, k: [
          { i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] }, t: 0, s: [75] },
          { t: 50, s: [0] },
        ]},
        p: { a: 0, k: [150, 150, 0] }, a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] }, o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] }, t: 0, s: [15, 15, 100] },
          { t: 50, s: [110, 110, 100] },
        ]},
      },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [200, 200] }, p: { a: 0, k: [0, 0] } },
        { ty: "st", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 1, lj: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 0, op: 50, st: 0, bm: 0,
    },
    // Ring 2 – starts 20f later
    {
      ddd: 0, ind: 2, ty: 4, nm: "Ring2", sr: 1,
      ks: {
        o: { a: 1, k: [
          { i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] }, t: 20, s: [75] },
          { t: 70, s: [0] },
        ]},
        p: { a: 0, k: [150, 150, 0] }, a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] }, o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] }, t: 20, s: [15, 15, 100] },
          { t: 70, s: [110, 110, 100] },
        ]},
      },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [200, 200] }, p: { a: 0, k: [0, 0] } },
        { ty: "st", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 1.5 }, lc: 1, lj: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 20, op: 70, st: 20, bm: 0,
    },
    // Ring 3 – starts 40f later
    {
      ddd: 0, ind: 3, ty: 4, nm: "Ring3", sr: 1,
      ks: {
        o: { a: 1, k: [
          { i: { x: [0.42], y: [1] }, o: { x: [0.58], y: [0] }, t: 40, s: [75] },
          { t: 90, s: [0] },
        ]},
        p: { a: 0, k: [150, 150, 0] }, a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] }, o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] }, t: 40, s: [15, 15, 100] },
          { t: 90, s: [110, 110, 100] },
        ]},
      },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [200, 200] }, p: { a: 0, k: [0, 0] } },
        { ty: "st", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 1 }, lc: 1, lj: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 40, op: 90, st: 40, bm: 0,
    },
  ],
};

// ── Success Checkmark ────────────────────────────────────────────────────────
// A checkmark that draws itself using a Trim Paths stroke animation.
const SUCCESS_CHECK_DATA = {
  v: "5.9.4", fr: 30, ip: 0, op: 60, w: 80, h: 80,
  nm: "Check", ddd: 0, assets: [],
  layers: [
    // Circle background
    {
      ddd: 0, ind: 2, ty: 4, nm: "Circle", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [0] }, { t: 10, s: [100] }] },
        p: { a: 0, k: [40, 40, 0] }, a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { i: { x: [0.34, 0.34, 0.34], y: [1.56, 1.56, 1] }, o: { x: [0.68, 0.68, 0.68], y: [0, 0, 0] }, t: 0, s: [0, 0, 100] },
          { t: 18, s: [100, 100, 100] },
        ]},
      },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [64, 64] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.129, 0.804, 0.396, 1] }, o: { a: 0, k: 15 }, r: 1 },
        { ty: "st", c: { a: 0, k: [0.129, 0.804, 0.396, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 }, lc: 1, lj: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 0, op: 60, st: 0, bm: 0,
    },
    // Checkmark stroke
    {
      ddd: 0, ind: 1, ty: 4, nm: "Check", sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 0, k: [40, 40, 0] }, a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [{ ty: "gr", it: [
        {
          ty: "sh", nm: "Path",
          ks: { a: 0, k: {
            i: [[0, 0], [0, 0], [0, 0]],
            o: [[0, 0], [0, 0], [0, 0]],
            v: [[-13, 1], [-4, 10], [14, -12]],
            c: false,
          }},
        },
        {
          ty: "tm", nm: "Trim",
          s: { a: 0, k: 0 },
          e: { a: 1, k: [
            { i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] }, t: 15, s: [0] },
            { t: 42, s: [100] },
          ]},
          o: { a: 0, k: 0 }, m: 1,
        },
        { ty: "st", c: { a: 0, k: [0.129, 0.804, 0.396, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 3.5 }, lc: 2, lj: 2 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 15, op: 60, st: 15, bm: 0,
    },
  ],
};

// ── Orbit Nodes ──────────────────────────────────────────────────────────────
// Three coloured nodes orbiting a central hub — representing multi-agent AI.
const ORBIT_NODES_DATA = {
  v: "5.9.4", fr: 30, ip: 0, op: 180, w: 240, h: 240,
  nm: "Orbit", ddd: 0, assets: [],
  layers: [
    // Hub
    {
      ddd: 0, ind: 5, ty: 4, nm: "Hub", sr: 1,
      ks: { o: { a: 0, k: 100 }, p: { a: 0, k: [120, 120, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [28, 28] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 }, r: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 0, op: 180, st: 0, bm: 0,
    },
    // Orbit ring
    {
      ddd: 0, ind: 4, ty: 4, nm: "Ring", sr: 1,
      ks: { o: { a: 0, k: 20 }, p: { a: 0, k: [120, 120, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [160, 160] }, p: { a: 0, k: [0, 0] } },
        { ty: "st", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 1.2 }, lc: 1, lj: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 0, op: 180, st: 0, bm: 0,
    },
    // Node A — purple
    {
      ddd: 0, ind: 1, ty: 4, nm: "NodeA", sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 1, k: [
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 0,   s: [200, 120, 0] },
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 45,  s: [120, 200, 0] },
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 90,  s: [40,  120, 0] },
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 135, s: [120, 40,  0] },
          { t: 180, s: [200, 120, 0] },
        ]},
        a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [18, 18] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.545, 0.361, 0.965, 1] }, o: { a: 0, k: 100 }, r: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 0, op: 180, st: 0, bm: 0,
    },
    // Node B — cyan
    {
      ddd: 0, ind: 2, ty: 4, nm: "NodeB", sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 1, k: [
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 0,   s: [40,  120, 0] },
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 45,  s: [120, 40,  0] },
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 90,  s: [200, 120, 0] },
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 135, s: [120, 200, 0] },
          { t: 180, s: [40, 120, 0] },
        ]},
        a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [18, 18] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.024, 0.714, 0.835, 1] }, o: { a: 0, k: 100 }, r: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 0, op: 180, st: 0, bm: 0,
    },
    // Node C — emerald
    {
      ddd: 0, ind: 3, ty: 4, nm: "NodeC", sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        p: { a: 1, k: [
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 0,   s: [120, 200, 0] },
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 45,  s: [200, 120, 0] },
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 90,  s: [120, 40,  0] },
          { i: { x: 0.5, y: 0.5 }, o: { x: 0.5, y: 0.5 }, t: 135, s: [40,  120, 0] },
          { t: 180, s: [120, 200, 0] },
        ]},
        a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [{ ty: "gr", it: [
        { ty: "el", s: { a: 0, k: [18, 18] }, p: { a: 0, k: [0, 0] } },
        { ty: "fl", c: { a: 0, k: [0.204, 0.827, 0.604, 1] }, o: { a: 0, k: 100 }, r: 1 },
        { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ]}],
      ip: 0, op: 180, st: 0, bm: 0,
    },
  ],
};

// ── Exported components ───────────────────────────────────────────────────────

export function AIRadarPulse({ size = 140, className = "" }: { size?: number; className?: string }) {
  const ref = useRef<LottieRefCurrentProps>(null);
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie
        lottieRef={ref}
        animationData={AI_RADAR_DATA}
        loop
        autoplay
        style={{ width: size, height: size }}
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
    </div>
  );
}

export function SuccessCheck({ size = 72, className = "" }: { size?: number; className?: string }) {
  const ref = useRef<LottieRefCurrentProps>(null);
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie
        lottieRef={ref}
        animationData={SUCCESS_CHECK_DATA}
        loop={false}
        autoplay
        style={{ width: size, height: size }}
      />
    </div>
  );
}

export function OrbitNodes({ size = 180, className = "" }: { size?: number; className?: string }) {
  const ref = useRef<LottieRefCurrentProps>(null);
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie
        lottieRef={ref}
        animationData={ORBIT_NODES_DATA}
        loop
        autoplay
        style={{ width: size, height: size }}
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
    </div>
  );
}
