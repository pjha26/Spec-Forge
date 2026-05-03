import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Zap, FileCode2, History, LogIn, LogOut, User, Sparkles, Server, Code2, Database, BookOpen, ChevronRight, Users, Search, Network, PlugZap, Terminal } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AIChat } from "@/components/ai-chat";
import { useAuth } from "@workspace/replit-auth-web";
import { useListSpecs } from "@workspace/api-client-react";
import { NotificationBell } from "@/components/notification-bell";

const SPEC_TYPE_META: Record<string, { color: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  "System Design": { color: "#7C3AED", Icon: Server },
  "API Design":    { color: "#06B6D4", Icon: Code2 },
  "Database Schema": { color: "#10B981", Icon: Database },
  "Feature Spec":  { color: "#F59E0B", Icon: BookOpen },
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);
  const [justOpened, setJustOpened] = useState(false);
  const { data: specs } = useListSpecs();
  const recentSpecs = (specs ?? []).slice(0, 4);

  const initials = user
    ? [user.firstName, user.lastName]
        .filter(Boolean)
        .map((s) => s![0])
        .join("")
        .toUpperCase() || "U"
    : "?";

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        const tag = (e.target as HTMLElement).tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || (e.target as HTMLElement).isContentEditable) return;
        e.preventDefault();
        setAiOpen(prev => {
          if (!prev) setJustOpened(true);
          return !prev;
        });
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
    { href: "/app", label: "Generator", icon: FileCode2, exact: true },
    { href: "/app/specs", label: "History", icon: History, exact: false },
    { href: "/app/search", label: "Search", icon: Search, exact: false },
    { href: "/app/graph", label: "Dep Graph", icon: Network, exact: false },
    { href: "/app/teams", label: "Teams", icon: Users, exact: false },
    { href: "/app/integrations", label: "Integrations", icon: PlugZap, exact: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* ─── Global Cmd+K Toast ─────────────────────────────────── */}
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 pointer-events-none"
        style={{
          opacity: justOpened ? 1 : 0,
          transform: `translateX(-50%) translateY(${justOpened ? "0px" : "-8px"})`,
        }}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono"
          style={{
            background: "rgba(139,92,246,0.9)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 24px rgba(139,92,246,0.4)",
            color: "white",
          }}
        >
          <Sparkles className="w-3 h-3" />
          AI Assistant opened
        </div>
      </div>

      <aside className="w-full md:w-64 flex flex-col relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, hsl(240,14%,6%) 0%, hsl(240,12%,5%) 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent)" }}
          />
        </div>

        {/* Logo */}
        <Link href="/">
          <div className="p-5 flex items-center gap-3 relative cursor-pointer group"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center relative z-10 transition-all duration-200 group-hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, hsl(263,90%,60%) 0%, hsl(213,90%,60%) 100%)",
                  boxShadow: "0 0 16px rgba(139,92,246,0.5), 0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="absolute -inset-1 rounded-2xl opacity-30 blur-sm transition-opacity duration-200 group-hover:opacity-60"
                style={{ background: "linear-gradient(135deg, hsl(263,90%,60%), hsl(213,90%,60%))" }}
              />
            </div>
            <div>
              <span className="font-mono font-bold tracking-tight text-base text-white transition-colors duration-200 group-hover:text-violet-300">SpecForge</span>
              <div className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm inline-block ml-1.5 align-middle"
                style={{ background: "rgba(139,92,246,0.15)", color: "hsl(263,90%,74%)", border: "1px solid rgba(139,92,246,0.25)" }}
              >
                BETA
              </div>
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 pt-4 flex flex-col min-h-0">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? location === href : location.startsWith(href);
            return (
              <Link key={href} href={href}>
                <div className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 relative overflow-hidden ${
                  active ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
                  style={active ? {
                    background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(99,102,241,0.1) 100%)",
                    border: "1px solid rgba(139,92,246,0.3)",
                    boxShadow: "0 0 12px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.07)",
                  } : {
                    background: "transparent",
                    border: "1px solid transparent",
                  }}
                >
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                      style={{ background: "linear-gradient(180deg, hsl(263,90%,70%), hsl(213,90%,65%))" }}
                    />
                  )}
                  <Icon className={`w-4 h-4 transition-all duration-200 ${active ? "text-violet-400" : "group-hover:text-foreground"}`} />
                  <span className="font-medium text-sm">{label}</span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: "hsl(263,90%,70%)" }}
                    />
                  )}
                </div>
              </Link>
            );
          })}

          {/* Recent specs */}
          {recentSpecs.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between px-3 mb-1.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                  Recent
                </span>
                <Link href="/app/specs">
                  <span className="text-[9px] font-mono text-muted-foreground opacity-50 hover:opacity-100 hover:text-violet-400 transition-all duration-150 cursor-pointer flex items-center gap-0.5">
                    all <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </Link>
              </div>
              <div className="space-y-0.5">
                {recentSpecs.map((spec) => {
                  const meta = SPEC_TYPE_META[spec.specType] ?? SPEC_TYPE_META["System Design"];
                  const { Icon: SpecIcon, color } = meta;
                  const active = location === `/app/specs/${spec.id}`;
                  return (
                    <Link key={spec.id} href={`/app/specs/${spec.id}`}>
                      <div
                        className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150"
                        style={active ? {
                          background: `rgba(${color === "#7C3AED" ? "124,58,237" : color === "#06B6D4" ? "6,182,212" : color === "#10B981" ? "16,185,129" : "245,158,11"},0.12)`,
                          border: `1px solid ${color}33`,
                        } : {
                          background: "transparent",
                          border: "1px solid transparent",
                        }}
                        onMouseEnter={e => {
                          if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                        }}
                        onMouseLeave={e => {
                          if (!active) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <div className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                          style={{ background: `${color}22` }}
                        >
                          <SpecIcon className="w-2.5 h-2.5" style={{ color }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors duration-150 truncate flex-1 leading-tight">
                          {spec.title}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* AI Assistant button */}
        <div className="p-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <NotificationBell />
          <button
            onClick={() => setAiOpen(true)}
            className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-mono text-xs relative overflow-hidden group transition-all duration-200"
            style={{
              background: aiOpen
                ? "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(6,182,212,0.15) 100%)"
                : "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.08) 100%)",
              border: aiOpen ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(139,92,246,0.25)",
              color: "hsl(263,90%,74%)",
              boxShadow: aiOpen ? "0 0 20px rgba(139,92,246,0.25)" : "0 0 12px rgba(139,92,246,0.1)",
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(6,182,212,0.12) 100%)" }}
            />
            <Sparkles className="w-3.5 h-3.5 relative z-10 shrink-0" />
            <span className="relative z-10 font-bold tracking-wide flex-1">AI ASSISTANT</span>
            <kbd className="relative z-10 flex items-center gap-0.5 opacity-60 shrink-0"
              style={{ fontSize: "9px", letterSpacing: "0.02em" }}
            >
              <span className="text-[10px]">{isMac ? "⌘" : "Ctrl"}</span>
              <span>K</span>
            </kbd>
          </button>
        </div>

        {/* User section */}
        <div className="p-3 pt-0">
          {isLoading ? (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div className="w-7 h-7 rounded-full bg-secondary animate-pulse" />
              <div className="h-3 w-24 bg-secondary animate-pulse rounded" />
            </div>
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group"
                  style={{ border: "1px solid transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)", e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent", e.currentTarget.style.borderColor = "transparent")}
                >
                  <Avatar className="w-7 h-7 shrink-0 ring-1 ring-violet-500/30">
                    {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={initials} />}
                    <AvatarFallback className="text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, hsl(263,90%,50%), hsl(213,90%,55%))", color: "white" }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate leading-tight text-foreground">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email ?? "User"}
                    </p>
                    {user.email && (
                      <p className="text-[10px] text-muted-foreground truncate leading-tight">{user.email}</p>
                    )}
                  </div>
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
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-mono text-xs transition-all duration-200"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "hsl(var(--muted-foreground))" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)", e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent", e.currentTarget.style.color = "")}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in with Replit
            </button>
          )}
        </div>

        <div className="px-4 pb-3 text-[10px] text-muted-foreground font-mono opacity-30">
          v1.0.0-beta
        </div>
      </aside>

      {/* ─── AI Assistant Sheet ──────────────────────────────────── */}
      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent
          side="right"
          className="p-0 flex flex-col"
          style={{
            width: "min(440px, 100vw)",
            background: "rgba(8,8,14,0.97)",
            borderLeft: "1px solid rgba(139,92,246,0.2)",
            boxShadow: "-8px 0 48px rgba(139,92,246,0.12)",
          }}
        >
          <AIChat />
        </SheetContent>
      </Sheet>

      {/* ─── Main content ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 line-grid-bg opacity-40" />
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)" }}
          />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)" }}
          />
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
