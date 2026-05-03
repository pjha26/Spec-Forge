/**
 * Team RAG Knowledge Base panel.
 * Shown as a tab inside Team Detail. Lets team editors upload and delete
 * past specs, ADRs, and decision documents that get injected into future
 * spec generation automatically.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookMarked, Upload, Trash2, Plus, Loader2, FileText, Gavel,
  BookOpen, AlignLeft, ChevronDown, ChevronUp, AlertCircle, Sparkles, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPES = [
  { value: "adr",      label: "ADR",      icon: Gavel,     color: "#F59E0B", desc: "Architecture Decision Record" },
  { value: "spec",     label: "Spec",     icon: FileText,  color: "#7C3AED", desc: "Past specification doc" },
  { value: "decision", label: "Decision", icon: BookMarked, color: "#EF4444", desc: "Key technical decision" },
  { value: "runbook",  label: "Runbook",  icon: AlignLeft,  color: "#10B981", desc: "Operational runbook" },
  { value: "doc",      label: "Other",    icon: BookOpen,   color: "#6B7280", desc: "General team document" },
] as const;

type DocType = typeof DOC_TYPES[number]["value"];

interface KnowledgeDoc {
  id: number;
  title: string;
  docType: DocType;
  wordCount: number;
  uploadedBy: string | null;
  createdAt: string;
  excerpt: string;
}

interface Props {
  teamId: number;
  canEdit: boolean;
}

export function TeamKnowledgePanel({ teamId, canEdit }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Upload form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [docType, setDocType] = useState<DocType>("adr");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/teams/${teamId}/knowledge`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.docs) setDocs(d.docs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setContent(text);
      if (!title) setTitle(file.name.replace(/\.(md|txt|mdx)$/, ""));
    };
    reader.readAsText(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), docType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }
      const doc = await res.json();
      // Inject excerpt for list view
      setDocs(prev => [{ ...doc, excerpt: content.slice(0, 200) }, ...prev]);
      setTitle(""); setContent(""); setDocType("adr");
      setShowUpload(false);
      toast({ title: "Document added to knowledge base!", description: "Future specs for this team will use it as context." });
    } catch (err: any) {
      toast({ title: err.message ?? "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: KnowledgeDoc) => {
    if (!confirm(`Delete "${doc.title}" from the knowledge base?`)) return;
    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/teams/${teamId}/knowledge/${doc.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Failed to delete document", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const totalWords = docs.reduce((s, d) => s + d.wordCount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <BookMarked className="w-3.5 h-3.5" style={{ color: "hsl(263,90%,70%)" }} />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold" style={{ color: "hsl(263,90%,74%)" }}>
              Knowledge Base
            </h3>
            <p className="text-[9px] text-muted-foreground font-mono">
              {docs.length} doc{docs.length !== 1 ? "s" : ""} · {totalWords.toLocaleString()} words
            </p>
          </div>
        </div>
        {canEdit && (
          <motion.button
            onClick={() => setShowUpload(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
            style={showUpload ? {
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#EF4444",
            } : {
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.3)",
              color: "hsl(263,90%,74%)",
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            {showUpload ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showUpload ? "Cancel" : "Add Doc"}
          </motion.button>
        )}
      </div>

      {/* RAG active banner */}
      {docs.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
        >
          <Sparkles className="w-3 h-3 shrink-0" style={{ color: "hsl(263,90%,74%)" }} />
          <p className="text-[10px] font-mono" style={{ color: "hsl(263,90%,74%)" }}>
            RAG active — all {docs.length} document{docs.length !== 1 ? "s" : ""} will be injected into new spec generation for this team.
          </p>
        </div>
      )}

      {/* Upload form */}
      <AnimatePresence>
        {showUpload && (
          <motion.form
            onSubmit={handleUpload}
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)" }}
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{ opacity: 1, height: "auto", overflow: "visible" }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
          >
            <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">New Knowledge Document</p>

            {/* Doc type picker */}
            <div className="flex flex-wrap gap-1.5">
              {DOC_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setDocType(t.value)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono transition-all"
                  style={docType === t.value ? {
                    background: `${t.color}20`,
                    border: `1px solid ${t.color}44`,
                    color: t.color,
                  } : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  <t.icon className="w-2.5 h-2.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Title */}
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Document title…"
              className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            />

            {/* Content */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Paste spec, ADR, decision doc, or any markdown/text content…"
              rows={8}
              className="w-full rounded-lg px-3 py-2 text-xs font-mono outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            />

            {/* File upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,.mdx,.markdown"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <Upload className="w-3 h-3" />
                Or upload .md / .txt file
              </button>
            </div>

            {content && (
              <p className="text-[9px] font-mono text-muted-foreground opacity-60">
                {content.trim().split(/\s+/).length.toLocaleString()} words · {content.length.toLocaleString()} chars
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowUpload(false)}
                className="text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-1"
              >
                Cancel
              </button>
              <motion.button
                type="submit"
                disabled={uploading || !title.trim() || !content.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold disabled:opacity-40"
                style={{ background: "rgba(139,92,246,0.3)", border: "1px solid rgba(139,92,246,0.4)", color: "white" }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Plus className="w-2.5 h-2.5" />}
                {uploading ? "Adding…" : "Add to Knowledge Base"}
              </motion.button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Docs list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}
          >
            <BookMarked className="w-5 h-5 opacity-30" style={{ color: "hsl(263,90%,70%)" }} />
          </div>
          <p className="text-xs font-mono text-muted-foreground">No knowledge documents yet</p>
          <p className="text-[10px] text-muted-foreground opacity-60 max-w-xs mx-auto">
            Upload past specs, ADRs, or decision docs. Every new spec generated for this team will be aware of them.
          </p>
          {canEdit && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "hsl(263,90%,74%)" }}
            >
              Upload first document →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => {
            const meta = DOC_TYPES.find(t => t.value === doc.docType) ?? DOC_TYPES[4];
            const expanded = expandedId === doc.id;
            return (
              <motion.div
                key={doc.id}
                className="rounded-lg overflow-hidden"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              >
                {/* Doc row */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}25` }}
                  >
                    <meta.icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold truncate">{doc.title}</p>
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded shrink-0"
                        style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}25` }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-mono opacity-60">
                      {doc.wordCount.toLocaleString()} words
                      {doc.uploadedBy ? ` · by ${doc.uploadedBy}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => setExpandedId(expanded ? null : doc.id)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="p-1.5 rounded text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                    >
                      {deletingId === doc.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3" />
                      }
                    </button>
                  )}
                </div>

                {/* Expandable excerpt */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      <p className="px-3 py-2.5 text-[11px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {doc.excerpt}{doc.excerpt.length >= 200 ? "…" : ""}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty state hint when docs exist */}
      {docs.length > 0 && canEdit && (
        <p className="text-[9px] font-mono text-muted-foreground opacity-40 text-center pt-1">
          <AlertCircle className="w-2.5 h-2.5 inline mr-1" />
          Documents are used as read context only — they are never modified by SpecForge.
        </p>
      )}
    </div>
  );
}
