import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ScrollText, Download, Filter, Loader2, Shield, RefreshCw,
  FileText, Share2, Trash2, Users, Key, Upload, LogIn, LogOut, Settings,
} from "lucide-react";

interface AuditLog {
  id: number;
  userId: string | null;
  username: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_META: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  "spec.created":           { label: "Spec Created",         color: "#7C3AED", Icon: FileText  },
  "spec.generated":         { label: "Spec Generated",       color: "#7C3AED", Icon: FileText  },
  "spec.deleted":           { label: "Spec Deleted",         color: "#EF4444", Icon: Trash2    },
  "spec.shared":            { label: "Spec Shared",          color: "#06B6D4", Icon: Share2    },
  "spec.exported_pdf":      { label: "PDF Export",           color: "#10B981", Icon: Download  },
  "spec.exported_docx":     { label: "DOCX Export",         color: "#10B981", Icon: Download  },
  "spec.exported_notion":   { label: "Notion Export",        color: "#10B981", Icon: Download  },
  "spec.synced":            { label: "Spec Synced",          color: "#F59E0B", Icon: RefreshCw },
  "team.member_added":      { label: "Member Added",         color: "#10B981", Icon: Users     },
  "team.member_removed":    { label: "Member Removed",       color: "#EF4444", Icon: Users     },
  "team.member_role_changed":{ label: "Role Changed",        color: "#F59E0B", Icon: Users     },
  "team.prompt_updated":    { label: "Prompt Updated",       color: "#8B5CF6", Icon: Settings  },
  "team.sso_configured":    { label: "SSO Configured",       color: "#F59E0B", Icon: Key       },
  "knowledge.uploaded":     { label: "Knowledge Uploaded",   color: "#8B5CF6", Icon: Upload    },
  "knowledge.deleted":      { label: "Knowledge Deleted",    color: "#EF4444", Icon: Trash2    },
  "sso.login":              { label: "SSO Login",            color: "#10B981", Icon: LogIn     },
  "auth.login":             { label: "Login",                color: "#10B981", Icon: LogIn     },
  "auth.logout":            { label: "Logout",               color: "#6B7280", Icon: LogOut    },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, color: "#6B7280", Icon: Shield };
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

interface Props { teamId: number }

export function AuditLogPanel({ teamId }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterAction) params.set("action", filterAction);
    if (filterUser) params.set("userId", filterUser);
    fetch(`/api/teams/${teamId}/audit?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.logs) setLogs(d.logs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [teamId, filterAction, filterUser]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/audit/export`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `audit-log-team-${teamId}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const uniqueActions = [...new Set(Object.keys(ACTION_META))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <ScrollText className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-red-400">Audit Log</h3>
            <p className="text-[9px] text-muted-foreground font-mono">{logs.length} events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all"
            style={showFilters
              ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }
              : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "hsl(var(--muted-foreground))" }}
          >
            <Filter className="w-3 h-3" />
            Filter
          </button>
          <motion.button
            onClick={handleExport}
            disabled={exporting || logs.length === 0}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold disabled:opacity-40"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)", color: "#EF4444" }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          >
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Export CSV
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-2 flex-wrap p-3 rounded-lg"
          style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
        >
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="flex-1 min-w-0 rounded px-2.5 py-1.5 text-[10px] font-mono outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <option value="">All actions</option>
            {uniqueActions.map(a => (
              <option key={a} value={a}>{getActionMeta(a).label}</option>
            ))}
          </select>
          <input
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            placeholder="Filter by user ID…"
            className="flex-1 min-w-0 rounded px-2.5 py-1.5 text-[10px] font-mono outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button onClick={() => { setFilterAction(""); setFilterUser(""); }}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-1"
          >Clear</button>
        </div>
      )}

      {/* Log table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <ScrollText className="w-8 h-8 mx-auto opacity-20 text-red-400" />
          <p className="text-xs font-mono text-muted-foreground">No audit events recorded yet.</p>
          <p className="text-[10px] text-muted-foreground opacity-50">
            Actions by team members will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log, i) => {
            const meta = getActionMeta(log.action);
            return (
              <motion.div
                key={log.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015, type: "spring", stiffness: 400, damping: 30 }}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}22` }}
                >
                  <meta.Icon className="w-3 h-3" style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    {log.resourceId && (
                      <span className="text-[9px] font-mono text-muted-foreground opacity-50">
                        #{log.resourceId}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-muted-foreground font-mono truncate">
                    {log.username ?? log.userId ?? "system"}
                    {log.ipAddress ? ` · ${log.ipAddress}` : ""}
                  </p>
                </div>
                <span className="text-[9px] font-mono text-muted-foreground opacity-50 shrink-0">
                  {fmtTime(log.createdAt)}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
