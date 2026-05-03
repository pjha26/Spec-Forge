import { useAuth } from "@workspace/replit-auth-web";
import { motion } from "framer-motion";
import { Terminal, LogIn, Loader2, Zap } from "lucide-react";
import { SpecForgeLogo } from "@/components/spec-forge-logo";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin opacity-40" />
          <span className="font-mono text-sm">Authenticating…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="flex flex-col items-center gap-8 max-w-sm w-full text-center"
        >
          <div className="flex flex-col items-center gap-4">
            <SpecForgeLogo size={52} textSize="text-xl" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-mono">
                Sign in to generate and manage technical specs
              </p>
            </div>
          </div>

          <div
            className="w-full rounded-2xl p-6 space-y-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-3 text-left">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(var(--primary-rgb),0.12)",
                  border: "1px solid rgba(var(--primary-rgb),0.25)",
                }}
              >
                <Terminal className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div>
                <p className="text-xs font-semibold font-mono text-white">AI-Powered Spec Generation</p>
                <p className="text-[11px] text-muted-foreground">From GitHub repos, descriptions, or images</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold font-mono text-white">Export &amp; Share</p>
                <p className="text-[11px] text-muted-foreground">Markdown, DOCX, Notion, PDF, public links</p>
              </div>
            </div>

            <motion.button
              onClick={login}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-mono font-bold text-sm text-white"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary)), rgba(var(--primary-rgb),0.7))",
                boxShadow: "0 0 24px rgba(var(--primary-rgb),0.3)",
              }}
              whileHover={{ scale: 1.02, boxShadow: "0 0 36px rgba(var(--primary-rgb),0.45)" } as any}
              whileTap={{ scale: 0.97 }}
            >
              <LogIn className="w-4 h-4" />
              Sign in with Replit
            </motion.button>
          </div>

          <p className="text-[10px] text-muted-foreground/50 font-mono">
            Free to use · No credit card required
          </p>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
