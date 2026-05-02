import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Network
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ComplexityScoreCard } from "@/components/complexity-score-card";
import { MermaidDiagram } from "@/components/mermaid-diagram";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [inputType, setInputType] = useState<"github_url" | "description">("github_url");
  const [inputValue, setInputValue] = useState("");
  const [specType, setSpecType] = useState<"system_design" | "api_design" | "database_schema" | "feature_spec">("system_design");
  
  const createSpec = useCreateSpec();
  const { data: recentSpecs } = useListRecentSpecs();

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const contentEndRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<"document" | "diagram">("document");
  
  // New State for SSE Analysis & Diagram
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [diagramData, setDiagramData] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!inputValue.trim()) {
      toast({
        title: "Input required",
        description: "Please provide a GitHub URL or project description.",
        variant: "destructive"
      });
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

      const spec = await createSpec.mutateAsync({
        data: {
          inputType,
          inputValue,
          specType,
          title
        }
      });

      // Start streaming
      const response = await fetch(`/api/specs/${spec.id}/stream`, { method: "POST" });
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE events from buffer
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);
              
              if (data.content) {
                setStreamedContent(prev => prev + data.content);
              } else if (data.analysis) {
                setAnalysisData(data.analysis);
              } else if (data.diagram) {
                setDiagramData(data.diagram);
              } else if (data.error) {
                toast({
                  title: "Generation Error",
                  description: data.error,
                  variant: "destructive"
                });
              }
            } catch (e) {
              console.error("Failed to parse SSE JSON", e);
            }
          }
        }
      }

      toast({
        title: "Success",
        description: "Spec generated successfully.",
      });
      
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate spec.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (contentEndRef.current && activeTab === "document") {
      contentEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamedContent, activeTab]);

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="space-y-2">
          <h1 className="text-3xl font-mono font-bold tracking-tight">Generate Spec</h1>
          <p className="text-muted-foreground">Instantly produce professional-grade technical specs from a codebase or description.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-5 border-border bg-card space-y-5">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Spec Type</label>
                <div className="grid grid-cols-1 gap-2">
                  <SpecTypeOption 
                    active={specType === "system_design"} 
                    onClick={() => setSpecType("system_design")}
                    icon={<Server className="w-4 h-4" />}
                    label="System Design"
                  />
                  <SpecTypeOption 
                    active={specType === "api_design"} 
                    onClick={() => setSpecType("api_design")}
                    icon={<Cpu className="w-4 h-4" />}
                    label="API Design"
                  />
                  <SpecTypeOption 
                    active={specType === "database_schema"} 
                    onClick={() => setSpecType("database_schema")}
                    icon={<Database className="w-4 h-4" />}
                    label="Database Schema"
                  />
                  <SpecTypeOption 
                    active={specType === "feature_spec"} 
                    onClick={() => setSpecType("feature_spec")}
                    icon={<BookOpen className="w-4 h-4" />}
                    label="Feature Spec"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Input Source</label>
                <div className="flex bg-secondary p-1 rounded-md">
                  <button
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded ${inputType === "github_url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setInputType("github_url")}
                  >
                    <Github className="w-3 h-3" /> GitHub
                  </button>
                  <button
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded ${inputType === "description" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setInputType("description")}
                  >
                    <FileText className="w-3 h-3" /> Description
                  </button>
                </div>

                {inputType === "github_url" ? (
                  <Input
                    placeholder="https://github.com/user/repo"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="font-mono text-sm"
                  />
                ) : (
                  <Textarea
                    placeholder="Describe your project, architecture, or feature requirements..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="min-h-[120px] text-sm resize-none"
                  />
                )}
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !inputValue.trim()}
                className="w-full font-mono font-bold tracking-wide"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    GENERATING
                  </>
                ) : (
                  <>
                    <Terminal className="w-4 h-4 mr-2" />
                    GENERATE SPEC
                  </>
                )}
              </Button>
            </Card>

            {analysisData || (isGenerating && streamedContent.length > 500) ? (
              <ComplexityScoreCard 
                score={analysisData?.score ?? null}
                label={analysisData?.label ?? null}
                risks={analysisData?.risks ?? null}
                summary={analysisData?.summary ?? null}
                isGenerating={isGenerating}
              />
            ) : recentSpecs && !isGenerating ? (
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">System Stats</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="System" count={recentSpecs.byType?.system_design || 0} />
                  <StatCard label="API" count={recentSpecs.byType?.api_design || 0} />
                  <StatCard label="Database" count={recentSpecs.byType?.database_schema || 0} />
                  <StatCard label="Feature" count={recentSpecs.byType?.feature_spec || 0} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            <Card className="h-full min-h-[500px] border-border bg-[#0a0a0a] flex flex-col overflow-hidden">
              <div className="border-b border-border flex items-center justify-between bg-card px-2">
                <div className="flex">
                  <button 
                    onClick={() => setActiveTab("document")}
                    className={`px-4 py-3 text-sm font-mono flex items-center gap-2 border-b-2 transition-colors ${activeTab === "document" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
                  >
                    <FileCode2 className="w-4 h-4" /> Document
                  </button>
                  <button 
                    onClick={() => setActiveTab("diagram")}
                    disabled={!diagramData && !isGenerating}
                    className={`px-4 py-3 text-sm font-mono flex items-center gap-2 border-b-2 transition-colors ${activeTab === "diagram" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed"}`}
                  >
                    <Network className="w-4 h-4" /> Diagram
                  </button>
                </div>
                {isGenerating && <span className="text-xs font-mono text-primary animate-pulse pr-3">Generating...</span>}
              </div>
              <div className="flex-1 p-5 overflow-auto bg-[#0a0a0a]">
                {!streamedContent && !isGenerating ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-center flex-col gap-2">
                    <Terminal className="w-8 h-8 opacity-20" />
                    <p className="font-mono text-sm">Awaiting input sequence...</p>
                  </div>
                ) : activeTab === "document" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamedContent}
                    </ReactMarkdown>
                    {isGenerating && !diagramData && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />}
                    <div ref={contentEndRef} />
                  </div>
                ) : (
                  <div className="h-full w-full min-h-[400px]">
                     {diagramData ? (
                       <MermaidDiagram chart={diagramData} />
                     ) : isGenerating ? (
                       <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground font-mono gap-4">
                         <Loader2 className="w-8 h-8 animate-spin opacity-50" />
                         <p className="text-sm">Synthesizing diagram structure...</p>
                       </div>
                     ) : null}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecTypeOption({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-all ${
        active 
          ? "border-primary bg-primary/10 text-primary" 
          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </div>
  );
}

function StatCard({ label, count }: { label: string, count: number }) {
  return (
    <div className="bg-card border border-border rounded p-3 flex flex-col">
      <span className="text-xl font-mono font-bold text-foreground">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
