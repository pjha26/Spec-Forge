import {
  useEffect, useRef, useState, useCallback, useMemo,
} from "react";
import { Link } from "wouter";
import {
  motion, useScroll, useTransform, useSpring,
  useMotionValue, useInView, AnimatePresence, animate,
} from "framer-motion";
import {
  Terminal, ArrowRight, Github, Zap, Network, Bot,
  ChevronRight, Star, Shield, GitBranch, Layers,
} from "lucide-react";
import {
  ScrambleText, HorizontalScroll, MorphBlob,
  GSAPScrollReveal, GSAPCounter, CursorTrail,
  type FeatureCard,
} from "@/components/gsap-scene";
import { AIRadarPulse, SuccessCheck, OrbitNodes } from "@/components/lottie-scene";
import {
  MatrixRain, DevHUD, AchievementSystem, GlitchOverlay,
  CommandsSection, FloatingCode, XPBar,
} from "@/components/gaming-scene";

// ── Typewriter ──────────────────────────────────────────────────────────────
const SPEC_TYPES = ["System Design Docs", "API Blueprints", "Database Schemas", "Feature Specs"];

function useTypewriter(words: string[], speed = 72, pause = 2000) {
  const [displayed, setDisplayed] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[wordIdx];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && charIdx < word.length)      t = setTimeout(() => setCharIdx(c => c + 1), speed);
    else if (!deleting && charIdx === word.length) t = setTimeout(() => setDeleting(true), pause);
    else if (deleting && charIdx > 0)             t = setTimeout(() => setCharIdx(c => c - 1), speed / 2.5);
    else { setDeleting(false); setWordIdx(i => (i + 1) % words.length); }
    setDisplayed(word.slice(0, charIdx));
    return () => clearTimeout(t);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);
  return displayed;
}

// ── Neural Particle Canvas ──────────────────────────────────────────────────
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const N = 68;
    type Particle = {
      x: number; y: number; vx: number; vy: number;
      r: number; baseX: number; baseY: number;
    };
    const pts: Particle[] = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.2 + Math.random() * 1.4,
      baseX: 0, baseY: 0,
    }));
    pts.forEach(p => { p.baseX = p.x; p.baseY = p.y; });

    const CONN_DIST = 130;
    const MOUSE_DIST = 160;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouse.current.x;
      const my = mouse.current.y;

      for (const p of pts) {
        // mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_DIST) {
          const force = (MOUSE_DIST - dist) / MOUSE_DIST;
          p.vx += dx / dist * force * 0.6;
          p.vy += dy / dist * force * 0.6;
        }
        // spring back
        p.vx += (p.baseX - p.x) * 0.003;
        p.vy += (p.baseY - p.y) * 0.003;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.x += p.vx;
        p.y += p.vy;
      }

      // Connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONN_DIST) {
            const alpha = (1 - d / CONN_DIST) * 0.28;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Dots
      for (const p of pts) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const near = Math.sqrt(dx * dx + dy * dy) < MOUSE_DIST * 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (near ? 1.2 : 0), 0, Math.PI * 2);
        ctx.fillStyle = near
          ? "rgba(192,132,252,0.9)"
          : "rgba(139,92,246,0.55)";
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    window.addEventListener("mousemove", handleMove);
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.65 }}
    />
  );
}

// ── Floating Orbs ──────────────────────────────────────────────────────────
function FloatingOrbs() {
  const orbs = useMemo(() => [
    { size: 520, x: "55%",  y: "-10%", color: "hsl(270,100%,60%)", delay: 0,   dur: 18 },
    { size: 380, x: "8%",   y: "20%",  color: "hsl(200,100%,60%)", delay: 3,   dur: 22 },
    { size: 300, x: "80%",  y: "5%",   color: "hsl(310,100%,55%)", delay: 1.5, dur: 16 },
    { size: 240, x: "20%",  y: "60%",  color: "hsl(180,100%,50%)", delay: 4,   dur: 20 },
    { size: 200, x: "70%",  y: "55%",  color: "hsl(250,100%,65%)", delay: 2,   dur: 24 },
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: o.size, height: o.size,
            left: o.x, top: o.y,
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            opacity: 0.09,
            filter: "blur(1px)",
          }}
          animate={{
            x: [0, 40, -30, 20, 0],
            y: [0, -50, 30, -20, 0],
            scale: [1, 1.08, 0.95, 1.04, 1],
          }}
          transition={{
            duration: o.dur,
            delay: o.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Magnetic Button ────────────────────────────────────────────────────────
function MagneticButton({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 180, damping: 14 });
  const y = useSpring(0, { stiffness: 180, damping: 14 });

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.38);
    y.set((e.clientY - cy) * 0.38);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ x, y }}>
      <div className={className} style={style}>{children}</div>
    </motion.div>
  );
}

// ── 3D Tilt Card ───────────────────────────────────────────────────────────
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(0, { stiffness: 200, damping: 18 });
  const rotateY = useSpring(0, { stiffness: 200, damping: 18 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    rotateY.set((px - 0.5) * 20);
    rotateX.set((0.5 - py) * 16);
    glowX.set(px * 100);
    glowY.set(py * 100);
  };
  const onLeave = () => { rotateX.set(0); rotateY.set(0); glowX.set(50); glowY.set(50); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 900, transformStyle: "preserve-3d" }}
      className={`relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm cursor-default ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl z-0"
        style={{
          background: useTransform(
            [glowX, glowY],
            ([gx, gy]) =>
              `radial-gradient(380px circle at ${gx}% ${gy}%, rgba(139,92,246,0.14), transparent 65%)`
          ),
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// ── Word Reveal ─────────────────────────────────────────────────────────────
function WordReveal({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const words = text.split(" ");
  return (
    <span ref={ref} className={className} style={{ display: "inline" }}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}
        >
          <motion.span
            style={{ display: "inline-block" }}
            initial={{ y: "110%", opacity: 0 }}
            animate={inView ? { y: "0%", opacity: 1 } : {}}
            transition={{
              duration: 0.55,
              delay: delay + i * 0.07,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {w}{i < words.length - 1 ? "\u00a0" : ""}
          </motion.span>
        </motion.span>
      ))}
    </span>
  );
}

// ── Beam Spotlight ────────────────────────────────────────────────────────
function PageBeam() {
  const bx = useMotionValue(-600);
  const by = useMotionValue(-600);
  const sx = useSpring(bx, { stiffness: 60, damping: 20 });
  const sy = useSpring(by, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => { bx.set(e.clientX); by.set(e.clientY); };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [bx, by]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
      style={{
        background: useTransform(
          [sx, sy],
          ([mx, my]) =>
            `radial-gradient(520px circle at ${mx}px ${my}px, rgba(139,92,246,0.045), transparent 65%)`
        ),
      }}
    />
  );
}

// ── Live Activity Feed ─────────────────────────────────────────────────────
const ACTIVITY = [
  "system_design spec generated for auth-service",
  "API blueprint created for payment gateway",
  "DB schema generated for e-commerce platform",
  "Feature spec exported to Notion",
  "Complexity score: 8/10 for microservices arch",
  "Architecture diagram rendered (Mermaid)",
  "PR agent analyzed 42 changed files",
  "GitHub webhook triggered — re-sync complete",
  "system_design spec for real-time collab app",
  "API blueprint for analytics dashboard",
];

function LiveActivityTicker() {
  const [items, setItems] = useState<Array<{ id: number; text: string }>>(() =>
    ACTIVITY.slice(0, 4).map((text, id) => ({ id, text }))
  );
  const idRef = useRef(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const text = ACTIVITY[Math.floor(Math.random() * ACTIVITY.length)];
      const id = idRef.current++;
      setItems(prev => [{ id, text }, ...prev].slice(0, 5));
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-black/40 backdrop-blur-xl p-4 min-h-[200px]"
      style={{ boxShadow: "0 0 40px rgba(139,92,246,0.08) inset, 0 0 0 1px rgba(139,92,246,0.08)" }}
    >
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/6">
        <motion.div
          className="w-2 h-2 rounded-full bg-green-400"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Live activity</span>
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map(item => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -16, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-2 text-[11px] font-mono"
            >
              <span className="text-purple-400 shrink-0 mt-0.5">›</span>
              <span className="text-muted-foreground leading-relaxed">{item.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Scroll progress bar ────────────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
      style={{
        scaleX,
        background: "linear-gradient(90deg, hsl(270,100%,65%), hsl(200,100%,65%))",
      }}
    />
  );
}

// ── CountUp ────────────────────────────────────────────────────────────────
function CountUp({ to, duration = 1600 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setCount(Math.round(eased * to));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);
  return <span ref={ref}>{count.toLocaleString()}</span>;
}

// ── Floating Tech Badges ───────────────────────────────────────────────────
function FloatingBadges() {
  const badges = [
    { label: "Claude Sonnet 4", x: "-15%", y: "25%",  delay: 0   },
    { label: "Mermaid.js",      x: "108%", y: "18%",  delay: 0.6 },
    { label: "PostgreSQL",      x: "-12%", y: "68%",  delay: 1.2 },
    { label: "TypeScript",      x: "105%", y: "72%",  delay: 0.3 },
    { label: "GPT-5.4",         x: "40%",  y: "-8%",  delay: 0.9 },
  ];

  return (
    <>
      {badges.map((b, i) => (
        <motion.div
          key={i}
          className="absolute hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-[11px] font-mono text-muted-foreground whitespace-nowrap"
          style={{ left: b.x, top: b.y }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0, 0.8, 0.8, 0.6, 0.8],
            scale: 1,
            y: [0, -8, 0, 6, 0],
          }}
          transition={{
            opacity: { delay: b.delay + 1, duration: 0.5 },
            scale:   { delay: b.delay + 1, duration: 0.5 },
            y: {
              delay: b.delay + 1.5,
              duration: 6 + i,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400/70" />
          {b.label}
        </motion.div>
      ))}
    </>
  );
}

// ── Animated Terminal ──────────────────────────────────────────────────────
function TerminalWindow() {
  const lines = [
    { t: 0.3,  text: "> specforge generate --type system_design", color: "#a78bfa" },
    { t: 0.9,  text: "✓ Scanning repository structure...",        color: "#6b7280" },
    { t: 1.35, text: "✓ Analysing components & dependencies...",  color: "#6b7280" },
    { t: 1.8,  text: "✓ Generating architecture diagram...",      color: "#6b7280" },
    { t: 2.25, text: "✓ Running complexity analysis...",          color: "#6b7280" },
    { t: 2.8,  text: "✓ Spec generated  [complexity: 7/10]",     color: "#34d399" },
    { t: 3.1,  text: "  → System Design Document",               color: "#60a5fa" },
    { t: 3.28, text: "  → Architecture Diagram (Mermaid)",        color: "#60a5fa" },
    { t: 3.46, text: "  → Tech Debt Report (3 risks found)",     color: "#fbbf24" },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
      style={{ boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.12) inset" }}
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.04] border-b border-white/6">
        <motion.span className="w-3 h-3 rounded-full bg-red-500/80"    whileHover={{ scale: 1.3 }} />
        <motion.span className="w-3 h-3 rounded-full bg-yellow-500/80" whileHover={{ scale: 1.3 }} />
        <motion.span className="w-3 h-3 rounded-full bg-green-500/80"  whileHover={{ scale: 1.3 }} />
        <span className="ml-3 text-xs font-mono text-muted-foreground/60">specforge — terminal</span>
      </div>
      <div className="bg-[#06060f] p-5 font-mono text-sm min-h-[230px] space-y-1.5">
        {lines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: line.t, duration: 0.25, ease: "easeOut" }}
            style={{ color: line.color }}
          >
            {line.text}
          </motion.p>
        ))}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ delay: 3.7, duration: 0.8, repeat: Infinity }}
          className="inline-block w-2 h-[15px] rounded-sm align-middle"
          style={{ background: "#a78bfa" }}
        />
      </div>
    </div>
  );
}

// ── Parallax section wrapper ───────────────────────────────────────────────
function ParallaxSection({ children, speed = 0.3, className = "" }: {
  children: React.ReactNode; speed?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 80}px`, `${speed * 80}px`]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

// ── Grain overlay ────────────────────────────────────────────────────────
function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.025]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
      }}
    />
  );
}

// ── Feature data ────────────────────────────────────────────────────────────
const features = [
  {
    icon: <Zap className="w-5 h-5" style={{ color: "#a78bfa" }} />,
    color: "#7c3aed",
    title: "Complexity Analysis",
    desc: "Instant 1–10 complexity score with tech debt risks, severity prioritisation, and suggested mitigations.",
    tag: "AI Analysis",
    glow: "rgba(124,58,237,0.18)",
  },
  {
    icon: <Network className="w-5 h-5" style={{ color: "#60a5fa" }} />,
    color: "#2563eb",
    title: "Architecture Diagrams",
    desc: "Auto-generated Mermaid.js flowcharts, sequence diagrams, and ER diagrams — rendered in milliseconds.",
    tag: "Visual",
    glow: "rgba(37,99,235,0.18)",
  },
  {
    icon: <Bot className="w-5 h-5" style={{ color: "#34d399" }} />,
    color: "#059669",
    title: "Ask Your Doc",
    desc: "Chat with Claude about your spec — trade-offs, edge cases, implementation details, anything.",
    tag: "Chat",
    glow: "rgba(5,150,105,0.18)",
  },
  {
    icon: <Shield className="w-5 h-5" style={{ color: "#f59e0b" }} />,
    color: "#d97706",
    title: "Team Collaboration",
    desc: "Shared workspaces, annotation threads, AI audit runs, and role-based access control.",
    tag: "Teams",
    glow: "rgba(217,119,6,0.18)",
  },
  {
    icon: <GitBranch className="w-5 h-5" style={{ color: "#f472b6" }} />,
    color: "#db2777",
    title: "GitHub Auto-sync",
    desc: "Webhooks keep your spec in sync when code changes — commit SPEC.md back to the repo automatically.",
    tag: "Git",
    glow: "rgba(219,39,119,0.18)",
  },
  {
    icon: <Layers className="w-5 h-5" style={{ color: "#22d3ee" }} />,
    color: "#0891b2",
    title: "Multi-format Export",
    desc: "Export to Markdown, DOCX, Notion, or PDF. Version history snapshots every generation.",
    tag: "Export",
    glow: "rgba(8,145,178,0.18)",
  },
];

// ── GSAP feature cards (maps existing feature data to FeatureCard interface) ─
const GSAP_FEATURE_CARDS: FeatureCard[] = [
  { icon: <Zap className="w-6 h-6" style={{ color: "#a78bfa" }} />,    color: "#7c3aed", title: "Complexity Analysis",   desc: "Instant 1–10 complexity score with tech-debt risks, severity prioritisation, and suggested mitigations.", tag: "AI Analysis" },
  { icon: <Network className="w-6 h-6" style={{ color: "#60a5fa" }} />, color: "#2563eb", title: "Architecture Diagrams", desc: "Auto-generated Mermaid flowcharts, sequence diagrams, and ER diagrams — rendered in milliseconds.",         tag: "Visual" },
  { icon: <Bot className="w-6 h-6" style={{ color: "#34d399" }} />,     color: "#059669", title: "Ask Your Doc",          desc: "Chat with Claude about your spec — trade-offs, edge cases, implementation details, anything.",            tag: "Chat" },
  { icon: <Shield className="w-6 h-6" style={{ color: "#f59e0b" }} />,  color: "#d97706", title: "Team Collaboration",    desc: "Shared workspaces, annotation threads, AI audit runs, and role-based access control.",                    tag: "Teams" },
  { icon: <GitBranch className="w-6 h-6" style={{ color: "#f472b6" }} />, color: "#db2777", title: "GitHub Auto-sync",    desc: "Webhooks keep your spec in sync when code changes — commit SPEC.md back to the repo automatically.",      tag: "Git" },
  { icon: <Layers className="w-6 h-6" style={{ color: "#22d3ee" }} />,  color: "#0891b2", title: "Multi-format Export",  desc: "Export to Markdown, DOCX, Notion, or PDF. Version history snapshots every generation.",                  tag: "Export" },
];

// ── Main Landing ────────────────────────────────────────────────────────────
export default function Landing() {
  const typed = useTypewriter(SPEC_TYPES);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY  = useTransform(heroScroll, [0, 1], ["0%", "28%"]);
  const heroO  = useTransform(heroScroll, [0, 0.7], [1, 0]);

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden" style={{ background: "#05050d" }}>
      <CursorTrail />
      <GrainOverlay />
      <PageBeam />
      <ScrollProgress />
      {/* ── Gaming HUD overlays (fixed, always visible) ─── */}
      <DevHUD />
      <AchievementSystem />
      <XPBar />

      <style>{`
        @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
        .shimmer-text {
          background: linear-gradient(90deg, hsl(270,100%,78%) 0%, hsl(195,100%,78%) 35%, hsl(310,100%,78%) 65%, hsl(270,100%,78%) 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        @keyframes borderBeam {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .border-beam {
          background: linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.7) 40%, rgba(96,165,250,0.7) 60%, transparent 100%);
          background-size: 200% 100%;
          animation: borderBeam 2.8s linear infinite;
        }
        @keyframes rotateHue { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
        .glow-ring { animation: rotateHue 8s linear infinite; }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-2 inset-x-4 md:inset-x-8 z-50 flex items-center justify-between px-5 py-3 rounded-2xl border border-white/8 bg-black/50 backdrop-blur-xl"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset" }}
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
            transition={{ duration: 0.4 }}
          >
            <Terminal className="w-3.5 h-3.5 text-white" />
          </motion.div>
          <span className="font-mono font-bold text-sm tracking-tight">SpecForge</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">BETA</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/specs">
            <motion.span
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-mono hidden sm:block"
              whileHover={{ x: 2 }}
            >
              History
            </motion.span>
          </Link>
          <Link href="/app">
            <MagneticButton className="inline-flex items-center gap-2 text-white text-sm font-mono px-4 py-2 rounded-xl transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 24px rgba(124,58,237,0.35)" } as React.CSSProperties}
            >
              Launch App <ArrowRight className="w-3.5 h-3.5" />
            </MagneticButton>
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-6 overflow-hidden" style={{ position: "relative" }}>
        <FloatingOrbs />
        <NeuralCanvas />
        {/* Gaming: matrix rain (subtle, purple/cyan themed) */}
        <MatrixRain opacity={0.13} />
        {/* Gaming: floating code fragments drifting in background */}
        <FloatingCode />
        {/* GSAP morphing blobs in background */}
        <MorphBlob size={600} color="rgba(124,58,237,0.12)" className="absolute -top-20 -left-32 pointer-events-none" />
        <MorphBlob size={420} color="rgba(37,99,235,0.10)" className="absolute bottom-0 right-0 pointer-events-none" />
        {/* Lottie AI radar — floats top-right of hero */}
        <AIRadarPulse size={160} className="absolute top-28 right-8 md:right-16 opacity-60 pointer-events-none hidden md:block" />

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 30%, transparent 100%)",
          }}
        />

        <motion.div
          className="relative z-10 max-w-5xl mx-auto text-center"
          style={{ y: heroY, opacity: heroO }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/6 text-purple-300 text-xs font-mono mb-10 relative overflow-hidden"
          >
            <div className="absolute inset-x-0 bottom-0 h-px border-beam" />
            <Star className="w-3 h-3 fill-current" />
            AI-powered technical documentation
          </motion.div>

          {/* Hero headline */}
          <div className="text-5xl md:text-7xl lg:text-[88px] font-bold tracking-tight leading-[1.04] mb-7 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <GlitchOverlay>
                <ScrambleText text="Generate" delay={0.6} className="text-white" />
              </GlitchOverlay>
            </motion.div>
            <div>
              <span className="shimmer-text">{typed || "\u00a0"}</span>
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                className="inline-block w-[3px] h-[0.82em] ml-1 align-middle rounded-sm"
                style={{ background: "#a78bfa" }}
              />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              in seconds.
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Drop in a GitHub URL or describe your project. SpecForge uses Claude AI to produce
            professional technical specs, architecture diagrams, and complexity reports — instantly.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/app">
              <MagneticButton>
                <motion.div
                  className="relative inline-flex items-center gap-3 text-white font-mono text-base px-8 py-4 rounded-2xl overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "linear-gradient(135deg, #6d28d9 0%, #3730a3 100%)" }}
                  />
                  <Terminal className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Start Generating</span>
                  <ChevronRight className="w-4 h-4 relative z-10" />
                  <div className="absolute -inset-1 rounded-2xl opacity-60 blur-lg -z-10"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                  />
                </motion.div>
              </MagneticButton>
            </Link>
            <Link href="/app/specs">
              <motion.span
                whileHover={{ scale: 1.03, borderColor: "rgba(139,92,246,0.4)" }}
                whileTap={{ scale: 0.97 }}
                className="cursor-pointer inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] text-white/80 font-mono text-base px-8 py-4 rounded-2xl transition-colors"
              >
                <Github className="w-4 h-4" />
                View Examples
              </motion.span>
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex items-center justify-center gap-6 mt-8 text-xs font-mono"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {["No signup required", "Powered by Claude AI", "Free to use"].map((t, i) => (
              <motion.span
                key={i}
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + i * 0.12 }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {t}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>

        {/* Hero visuals: terminal + live feed */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-4xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-5 gap-5"
        >
          <div className="md:col-span-3 relative">
            <FloatingBadges />
            <TerminalWindow />
          </div>
          <div className="md:col-span-2">
            <LiveActivityTicker />
          </div>
          <div className="absolute -inset-8 rounded-3xl opacity-30 blur-3xl pointer-events-none -z-10"
            style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.25) 0%, transparent 70%)" }}
          />
        </motion.div>
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <section className="relative py-16 overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(124,58,237,0.05), transparent)" }} />
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
          {[
            { val: 4,   suffix: " types", label: "Spec formats" },
            { val: 10,  suffix: "/10",    label: "Max complexity" },
            { val: 30,  suffix: "s",      label: "Avg generation" },
            { val: 100, suffix: "%",      label: "AI-generated" },
          ].map((s, i) => (
            <div key={i} className="space-y-1">
              <div className="text-4xl md:text-5xl font-bold font-mono shimmer-text">
                <GSAPCounter to={s.val} suffix={s.suffix} duration={1.8} />
              </div>
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features — GSAP horizontal scroll ──────────────── */}
      <HorizontalScroll cards={GSAP_FEATURE_CARDS} />

      {/* ── How it works ────────────────────────────────────── */}
      <section className="py-28 px-6 relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(124,58,237,0.06), transparent)" }}
        />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block text-xs font-mono uppercase tracking-widest text-purple-400 mb-4 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5"
            >
              How It Works
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-bold">
              <WordReveal text="Three steps to a spec" delay={0.05} />
            </h2>
          </div>

          {/* Lottie orbit nodes — decorative, floats beside the steps */}
          <div className="flex justify-center mb-8">
            <OrbitNodes size={180} />
          </div>

          {/* Steps with connecting line — wrapped in GSAP stagger reveal */}
          <div className="relative space-y-6">
            <div className="hidden md:block absolute left-[calc(50%-0.5px)] top-10 bottom-10 w-px"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(124,58,237,0.5) 20%, rgba(124,58,237,0.5) 80%, transparent)" }}
            />

            <GSAPScrollReveal stagger={0.18} y={56}>
              {[
                { n: "01", title: "Input your project",  desc: "Paste a GitHub URL or describe your project in plain English." },
                { n: "02", title: "Pick a spec type",    desc: "System design, API design, database schema, or feature spec." },
                { n: "03", title: "Get your docs",       desc: "Receive a full technical document, diagram, and complexity report in seconds." },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-6 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
                >
                  <TiltCard className={`flex-1 p-6 ${i % 2 === 1 ? "md:text-right" : ""}`}>
                    <span className="font-mono text-5xl font-bold" style={{ color: "rgba(124,58,237,0.22)" }}>{s.n}</span>
                    <h3 className="text-xl font-bold mt-1 mb-2">{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{s.desc}</p>
                  </TiltCard>

                  <motion.div
                    className="hidden md:flex w-12 h-12 rounded-full items-center justify-center shrink-0 relative z-10 font-mono font-bold text-sm text-white"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 28px rgba(124,58,237,0.5)" }}
                    whileHover={{ scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {i + 1}
                  </motion.div>

                  <div className="hidden md:block flex-1" />
                </div>
              ))}
            </GSAPScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Spec types ────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block text-xs font-mono uppercase tracking-widest text-purple-400 mb-4 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/5"
            >
              Spec Types
            </motion.div>
            <h2 className="text-4xl md:text-5xl font-bold">
              <WordReveal text="Built for every stage" delay={0.05} />
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: "⚙️", label: "System Design",   desc: "Architecture, component interactions, data flow", color: "#7c3aed" },
              { emoji: "🔗", label: "API Design",       desc: "Endpoints, auth, request/response schemas",       color: "#2563eb" },
              { emoji: "🗄️", label: "Database Schema", desc: "Tables, relationships, indexes, constraints",    color: "#059669" },
              { emoji: "📋", label: "Feature Spec",     desc: "User stories, acceptance criteria, edge cases",  color: "#d97706" },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <TiltCard className="p-5 h-full text-center">
                  <motion.div
                    className="text-3xl mb-3"
                    whileHover={{ scale: 1.2, rotate: [-4, 4, -2, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    {t.emoji}
                  </motion.div>
                  <h4 className="font-bold font-mono text-sm mb-2">{t.label}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>{t.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commands (gaming terminal section) ──────────── */}
      <CommandsSection />

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            className="absolute w-[700px] h-[700px] rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(270,100%,55%) 0%, transparent 70%)",
              left: "50%", top: "50%",
              x: "-50%", y: "-50%",
              opacity: 0.12,
            }}
            animate={{ scale: [1, 1.12, 1], rotate: [0, 60, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(200,100%,55%) 0%, transparent 70%)",
              right: "10%", bottom: "10%",
              opacity: 0.08,
            }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "linear-gradient(rgba(139,92,246,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.035) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          {/* Lottie checkmark — plays once on scroll into view */}
          <div className="flex justify-center mb-4">
            <SuccessCheck size={80} />
          </div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
          >
            Stop writing docs
            <br />
            <span className="shimmer-text">from scratch.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg mb-12 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Generate your first spec in under a minute — no account needed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link href="/app">
              <MagneticButton>
                <motion.div
                  className="relative inline-flex items-center gap-3 text-white font-mono text-lg px-10 py-5 rounded-2xl overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Terminal className="w-5 h-5" />
                  Generate Free Spec
                  <ArrowRight className="w-4 h-4" />
                  <div className="absolute -inset-1 rounded-2xl blur-xl -z-10 opacity-70"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                  />
                </motion.div>
              </MagneticButton>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="px-6 py-8 border-t border-white/4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-mono text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center">
            <Terminal className="w-2.5 h-2.5 text-white" />
          </div>
          SpecForge — AI technical documentation
        </div>
        <div className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
          Powered by Claude AI · Built on Replit
        </div>
      </footer>
    </div>
  );
}
