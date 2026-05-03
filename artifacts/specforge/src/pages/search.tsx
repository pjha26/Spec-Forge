import { useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Server, Cpu, Database, BookOpen, FileText,
  Loader2, Clock, ArrowRight, Sparkles, X, Github,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const TYPE_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  system_design:   { label: "System Design",   icon: Server,   color: "#22D3EE", bg: "rgba(0,180,216,0.12)",  border: "rgba(0,180,216,0.35)" },
  api_design:      { label: "API Design",       icon: Cpu,      color: "#22D3EE", bg: "rgba(6,182,212,0.12)",  border: "rgba(6,182,212,0.35)" },
  database_schema: { label: "Database Schema",  icon: Database, color: "#34D399", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)" },
  feature_spec:    { label: "Feature Spec",     icon: BookOpen, color: "#FCD34D", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" },
};

const FILTERS = [
  { value: "all", label: "All Types" },
  { value: "system_design", label: "System Design" },
  { value: "api_design", label: "API Design" },
  { value: "database_schema", label: "Database Schema" },
  { value: "feature_spec", label: "Feature Spec" },
];

const SUGGESTIONS = [
  "authentication system",
  "database schema",
  "REST API",
  "microservices",
  "payment integration",
  "Redis cache",
];

type SearchResult = {
  id: number;
  title: string;
  specType: string;
  inputType: string;
  status: string;
  complexityScore: number | null;
  createdAt: string;
  updatedAt: string;
  relevance: number;
  snippet: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, type: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (type !== "all") params.set("type", type);
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value, filterType), 350);
  };

  const handleFilterChange = (type: string) => {
    setFilterType(type);
    if (query.trim().length >= 2) doSearch(query, type);
  };

  const handleSuggestion = (s: string) => {
    setQuery(s);
    doSearch(s, filterType);
  };

  const highlightText = (text: string, q: string) => {
    if (!q.trim()) return text;
    const words = q.trim().split(/\s+/).filter(Boolean);
    const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-primary/30 text-primary-foreground rounded-sm px-0.5 not-italic">{part}</mark>
        : part
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,180,216,0.12)", border: "1px solid rgba(0,180,216,0.25)" }}
            >
              <Sparkles className="w-4.5 h-4.5" style={{ color: "hsl(191,100%,52%)" }} />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1">Search your specs</h1>
          <p className="text-sm text-muted-foreground">
            Find anything across your entire spec library using natural language
          </p>
        </motion.div>

        {/* Search box */}
        <motion.div
          className="relative mb-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder={`Search specs — "find my Redis caching spec", "auth API", "database schema"…`}
            className="pl-11 pr-10 h-12 text-sm font-mono"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(0,180,216,0.28)",
              boxShadow: "0 0 0 4px rgba(0,180,216,0.05)",
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          className="flex items-center gap-2 flex-wrap mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-150"
              style={filterType === f.value ? {
                background: "rgba(0,180,216,0.15)",
                border: "1px solid rgba(0,180,216,0.35)",
                color: "hsl(191,100%,65%)",
              } : {
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Suggestions (shown before search) */}
        {!searched && !isSearching && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
              Try searching for
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "rgba(0,180,216,0.35)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {isSearching && (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-mono">Searching…</span>
          </div>
        )}

        {/* No results */}
        {searched && !isSearching && results.length === 0 && (
          <motion.div
            className="text-center py-16 space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Search className="w-8 h-8 mx-auto opacity-20" />
            <p className="text-sm text-muted-foreground font-mono">No specs matched "{query}"</p>
            <p className="text-xs text-muted-foreground/60">Try different keywords or remove the type filter</p>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {searched && !isSearching && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
                {total} result{total !== 1 ? "s" : ""} for "{query}"
              </p>
              <div className="space-y-3">
                {results.map((r, i) => {
                  const meta = TYPE_META[r.specType];
                  const Icon = meta?.icon ?? FileText;
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link href={`/app/specs/${r.id}`}>
                        <div
                          className="group rounded-xl p-4 cursor-pointer transition-all duration-200"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.07)",
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,180,216,0.25)";
                            (e.currentTarget as HTMLElement).style.background = "rgba(0,180,216,0.04)";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)";
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: meta?.bg, border: `1px solid ${meta?.border}` }}
                            >
                              <Icon className="w-3.5 h-3.5" style={{ color: meta?.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm text-white truncate group-hover:text-primary transition-colors">
                                  {highlightText(r.title, query)}
                                </h3>
                                <Badge variant="outline" className="text-[9px] font-mono shrink-0"
                                  style={{ color: meta?.color, borderColor: meta?.border, background: meta?.bg }}
                                >
                                  {meta?.label ?? r.specType}
                                </Badge>
                              </div>
                              {r.snippet && (
                                <p className="text-xs text-muted-foreground line-clamp-2 font-mono leading-relaxed">
                                  …{highlightText(r.snippet.replace(/\n+/g, " ").trim(), query)}…
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60 font-mono">
                                {r.inputType === "github_url"
                                  ? <><Github className="w-3 h-3" /> GitHub</>
                                  : <><FileText className="w-3 h-3" /> Description</>
                                }
                                <span>·</span>
                                <Clock className="w-3 h-3" />
                                {format(new Date(r.updatedAt), "MMM d, yyyy")}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary shrink-0 transition-colors mt-1" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
