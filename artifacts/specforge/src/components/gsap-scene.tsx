/**
 * GSAP-powered animation components for the landing page.
 *
 * Includes:
 *  - ScrambleText        — hero word scrambles through random chars before resolving
 *  - HorizontalScroll    — ScrollTrigger pin: vertical scroll drives horizontal features carousel
 *  - MorphBlob           — SVG clip-path that morphs between organic shapes continuously
 *  - GSAPScrollReveal    — staggered reveal controlled by GSAP ScrollTrigger
 *  - GSAPCounter         — number counts up on scroll entry with GSAP
 *  - CursorTrail         — 12-dot GPU-composited cursor trail
 */

import { useEffect, useRef, useState, type ElementType } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, TextPlugin, useGSAP);

// ── helpers ──────────────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&";
const rand  = (arr: string) => arr[Math.floor(Math.random() * arr.length)];

// ── ScrambleText ──────────────────────────────────────────────────────────────
/**
 * Renders `text` but every character scrambles through random glyphs
 * before resolving to the real character — timed so characters resolve
 * from left to right, giving a "decoding" feel.
 */
export function ScrambleText({
  text,
  delay = 0.3,
  className = "",
  tag: Tag = "span",
}: {
  text: string;
  delay?: number;
  className?: string;
  tag?: ElementType;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Build per-character spans
    const chars = text.split("").map((ch, i) => {
      const span = document.createElement("span");
      span.textContent = ch === " " ? "\u00a0" : rand(CHARS);
      span.dataset.final = ch === " " ? "\u00a0" : ch;
      span.dataset.idx   = String(i);
      return span;
    });
    el.innerHTML = "";
    chars.forEach(s => el.appendChild(s));

    // Stagger resolve
    const total   = text.length;
    const perChar = 0.045;
    const scramDur = 0.35;

    chars.forEach((span, i) => {
      let ticks = 0;
      const maxTicks = Math.floor((i / total) * 14) + 8;
      let scramInterval: ReturnType<typeof setInterval>;

      const startAt = delay + i * perChar;

      const t = setTimeout(() => {
        scramInterval = setInterval(() => {
          if (ticks >= maxTicks) {
            clearInterval(scramInterval);
            span.textContent = span.dataset.final!;
            return;
          }
          span.textContent = rand(CHARS);
          ticks++;
        }, scramDur * 1000 / maxTicks);
      }, startAt * 1000);

      (span as any)._cleanup = () => { clearTimeout(t); clearInterval(scramInterval); };
    });

    return () => { chars.forEach(s => (s as any)._cleanup?.()); };
  }, [text, delay]);

  return (
    <Tag>
      <span ref={containerRef} className={className} />
    </Tag>
  );
}

// ── MorphBlob ─────────────────────────────────────────────────────────────────
/**
 * An SVG shape layer that continuously morphs between 5 organic blob paths
 * using GSAP's native path interpolation via CSS clip-path.
 */
const BLOB_PATHS = [
  "M60,10 C80,0 95,15 95,30 C95,50 85,65 70,75 C55,85 35,90 20,75 C5,60 0,40 10,20 C20,0 40,20 60,10 Z",
  "M55,5  C78,2 98,20 98,40 C98,60 80,80 58,88 C36,96 10,85 3,60  C-4,35 15,8  55,5  Z",
  "M50,8  C75,5 100,25 95,50 C90,75 65,92 40,90 C15,88 0,65  5,40  C10,15 25,11 50,8  Z",
  "M45,12 C70,8 95,28 92,55 C89,82 62,95 38,92 C14,89 -5,68  2,42  C9,16 20,16 45,12 Z",
  "M58,8  C82,4 100,22 97,48 C94,74 72,90 48,92 C24,94 2,78  1,50  C0,22 34,12 58,8  Z",
];

export function MorphBlob({
  size = 520,
  color = "rgba(var(--primary-rgb),0.15)",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const idxRef  = useRef(0);

  useGSAP(() => {
    const el = pathRef.current;
    if (!el) return;

    const morph = () => {
      idxRef.current = (idxRef.current + 1) % BLOB_PATHS.length;
      gsap.to(el, {
        attr: { d: BLOB_PATHS[idxRef.current] },
        duration: 4,
        ease: "sine.inOut",
        onComplete: morph,
      });
    };

    // start after short delay so first render is clean
    gsap.delayedCall(0.5, morph);
  }, []);

  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ filter: `blur(${size * 0.08}px)` }}>
        <path ref={pathRef} d={BLOB_PATHS[0]} fill={color} />
      </svg>
    </div>
  );
}

// ── HorizontalScroll ──────────────────────────────────────────────────────────
/**
 * Pins the section while the user scrolls, then drives a horizontal
 * carousel through all feature cards. Feels like native iOS scroll snapping
 * but entirely GSAP-controlled.
 */
export interface FeatureCard {
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
  tag: string;
}

export function HorizontalScroll({ cards }: { cards: FeatureCard[] }) {
  const sectionRef  = useRef<HTMLDivElement>(null);
  const trackRef    = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(() => {
    const section = sectionRef.current;
    const track   = trackRef.current;
    if (!section || !track) return;

    const cardWidth  = track.children[0]?.clientWidth ?? 340;
    const gap        = 24;
    const totalScroll = (cardWidth + gap) * (cards.length - 1);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end:   `+=${totalScroll + window.innerHeight * 0.5}`,
          pin:   true,
          scrub: 1.2,
          anticipatePin: 1,
          onUpdate: (self) => {
            const idx = Math.round(self.progress * (cards.length - 1));
            setActive(idx);
          },
        },
      });

      tl.to(track, {
        x: -totalScroll,
        ease: "none",
      });
    }, section);

    return () => ctx.revert();
  }, { scope: sectionRef, dependencies: [cards.length] });

  return (
    <section ref={sectionRef} className="relative overflow-hidden" style={{ background: "#07070f" }}>
      {/* Section label */}
      <div className="relative z-20 px-8 pt-16 pb-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest"
              style={{ color: "rgba(var(--primary-rgb),0.8)" }}>
              Features — scroll to explore
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mt-2 text-white">
              Built for real engineers
            </h2>
          </div>
          {/* Dot progress */}
          <div className="hidden md:flex items-center gap-2">
            {cards.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width:      i === active ? 24 : 6,
                  height:     6,
                  background: i === active ? "hsl(var(--primary))" : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Track */}
      <div className="px-8 pb-20 overflow-visible">
        <div
          ref={trackRef}
          className="flex gap-6 will-change-transform"
          style={{ width: "max-content" }}
        >
          {cards.map((card, i) => (
            <div
              key={i}
              className="shrink-0 rounded-2xl p-7 flex flex-col gap-5 transition-all duration-500"
              style={{
                width: 340,
                background: i === active
                  ? `linear-gradient(135deg, ${card.color}22, ${card.color}08)`
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${i === active ? card.color + "40" : "rgba(255,255,255,0.06)"}`,
                boxShadow: i === active ? `0 0 40px ${card.color}20` : "none",
                transform: `scale(${i === active ? 1 : 0.96})`,
              }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `${card.color}18`, border: `1px solid ${card.color}25` }}
              >
                {card.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold text-white">{card.title}</h3>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded border"
                    style={{ color: card.color, background: `${card.color}12`, borderColor: `${card.color}30` }}
                  >
                    {card.tag}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {card.desc}
                </p>
              </div>
              {/* Progress bar that fills on active card */}
              <div className="mt-auto h-px rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: i === active ? "100%" : "0%",
                    background: `linear-gradient(90deg, ${card.color}, ${card.color}80)`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── GSAPScrollReveal ──────────────────────────────────────────────────────────
/**
 * Wraps children in a GSAP ScrollTrigger reveal.
 * Each direct child animates in with a stagger.
 */
export function GSAPScrollReveal({
  children,
  stagger = 0.1,
  y = 48,
  className = "",
}: {
  children: React.ReactNode;
  stagger?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const items = Array.from(el.children);

    gsap.fromTo(
      items,
      { opacity: 0, y, filter: "blur(8px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        stagger,
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      }
    );
  }, { scope: ref });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ── GSAPCounter ───────────────────────────────────────────────────────────────
/** Number that counts up from 0 using GSAP when it enters the viewport. */
export function GSAPCounter({
  to,
  suffix = "",
  duration = 2,
  className = "",
}: {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const obj = useRef({ val: 0 });

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    gsap.fromTo(
      obj.current,
      { val: 0 },
      {
        val: to,
        duration,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none none",
        },
        onUpdate() {
          if (el) el.textContent = `${Math.round(obj.current.val)}${suffix}`;
        },
        onComplete() {
          if (el) el.textContent = `${to}${suffix}`;
        },
      }
    );
  }, { scope: ref });

  return <span ref={ref} className={className}>0{suffix}</span>;
}

// ── CursorTrail ───────────────────────────────────────────────────────────────
/**
 * 12 GPU-composited dots that trail behind the cursor.
 * Each dot follows the previous with increasing lag — like a comet tail.
 */
export function CursorTrail() {
  const dotsRef = useRef<HTMLDivElement[]>([]);
  const pos     = useRef({ x: -200, y: -200 });
  const chain   = useRef<Array<{ x: number; y: number }>>([]);
  const COUNT   = 12;

  useEffect(() => {
    // initialize chain
    chain.current = Array.from({ length: COUNT }, () => ({ x: -200, y: -200 }));

    const onMove = (e: MouseEvent) => { pos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMove, { passive: true });

    let raf: number;
    const tick = () => {
      chain.current[0].x += (pos.current.x - chain.current[0].x) * 0.28;
      chain.current[0].y += (pos.current.y - chain.current[0].y) * 0.28;

      for (let i = 1; i < COUNT; i++) {
        chain.current[i].x += (chain.current[i - 1].x - chain.current[i].x) * 0.25;
        chain.current[i].y += (chain.current[i - 1].y - chain.current[i].y) * 0.25;
      }

      dotsRef.current.forEach((dot, i) => {
        if (!dot) return;
        const { x, y } = chain.current[i];
        const scale = 1 - i / COUNT;
        gsap.set(dot, {
          x: x - 4,
          y: y - 4,
          scale,
          opacity: (1 - i / COUNT) * 0.55,
        });
      });
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[999]" aria-hidden>
      {Array.from({ length: COUNT }, (_, i) => (
        <div
          key={i}
          ref={el => { if (el) dotsRef.current[i] = el; }}
          className="absolute w-2 h-2 rounded-full will-change-transform"
          style={{ background: `hsl(${265 + i * 4},85%,${70 - i * 2}%)` }}
        />
      ))}
    </div>
  );
}
