import { useParams, Link } from "wouter";
import { useGetSpec } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  ArrowLeft,
  Copy,
  Download,
  Server,
  Cpu,
  Database,
  BookOpen,
  Github,
  FileText,
  Clock,
  Terminal
} from "lucide-react";

export default function SpecDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  
  const { data: spec, isLoading, error } = useGetSpec(Number(id));

  const handleCopy = () => {
    if (spec?.content) {
      navigator.clipboard.writeText(spec.content);
      toast({
        title: "Copied to clipboard",
      });
    }
  };

  const handleDownload = () => {
    if (spec?.content) {
      const blob = new Blob([spec.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${spec.title.toLowerCase().replace(/\s+/g, "-")}-${spec.specType}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getSpecTypeIcon = (type: string) => {
    switch (type) {
      case "system_design": return <Server className="w-3 h-3" />;
      case "api_design": return <Cpu className="w-3 h-3" />;
      case "database_schema": return <Database className="w-3 h-3" />;
      case "feature_spec": return <BookOpen className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const getSpecTypeLabel = (type: string) => {
    switch (type) {
      case "system_design": return "System Design";
      case "api_design": return "API Design";
      case "database_schema": return "Database Schema";
      case "feature_spec": return "Feature Spec";
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <Terminal className="w-8 h-8 opacity-20" />
          <span className="font-mono text-sm">Loading spec data...</span>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive font-mono">ERR_SPEC_NOT_FOUND</h2>
          <p className="text-muted-foreground">The requested specification could not be located.</p>
          <Link href="/specs">
            <Button variant="outline" className="font-mono">
              <ArrowLeft className="w-4 h-4 mr-2" /> RETURN TO HISTORY
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/specs">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold leading-tight">{spec.title}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-1">
              <span className="flex items-center gap-1">
                {spec.inputType === "github_url" ? <Github className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                {spec.inputType === "github_url" ? "GitHub" : "Description"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(spec.createdAt), "MMM d, yyyy HH:mm")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1.5 py-1 px-2.5 mr-2">
            {getSpecTypeIcon(spec.specType)}
            {getSpecTypeLabel(spec.specType)}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleCopy} className="font-mono text-xs">
            <Copy className="w-3 h-3 mr-2" /> COPY
          </Button>
          <Button size="sm" onClick={handleDownload} className="font-mono text-xs">
            <Download className="w-3 h-3 mr-2" /> DOWNLOAD
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6 flex justify-center">
        <Card className="w-full max-w-4xl border-border bg-[#0a0a0a] flex flex-col overflow-hidden min-h-full">
          <div className="border-b border-border p-3 flex items-center gap-2 bg-card">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="ml-2 text-xs font-mono text-muted-foreground">{spec.title.toLowerCase().replace(/\s+/g, "-")}.md</span>
          </div>
          <div className="p-8 overflow-auto flex-1 prose prose-invert max-w-none prose-pre:bg-black/50 prose-pre:border prose-pre:border-border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {spec.content}
            </ReactMarkdown>
          </div>
        </Card>
      </div>
    </div>
  );
}