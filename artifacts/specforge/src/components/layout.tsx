import { Link, useLocation } from "wouter";
import { Terminal, FileCode2, History, Bot } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AIChat } from "@/components/ai-chat";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

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
          <Link href="/">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${location === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <FileCode2 className="w-4 h-4" />
              <span className="font-medium text-sm">Generator</span>
            </div>
          </Link>
          <Link href="/specs">
            <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${location.startsWith("/specs") && location !== "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
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

        <div className="p-4 pt-0 text-xs text-muted-foreground font-mono opacity-50">
          v1.0.0-beta
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50"></div>
        <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}