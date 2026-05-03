import { motion, AnimatePresence } from "framer-motion";
import { Shield, Database, Cpu, Building2, GitMerge, CheckCircle2 } from "lucide-react";

const AGENT_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  architect:   { label: "Architect",   icon: Building2, color: "#7C3AED" },
  security:    { label: "Security",    icon: Shield,    color: "#EF4444" },
  database:    { label: "Database",    icon: Database,  color: "#10B981" },
  api:         { label: "API",         icon: Cpu,       color: "#06B6D4" },
  coordinator: { label: "Coordinator", icon: GitMerge,  color: "#F59E0B" },
};

interface Props {
  agentProgress: Record<string, number>;
  activeAgents: Set<string>;
  completedAgents: Set<string>;
}

export function MultiAgentProgress({ agentProgress, activeAgents, completedAgents }: Props) {
  return (
    <div className="p-4 space-y-2.5">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
        Parallel Agents Running
      </p>
      {Object.entries(AGENT_CONFIG).map(([key, cfg]) => {
        const Icon = cfg.icon;
        const isActive = activeAgents.has(key);
        const isDone = completedAgents.has(key);
        const chars = agentProgress[key] ?? 0;

        return (
          <motion.div
            key={key}
            className="flex items-center gap-3 px-3 py-2 rounded-lg"
            style={{
              background: isDone
                ? `${cfg.color}10`
                : isActive
                  ? `${cfg.color}14`
                  : "rgba(255,255,255,0.02)",
              border: `1px solid ${isDone || isActive ? cfg.color + "30" : "rgba(255,255,255,0.05)"}`,
              opacity: !isActive && !isDone ? 0.45 : 1,
            }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: isDone ? 1 : isActive ? 1 : 0.45, x: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `${cfg.color}20` }}
            >
              {isDone
                ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                : <Icon className="w-3.5 h-3.5" style={{ color: cfg.color, opacity: isActive ? 1 : 0.5 }} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold" style={{ color: isActive || isDone ? cfg.color : undefined }}>
                  {cfg.label}
                </span>
                {isActive && !isDone && (
                  <motion.span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: `${cfg.color}20`, color: cfg.color }}
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  >
                    RUNNING
                  </motion.span>
                )}
                {isDone && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: `${cfg.color}15`, color: cfg.color }}
                  >
                    DONE
                  </span>
                )}
              </div>
              {chars > 0 && (
                <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                  {chars.toLocaleString()} chars
                </p>
              )}
            </div>
            {isActive && !isDone && (
              <div className="flex gap-0.5 shrink-0">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{ background: cfg.color }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
