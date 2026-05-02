import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateSpec,
  useListRecentSpecs,
} from "@workspace/api-client-react";
import {
  Database,
  Server,
  Cpu,
  BookOpen,
  Terminal,
  Github,
  FileText,
  Loader2,
  FileCode2,
  Network,
  Zap,
  LayoutTemplate,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ComplexityScoreCard } from "@/components/complexity-score-card";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { SpecTemplatesModal, type SpecTemplate } from "@/components/spec-templates-modal";

const SPEC_TYPES = [
  {
    value: "system_design" as const,
    label: "System Design",
    icon: Server,
    color: "#7C3AED",
    glow: "rgba(124,58,237,0.4)",
    gradient: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(99,102,241,0.08) 100%)",
    border: "rgba(124,58,237,0.4)",
    desc: "Architecture & data flow",
  },
  {
    value: "api_design" as const,
    label: "API Design",
    icon: Cpu,
    color: "#06B6D4",
    glow: "rgba(6,182,212,0.4)",
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.05) 100%)",
    border: "rgba(6,182,212,0.4)",
    desc: "Endpoints & schemas",
  },
  {
    value: "database_schema" as const,
    label: "Database Schema",
    icon: Database,
    color: "#10B981",
    glow: "rgba(16,185,129,0.4)",
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)",
    border: "rgba(16,185,129,0.4)",
    desc: "Tables & relationships",
  },
  {
    value: "feature_spec" as const,
    label: "Feature Spec",
    icon: BookOpen,
    color: "#F59E0B",
    glow: "rgba(245,158,11,0.4)",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)",
    border: "rgba(245,158,11,0.4)",
    desc: "Stories & criteria",
  },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [inputType, setInputType] = useState<"github_url" | "description">("github_url");
  const [inputValue, setInputValue] = useState("");
  const [specType, setSpecType] = useState<"system_design" | "api_design" | "database_schema" | "feature_spec">("system_design");
  const [aiModel, setAiModel] = useState<"claude-sonnet-4-6" | "gpt-5.4" | "gpt-5.1" | "gemini-2.5-pro" | "gemini-2.5-flash">("claude-sonnet-4-6");

  const createSpec = useCreateSpec();
  const { data: recentSpecs } = useListRecentSpecs();

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const contentEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<"document" | "diagram">("document");
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [diagramData, setDiagramData] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleTemplateSelect = (tpl: SpecTemplate) => {
    setSpecType(tpl.specType as any);
    setInputType("description");
    setInputValue(tpl.description);
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const handleGenerate = async () => {
    if (!inputValue.trim()) {
      toast({ title: "Input required", description: "Please provide a GitHub URL or project description.", variant: "destructive" });
      return;
    }
    try {
      setIsGenerating(true);
      setStreamedContent("");
      setAnalysisData(null);
      setDiagramData(null);
      setActiveTab("document");

      const title = inputType === "github_url"
        ? inputValue.split("/").pop() || "Project Spec"
        : "Generated Spec";

      const spec = await createSpec.mutateAsync({ data: { inputType, inputValue, specType, title, aiModel } });
      const response = await fetch(`/api/specs/${spec.id}/stream`, { method: "POST" });
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) setStreamedContent(prev => prev + data.content);
              else if (data.analysis) setAnalysisData(data.analysis);
              else if (data.diagram) setDiagramData(data.diagram);
              else if (data.error) toast({ title: "Generation Error", description: data.error, variant: "destructive" });
            } catch {}
          }
        }
      }

      toast({ title: "Spec generated!", description: "Your technical document is ready." });
    } catch {
      toast({ title: "Error", description: "Failed to generate spec.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (contentEndRef.current && activeTab === "document") {
      contentEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamedContent, activeTab]);

  const activeSpecType = SPEC_TYPES.find(s => s.value === specType)!;

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <header className="animate-slide-up flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(6,182,212,0.1) 100%)",
                  border: "1px solid rgba(139,92,246,0.3)",
                }}
              >
                <Zap className="w-4 h-4" style={{ color: "hsl(263,90%,70%)" }} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight gradient-text">Generate Spec</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-11">Instantly produce professional-grade technical specs from a codebase or description.</p>
          </div>
          <motion.button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-mono font-bold shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(6,182,212,0.1))",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "hsl(263,90%,74%)",
              boxShadow: "0 0 18px rgba(139,92,246,0.15)",
            }}
            whileHover={{ scale: 1.04, boxShadow: "0 0 28px rgba(139,92,246,0.35)" } as any}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 360, damping: 28 }}
          >
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </motion.button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl p-5 space-y-5 glass-card animate-slide-up" style={{ animationDelay: "0.05s" }}>

              <div className="space-y-2.5">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Spec Type</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {SPEC_TYPES.map((type, idx) => {
                    const Icon = type.icon;
                    const active = specType === type.value;
                    return (
                      <motion.button
                        key={type.value}
                        onClick={() => setSpecType(type.value)}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer text-left group"
                        style={active ? {
                          background: type.gradient,
                          border: `1px solid ${type.border}`,
                          boxShadow: `0 0 12px ${type.glow.replace("0.4", "0.2")}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                        } : {
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 + idx * 0.06, type: "spring", stiffness: 380, damping: 30 }}
                        whileHover={{ scale: 1.015, x: 2 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <motion.div
                          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                          style={active ? {
                            background: `${type.color}22`,
                            boxShadow: `0 0 8px ${type.glow}`,
                          } : {
                            background: "rgba(255,255,255,0.04)",
                          }}
                          animate={active ? { scale: [1, 1.12, 1] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <Icon className="w-3.5 h-3.5"
                            style={{ color: active ? type.color : undefined }}
                          />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: active ? type.color : undefined }}>{type.label}</p>
                          <p className="text-[10px] text-muted-foreground">{type.desc}</p>
                        </div>
                        <AnimatePresence>
                          {active && (
                            <motion.div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: type.color }}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            />
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Input Source</label>
                <div className="flex rounded-lg p-1 gap-1"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {[
                    { value: "github_url" as const, label: "GitHub", icon: Github },
                    { value: "description" as const, label: "Text", icon: FileText },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setInputType(value)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
                      style={inputType === value ? {
                        background: "rgba(139,92,246,0.2)",
                        color: "hsl(263,90%,74%)",
                        border: "1px solid rgba(139,92,246,0.3)",
                        boxShadow: "0 0 8px rgba(139,92,246,0.2)",
                      } : {
                        color: "hsl(var(--muted-foreground))",
                        border: "1px solid transparent",
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>

                {inputType === "github_url" ? (
                  <Input
                    placeholder="https://github.com/user/repo"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="font-mono text-sm"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "rgba(139,92,246,0.5)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                ) : (
                  <Textarea
                    ref={textareaRef}
                    placeholder="Describe your project, architecture, or feature requirements..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="min-h-[100px] text-sm resize-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "rgba(139,92,246,0.5)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                )}
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">AI Model</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {([
                    { value: "claude-sonnet-4-6" as const, label: "Claude Sonnet", badge: "Anthropic", color: "#C084FC", dot: "rgba(192,132,252,0.8)" },
                    { value: "gpt-5.4" as const, label: "GPT-5.4",          badge: "OpenAI",    color: "#34D399", dot: "rgba(52,211,153,0.8)"  },
                    { value: "gpt-5.1" as const, label: "GPT-5.1",          badge: "OpenAI",    color: "#34D399", dot: "rgba(52,211,153,0.8)"  },
                    { value: "gemini-2.5-pro" as const, label: "Gemini 2.5 Pro",  badge: "Google",    color: "#60A5FA", dot: "rgba(96,165,250,0.8)"  },
                    { value: "gemini-2.5-flash" as const, label: "Gemini 2.5 Flash", badge: "Google", color: "#60A5FA", dot: "rgba(96,165,250,0.8)"  },
                  ] as const).map(({ value, label, badge, color, dot }, idx) => {
                    const active = aiModel === value;
                    return (
                      <motion.button
                        key={value}
                        onClick={() => setAiModel(value)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left"
                        style={active ? {
                          background: `${color}14`,
                          border: `1px solid ${color}44`,
                          boxShadow: `0 0 10px ${color}18`,
                        } : {
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + idx * 0.05, type: "spring", stiffness: 380, damping: 30 }}
                        whileHover={{ scale: 1.015, x: 2 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: active ? dot : "rgba(255,255,255,0.2)" }}
                          animate={active ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                        <span className="text-sm font-medium flex-1" style={{ color: active ? color : undefined }}>{label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={active ? {
                            background: `${color}20`,
                            color,
                            border: `1px solid ${color}30`,
                          } : {
                            background: "rgba(255,255,255,0.05)",
                            color: "hsl(var(--muted-foreground))",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >{badge}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                onClick={handleGenerate}
                disabled={isGenerating || !inputValue.trim()}
                className="w-full py-3 px-4 rounded-lg font-mono font-bold text-sm text-white tracking-wide disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-gradient"
                whileHover={!isGenerating ? { scale: 1.02, boxShadow: "0 0 32px rgba(139,92,246,0.5)" } as any : {}}
                whileTap={!isGenerating ? { scale: 0.97 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.span
                      key="generating"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      GENERATING…
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Terminal className="w-4 h-4" />
                      GENERATE SPEC
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {analysisData || (isGenerating && streamedContent.length > 500) ? (
                <ComplexityScoreCard
                  score={analysisData?.score ?? null}
                  label={analysisData?.label ?? null}
                  risks={analysisData?.risks ?? null}
                  summary={analysisData?.summary ?? null}
                  isGenerating={isGenerating}
                />
              ) : recentSpecs && !isGenerating ? (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest px-1">System Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "System", count: recentSpecs.byType?.system_design || 0, color: "#7C3AED" },
                      { label: "API", count: recentSpecs.byType?.api_design || 0, color: "#06B6D4" },
                      { label: "Database", count: recentSpecs.byType?.database_schema || 0, color: "#10B981" },
                      { label: "Feature", count: recentSpecs.byType?.feature_spec || 0, color: "#F59E0B" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="rounded-lg p-3 flex flex-col gap-1 glass-card">
                        <span className="text-2xl font-mono font-bold" style={{ color }}>{count}</span>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.08s" }}>
            <div className="h-full min-h-[520px] rounded-xl flex flex-col overflow-hidden"
              style={{
                background: "rgba(8,8,14,0.9)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center justify-between px-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex">
                  {[
                    { key: "document" as const, icon: FileCode2, label: "Document" },
                    { key: "diagram" as const, icon: Network, label: "Diagram" },
                  ].map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      disabled={key === "diagram" && !diagramData && !isGenerating}
                      className="px-4 py-3 text-sm font-mono flex items-center gap-2 transition-all duration-200 border-b-2"
                      style={{
                        borderBottomColor: activeTab === key ? "hsl(263,90%,64%)" : "transparent",
                        color: activeTab === key ? "white" : undefined,
                        opacity: key === "diagram" && !diagramData && !isGenerating ? 0.4 : 1,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                {isGenerating && (
                  <div className="flex items-center gap-2 pr-3">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "hsl(263,90%,64%)" }} />
                    <span className="text-xs font-mono text-muted-foreground">Generating…</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto">
                {!streamedContent && !isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 p-8">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{
                          background: "rgba(139,92,246,0.08)",
                          border: "1px solid rgba(139,92,246,0.2)",
                        }}
                      >
                        <Terminal className="w-7 h-7 opacity-40" />
                      </div>
                      <div className="absolute -inset-3 rounded-3xl opacity-20 blur-lg"
                        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.5), transparent)" }}
                      />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-mono text-sm">Awaiting input sequence…</p>
                      <p className="text-xs text-muted-foreground/60">Select a spec type and enter your source</p>
                    </div>
                  </div>
                ) : activeTab === "document" ? (
                  <div className="p-6 prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamedContent}</ReactMarkdown>
                    {isGenerating && !diagramData && (
                      <span className="inline-block w-2 h-4 rounded-sm ml-1 animate-pulse align-middle"
                        style={{ background: "hsl(263,90%,64%)" }}
                      />
                    )}
                    <div ref={contentEndRef} />
                  </div>
                ) : (
                  <div className="h-full w-full min-h-[400px]">
                    {diagramData ? (
                      <MermaidDiagram chart={diagramData} />
                    ) : isGenerating ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                        <Loader2 className="w-8 h-8 animate-spin opacity-40" />
                        <p className="text-sm font-mono">Synthesizing diagram structure…</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates modal */}
      <AnimatePresence>
        {showTemplates && (
          <SpecTemplatesModal
            onClose={() => setShowTemplates(false)}
            onSelect={handleTemplateSelect}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
