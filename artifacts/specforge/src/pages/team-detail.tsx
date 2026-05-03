import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Users, Plus, Trash2, Crown, Edit3, Eye,
  Loader2, Shield, FileText, Server, Database, BookOpen, Cpu,
  Settings, Check, X, BookMarked, ScrollText, AlertTriangle,
} from "lucide-react";
import { TeamKnowledgePanel } from "@/components/team-knowledge-panel";
import { AuditLogPanel } from "@/components/audit-log-panel";
import { TeamSettingsPanel } from "@/components/team-settings-panel";
import { SpecConflictsPanel } from "@/components/spec-conflicts-panel";

interface Member {
  id: number;
  teamId: number;
  userId: string;
  username: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: string;
}

interface TeamSpec {
  id: number;
  title: string;
  specType: string;
  status: string;
  createdAt: string;
  complexityScore: number | null;
}

interface TeamDetail {
  id: number;
  name: string;
  description: string;
  ownerId: string;
  role: "owner" | "editor" | "viewer";
  customSystemPrompt: string | null;
  ssoEnabled: string | null;
  createdAt: string;
  members: Member[];
  specs: TeamSpec[];
}

const ROLE_META: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  owner:  { label: "Owner",  color: "#F59E0B", Icon: Crown  },
  editor: { label: "Editor", color: "#06B6D4", Icon: Edit3  },
  viewer: { label: "Viewer", color: "#6B7280", Icon: Eye    },
};

const SPEC_ICON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  system_design:   Server,
  api_design:      Cpu,
  database_schema: Database,
  feature_spec:    BookOpen,
};

type ActiveTab = "overview" | "knowledge" | "conflicts" | "audit" | "settings";

export default function TeamDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteId, setInviteId] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviting, setInviting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    fetch(`/api/teams/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTeam(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteId.trim() || !team) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: inviteId.trim(), username: inviteUsername.trim() || inviteId.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      const member = await res.json();
      setTeam(prev => prev ? { ...prev, members: [...prev.members, member] } : prev);
      setInviteId(""); setInviteUsername(""); setShowInvite(false);
      toast({ title: "Member added!" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to add member", variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (!team) return;
    if (!confirm(`Remove ${member.username} from the team?`)) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/members/${member.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTeam(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== member.id) } : prev);
      toast({ title: "Member removed" });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  };

  const handleRoleChange = async (member: Member, role: "editor" | "viewer") => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      setTeam(prev => prev ? { ...prev, members: prev.members.map(m => m.id === member.id ? { ...m, role } : m) } : prev);
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  const handleSaveName = async () => {
    if (!team || !nameDraft.trim()) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      if (!res.ok) throw new Error();
      setTeam(prev => prev ? { ...prev, name: nameDraft.trim() } : prev);
      setEditingName(false);
      toast({ title: "Team name updated" });
    } catch {
      toast({ title: "Failed to update team", variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  const handleRemoveSpec = async (spec: TeamSpec) => {
    if (!team) return;
    try {
      const res = await fetch(`/api/teams/${team.id}/specs/${spec.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTeam(prev => prev ? { ...prev, specs: prev.specs.filter(s => s.id !== spec.id) } : prev);
      toast({ title: "Spec removed from team" });
    } catch {
      toast({ title: "Failed to remove spec", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground text-sm font-mono">Team not found or access denied.</p>
          <Link href="/app/teams"><Button variant="outline" size="sm" className="font-mono text-xs"><ArrowLeft className="w-3 h-3 mr-1.5" />Back to Teams</Button></Link>
        </div>
      </div>
    );
  }

  const isOwner = team.role === "owner";
  const canEdit = team.role !== "viewer";

  type TabDef = { id: ActiveTab; label: string; Icon: React.ComponentType<{ className?: string }>; badge?: string; ownerOnly?: boolean };
  const ALL_TABS: TabDef[] = [
    { id: "overview",   label: "Members & Specs", Icon: Users          },
    { id: "knowledge",  label: "Knowledge Base",  Icon: BookMarked,     badge: "RAG" },
    { id: "conflicts",  label: "Conflicts",       Icon: AlertTriangle,  badge: "AI", ownerOnly: true },
    { id: "audit",      label: "Audit Log",       Icon: ScrollText,     ownerOnly: true },
    { id: "settings",   label: "Settings",        Icon: Settings,       ownerOnly: true },
  ];
  const TABS = ALL_TABS.filter((t): t is TabDef => !t.ownerOnly || isOwner);

  return (
    <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/teams">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                autoFocus
                className="flex-1 max-w-xs rounded-lg px-3 py-1.5 text-lg font-bold bg-black/40 border border-purple-500/40 outline-none"
              />
              <button onClick={handleSaveName} disabled={savingName} className="p-1.5 rounded text-green-400 hover:bg-green-500/10">
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={() => setEditingName(false)} className="p-1.5 rounded text-muted-foreground hover:bg-white/5">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{team.name}</h1>
              {isOwner && (
                <button onClick={() => { setNameDraft(team.name); setEditingName(true); }} className="p-1 rounded text-muted-foreground opacity-40 hover:opacity-80 hover:bg-white/5">
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {team.description && <p className="text-xs text-muted-foreground mt-0.5">{team.description}</p>}
        </div>
        <Badge variant="outline" className="font-mono text-[10px] shrink-0"
          style={{ borderColor: `${ROLE_META[team.role].color}40`, color: ROLE_META[team.role].color, background: `${ROLE_META[team.role].color}12` }}
        >
          {ROLE_META[team.role].label}
        </Badge>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all"
              style={active ? {
                background: "rgba(124,58,237,0.25)",
                border: "1px solid rgba(124,58,237,0.35)",
                color: "hsl(263,90%,74%)",
              } : {
                background: "transparent",
                border: "1px solid transparent",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              <tab.Icon className="w-3 h-3" />
              {tab.label}
              {tab.id === "knowledge" && (
                <span className="ml-0.5 px-1 py-0.5 rounded text-[9px] font-bold"
                  style={{ background: "rgba(139,92,246,0.2)", color: "hsl(263,90%,74%)" }}
                >
                  RAG
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Overview tab ────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Members — 2/5 */}
          <Card className="lg:col-span-2 border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                MEMBERS ({team.members.length})
              </h2>
              {canEdit && (
                <button
                  onClick={() => setShowInvite(v => !v)}
                  className="text-[10px] font-mono font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
                  style={{ color: "hsl(263,90%,74%)", background: "rgba(124,58,237,0.12)" }}
                >
                  <Plus className="w-2.5 h-2.5" /> ADD
                </button>
              )}
            </div>

            {showInvite && (
              <form onSubmit={handleInvite} className="mb-4 space-y-2 p-3 rounded-lg"
                style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)" }}
              >
                <p className="text-[10px] font-mono text-purple-300 font-bold">ADD BY REPLIT USER ID</p>
                <input
                  value={inviteId}
                  onChange={e => setInviteId(e.target.value)}
                  placeholder="Replit user ID *"
                  autoFocus
                  className="w-full rounded px-2.5 py-1.5 text-xs font-mono bg-black/40 border border-border outline-none focus:border-purple-500/50"
                />
                <input
                  value={inviteUsername}
                  onChange={e => setInviteUsername(e.target.value)}
                  placeholder="Display name (optional)"
                  className="w-full rounded px-2.5 py-1.5 text-xs font-mono bg-black/40 border border-border outline-none focus:border-purple-500/50"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as "editor" | "viewer")}
                  className="w-full rounded px-2.5 py-1.5 text-xs font-mono bg-black/40 border border-border outline-none"
                >
                  <option value="editor">Editor — can generate & sync specs</option>
                  <option value="viewer">Viewer — read-only access</option>
                </select>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowInvite(false)} className="text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-1">Cancel</button>
                  <button type="submit" disabled={inviting || !inviteId.trim()}
                    className="text-[10px] font-mono font-bold px-3 py-1 rounded transition-colors disabled:opacity-50"
                    style={{ background: "rgba(124,58,237,0.25)", color: "hsl(263,90%,74%)" }}
                  >
                    {inviting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add"}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1.5">
              {team.members.map(member => {
                const rm = ROLE_META[member.role] ?? ROLE_META.viewer;
                const RoleIcon = rm.Icon;
                return (
                  <div key={member.id} className="flex items-center gap-2.5 p-2 rounded-lg group"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold"
                      style={{ background: `${rm.color}18`, color: rm.color }}
                    >
                      {member.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{member.username}</p>
                      <p className="text-[9px] text-muted-foreground font-mono opacity-60 truncate">{member.userId}</p>
                    </div>
                    {isOwner && member.role !== "owner" ? (
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member, e.target.value as "editor" | "viewer")}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border bg-black/40 outline-none cursor-pointer"
                        style={{ color: rm.color }}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="text-[9px] font-mono flex items-center gap-1 shrink-0" style={{ color: rm.color }}>
                        <RoleIcon className="w-2.5 h-2.5" />{rm.label}
                      </span>
                    )}
                    {canEdit && member.role !== "owner" && (
                      <button onClick={() => handleRemoveMember(member)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Specs — 3/5 */}
          <Card className="lg:col-span-3 border-border bg-card p-4">
            <h2 className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1.5 mb-4">
              <FileText className="w-3 h-3" />
              TEAM SPECS ({team.specs.length})
            </h2>

            {team.specs.length === 0 ? (
              <div className="py-8 text-center">
                <Shield className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-20" />
                <p className="text-xs text-muted-foreground font-mono opacity-60">
                  No specs shared with this team yet.
                </p>
                <p className="text-[10px] text-muted-foreground opacity-40 mt-1">
                  Open any spec and assign it to this team.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {team.specs.map(spec => {
                  const SpecIcon = SPEC_ICON[spec.specType] ?? FileText;
                  return (
                    <div key={spec.id} className="flex items-center gap-3 p-2.5 rounded-lg group"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)" }}
                      >
                        <SpecIcon className="w-3.5 h-3.5" style={{ color: "hsl(263,90%,74%)" } as React.CSSProperties} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{spec.title}</p>
                        <p className="text-[9px] text-muted-foreground font-mono opacity-60">
                          {spec.specType.replace(/_/g, " ")}
                          {spec.complexityScore !== null ? ` · score ${spec.complexityScore}` : ""}
                        </p>
                      </div>
                      <Link href={`/app/specs/${spec.id}`}>
                        <button className="text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-transparent hover:border-border transition-all">
                          Open →
                        </button>
                      </Link>
                      {canEdit && (
                        <button onClick={() => handleRemoveSpec(spec)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 rounded text-muted-foreground hover:text-red-400 transition-opacity"
                          title="Remove from team"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Knowledge Base tab ───────────────────────────────────────── */}
      {activeTab === "knowledge" && (
        <Card className="border-border bg-card p-5">
          <TeamKnowledgePanel teamId={team.id} canEdit={canEdit} />
        </Card>
      )}

      {/* ── Conflicts tab ────────────────────────────────────────────── */}
      {activeTab === "conflicts" && isOwner && (
        <Card className="border-border bg-card p-5">
          <SpecConflictsPanel teamId={team.id} />
        </Card>
      )}

      {/* ── Audit Log tab ────────────────────────────────────────────── */}
      {activeTab === "audit" && isOwner && (
        <Card className="border-border bg-card p-5">
          <AuditLogPanel teamId={team.id} />
        </Card>
      )}

      {/* ── Settings tab ─────────────────────────────────────────────── */}
      {activeTab === "settings" && isOwner && (
        <Card className="border-border bg-card p-5">
          <TeamSettingsPanel
            teamId={team.id}
            initialPrompt={team.customSystemPrompt}
            ssoEnabled={team.ssoEnabled === "true"}
          />
        </Card>
      )}
    </div>
  );
}
