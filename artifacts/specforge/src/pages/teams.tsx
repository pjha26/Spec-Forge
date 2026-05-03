import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Plus, Trash2, ChevronRight, Loader2, Shield, Edit3, Eye, Crown,
} from "lucide-react";

interface Team {
  id: number;
  name: string;
  description: string;
  ownerId: string;
  role: "owner" | "editor" | "viewer";
  createdAt: string;
  updatedAt: string;
}

const ROLE_META: Record<string, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  owner:  { label: "Owner",  color: "#F59E0B", Icon: Crown },
  editor: { label: "Editor", color: "#06B6D4", Icon: Edit3 },
  viewer: { label: "Viewer", color: "#6B7280", Icon: Eye },
};

export default function TeamsPage() {
  const { isAuthenticated, login } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/teams")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.teams) setTeams(d.teams); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() }),
      });
      if (!res.ok) throw new Error();
      const team = await res.json();
      setTeams(prev => [team, ...prev]);
      setShowForm(false);
      setFormName("");
      setFormDesc("");
      toast({ title: "Team created!" });
    } catch {
      toast({ title: "Failed to create team", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Delete team "${team.name}"? This will unlink all team specs.`)) return;
    setDeleting(team.id);
    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTeams(prev => prev.filter(t => t.id !== team.id));
      toast({ title: "Team deleted" });
    } catch {
      toast({ title: "Failed to delete team", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Users className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
          <p className="text-muted-foreground text-sm">Sign in to use Team Workspaces</p>
          <Button onClick={login} className="font-mono text-xs">Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: "hsl(191,100%,52%)" }} />
            Team Workspaces
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            Share specs with your team, control access by role.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="font-mono text-xs gap-2"
          style={{ background: "linear-gradient(135deg,#0891b2,#0369a1)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          NEW TEAM
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="mb-6 p-5 border-cyan-500/30"
          style={{ background: "rgba(0,180,216,0.04)" }}
        >
          <form onSubmit={handleCreate} className="space-y-3">
            <h3 className="text-sm font-bold font-mono text-cyan-400">CREATE TEAM</h3>
            <input
              value={formName}
              onChange={e => setFormName(e.target.value)}
              placeholder="Team name *"
              autoFocus
              className="w-full rounded-lg px-3 py-2 text-sm font-mono bg-black/40 border border-border focus:border-cyan-500/60 outline-none"
            />
            <input
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full rounded-lg px-3 py-2 text-sm font-mono bg-black/40 border border-border focus:border-cyan-500/60 outline-none"
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" className="font-mono text-xs" onClick={() => { setShowForm(false); setFormName(""); setFormDesc(""); }}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="font-mono text-xs" disabled={creating || !formName.trim()}>
                {creating ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Plus className="w-3 h-3 mr-1.5" />}
                Create
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Teams list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.18)" }}
          >
            <Users className="w-7 h-7" style={{ color: "hsl(191,100%,52%)" }} />
          </div>
          <p className="text-muted-foreground text-sm">You're not in any teams yet.</p>
          <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => setShowForm(true)}>
            <Plus className="w-3 h-3 mr-1.5" /> Create your first team
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map(team => {
            const rm = ROLE_META[team.role] ?? ROLE_META.viewer;
            const RoleIcon = rm.Icon;
            return (
              <div key={team.id}
                className="group relative rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Link href={`/app/teams/${team.id}`}>
                  <div className="p-4 cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: "rgba(0,180,216,0.12)", border: "1px solid rgba(0,180,216,0.22)" }}
                        >
                          <Shield className="w-4 h-4" style={{ color: "hsl(191,100%,65%)" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{team.name}</p>
                          {team.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{team.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] font-mono gap-1 px-1.5 py-0.5"
                          style={{ borderColor: `${rm.color}40`, color: rm.color, background: `${rm.color}12` }}
                        >
                          <RoleIcon className="w-2.5 h-2.5" />
                          {rm.label}
                        </Badge>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-40 group-hover:opacity-80 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </Link>

                {team.role === "owner" && (
                  <button
                    onClick={() => handleDelete(team)}
                    disabled={deleting === team.id}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-red-400"
                    style={{ zIndex: 10 }}
                    title="Delete team"
                  >
                    {deleting === team.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
