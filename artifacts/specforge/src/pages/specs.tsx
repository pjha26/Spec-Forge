import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useListSpecs, useDeleteSpec } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListSpecsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Server,
  Cpu,
  Database,
  BookOpen,
  Trash2,
  ArrowRight,
  Github,
  FileText,
  Clock,
  Zap,
  History,
} from "lucide-react";

const SPEC_TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string; glow: string }> = {
  system_design: {
    label: "System Design",
    icon: Server,
    color: "#A78BFA",
    bg: "rgba(124,58,237,0.12)",
    border: "rgba(124,58,237,0.35)",
    glow: "rgba(124,58,237,0.2)",
  },
  api_design: {
    label: "API Design",
    icon: Cpu,
    color: "#22D3EE",
    bg: "rgba(6,182,212,0.12)",
    border: "rgba(6,182,212,0.35)",
    glow: "rgba(6,182,212,0.2)",
  },
  database_schema: {
    label: "Database Schema",
    icon: Database,
    color: "#34D399",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.35)",
    glow: "rgba(16,185,129,0.2)",
  },
  feature_spec: {
    label: "Feature Spec",
    icon: BookOpen,
    color: "#FCD34D",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.35)",
    glow: "rgba(245,158,11,0.2)",
  },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "system_design", label: "System" },
  { value: "api_design", label: "API" },
  { value: "database_schema", label: "Database" },
  { value: "feature_spec", label: "Feature" },
];

export default function SpecsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: specs, isLoading } = useListSpecs();
  const deleteSpec = useDeleteSpec();

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteSpec.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey() });
      toast({ title: "Spec deleted" });
    } catch {
      toast({ title: "Failed to delete spec", variant: "destructive" });
    }
  };

  const filteredSpecs = specs?.filter(spec => {
    const matchesSearch = spec.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || spec.specType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <header className="space-y-1 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(6,182,212,0.1) 100%)",
                border: "1px solid rgba(139,92,246,0.3)",
              }}
            >
              <History className="w-4 h-4" style={{ color: "hsl(263,90%,70%)" }} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight gradient-text">Spec History</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-11">Search and manage all your generated technical specifications.</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3 items-center animate-slide-up" style={{ animationDelay: "0.05s" }}>
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search specs by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
          </div>

          <div className="flex rounded-lg p-1 gap-0.5 w-full sm:w-auto"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {FILTER_OPTIONS.map(({ value, label }) => {
              const meta = value !== "all" ? SPEC_TYPE_META[value] : null;
              const active = filterType === value;
              return (
                <button
                  key={value}
                  onClick={() => setFilterType(value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap"
                  style={active ? {
                    background: meta ? meta.bg : "rgba(139,92,246,0.18)",
                    color: meta ? meta.color : "#A78BFA",
                    border: `1px solid ${meta ? meta.border : "rgba(139,92,246,0.3)"}`,
                    boxShadow: `0 0 8px ${meta ? meta.glow : "rgba(139,92,246,0.15)"}`,
                  } : {
                    color: "hsl(var(--muted-foreground))",
                    border: "1px solid transparent",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-44 rounded-xl glass-card animate-pulse" />
            ))}
          </div>
        ) : filteredSpecs?.length === 0 ? (
          <div className="py-20 text-center space-y-4 animate-pop-in">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}
              >
                <FileText className="w-7 h-7 opacity-30" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">No specs found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or generate a new spec.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSpecs?.map((spec, index) => {
              const meta = SPEC_TYPE_META[spec.specType] ?? SPEC_TYPE_META.system_design;
              const Icon = meta.icon;
              return (
                <div
                  key={spec.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
                >
                  <Link href={`/app/specs/${spec.id}`}>
                    <div className="group relative h-full rounded-xl cursor-pointer overflow-hidden transition-all duration-300"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = meta.border;
                        e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.4), 0 0 20px ${meta.glow}`;
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-px"
                        style={{
                          background: `linear-gradient(90deg, transparent 0%, ${meta.color}60 50%, transparent 100%)`,
                          opacity: 0,
                          transition: "opacity 0.3s",
                        }}
                        ref={el => {
                          if (el) {
                            el.closest('.group')?.addEventListener('mouseenter', () => el.style.opacity = "1");
                            el.closest('.group')?.addEventListener('mouseleave', () => el.style.opacity = "0");
                          }
                        }}
                      />

                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at top left, ${meta.glow} 0%, transparent 60%)` }}
                      />

                      <div className="relative p-5 h-full flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono font-semibold"
                            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                          >
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </div>
                          <button
                            className="h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground hover:text-red-400"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                            onClick={(e) => handleDelete(e, spec.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h3 className="font-bold text-base mb-2 text-foreground line-clamp-2 leading-tight group-hover:text-white transition-colors">
                          {spec.title}
                        </h3>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                          {spec.inputType === "github_url"
                            ? <Github className="w-3 h-3 shrink-0" />
                            : <FileText className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{spec.inputValue}</span>
                        </div>

                        <div className="mt-auto pt-3 flex items-center justify-between"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <Clock className="w-3 h-3" />
                            {format(new Date(spec.createdAt), "MMM d, yyyy")}
                          </div>
                          <div className="flex items-center gap-1 text-xs font-mono opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
                            style={{ color: meta.color }}
                          >
                            View <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
