import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, AlertTriangle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TechDebtRisk {
  title: string;
  severity: "high" | "medium" | "low";
  description: string;
}

interface ComplexityScoreCardProps {
  score: number | null;
  label?: string | null;
  risks: TechDebtRisk[] | null;
  summary: string | null;
  isGenerating?: boolean;
}

export function ComplexityScoreCard({ score, label, risks, summary, isGenerating }: ComplexityScoreCardProps) {
  if (isGenerating && score === null) {
    return (
      <Card className="p-5 border-border bg-card space-y-5 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-mono font-bold text-sm text-muted-foreground uppercase">Analyzing Complexity...</h3>
        </div>
        <div className="flex gap-6 items-center">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="space-y-3 pt-4 border-t border-border/50">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  if (score === null) return null;

  const getColorClass = (s: number) => {
    if (s <= 3) return "text-green-500 stroke-green-500 border-green-500/20 bg-green-500/10";
    if (s <= 6) return "text-amber-500 stroke-amber-500 border-amber-500/20 bg-amber-500/10";
    return "text-destructive stroke-destructive border-destructive/20 bg-destructive/10";
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high": return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">HIGH</Badge>;
      case "medium": return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">MEDIUM</Badge>;
      case "low": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">LOW</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{severity.toUpperCase()}</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high": return <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />;
      case "medium": return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case "low": return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />;
      default: return null;
    }
  };

  const colorClasses = getColorClass(score);

  // SVG Circle calculations
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 10) * circumference;

  return (
    <Card className="border-border bg-card overflow-hidden">
      <div className="border-b border-border p-3 flex items-center justify-between bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono font-bold tracking-tight">System Analysis</span>
        </div>
      </div>
      
      <div className="p-5 space-y-6">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <div className="relative flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-muted fill-none"
                strokeWidth="8"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className={`fill-none transition-all duration-1000 ease-in-out ${colorClasses.split(' ')[1]}`}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-mono font-bold ${colorClasses.split(' ')[0]}`}>{score}</span>
              <span className="text-[10px] text-muted-foreground font-mono">/ 10</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h4 className="font-bold text-foreground">Complexity Score</h4>
              {label && (
                <Badge variant="outline" className={`font-mono uppercase ${colorClasses.split(' ')[2]} ${colorClasses.split(' ')[3]} ${colorClasses.split(' ')[0]}`}>
                  {label}
                </Badge>
              )}
            </div>
            {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
          </div>
        </div>

        {risks && risks.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Tech Debt Risks</h4>
            <div className="grid gap-3">
              {risks.map((risk, i) => (
                <div key={i} className="flex gap-3 bg-secondary/50 p-3 rounded-md border border-border/50">
                  {getSeverityIcon(risk.severity)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{risk.title}</span>
                      {getSeverityBadge(risk.severity)}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
