import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Zap, FileCode2, History, LogIn, LogOut, User, Sparkles,
  Server, Code2, Database, BookOpen, ChevronRight, Users,
  Search, Network, PlugZap, Terminal, Activity, Shield,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AIChat } from "@/components/ai-chat";
import { useAuth } from "@workspace/replit-auth-web";
import { useListSpecs } from "@workspace/api-client-react";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeSwitcher } from "@/components/theme-switcher";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// ── Spec type registry ────────────────────────────────────────────────────────
const SPEC_TYPE_META: Record<string, { color: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  "System Design":   { color: "#7C3AED", Icon: Server },
  "API Design":      { color: "#06B6D4", Icon: Code2 },
  "Database Schema": { color: "#10B981", Icon: Database },
  "Feature Spec":    { color: "#F59E0B", Icon: BookOpen },
};

// ── Scanline overlay ──────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-none">
      <div
        style={{
          position: "absolute", inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)",
          animation: "scanSlide 8s linear infinite",
        }}
      />
    </div>
  );
}

// ── Corner brackets on active nav item ────────────────────────────────────────
function CornerBrackets({ color = "#0891b2" }: { color?: string }) {
  return (
    <>
      <span className="absolute top-0.5 left-0.5 w-2 h-2 pointer-events-none"
        style={{
          borderTop: `1.5px solid ${color}`,
          borderLeft: `1.5px solid ${color}`,
          boxShadow: `0 0 4px ${color}80`,
        }}
      />
      <span className="absolute top-0.5 right-0.5 w-2 h-2 pointer-events-none"
        style={{
          borderTop: `1.5px solid ${color}`,
          borderRight: `1.5px solid ${color}`,
          boxShadow: `0 0 4px ${color}80`,
        }}
      />
      <span className="absolute bottom-0.5 left-0.5 w-2 h-2 pointer-events-none"
        style={{
          borderBottom: `1.5px solid ${color}`,
          borderLeft: `1.5px solid ${color}`,
          boxShadow: `0 0 4px ${color}80`,
        }}
      />
      <span className="absolute bottom-0.5 right-0.5 w-2 h-2 pointer-events-none"
        style={{
          borderBottom: `1.5px solid ${color}`,
          borderRight: `1.5px solid ${color}`,
          boxShadow: `0 0 4px ${color}80`,
        }}
      />
    </>
  );
}

// ── Spark burst on click ───────────────────────────────────────────────────────
function useSparkOnClick() {
  return useCallback((e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    for (let i = 0; i < 8; i++) {
      const spark = document.createElement("div");
      const angle = (i / 8) * Math.PI * 2;
      const dist  = 24 + Math.random() * 20;
      spark.style.cssText = `
        position:absolute; width:3px; height:3px; border-radius:50%;
        background:hsl(${260 + Math.random() * 60},90%,75%);
        left:${cx}px; top:${cy}px; pointer-events:none; z-index:999;
        box-shadow:0 0 4px hsl(${260 + Math.random() * 60},90%,75%);
      `;
      el.appendChild(spark);
      gsap.to(spark, {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        opacity: 0,
        scale: 0,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => spark.remove(),
      });
    }
  }, []);
}

// ── Glitch text (logo) ────────────────────────────────────────────────────────
function GlitchLogo({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [glitching, setGlitching] = useState(false);
  const GLITCH_CHARS = "!<>-_\\/[]{}—=+*^?#@$%&";

  const triggerGlitch = () => {
    if (glitching) return;
    setGlitching(true);
    const el = ref.current;
    if (!el) return;
    const original = text;
    let iter = 0;
    const interval = setInterval(() => {
      el.textContent = original.split("").map((c, i) =>
        i < iter ? original[i] : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      ).join("");
      iter += 0.5;
      if (iter >= original.length) {
        clearInterval(interval);
        el.textContent = original;
        setGlitching(false);
      }
    }, 40);
  };

  return (
    <span
      ref={ref}
      onMouseEnter={triggerGlitch}
      className="font-mono font-bold tracking-tight text-base text-white cursor-pointer select-none"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {text}
    </span>
  );
}

// ── Data stream border ────────────────────────────────────────────────────────
function DataStream() {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-px overflow-hidden pointer-events-none z-30">
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          background: "linear-gradient(180deg, transparent 0%, #00b4d8 20%, #38bdf8 50%, #00b4d8 80%, transparent 100%)",
          animation: "dataStream 3s linear infinite",
          height: "200%",
        }}
      />
    </div>
  );
}

// ── Hex grid background ────────────────────────────────────────────────────────
function HexGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.035] overflow-hidden"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49'%3E%3Cpath d='M14 0 L28 8 L28 24 L14 32 L0 24 L0 8 Z' fill='none' stroke='%238b5cf6' stroke-width='0.5'/%3E%3Cpath d='M14 17 L28 25 L28 41 L14 49 L0 41 L0 25 Z' fill='none' stroke='%238b5cf6' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: "28px 49px",
      }}
    />
  );
}

// ── Boot sequence ─────────────────────────────────────────────────────────────
function useBootSequence() {
  const [phase, setPhase] = useState<"booting" | "ready">("booting");
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const sequence = [
      "> SPECFORGE OS v1.0.0-beta",
      "> Initializing neural engine...",
      "> Connecting to Claude API... OK",
      "> Loading nav modules... DONE",
      "> System ready.",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < sequence.length) {
        setLines(prev => [...prev, sequence[i]]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setPhase("ready"), 400);
      }
    }, 280);
    return () => clearInterval(interval);
  }, []);

  return { phase, lines };
}

// ── Animated energy ring on logo ──────────────────────────────────────────────
function EnergyRing() {
  return (
    <div className="absolute -inset-2 pointer-events-none">
      <svg width="52" height="52" viewBox="0 0 52 52" className="absolute inset-0">
        <circle cx="26" cy="26" r="22" fill="none" stroke="url(#ringGrad)" strokeWidth="1"
          strokeDasharray="8 4" style={{ animation: "spinRing 4s linear infinite" }} />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00b4d8" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#00b4d8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Pulsing status dot ────────────────────────────────────────────────────────
function StatusDot({ color = "#22c55e" }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ background: color }} />
      <span className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: color }} />
    </span>
  );
}

// ── Power bar (XP style, on recent spec hover) ────────────────────────────────
function PowerBar({ color }: { color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    setTimeout(() => setWidth(40 + Math.random() * 55), 80);
  }, []);
  return (
    <div className="h-0.5 w-full rounded-full overflow-hidden mt-1"
      style={{ background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}, ${color}80)`,
          boxShadow: `0 0 4px ${color}60`,
        }}
      />
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);
  const [justOpened, setJustOpened] = useState(false);
  const { data: specs } = useListSpecs();
  const recentSpecs = (specs ?? []).slice(0, 4);
  const sidebarRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const spark = useSparkOnClick();
  const { phase, lines } = useBootSequence();

  const initials = user
    ? [user.firstName, user.lastName].filter(Boolean).map((s) => s![0]).join("").toUpperCase() || "U"
    : "?";
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  // GSAP boot entrance for nav items
  useGSAP(() => {
    if (phase !== "ready") return;
    const items = navRef.current?.querySelectorAll("[data-nav-item]");
    if (!items) return;
    gsap.fromTo(
      Array.from(items),
      { x: -32, opacity: 0, filter: "blur(6px)" },
      { x: 0, opacity: 1, filter: "blur(0px)", stagger: 0.07, duration: 0.5, ease: "power3.out" }
    );
  }, { scope: sidebarRef, dependencies: [phase] });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        const tag = (e.target as HTMLElement).tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || (e.target as HTMLElement).isContentEditable) return;
        e.preventDefault();
        setAiOpen(prev => { if (!prev) setJustOpened(true); return !prev; });
      }
      if (e.key === "Escape") setAiOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (justOpened) {
      const t = setTimeout(() => setJustOpened(false), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [justOpened]);

  const navItems = [
    { href: "/app",            label: "Generator",    icon: FileCode2, exact: true,  color: "#0891b2" },
    { href: "/app/specs",      label: "History",      icon: History,   exact: false, color: "#0891b2" },
    { href: "/app/search",     label: "Search",       icon: Search,    exact: false, color: "#06b6d4" },
    { href: "/app/graph",      label: "Dep Graph",    icon: Network,   exact: false, color: "#10b981" },
    { href: "/app/teams",      label: "Teams",        icon: Users,     exact: false, color: "#f59e0b" },
    { href: "/app/integrations", label: "Integrations", icon: PlugZap, exact: false, color: "#db2777" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">

      {/* ── Global CSS for gaming animations ── */}
      <style>{`
        @keyframes scanSlide {
          0%   { transform: translateY(-50%); }
          100% { transform: translateY(0%);   }
        }
        @keyframes dataStream {
          0%   { transform: translateY(-50%); }
          100% { transform: translateY(0%);   }
        }
        @keyframes spinRing {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes rgbBorder {
          0%   { border-color: #00b4d8; box-shadow: 0 0 8px #00b4d840; }
          33%  { border-color: #06b6d4; box-shadow: 0 0 8px #06b6d440; }
          66%  { border-color: #10b981; box-shadow: 0 0 8px #10b98140; }
          100% { border-color: #00b4d8; box-shadow: 0 0 8px #00b4d840; }
        }
        @keyframes sweepScan {
          0%   { left: -100%; }
          100% { left: 200%;  }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1;   }
        }
        @keyframes matrixDrop {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes flickerIn {
          0%   { opacity: 0; }
          20%  { opacity: 1; }
          22%  { opacity: 0; }
          24%  { opacity: 1; }
          100% { opacity: 1; }
        }
        @keyframes hueRotate {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
        @keyframes borderSweep {
          0%   { background-position: 0%   50%; }
          100% { background-position: 300% 50%; }
        }
        .gaming-nav-item:hover .nav-sweep {
          animation: sweepScan 0.55s ease forwards;
        }
        .gaming-nav-item .nav-label {
          transition: letter-spacing 0.2s ease, color 0.2s ease;
        }
        .gaming-nav-item:hover .nav-label {
          letter-spacing: 0.05em;
          color: white;
        }
      `}</style>

      {/* ── Cmd+K toast ── */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 pointer-events-none"
        style={{
          opacity: justOpened ? 1 : 0,
          transform: `translateX(-50%) translateY(${justOpened ? "0px" : "-8px"})`,
        }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono"
          style={{
            background: "rgba(0,180,216,0.9)", backdropFilter: "blur(12px)",
            boxShadow: "0 4px 24px rgba(0,180,216,0.4)", color: "white",
          }}
        >
          <Sparkles className="w-3 h-3" />
          AI Assistant opened
        </div>
      </div>

      {/* ── GAMING SIDEBAR ── */}
      <aside
        ref={sidebarRef}
        className="w-full md:w-64 flex flex-col relative overflow-hidden shrink-0"
        style={{
          background: "linear-gradient(180deg, hsl(240,20%,4%) 0%, hsl(240,18%,5%) 100%)",
          borderRight: "1px solid rgba(0,180,216,0.15)",
          boxShadow: "4px 0 40px rgba(0,180,216,0.06)",
        }}
      >
        <HexGrid />
        <Scanlines />
        <DataStream />

        {/* Top energy line */}
        <div className="absolute top-0 left-0 right-0 h-px z-10"
          style={{
            background: "linear-gradient(90deg, transparent, #00b4d8, #38bdf8, #00b4d8, transparent)",
            animation: "borderSweep 4s linear infinite",
            backgroundSize: "300% 100%",
          }}
        />

        {/* ── Logo ── */}
        <Link href="/">
          <div
            className="p-5 flex items-center gap-3 relative cursor-pointer group"
            style={{ borderBottom: "1px solid rgba(0,180,216,0.1)" }}
            onClick={spark}
          >
            <div className="relative shrink-0">
              <EnergyRing />
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center relative z-10 transition-all duration-200 group-hover:scale-110"
                style={{
                  background: "linear-gradient(135deg, hsl(191,100%,35%) 0%, hsl(210,90%,45%) 100%)",
                  boxShadow: "0 0 20px rgba(0,180,216,0.5), 0 4px 12px rgba(0,0,0,0.4)",
                  animation: "pulseGlow 2.5s ease-in-out infinite",
                }}
              >
                <Zap className="w-4 h-4 text-white fill-white" style={{ animation: "hueRotate 6s linear infinite" }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <GlitchLogo text="SpecForge" />
              <div
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm inline-block"
                style={{
                  background: "rgba(0,180,216,0.12)", color: "hsl(191,100%,65%)",
                  border: "1px solid rgba(0,180,216,0.25)",
                  animation: "flickerIn 1.2s ease forwards",
                }}
              >
                BETA
              </div>
            </div>
            {/* System status line */}
            <div className="absolute bottom-0 left-5 right-5 flex items-center gap-1.5 pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <StatusDot color="#22c55e" />
              <span className="text-[8px] font-mono text-green-400 tracking-widest">SYSTEM ONLINE</span>
            </div>
          </div>
        </Link>

        {/* ── Boot screen → Nav ── */}
        {phase === "booting" ? (
          <div className="flex-1 p-4 font-mono text-[10px] space-y-1 overflow-hidden" style={{ color: "#22c55e" }}>
            {lines.map((line, i) => (
              <div key={i} style={{ animation: "flickerIn 0.3s ease forwards" }}>
                {line}
                {i === lines.length - 1 && (
                  <span className="animate-pulse ml-0.5">█</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <nav ref={navRef} className="flex-1 p-3 space-y-0.5 pt-4 flex flex-col min-h-0">
            {navItems.map(({ href, label, icon: Icon, exact, color }, idx) => {
              const active = exact ? location === href : location.startsWith(href);
              return (
                <Link key={href} href={href}>
                  <div
                    data-nav-item
                    onClick={spark}
                    className="gaming-nav-item group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer relative overflow-hidden"
                    style={active ? {
                      background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
                      border: `1px solid ${color}40`,
                      boxShadow: `0 0 16px ${color}20, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    } : {
                      background: "transparent",
                      border: "1px solid transparent",
                    }}
                  >
                    {/* Sweep shine on hover */}
                    <div className="nav-sweep absolute inset-y-0 w-12 pointer-events-none"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)",
                        left: "-100%",
                      }}
                    />

                    {active && <CornerBrackets color={color} />}

                    {/* Left energy bar */}
                    {active && (
                      <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r overflow-hidden">
                        <div style={{
                          position: "absolute", inset: 0,
                          background: `linear-gradient(180deg, transparent, ${color}, ${color}, transparent)`,
                          animation: "dataStream 1.5s linear infinite",
                          height: "200%",
                        }} />
                      </div>
                    )}

                    {/* Icon with glow */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 relative"
                      style={active ? {
                        background: `${color}20`,
                        border: `1px solid ${color}35`,
                        boxShadow: `0 0 10px ${color}30`,
                      } : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Icon
                        className="w-3.5 h-3.5 transition-all duration-200"
                        style={{ color: active ? color : "rgba(255,255,255,0.45)" }}
                      />
                      {active && (
                        <div className="absolute inset-0 rounded-lg opacity-50 blur-sm"
                          style={{ background: color }} />
                      )}
                    </div>

                    {/* Label */}
                    <span
                      className="nav-label font-mono text-sm font-medium flex-1"
                      style={{ color: active ? "white" : "rgba(255,255,255,0.5)" }}
                    >
                      {label}
                    </span>

                    {/* Active status */}
                    {active && (
                      <div className="flex items-center gap-1.5">
                        <StatusDot color={color} />
                      </div>
                    )}

                    {/* Index number HUD style */}
                    <span
                      className="text-[8px] font-mono opacity-0 group-hover:opacity-40 transition-opacity duration-150"
                      style={{ color }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                </Link>
              );
            })}

            {/* ── Recent specs ── */}
            {recentSpecs.length > 0 && (
              <div className="pt-5">
                <div className="flex items-center justify-between px-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-2.5 h-2.5" style={{ color: "rgba(0,180,216,0.6)" }} />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest"
                      style={{ color: "rgba(0,180,216,0.6)" }}>
                      Recent
                    </span>
                  </div>
                  <Link href="/app/specs">
                    <span className="text-[9px] font-mono flex items-center gap-0.5 cursor-pointer transition-all duration-150 hover:text-violet-400"
                      style={{ color: "rgba(255,255,255,0.3)" }}>
                      all <ChevronRight className="w-2.5 h-2.5" />
                    </span>
                  </Link>
                </div>

                {/* Divider with energy effect */}
                <div className="mx-3 mb-2 h-px relative overflow-hidden">
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg, transparent, rgba(0,180,216,0.4), rgba(56,189,248,0.25), transparent)",
                    animation: "borderSweep 3s linear infinite",
                    backgroundSize: "300% 100%",
                  }} />
                </div>

                <div className="space-y-0.5">
                  {recentSpecs.map((spec) => {
                    const meta = SPEC_TYPE_META[spec.specType] ?? SPEC_TYPE_META["System Design"];
                    const { Icon: SpecIcon, color } = meta;
                    const active = location === `/app/specs/${spec.id}`;
                    return (
                      <Link key={spec.id} href={`/app/specs/${spec.id}`}>
                        <div
                          data-nav-item
                          onClick={spark}
                          className="gaming-nav-item group px-3 py-2 rounded-lg cursor-pointer relative overflow-hidden"
                          style={active ? {
                            background: `${color}15`,
                            border: `1px solid ${color}30`,
                          } : {
                            background: "transparent",
                            border: "1px solid transparent",
                          }}
                        >
                          <div className="nav-sweep absolute inset-y-0 w-10 pointer-events-none"
                            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)", left: "-100%" }}
                          />
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all duration-200"
                              style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                              <SpecIcon className="w-2.5 h-2.5" style={{ color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="nav-label text-[11px] font-mono truncate block leading-tight"
                                style={{ color: active ? "white" : "rgba(255,255,255,0.45)" }}>
                                {spec.title}
                              </span>
                              <PowerBar color={color} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* spacer */}
            <div className="flex-1" />

            {/* System stats HUD */}
            <div className="px-3 py-2 rounded-lg mx-0"
              style={{ border: "1px solid rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Shield className="w-2.5 h-2.5" style={{ color: "rgba(0,180,216,0.6)" }} />
                <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "rgba(0,180,216,0.6)" }}>
                  System Status
                </span>
              </div>
              {[
                { label: "API", value: 98, color: "#22c55e" },
                { label: "AI", value: 100, color: "#00b4d8" },
                { label: "DB", value: 95, color: "#06b6d4" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-mono w-5 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${value}%`, background: color, boxShadow: `0 0 4px ${color}` }} />
                  </div>
                  <span className="text-[8px] font-mono w-6 text-right shrink-0" style={{ color }}>{value}%</span>
                </div>
              ))}
            </div>
          </nav>
        )}

        {/* ── AI Assistant button ── */}
        <div className="p-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(0,180,216,0.08)" }}>
          <NotificationBell />
          <button
            onClick={() => { setAiOpen(true); }}
            className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-mono text-xs relative overflow-hidden group transition-all duration-200"
            style={{
              background: aiOpen
                ? "linear-gradient(135deg, rgba(0,180,216,0.25) 0%, rgba(56,189,248,0.15) 100%)"
                : "linear-gradient(135deg, rgba(0,180,216,0.1) 0%, rgba(56,189,248,0.06) 100%)",
              border: aiOpen ? "1px solid rgba(0,180,216,0.6)" : "1px solid rgba(0,180,216,0.22)",
              color: "hsl(191,100%,65%)",
              boxShadow: aiOpen ? "0 0 24px rgba(0,180,216,0.3), inset 0 0 20px rgba(0,180,216,0.04)" : "0 0 12px rgba(0,180,216,0.08)",
              animation: "rgbBorder 4s linear infinite",
            }}
          >
            {/* Sweep */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "linear-gradient(135deg, rgba(0,180,216,0.15) 0%, rgba(56,189,248,0.1) 100%)" }}
            />
            {/* Scan line on hover */}
            <div className="nav-sweep absolute inset-y-0 w-16 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)", left: "-100%" }}
            />
            <Sparkles className="w-3.5 h-3.5 relative z-10 shrink-0" style={{ animation: "hueRotate 3s linear infinite" }} />
            <span className="relative z-10 font-bold tracking-widest flex-1 uppercase text-[11px]">AI Assistant</span>
            <kbd className="relative z-10 flex items-center gap-0.5 opacity-60 shrink-0"
              style={{ fontSize: "9px", letterSpacing: "0.02em" }}>
              <span className="text-[10px]">{isMac ? "⌘" : "Ctrl"}</span>
              <span>K</span>
            </kbd>
          </button>
        </div>

        {/* ── User section ── */}
        <div className="p-3 pt-0">
          {isLoading ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-7 h-7 rounded-full bg-secondary animate-pulse" />
              <div className="h-3 w-24 bg-secondary animate-pulse rounded" />
            </div>
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group relative overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="nav-sweep absolute inset-y-0 w-16 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)", left: "-100%" }}
                  />
                  <Avatar className="w-7 h-7 shrink-0" style={{ boxShadow: "0 0 8px rgba(0,180,216,0.35)", border: "1px solid rgba(0,180,216,0.3)" }}>
                    {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={initials} />}
                    <AvatarFallback className="text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, hsl(191,100%,35%), hsl(210,90%,45%))", color: "white" }}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-semibold truncate leading-tight text-white">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email ?? "User"}
                    </p>
                    {user.email && (
                      <p className="text-[10px] font-mono truncate leading-tight" style={{ color: "rgba(0,180,216,0.7)" }}>
                        {user.email}
                      </p>
                    )}
                  </div>
                  <StatusDot color="#22c55e" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-52">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground font-mono">
                  <User className="w-3.5 h-3.5 mr-2" />
                  {user.email ?? "Signed in"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive text-xs">
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={login}
              className="gaming-nav-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-mono text-xs transition-all duration-200 relative overflow-hidden group"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
            >
              <div className="nav-sweep absolute inset-y-0 w-16 pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)", left: "-100%" }}
              />
              <LogIn className="w-3.5 h-3.5 relative z-10" />
              <span className="nav-label relative z-10">Sign in with Replit</span>
            </button>
          )}
        </div>

        {/* Theme switcher + version footer */}
        <div className="px-3 pb-3 space-y-2">
          <ThemeSwitcher />
          <div className="flex items-center justify-between px-1">
            <span className="text-[9px] font-mono opacity-25">v1.0.0-beta</span>
            <span className="text-[9px] font-mono opacity-25" style={{ color: "#22c55e" }}>● ONLINE</span>
          </div>
        </div>

        {/* Bottom energy line */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, #00b4d860, #38bdf860, transparent)",
          }}
        />
      </aside>

      {/* ── AI Assistant Sheet ── */}
      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent
          side="right"
          className="p-0 flex flex-col"
          style={{
            width: "min(440px, 100vw)",
            background: "hsl(var(--card))",
            borderLeft: "1px solid rgba(0,180,216,0.2)",
            boxShadow: "-8px 0 48px rgba(0,180,216,0.1)",
          }}
        >
          <AIChat />
        </SheetContent>
      </Sheet>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 line-grid-bg opacity-40" />
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,180,216,0.03) 0%, transparent 70%)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)" }} />
        </div>
        <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
          {import.meta.env.VITE_LOCAL_DEV === "true" && (
            <div
              className="shrink-0 flex items-center gap-2.5 px-4 py-1.5 font-mono text-[10px] select-none"
              style={{
                background: "rgba(234,179,8,0.08)",
                borderBottom: "1px solid rgba(234,179,8,0.2)",
                color: "#EAB308",
              }}
            >
              <Terminal className="w-3 h-3 shrink-0" />
              <span className="font-bold tracking-widest uppercase">Local Dev Mode</span>
              <span className="opacity-50 mx-1">·</span>
              <span className="opacity-60">Replit Auth bypassed</span>
              <span className="opacity-50 mx-1">·</span>
              <span className="opacity-60">
                user: <span className="text-yellow-400">{import.meta.env.VITE_LOCAL_DEV_USER_ID ?? "local-dev-user"}</span>
              </span>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
