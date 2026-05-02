import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { Terminal, ArrowRight, Github, Zap, Network, Bot, ChevronRight, Star } from "lucide-react";

const SPEC_TYPES = ["System Design Docs", "API Blueprints", "Database Schemas", "Feature Specs"];

function useTypewriter(words: string[], speed = 80, pause = 1800) {
  const [displayed, setDisplayed] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && charIdx < word.length) {
      timeout = setTimeout(() => setCharIdx((c) => c + 1), speed);
    } else if (!deleting && charIdx === word.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx((c) => c - 1), speed / 2);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setWordIdx((i) => (i + 1) % words.length);
    }

    setDisplayed(word.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return displayed;
}

function Aurora() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute w-[900px] h-[900px] rounded-full opacity-[0.15]"
        style={{
          background: "radial-gradient(circle, hsl(270,100%,60%) 0%, transparent 70%)",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          animation: "aurora1 12s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.10]"
        style={{
          background: "radial-gradient(circle, hsl(200,100%,60%) 0%, transparent 70%)",
          top: "10%",
          left: "10%",
          animation: "aurora2 14s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.08]"
        style={{
          background: "radial-gradient(circle, hsl(300,100%,60%) 0%, transparent 70%)",
          top: "5%",
          right: "5%",
          animation: "aurora3 10s ease-in-out infinite alternate",
        }}
      />
    </div>
  );
}

function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)",
      }}
    />
  );
}

function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative overflow-hidden rounded-xl border border-white/8 bg-white/3 backdrop-blur-sm transition-all duration-300 ${hovered ? "border-purple-500/30 bg-white/5" : ""} ${className}`}
    >
      {hovered && (
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, rgba(139,92,246,0.12), transparent 60%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CountUp({ to, duration = 1500 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);

  return <span ref={ref}>{count}</span>;
}

function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function TerminalWindow() {
  const lines = [
    { delay: 0.2, text: "> specforge generate --type system_design", color: "text-green-400" },
    { delay: 0.8, text: "✓ Scanning repository structure...", color: "text-muted-foreground" },
    { delay: 1.2, text: "✓ Analyzing components & dependencies...", color: "text-muted-foreground" },
    { delay: 1.6, text: "✓ Generating architecture diagram...", color: "text-muted-foreground" },
    { delay: 2.0, text: "✓ Running complexity analysis...", color: "text-muted-foreground" },
    { delay: 2.5, text: "✓ Spec generated successfully [complexity: 7/10]", color: "text-purple-400" },
    { delay: 2.9, text: "  → System Design Document", color: "text-blue-400" },
    { delay: 3.1, text: "  → Architecture Diagram (Mermaid)", color: "text-blue-400" },
    { delay: 3.3, text: "  → Tech Debt Report (3 risks found)", color: "text-yellow-400" },
  ];

  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-900/20">
      <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/8">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs font-mono text-muted-foreground">specforge — terminal</span>
      </div>
      <div className="bg-[#080810]/90 backdrop-blur p-5 font-mono text-sm min-h-[220px] space-y-1.5">
        {lines.map((line, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: line.delay, duration: 0.3 }}
            className={line.color}
          >
            {line.text}
          </motion.p>
        ))}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ delay: 3.5, duration: 1, repeat: Infinity }}
          className="inline-block w-2 h-4 bg-purple-400 align-middle"
        />
      </div>
    </div>
  );
}

const features = [
  {
    icon: <Zap className="w-6 h-6 text-purple-400" />,
    title: "Complexity Score",
    desc: "Instant 1-10 complexity analysis with tech debt risks, prioritized by severity — HIGH, MED, LOW.",
    tag: "AI Analysis",
    tagColor: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  },
  {
    icon: <Network className="w-6 h-6 text-blue-400" />,
    title: "Architecture Diagrams",
    desc: "Auto-generated Mermaid.js diagrams — flowcharts for systems, sequence for APIs, ER for databases.",
    tag: "Visual",
    tagColor: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  {
    icon: <Bot className="w-6 h-6 text-emerald-400" />,
    title: "Ask Your Doc",
    desc: "Chat with Claude AI about your spec. Ask about trade-offs, implementation details, or edge cases.",
    tag: "Chat",
    tagColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
];

const steps = [
  { num: "01", title: "Input your project", desc: "Paste a GitHub URL or describe your project in plain text." },
  { num: "02", title: "Pick a spec type", desc: "System design, API design, database schema, or feature spec." },
  { num: "03", title: "Get your docs", desc: "Receive a full technical document, diagram, and complexity report in seconds." },
];

export default function Landing() {
  const typed = useTypewriter(SPEC_TYPES);

  return (
    <div className="min-h-screen bg-[#060609] text-foreground overflow-x-hidden">
      <style>{`
        @keyframes aurora1 { from { transform: translateX(-50%) scale(1); } to { transform: translateX(-50%) scale(1.15) translateY(30px); } }
        @keyframes aurora2 { from { transform: scale(1) translateY(0); } to { transform: scale(1.2) translateY(-40px) translateX(30px); } }
        @keyframes aurora3 { from { transform: scale(1); } to { transform: scale(1.3) translateY(20px) translateX(-20px); } }
        @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
        .shimmer-text {
          background: linear-gradient(90deg, hsl(270,100%,75%) 0%, hsl(200,100%,80%) 40%, hsl(270,100%,75%) 80%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .glow-purple { box-shadow: 0 0 40px rgba(139,92,246,0.25), 0 0 80px rgba(139,92,246,0.1); }
        .noise-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          opacity: 0.4;
        }
      `}</style>

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 border-b border-white/5 bg-[#060609]/80 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-purple-600 flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-mono font-bold text-base tracking-tight">SpecForge</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 ml-1">BETA</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/specs">
            <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-mono hidden sm:block">History</span>
          </Link>
          <Link href="/app">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="cursor-pointer inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-mono px-4 py-2 rounded-lg transition-colors glow-purple"
            >
              Launch App <ArrowRight className="w-3.5 h-3.5" />
            </motion.span>
          </Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 px-6 noise-bg">
        <Aurora />
        <DotGrid />

        <motion.div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/25 bg-purple-500/8 text-purple-300 text-xs font-mono mb-8"
          >
            <Star className="w-3 h-3 fill-current" />
            AI-powered technical documentation
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6"
          >
            Generate
            <br />
            <span className="shimmer-text">{typed || "\u00a0"}</span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              className="inline-block w-1 h-[0.85em] bg-purple-400 ml-1 align-middle rounded-sm"
            />
            <br />
            <span className="text-foreground/90">in seconds.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Drop in a GitHub URL or describe your project. SpecForge uses Claude AI to produce
            professional technical specs, architecture diagrams, and complexity reports — instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/app">
              <motion.span
                whileHover={{ scale: 1.04, boxShadow: "0 0 60px rgba(139,92,246,0.4)" }}
                whileTap={{ scale: 0.97 }}
                className="cursor-pointer inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-500 text-white font-mono text-base px-8 py-4 rounded-xl transition-colors glow-purple"
              >
                <Terminal className="w-4 h-4" />
                Start Generating
                <ChevronRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <Link href="/app/specs">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="cursor-pointer inline-flex items-center gap-2 border border-white/12 bg-white/4 hover:bg-white/8 text-foreground font-mono text-base px-8 py-4 rounded-xl transition-colors"
              >
                <Github className="w-4 h-4" />
                View Examples
              </motion.span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-6 mt-8 text-xs font-mono text-muted-foreground"
          >
            {["No signup required", "Powered by Claude AI", "Free to use"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Terminal Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-2xl mx-auto mt-16"
        >
          <TerminalWindow />
          <div className="absolute -inset-4 bg-purple-600/5 rounded-2xl blur-xl -z-10" />
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative py-16 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: 4, suffix: " spec types", label: "Supported" },
            { val: 10, suffix: "/10", label: "Max complexity score" },
            { val: 30, suffix: "s", label: "Average generation time" },
            { val: 100, suffix: "%", label: "AI-generated content" },
          ].map((s, i) => (
            <FadeInSection key={i} delay={i * 0.1} className="space-y-1">
              <div className="text-4xl font-bold font-mono shimmer-text">
                <CountUp to={s.val} />
                {s.suffix}
              </div>
              <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{s.label}</div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">Everything in one doc</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              More than markdown — SpecForge gives you diagrams, analysis, and a conversational AI that knows your codebase.
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <FadeInSection key={i} delay={i * 0.12}>
                <SpotlightCard className="p-6 h-full">
                  <div className="flex flex-col h-full gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/8">
                      {f.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg">{f.title}</h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${f.tagColor}`}>{f.tag}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto relative">
          <FadeInSection className="text-center mb-16">
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">How It Works</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3">Three steps to a spec</h2>
          </FadeInSection>

          <div className="relative">
            <div className="hidden md:block absolute left-[calc(50%-1px)] top-8 bottom-8 w-px bg-gradient-to-b from-purple-600/40 via-purple-600/20 to-transparent" />
            <div className="space-y-8">
              {steps.map((s, i) => (
                <FadeInSection key={i} delay={i * 0.15}>
                  <div className={`flex items-start gap-6 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
                    <SpotlightCard className={`flex-1 p-6 ${i % 2 === 1 ? "md:text-right" : ""}`}>
                      <span className="font-mono text-4xl font-bold text-purple-400/30">{s.num}</span>
                      <h3 className="text-xl font-bold mt-1 mb-2">{s.title}</h3>
                      <p className="text-muted-foreground text-sm">{s.desc}</p>
                    </SpotlightCard>
                    <div className="hidden md:flex w-12 h-12 rounded-full bg-purple-600 items-center justify-center shrink-0 mt-4 relative z-10 glow-purple">
                      <span className="font-mono font-bold text-sm text-white">{i + 1}</span>
                    </div>
                    <div className="hidden md:block flex-1" />
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Spec types */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeInSection className="text-center mb-14">
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">Spec Types</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">Built for every stage</h2>
          </FadeInSection>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "⚙️", label: "System Design", desc: "Architecture overview, component interactions, data flow" },
              { icon: "🔗", label: "API Design", desc: "Endpoints, auth, request/response schemas, error handling" },
              { icon: "🗄️", label: "Database Schema", desc: "Tables, relationships, indexes, constraints" },
              { icon: "📋", label: "Feature Spec", desc: "User stories, acceptance criteria, edge cases" },
            ].map((t, i) => (
              <FadeInSection key={i} delay={i * 0.08}>
                <SpotlightCard className="p-5 h-full text-center">
                  <div className="text-3xl mb-3">{t.icon}</div>
                  <h4 className="font-bold font-mono text-sm mb-2">{t.label}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
                </SpotlightCard>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950/40 via-[#060609] to-blue-950/20" />
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, hsl(270,100%,60%) 0%, transparent 70%)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
            }}
          />
          <DotGrid />
        </div>

        <FadeInSection className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Stop writing docs
            <br />
            <span className="shimmer-text">from scratch.</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Generate your first spec in under a minute — no account needed.
          </p>
          <Link href="/app">
            <motion.span
              whileHover={{ scale: 1.04, boxShadow: "0 0 80px rgba(139,92,246,0.5)" }}
              whileTap={{ scale: 0.97 }}
              className="cursor-pointer inline-flex items-center gap-3 bg-purple-600 hover:bg-purple-500 text-white font-mono text-lg px-10 py-5 rounded-xl transition-colors glow-purple"
            >
              <Terminal className="w-5 h-5" />
              Launch SpecForge
              <ArrowRight className="w-5 h-5" />
            </motion.span>
          </Link>
        </FadeInSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center">
              <Terminal className="w-2.5 h-2.5 text-white" />
            </div>
            <span>SpecForge v1.0.0-beta</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/app"><span className="hover:text-foreground transition-colors cursor-pointer">Generator</span></Link>
            <Link href="/app/specs"><span className="hover:text-foreground transition-colors cursor-pointer">History</span></Link>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Powered by Claude AI
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
