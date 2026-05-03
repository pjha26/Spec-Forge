/**
 * T001: Public Share Page — /share/:token
 * No sidebar, no auth required. Clean read-only view.
 */

import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import {
  Zap, FileCode2, Network, Eye, Loader2, AlertCircle, Calendar,
  Server, Cpu, Database, BookOpen,
} from "lucide-react";
import { format } from "date-fns";

const SPEC_ICONS: Record<string, any> = {
  system_design: Server,
  api_design: Cpu,
  database_schema: Database,
  feature_spec: BookOpen,
};

const SPEC_COLORS: Record<string, string> = {
  system_design: "#7C3AED",
  api_design: "#06B6D4",
  database_schema: "#10B981",
  feature_spec: "#F59E0B",
};

interface SharedSpec {
  id: number;
  title: string;
  specType: string;
  content: string;
  mermaidDiagram?: string;
  complexityScore?: number;
  complexitySummary?: string;
  aiModel: string;
  createdAt: string;
  viewCount: number;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [spec, setSpec] = useState<SharedSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"document" | "diagram">("document");

  useEffect(() => {
    if (!token) return;
    fetch(`/api/specs/share/${token}`)
      .then(r => {
        if (!r.ok) throw new Error("Spec not found or link has expired.");
        return r.json();
      })
      .then(setSpec)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-8">
        <AlertCircle className="w-12 h-12 text-destructive opacity-60" />
        <h1 className="text-xl font-bold font-mono">Spec Not Found</h1>
        <p className="text-muted-foreground text-sm text-center max-w-sm">{error ?? "This share link may have expired or been removed."}</p>
        <a href="/" className="text-sm text-primary hover:underline">← Back to SpecForge</a>
      </div>
    );
  }

  const SpecIcon = SPEC_ICONS[spec.specType] ?? Server;
  const specColor = SPEC_COLORS[spec.specType] ?? "#7C3AED";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.2))", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: "hsl(263,90%,70%)" }} />
            </div>
            <span className="text-sm font-mono font-bold" style={{ color: "hsl(263,90%,74%)" }}>SpecForge</span>
          </a>

          <div className="h-4 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `${specColor}20` }}
            >
              <SpecIcon className="w-3 h-3" style={{ color: specColor }} />
            </div>
            <h1 className="text-sm font-semibold truncate">{spec.title}</h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0"
              style={{ background: `${specColor}15`, color: specColor, border: `1px solid ${specColor}25` }}
            >
              {spec.specType.replace(/_/g, " ")}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-muted-foreground text-xs">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{spec.viewCount.toLocaleString()} views</span>
            </div>
            {spec.createdAt && (
              <div className="flex items-center gap-1 hidden sm:flex">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(spec.createdAt), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-6 flex gap-0 border-t"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          {[
            { key: "document" as const, icon: FileCode2, label: "Document" },
            ...(spec.mermaidDiagram ? [{ key: "diagram" as const, icon: Network, label: "Diagram" }] : []),
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="px-4 py-2.5 text-sm font-mono flex items-center gap-2 border-b-2 transition-all"
              style={{
                borderBottomColor: activeTab === key ? specColor : "transparent",
                color: activeTab === key ? "white" : "hsl(var(--muted-foreground))",
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {activeTab === "document" ? (
          <motion.div
            className="prose prose-invert prose-sm max-w-none"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{spec.content}</ReactMarkdown>
          </motion.div>
        ) : (
          <motion.div
            className="rounded-xl overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ border: "1px solid rgba(255,255,255,0.08)", minHeight: 400 }}
          >
            {spec.mermaidDiagram && <MermaidDiagram chart={spec.mermaidDiagram} />}
          </motion.div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t flex flex-col sm:flex-row items-center gap-3 text-xs text-muted-foreground"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <span>Generated with SpecForge · {spec.aiModel}</span>
          <div className="flex-1" />
          <a href="/" className="text-primary hover:underline flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Create your own spec →
          </a>
        </div>
      </div>
    </div>
  );
}
