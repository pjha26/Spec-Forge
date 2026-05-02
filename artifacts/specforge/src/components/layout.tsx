import { Link, useLocation } from "wouter";
import { Terminal, FileCode2, History, Bot, LogIn, LogOut, User } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
            <Terminal className="w-4 h-4" />
          </div>
          <span className="font-mono font-bold tracking-tight text-lg">SpecForge</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/app">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${location === "/app" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <FileCode2 className="w-4 h-4" />
              <span className="font-medium text-sm">Generator</span>
            </div>
          </Link>
          <Link href="/app/specs">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${location.startsWith("/app/specs") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <History className="w-4 h-4" />
              <span className="font-medium text-sm">History</span>
            </div>
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full font-mono text-xs border-primary/30 text-primary hover:bg-primary/10 justify-start">
                <Bot className="w-4 h-4 mr-2" /> AI ASSISTANT
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background border-l border-border flex flex-col">
              <div className="flex-1 p-4 overflow-hidden">
                <AIChat />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="p-4 pt-0 border-t border-border">
          {isLoading ? (
            <div className="flex items-center gap-2 px-1 py-2 text-muted-foreground">
              <div className="w-7 h-7 rounded-full bg-secondary animate-pulse" />
              <div className="h-3 w-20 bg-secondary animate-pulse rounded" />
            </div>
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 px-1 py-2 rounded-md hover:bg-secondary/50 transition-colors text-left">
                  <Avatar className="w-7 h-7 shrink-0">
                    {user.profileImageUrl && <AvatarImage src={user.profileImageUrl} alt={initials} />}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.email ?? "User"}
                    </p>
                    {user.email && (
                      <p className="text-xs text-muted-foreground truncate leading-tight">{user.email}</p>
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
            <Button
              variant="outline"
              size="sm"
              onClick={login}
              className="w-full font-mono text-xs justify-start"
            >
              <LogIn className="w-3.5 h-3.5 mr-2" />
              Sign in
            </Button>
          )}
        </div>

        <div className="px-4 pb-3 text-xs text-muted-foreground font-mono opacity-50">
          v1.0.0-beta
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50" />
        <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
