import { useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { 
  useListSpecs, 
  useDeleteSpec 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListSpecsQueryKey } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Search,
  Server,
  Cpu,
  Database,
  BookOpen,
  Trash2,
  ExternalLink,
  Github,
  FileText,
  Clock
} from "lucide-react";

export default function SpecsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: specs, isLoading } = useListSpecs();
  const deleteSpec = useDeleteSpec();

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await deleteSpec.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSpecsQueryKey() });
      toast({
        title: "Spec deleted",
      });
    } catch (err) {
      toast({
        title: "Failed to delete spec",
        variant: "destructive"
      });
    }
  };

  const filteredSpecs = specs?.filter(spec => {
    const matchesSearch = spec.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || spec.specType === filterType;
    return matchesSearch && matchesType;
  });

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

  return (
    <div className="flex-1 overflow-auto bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-mono font-bold tracking-tight">Spec History</h1>
          <p className="text-muted-foreground">Search and view all generated technical specifications.</p>
        </header>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search specs by title..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <div className="flex bg-card p-1 rounded-md border border-border w-full sm:w-auto overflow-x-auto">
            <FilterButton active={filterType === "all"} onClick={() => setFilterType("all")} label="All" />
            <FilterButton active={filterType === "system_design"} onClick={() => setFilterType("system_design")} label="System" />
            <FilterButton active={filterType === "api_design"} onClick={() => setFilterType("api_design")} label="API" />
            <FilterButton active={filterType === "database_schema"} onClick={() => setFilterType("database_schema")} label="Database" />
            <FilterButton active={filterType === "feature_spec"} onClick={() => setFilterType("feature_spec")} label="Feature" />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="p-5 h-40 bg-card border-border animate-pulse" />
            ))}
          </div>
        ) : filteredSpecs?.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <FileText className="w-12 h-12 text-muted-foreground opacity-50 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-foreground">No specs found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or generate a new spec.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSpecs?.map((spec, index) => (
              <div 
                key={spec.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
              >
                <Link href={`/specs/${spec.id}`}>
                  <Card className="p-5 h-full flex flex-col hover:border-primary/50 hover:bg-secondary/50 transition-colors cursor-pointer group bg-card border-border relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-start justify-between mb-4">
                      <Badge variant="secondary" className="bg-background text-foreground border-border font-mono font-medium gap-1.5 flex items-center shadow-none">
                        {getSpecTypeIcon(spec.specType)}
                        {getSpecTypeLabel(spec.specType)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2 -mt-2"
                        onClick={(e) => handleDelete(e, spec.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <h3 className="font-bold text-lg mb-2 text-foreground line-clamp-2 leading-tight">
                      {spec.title}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                      {spec.inputType === "github_url" ? <Github className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      <span className="truncate">{spec.inputValue}</span>
                    </div>

                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <Clock className="w-3 h-3" />
                        {format(new Date(spec.createdAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs font-mono text-primary flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                        View <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
        active 
          ? "bg-background text-foreground shadow-sm font-bold" 
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}