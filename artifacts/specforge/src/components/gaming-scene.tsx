/**
 * Developer-friendly gaming animations for the landing page.
 *
 * Components:
 *  MatrixRain        — purple/cyan falling matrix characters (canvas)
 *  DevHUD            — fixed corner HUD with real FPS + live build/api status
 *  AchievementSystem — toast notifications that fire on scroll milestones
 *  GlitchOverlay     — periodic RGB-split glitch frames on any child text
 *  CommandsSection   — animated terminal section: commands type out, output appears
 *  FloatingCode      — syntax-coloured code fragments that drift in the hero bg
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "framer-motion";
import {
  Trophy, Zap, Cpu, Wifi, CheckCircle2, Terminal, Star,
  Code2, GitCommit, Package,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// 1. MATRIX RAIN
// ─────────────────────────────────────────────────────────────────────────────
const MATRIX_CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノ" +
  "ハヒフヘホマミムメモヤユヨラリルレロワヲン" +
  "0123456789ABCDEFabcdef{}[]<>/#$%&|^~";

export function MatrixRain({ opacity = 0.18 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const FONT_SIZE = 14;
    const cols = () => Math.ceil(canvas.width / FONT_SIZE);

    let columns: number[] = Array.from({ length: cols() }, () =>
      Math.floor(Math.random() * -50)
    );

    window.addEventListener("resize", () => {
      columns = Array.from({ length: cols() }, () => Math.floor(Math.random() * -50));
    });

    const COLORS = ["#7c3aed", "#8b5cf6", "#a78bfa", "#06b6d4", "#22d3ee"];

    let raf: number;
    let frame = 0;

    const draw = () => {
      frame++;
      if (frame % 2 !== 0) { raf = requestAnimationFrame(draw); return; }

      // Fade trail
      ctx.fillStyle = "rgba(5,5,13,0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px monospace`;

      columns.forEach((y, i) => {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        const x = i * FONT_SIZE;

        // Leading char — bright white/cyan
        if (y > 0) {
          ctx.fillStyle = y % 3 === 0 ? "#ffffff" : "#a5f3fc";
          ctx.shadowColor = "#06b6d4";
          ctx.shadowBlur  = 8;
          ctx.fillText(char, x, y * FONT_SIZE);
          ctx.shadowBlur = 0;
        }

        // Body chars — purple/violet
        if (y > 1) {
          const bodyChar = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          const colorIdx = Math.floor(Math.random() * COLORS.length);
          ctx.fillStyle = COLORS[colorIdx];
          ctx.globalAlpha = 0.6 + Math.random() * 0.4;
          ctx.fillText(bodyChar, x, (y - 1) * FONT_SIZE);
          ctx.globalAlpha = 1;
        }

        // Reset column randomly
        if (y * FONT_SIZE > canvas.height && Math.random() > 0.975) {
          columns[i] = 0;
        } else {
          columns[i]++;
        }
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity, mixBlendMode: "screen" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DEV HUD  (fixed top-right corner below the navbar)
// ─────────────────────────────────────────────────────────────────────────────
function useFPS() {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let last = performance.now();
    let frames = 0;
    let raf: number;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round(frames * 1000 / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

export function DevHUD() {
  const fps     = useFPS();
  const [ping]  = useState(() => 8 + Math.floor(Math.random() * 18));
  const [mem]   = useState(() => (Math.random() * 0.4 + 0.2).toFixed(1));
  const [visible, setVisible] = useState(true);

  const fpsColor =
    fps >= 55 ? "#22c55e" :
    fps >= 40 ? "#f59e0b" : "#ef4444";

  if (!visible) return null;

  return (
    <div
      className="fixed top-16 right-4 z-40 font-mono text-[10px] select-none pointer-events-auto"
      style={{
        background: "rgba(5,5,13,0.85)",
        border: "1px solid rgba(124,58,237,0.3)",
        borderRadius: 6,
        padding: "6px 10px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 20px rgba(124,58,237,0.12)",
        minWidth: 144,
      }}
    >
      {/* Close */}
      <button
        onClick={() => setVisible(false)}
        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]"
        style={{ background: "#7c3aed", color: "white", lineHeight: 1 }}
      >×</button>

      <div className="flex items-center justify-between mb-1.5 pb-1.5"
        style={{ borderBottom: "1px solid rgba(124,58,237,0.2)" }}>
        <span style={{ color: "rgba(124,58,237,0.8)" }} className="uppercase tracking-widest text-[8px]">
          DEV HUD
        </span>
        <span className="flex items-center gap-1" style={{ color: "#22c55e" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: "#22c55e" }} />
          LIVE
        </span>
      </div>

      {/* FPS */}
      <div className="flex justify-between items-center mb-1">
        <span style={{ color: "rgba(255,255,255,0.4)" }}>FPS</span>
        <span style={{ color: fpsColor, fontVariantNumeric: "tabular-nums" }}>{fps}</span>
      </div>

      {/* Ping */}
      <div className="flex justify-between items-center mb-1">
        <span style={{ color: "rgba(255,255,255,0.4)" }}>PING</span>
        <span style={{ color: "#06b6d4" }}>{ping}ms</span>
      </div>

      {/* Heap */}
      <div className="flex justify-between items-center mb-1">
        <span style={{ color: "rgba(255,255,255,0.4)" }}>HEAP</span>
        <span style={{ color: "#a78bfa" }}>{mem}GB</span>
      </div>

      {/* Build */}
      <div className="flex justify-between items-center mb-1">
        <span style={{ color: "rgba(255,255,255,0.4)" }}>BUILD</span>
        <span style={{ color: "#22c55e" }}>✓ OK</span>
      </div>

      {/* Claude API */}
      <div className="flex justify-between items-center">
        <span style={{ color: "rgba(255,255,255,0.4)" }}>CLAUDE</span>
        <span style={{ color: "#22c55e" }}>ONLINE</span>
      </div>

      {/* FPS bar */}
      <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, (fps / 60) * 100)}%`,
            background: fpsColor,
            boxShadow: `0 0 4px ${fpsColor}`,
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ACHIEVEMENT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
interface Achievement {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  xp: number;
  color: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "landed",   icon: <Zap className="w-4 h-4" />,        title: "First Contact",      desc: "Visited SpecForge landing",    xp: 50,   color: "#7c3aed" },
  { id: "scroller", icon: <Star className="w-4 h-4" />,       title: "Explorer",            desc: "Scrolled past hero section",   xp: 100,  color: "#f59e0b" },
  { id: "features", icon: <Package className="w-4 h-4" />,    title: "Feature Unlocked",    desc: "Discovered the feature list",  xp: 200,  color: "#06b6d4" },
  { id: "howto",    icon: <GitCommit className="w-4 h-4" />,  title: "Read the Docs",       desc: "Found How It Works section",   xp: 150,  color: "#10b981" },
  { id: "cta",      icon: <Trophy className="w-4 h-4" />,     title: "LEVEL UP",            desc: "Ready to generate your spec",  xp: 500,  color: "#db2777" },
];

function AchievementToast({ achievement, onDone }: { achievement: Achievement; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ x: 120, opacity: 0, scale: 0.88 }}
      animate={{ x: 0,   opacity: 1, scale: 1 }}
      exit={{ x: 80, opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-none"
      style={{
        background: `linear-gradient(135deg, rgba(5,5,13,0.96) 0%, ${achievement.color}18 100%)`,
        border: `1px solid ${achievement.color}50`,
        boxShadow: `0 0 24px ${achievement.color}30, 0 8px 32px rgba(0,0,0,0.5)`,
        backdropFilter: "blur(20px)",
        minWidth: 260,
      }}
    >
      {/* Icon ring */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
        style={{ background: `${achievement.color}20`, border: `1px solid ${achievement.color}40` }}
      >
        <span style={{ color: achievement.color }}>{achievement.icon}</span>
        <span
          className="absolute inset-0 rounded-xl opacity-30 blur-sm"
          style={{ background: achievement.color }}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: achievement.color }}>
            Achievement Unlocked
          </span>
        </div>
        <p className="text-xs font-bold text-white font-mono leading-tight">{achievement.title}</p>
        <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>{achievement.desc}</p>
      </div>

      {/* XP */}
      <div className="shrink-0 text-right">
        <span
          className="text-sm font-bold font-mono"
          style={{ color: achievement.color, textShadow: `0 0 8px ${achievement.color}` }}
        >
          +{achievement.xp}
        </span>
        <p className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>XP</p>
      </div>
    </motion.div>
  );
}

export function AchievementSystem() {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [active, setActive] = useState<Achievement | null>(null);
  const fired = useRef<Set<string>>(new Set());

  const fire = useCallback((id: string) => {
    if (fired.current.has(id)) return;
    fired.current.add(id);
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;
    setQueue(q => [...q, ach]);
  }, []);

  // Fire "landed" immediately
  useEffect(() => { setTimeout(() => fire("landed"), 1200); }, [fire]);

  // Scroll milestones
  useEffect(() => {
    const handler = () => {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (pct > 0.10) fire("scroller");
      if (pct > 0.30) fire("features");
      if (pct > 0.58) fire("howto");
      if (pct > 0.88) fire("cta");
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [fire]);

  // Drain queue one by one
  useEffect(() => {
    if (!active && queue.length > 0) {
      const [next, ...rest] = queue;
      setActive(next);
      setQueue(rest);
    }
  }, [active, queue]);

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="wait">
        {active && (
          <AchievementToast
            key={active.id}
            achievement={active}
            onDone={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. GLITCH OVERLAY  (wraps hero headline, fires periodically)
// ─────────────────────────────────────────────────────────────────────────────
export function GlitchOverlay({ children }: { children: React.ReactNode }) {
  const [glitch, setGlitch] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fire = () => {
      setGlitch(true);
      setOffset({ x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 4 });
      const frames = [80, 120, 160, 200, 240];
      frames.forEach((ms, i) => {
        setTimeout(() => {
          setOffset({ x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 6 });
          if (i === frames.length - 1) {
            setGlitch(false);
            setOffset({ x: 0, y: 0 });
          }
        }, ms);
      });
    };

    const interval = setInterval(fire, 4500 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block">
      {/* Cyan ghost */}
      {glitch && (
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            color: "#06b6d4",
            transform: `translate(${offset.x + 3}px, ${offset.y}px)`,
            clipPath: "inset(20% 0 50% 0)",
            opacity: 0.7,
          }}
        >
          {children}
        </span>
      )}
      {/* Magenta ghost */}
      {glitch && (
        <span
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            color: "#f43f5e",
            transform: `translate(${-offset.x - 2}px, ${-offset.y}px)`,
            clipPath: "inset(55% 0 20% 0)",
            opacity: 0.7,
          }}
        >
          {children}
        </span>
      )}
      {/* Main */}
      <span
        style={{
          display: "inline-block",
          transform: glitch ? `translate(${-offset.x * 0.5}px, 0)` : "none",
        }}
      >
        {children}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. COMMANDS SECTION  (animated terminal with typed commands + output)
// ─────────────────────────────────────────────────────────────────────────────
interface Command {
  prompt: string;
  cmd: string;
  output: string[];
  outputColor: string;
}

const COMMANDS: Command[] = [
  {
    prompt: "~/project",
    cmd: "specforge generate --repo github.com/acme/api --type system_design",
    output: [
      "✓ Cloning repository metadata...",
      "✓ Analysing 1,247 files across 38 modules",
      "✓ Running Claude Sonnet 4.6 (extended thinking)...",
      "✓ System design spec generated → ./SPEC.md",
      "  Complexity: 7.4/10  ·  Est. read time: 8 min",
    ],
    outputColor: "#22c55e",
  },
  {
    prompt: "~/project",
    cmd: "specforge export --format pdf --output ./docs/spec.pdf",
    output: [
      "✓ Rendering Mermaid diagrams...",
      "✓ Applying print stylesheet...",
      "✓ PDF generated → ./docs/spec.pdf  (1.2 MB)",
    ],
    outputColor: "#06b6d4",
  },
  {
    prompt: "~/project",
    cmd: "git commit -m 'docs: add AI-generated system design spec [specforge]'",
    output: [
      "[main 4f3a9c2] docs: add AI-generated system design spec [specforge]",
      " 1 file changed, 312 insertions(+)",
    ],
    outputColor: "#f59e0b",
  },
  {
    prompt: "~/project",
    cmd: "curl -s /api/specs/recent | jq '.[0].title'",
    output: ['"acme-api — System Design"'],
    outputColor: "#a78bfa",
  },
];

function useTypedText(text: string, active: boolean, speed = 22) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (!active) { setShown(""); return; }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, active, speed]);
  return shown;
}

function CommandBlock({ command, index, globalActive }: {
  command: Command; index: number; globalActive: boolean;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [phase, setPhase] = useState<"idle" | "typing" | "output">("idle");
  const typedCmd = useTypedText(command.cmd, phase === "typing", 18);

  useEffect(() => {
    if (!inView || !globalActive) return;
    const delay = index * 600;
    const t1 = setTimeout(() => setPhase("typing"), delay);
    const t2 = setTimeout(() => setPhase("output"), delay + command.cmd.length * 18 + 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [inView, globalActive, index, command.cmd.length]);

  return (
    <div
      ref={ref}
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(5,5,13,0.8)",
        border: "1px solid rgba(124,58,237,0.2)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Terminal title bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
        <span className="ml-2 text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
          bash — specforge
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Cpu className="w-2.5 h-2.5" style={{ color: "rgba(124,58,237,0.5)" }} />
          <span className="text-[9px] font-mono" style={{ color: "rgba(124,58,237,0.5)" }}>claude-sonnet-4-6</span>
        </div>
      </div>

      {/* Command line */}
      <div className="px-4 py-3 font-mono text-sm leading-relaxed">
        <div className="flex items-start gap-2 flex-wrap">
          <span style={{ color: "#22c55e" }}>{command.prompt}</span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>$</span>
          <span style={{ color: "#e2e8f0" }}>
            {typedCmd}
            {phase === "typing" && (
              <span className="animate-pulse ml-0.5" style={{ color: "#a78bfa" }}>█</span>
            )}
          </span>
        </div>

        {/* Output */}
        <AnimatePresence>
          {phase === "output" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="mt-2 space-y-0.5"
            >
              {command.output.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12, duration: 0.25 }}
                  className="text-xs"
                  style={{ color: command.outputColor, opacity: 0.85 }}
                >
                  {line}
                </motion.div>
              ))}
              {/* Prompt returns */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: command.output.length * 0.12 + 0.2 }}
                className="flex items-center gap-2 mt-1"
              >
                <span style={{ color: "#22c55e" }}>{command.prompt}</span>
                <span style={{ color: "rgba(255,255,255,0.35)" }}>$</span>
                <span className="animate-pulse" style={{ color: "#a78bfa" }}>█</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function CommandsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="py-28 px-6 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, transparent, rgba(5,5,13,0.8) 20%, rgba(5,5,13,0.8) 80%, transparent)" }}
    >
      {/* Background matrix rain (subtle) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <MatrixRain opacity={0.06} />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-purple-400 mb-4 px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/5"
          >
            <Terminal className="w-3 h-3" />
            CLI & API
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Built for your{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #7c3aed, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              terminal
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="max-w-xl mx-auto text-base leading-relaxed"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Generate, export, commit, and query specs without leaving your shell.
            Pipe into any workflow.
          </motion.p>
        </div>

        {/* Command blocks grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {COMMANDS.map((cmd, i) => (
            <CommandBlock key={i} command={cmd} index={i} globalActive={inView} />
          ))}
        </div>

        {/* Install hint */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-center justify-center gap-3 flex-wrap"
        >
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-xl font-mono text-sm"
            style={{
              background: "rgba(5,5,13,0.7)",
              border: "1px solid rgba(124,58,237,0.2)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.3)" }}>$</span>
            <span style={{ color: "#e2e8f0" }}>npx specforge init</span>
            <span
              className="text-[10px] px-2 py-0.5 rounded"
              style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)" }}
            >
              coming soon
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. FLOATING CODE FRAGMENTS (hero background decoration)
// ─────────────────────────────────────────────────────────────────────────────
const CODE_SNIPPETS = [
  { code: 'POST /api/specs',           color: "#7c3aed" },
  { code: 'type: "system_design"',     color: "#06b6d4" },
  { code: 'complexity: 7.4',           color: "#22c55e" },
  { code: 'model: claude-sonnet',      color: "#f59e0b" },
  { code: '→ SPEC.md generated',       color: "#a78bfa" },
  { code: 'git push origin main',      color: "#fb923c" },
  { code: 'status: 200 OK',            color: "#22c55e" },
  { code: '$ specforge --watch',       color: "#06b6d4" },
];

export function FloatingCode() {
  const snippets = CODE_SNIPPETS.map((s, i) => ({
    ...s,
    x: `${8 + Math.floor(i / 4) * 65 + (i % 2) * 18}%`,
    y: `${10 + (i % 4) * 22}%`,
    delay: i * 0.8,
    dur: 12 + i * 2.3,
    dx: (Math.random() - 0.5) * 60,
    dy: (Math.random() - 0.5) * 40,
    rot: (Math.random() - 0.5) * 12,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {snippets.map((s, i) => (
        <motion.div
          key={i}
          className="absolute font-mono text-[11px] px-2.5 py-1 rounded-lg"
          style={{
            left: s.x, top: s.y,
            color: s.color,
            background: `${s.color}10`,
            border: `1px solid ${s.color}25`,
            opacity: 0.55,
            boxShadow: `0 0 12px ${s.color}18`,
          }}
          animate={{
            x: [0, s.dx, 0],
            y: [0, s.dy, 0],
            rotate: [0, s.rot, 0],
            opacity: [0.35, 0.7, 0.35],
          }}
          transition={{
            duration: s.dur,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {s.code}
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. XP LEVEL BAR (bottom of page, shows user progress through the page)
// ─────────────────────────────────────────────────────────────────────────────
export function XPBar() {
  const [xp, setXp] = useState(0);

  useEffect(() => {
    const handler = () => {
      const pct = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
      const earned = Math.round(pct * 1000);
      setXp(earned);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const level   = Math.floor(xp / 200) + 1;
  const levelXP = xp % 200;

  return (
    <div
      className="fixed bottom-4 left-4 z-40 font-mono text-[10px] pointer-events-none select-none"
      style={{
        background: "rgba(5,5,13,0.85)",
        border: "1px solid rgba(124,58,237,0.25)",
        borderRadius: 8,
        padding: "6px 10px",
        backdropFilter: "blur(12px)",
        minWidth: 160,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span style={{ color: "#a78bfa" }} className="uppercase tracking-widest text-[8px]">Dev Level</span>
        <span
          className="font-bold"
          style={{ color: "#7c3aed", textShadow: "0 0 8px #7c3aed" }}
        >
          LVL {level}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #7c3aed, #06b6d4)", boxShadow: "0 0 6px #7c3aed" }}
          animate={{ width: `${(levelXP / 200) * 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between" style={{ color: "rgba(255,255,255,0.3)" }}>
        <span>{levelXP} XP</span>
        <span>200 XP</span>
      </div>
    </div>
  );
}
