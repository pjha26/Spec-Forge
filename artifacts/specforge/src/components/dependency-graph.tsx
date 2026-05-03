import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Network, Loader2, RefreshCw, Server, Cpu, Database, BookOpen, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Spec = { id: number; title: string; specType: string; status: string };
type Dep  = { id: number; sourceSpecId: number; targetSpecId: number; relationshipType: string; description?: string };

const TYPE_COLOR: Record<string, string> = {
  system_design:   "#8B5CF6",
  api_design:      "#06B6D4",
  database_schema: "#10B981",
  feature_spec:    "#F59E0B",
};
const TYPE_ICON: Record<string, any> = {
  system_design:   Server,
  api_design:      Cpu,
  database_schema: Database,
  feature_spec:    BookOpen,
};
const REL_COLOR: Record<string, string> = {
  depends_on:        "#8B5CF6",
  shares_data_model: "#10B981",
  uses_api:          "#06B6D4",
  extends:           "#F59E0B",
  conflicts_with:    "#EF4444",
};
const REL_LABEL: Record<string, string> = {
  depends_on:        "depends on",
  shares_data_model: "shares model",
  uses_api:          "uses API",
  extends:           "extends",
  conflicts_with:    "conflicts",
};

interface Node { id: number; title: string; specType: string; x: number; y: number; vx: number; vy: number }

function layoutNodes(specs: Spec[], deps: Dep[]): Node[] {
  const n = specs.length;
  if (n === 0) return [];

  const nodes: Node[] = specs.map((s, i) => {
    const angle = (2 * Math.PI * i) / n;
    const radius = Math.min(180 + n * 18, 320);
    return {
      id: s.id,
      title: s.title,
      specType: s.specType,
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
      vx: 0, vy: 0,
    };
  });

  // Simple force-directed simulation — 80 ticks
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const edges = deps.map(d => ({ s: d.sourceSpecId, t: d.targetSpecId }));

  for (let tick = 0; tick < 80; tick++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 8000 / (dist * dist);
        a.vx -= (dx / dist) * force;
        a.vy -= (dy / dist) * force;
        b.vx += (dx / dist) * force;
        b.vy += (dy / dist) * force;
      }
    }
    // Attraction along edges
    for (const e of edges) {
      const a = nodeMap.get(e.s), b = nodeMap.get(e.t);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 180) * 0.03;
      a.vx += (dx / dist) * force;
      a.vy += (dy / dist) * force;
      b.vx -= (dx / dist) * force;
      b.vy -= (dy / dist) * force;
    }
    // Center gravity
    for (const node of nodes) {
      node.vx += (400 - node.x) * 0.003;
      node.vy += (300 - node.y) * 0.003;
      node.x += node.vx * 0.6;
      node.y += node.vy * 0.6;
      node.vx *= 0.7;
      node.vy *= 0.7;
    }
  }

  return nodes;
}

export function DependencyGraph() {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [deps, setDeps]   = useState<Dep[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading]     = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [hovered, setHovered]     = useState<number | null>(null);
  const [selected, setSelected]   = useState<number | null>(null);
  const [scale, setScale]         = useState(1);
  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<{ id: number; ox: number; oy: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/specs/dependencies");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSpecs(data.specs ?? []);
      setDeps(data.dependencies ?? []);
      setNodes(layoutNodes(data.specs ?? [], data.dependencies ?? []));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/specs/dependencies/analyze", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDeps(data.dependencies ?? []);
      const specRes = await fetch("/api/specs/dependencies");
      const d2 = await specRes.json();
      setSpecs(d2.specs ?? []);
      setNodes(layoutNodes(d2.specs ?? [], data.dependencies ?? []));
    } catch {}
    finally { setAnalyzing(false); }
  };

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const selectedNode = selected ? nodeMap.get(selected) : null;
  const selectedSpec = selected ? specs.find(s => s.id === selected) : null;
  const connectedDeps = selected
    ? deps.filter(d => d.sourceSpecId === selected || d.targetSpecId === selected)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground gap-3">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="font-mono text-sm">Loading graph…</span>
      </div>
    );
  }

  if (specs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center gap-4">
        <Network className="w-10 h-10 opacity-20" />
        <p className="text-sm text-muted-foreground">No specs found to visualize.</p>
        <p className="text-xs text-muted-foreground/60">Generate some specs first, then come back here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <span className="font-mono text-sm font-bold">Spec Dependency Graph</span>
          <Badge variant="outline" className="text-[9px] font-mono">{specs.length} specs · {deps.length} links</Badge>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.min(s + 0.15, 2))} className="p-1.5 rounded border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
          <button onClick={() => setScale(s => Math.max(s - 0.15, 0.4))} className="p-1.5 rounded border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} className="p-1.5 rounded border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
          <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={analyzing} className="font-mono text-xs ml-1">
            {analyzing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-2" />}
            {analyzing ? "Analyzing…" : deps.length === 0 ? "Analyze Dependencies" : "Re-analyze"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* SVG canvas */}
        <div className="flex-1 relative overflow-hidden" style={{ background: "rgba(8,8,14,0.5)" }}>
          {deps.length === 0 && specs.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Click "Analyze Dependencies" to map relationships</p>
                <p className="text-xs text-muted-foreground/50">AI will compare your specs and extract links</p>
              </div>
            </div>
          )}
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox="0 0 800 600"
            style={{ cursor: "grab" }}
          >
            <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
              {/* Edge lines */}
              {deps.map(dep => {
                const src = nodeMap.get(dep.sourceSpecId);
                const tgt = nodeMap.get(dep.targetSpecId);
                if (!src || !tgt) return null;
                const color = REL_COLOR[dep.relationshipType] ?? "#8B5CF6";
                const isHighlighted = hovered === dep.sourceSpecId || hovered === dep.targetSpecId
                  || selected === dep.sourceSpecId || selected === dep.targetSpecId;
                const mx = (src.x + tgt.x) / 2;
                const my = (src.y + tgt.y) / 2;
                return (
                  <g key={dep.id}>
                    <line
                      x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                      stroke={color}
                      strokeWidth={isHighlighted ? 2 : 1}
                      strokeOpacity={isHighlighted ? 0.8 : 0.25}
                      strokeDasharray={dep.relationshipType === "conflicts_with" ? "4 3" : undefined}
                    />
                    {isHighlighted && (
                      <text x={mx} y={my - 4} textAnchor="middle" fontSize="7" fill={color} opacity={0.9} fontFamily="monospace">
                        {REL_LABEL[dep.relationshipType] ?? dep.relationshipType}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {nodes.map(node => {
                const color = TYPE_COLOR[node.specType] ?? "#8B5CF6";
                const isHov = hovered === node.id;
                const isSel = selected === node.id;
                const isConn = connectedDeps.some(d => d.sourceSpecId === node.id || d.targetSpecId === node.id);
                const dimmed = selected !== null && !isSel && !isConn;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(selected === node.id ? null : node.id)}
                    opacity={dimmed ? 0.25 : 1}
                  >
                    {/* Glow */}
                    {(isHov || isSel) && (
                      <circle r={32} fill={color} opacity={0.12} />
                    )}
                    {/* Node circle */}
                    <circle
                      r={isSel ? 26 : isHov ? 24 : 22}
                      fill={`${color}22`}
                      stroke={color}
                      strokeWidth={isSel ? 2.5 : 1.5}
                      strokeOpacity={isHov || isSel ? 1 : 0.5}
                    />
                    {/* Icon text (using first letter) */}
                    <text textAnchor="middle" dominantBaseline="central" fontSize="12" fill={color} fontWeight="bold" fontFamily="monospace">
                      {node.specType === "system_design" ? "S" : node.specType === "api_design" ? "A" : node.specType === "database_schema" ? "D" : "F"}
                    </text>
                    {/* Label */}
                    <text
                      y={32}
                      textAnchor="middle"
                      fontSize="9"
                      fill="rgba(255,255,255,0.7)"
                      fontFamily="monospace"
                    >
                      {node.title.length > 18 ? node.title.slice(0, 16) + "…" : node.title}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Side panel */}
        {selected && selectedSpec && selectedNode && (
          <motion.div
            className="w-56 shrink-0 border-l border-border flex flex-col overflow-hidden"
            style={{ background: "rgba(10,10,18,0.95)" }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${TYPE_COLOR[selectedSpec.specType]}22`, border: `1px solid ${TYPE_COLOR[selectedSpec.specType]}55` }}>
                  {(() => { const I = TYPE_ICON[selectedSpec.specType] ?? Server; return <I className="w-3.5 h-3.5" style={{ color: TYPE_COLOR[selectedSpec.specType] }} />; })()}
                </div>
                <p className="text-xs font-bold text-white leading-snug">{selectedSpec.title}</p>
              </div>
              <Link href={`/app/specs/${selectedSpec.id}`}>
                <Button size="sm" variant="outline" className="w-full font-mono text-xs mt-1">
                  Open spec →
                </Button>
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {connectedDeps.length === 0 && (
                <p className="text-[10px] text-muted-foreground font-mono text-center py-4">No connections</p>
              )}
              {connectedDeps.map(dep => {
                const otherId = dep.sourceSpecId === selected ? dep.targetSpecId : dep.sourceSpecId;
                const otherSpec = specs.find(s => s.id === otherId);
                const isSource = dep.sourceSpecId === selected;
                const color = REL_COLOR[dep.relationshipType] ?? "#8B5CF6";
                return (
                  <div key={dep.id} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[9px] font-mono mb-1" style={{ color }}>
                      {isSource ? "→" : "←"} {REL_LABEL[dep.relationshipType] ?? dep.relationshipType}
                    </p>
                    <p className="text-[10px] font-semibold text-white truncate">{otherSpec?.title ?? `Spec #${otherId}`}</p>
                    {dep.description && <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{dep.description}</p>}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
