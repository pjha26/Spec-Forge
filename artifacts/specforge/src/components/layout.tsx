import { Link, useLocation } from "wouter";
import { Zap, FileCode2, History, Bot, LogIn, LogOut, User, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  const initials = user
    ? [user.firstName, user.lastName]
        .filter(Boolean)
        .map((s) => s![0])
        .join("")
        .toUpperCase() || "U"
    : "?";

  const navItems = [
    { href: "/app", label: "Generator", icon: FileCode2, exact: true },
    { href: "/app/specs", label: "History", icon: History, exact: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
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

        <div className="p-5 flex items-center gap-3 relative"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center relative z-10"
              style={{
                background: "linear-gradient(135deg, hsl(263,90%,60%) 0%, hsl(213,90%,60%) 100%)",
                boxShadow: "0 0 16px rgba(139,92,246,0.5), 0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="absolute -inset-1 rounded-2xl opacity-30 blur-sm"
              style={{ background: "linear-gradient(135deg, hsl(263,90%,60%), hsl(213,90%,60%))" }}
            />
          </div>
          <div>
            <span className="font-mono font-bold tracking-tight text-base text-white">SpecForge</span>
            <div className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm inline-block ml-1.5 align-middle"
              style={{ background: "rgba(139,92,246,0.15)", color: "hsl(263,90%,74%)", border: "1px solid rgba(139,92,246,0.25)" }}
            >
              BETA
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 pt-4">
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
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <Sheet>
            <SheetTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-mono text-xs relative overflow-hidden group transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.08) 100%)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  color: "hsl(263,90%,74%)",
                  boxShadow: "0 0 12px rgba(139,92,246,0.1)",
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(6,182,212,0.12) 100%)" }}
                />
                <Sparkles className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10 font-bold tracking-wide">AI ASSISTANT</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background border-l border-border flex flex-col">
              <div className="flex-1 p-4 overflow-hidden">
                <AIChat />
              </div>
            </SheetContent>
          </Sheet>
        </div>

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

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 line-grid-bg opacity-40" />
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)" }}
          />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)" }}
          />
        </div>
        <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
