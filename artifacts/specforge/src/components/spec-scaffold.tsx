import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, FolderOpen, File, Loader2, Code2, ChevronRight, Package, Layers } from "lucide-react";
import JSZip from "jszip";

interface ScaffoldFile {
  path: string;
  content: string;
  language: string;
}

interface ScaffoldData {
  projectName: string;
  description: string;
  stack: string;
  files: ScaffoldFile[];
}

const LANG_COLORS: Record<string, string> = {
  typescript: "#3178C6",
  javascript: "#F7DF1E",
  json: "#8B5CF6",
  yaml: "#10B981",
  sql: "#F59E0B",
  markdown: "#9CA3AF",
  bash: "#6EE7B7",
  text: "#9CA3AF",
};

function fileIcon(path: string): string {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "ts";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "js";
  if (path.endsWith(".json")) return "{}";
  if (path.endsWith(".md")) return "md";
  if (path.endsWith(".yml") || path.endsWith(".yaml")) return "⚙";
  if (path.endsWith(".sql")) return "db";
  if (path.endsWith(".sh")) return "$_";
  if (path.endsWith(".gitignore") || path.startsWith(".")) return "·";
  return "f";
}

interface SpecScaffoldProps {
  specId: number;
  specTitle: string;
  onClose: () => void;
}

export function SpecScaffold({ specId, specTitle, onClose }: SpecScaffoldProps) {
  const [scaffold, setScaffold] = useState<ScaffoldData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ScaffoldFile | null>(null);
  const [downloading, setDownloading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/specs/${specId}/scaffold`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate scaffold");
      }
      const data: ScaffoldData = await res.json();
      setScaffold(data);
      setSelectedFile(data.files[0] ?? null);
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const downloadZip = async () => {
    if (!scaffold) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const root = zip.folder(scaffold.projectName)!;
      for (const file of scaffold.files) {
        const parts = file.path.split("/");
        let folder = root;
        for (let i = 0; i < parts.length - 1; i++) {
          folder = folder.folder(parts[i])!;
        }
        folder.file(parts[parts.length - 1], file.content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${scaffold.projectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        className="ml-auto h-full flex flex-col overflow-hidden"
        style={{
          width: "min(92vw, 1100px)",
          background: "linear-gradient(180deg, #0c0c14 0%, #080810 100%)",
          borderLeft: "1px solid rgba(139,92,246,0.25)",
          boxShadow: "-32px 0 120px rgba(0,0,0,0.8)",
        }}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 38, mass: 0.9 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.2))", border: "1px solid rgba(139,92,246,0.4)" }}
              whileHover={{ scale: 1.05 }}
            >
              <Code2 className="w-4 h-4" style={{ color: "hsl(263,90%,74%)" }} />
            </motion.div>
            <div>
              <p className="text-sm font-bold text-white font-mono">Code Scaffold</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[280px]">{specTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scaffold && (
              <motion.button
                onClick={downloadZip}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-colors"
                style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "hsl(263,90%,74%)" }}
                whileHover={{ scale: 1.03, background: "rgba(139,92,246,0.3)" } as any}
                whileTap={{ scale: 0.97 }}
              >
                {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                {downloading ? "Zipping…" : "Download ZIP"}
              </motion.button>
            )}
            <motion.button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
              whileHover={{ scale: 1.1, background: "rgba(255,255,255,0.12)" } as any}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!scaffold && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 25 }}
                className="text-center space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.1))", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  <Layers className="w-7 h-7" style={{ color: "hsl(263,90%,74%)" }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Generate project scaffold</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    AI will analyze your spec and generate a complete, ready-to-use project skeleton with real starter code.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-muted-foreground">
                  {["Folder structure", "Starter files", "Config files", "Download ZIP"].map((item, i) => (
                    <motion.span
                      key={item}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.07 }}
                      className="flex items-center gap-1"
                    >
                      <span style={{ color: "hsl(263,90%,70%)" }}>✓</span> {item}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
              <motion.button
                onClick={generate}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-mono font-bold text-sm text-white"
                style={{ background: "linear-gradient(135deg, #7C3AED, #6366F1)", boxShadow: "0 0 32px rgba(124,58,237,0.4)" }}
                whileHover={{ scale: 1.04, boxShadow: "0 0 48px rgba(124,58,237,0.6)" } as any}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Code2 className="w-4 h-4" />
                Generate Scaffold
              </motion.button>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <Package className="w-10 h-10" style={{ color: "hsl(263,90%,70%)" }} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <p className="text-sm font-mono font-bold text-white">Generating scaffold…</p>
                <p className="text-xs text-muted-foreground mt-1">AI is analyzing your spec and writing starter code</p>
              </motion.div>
              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "hsl(263,90%,70%)" }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <p className="text-sm text-red-400 font-mono">{error}</p>
              <motion.button
                onClick={generate}
                className="px-4 py-2 rounded-lg text-xs font-mono font-bold"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5" }}
                whileTap={{ scale: 0.95 }}
              >
                Try again
              </motion.button>
            </div>
          )}

          {scaffold && (
            <motion.div
              className="flex-1 overflow-hidden flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* File tree */}
              <div className="w-64 shrink-0 overflow-y-auto flex flex-col"
                style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* Project info */}
                <div className="px-4 py-3 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <FolderOpen className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs font-mono font-bold text-white truncate">{scaffold.projectName}/</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{scaffold.stack}</p>
                </div>

                {/* Files */}
                <div className="flex-1 py-2">
                  {scaffold.files.map((file, i) => {
                    const active = selectedFile?.path === file.path;
                    const color = LANG_COLORS[file.language] ?? "#9CA3AF";
                    return (
                      <motion.button
                        key={file.path}
                        onClick={() => setSelectedFile(file)}
                        className="w-full flex items-center gap-2 px-4 py-1.5 text-left transition-colors"
                        style={active ? {
                          background: "rgba(139,92,246,0.15)",
                          borderRight: "2px solid hsl(263,90%,70%)",
                        } : {}}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 + i * 0.03 }}
                        whileHover={{ background: "rgba(255,255,255,0.05)" } as any}
                      >
                        <span className="text-[9px] font-mono font-bold w-5 text-center shrink-0 rounded px-0.5"
                          style={{ background: `${color}22`, color }}
                        >
                          {fileIcon(file.path)}
                        </span>
                        <span className="text-[11px] font-mono truncate"
                          style={{ color: active ? "hsl(263,90%,74%)" : "hsl(var(--muted-foreground))" }}
                        >
                          {file.path.split("/").pop()}
                        </span>
                        {file.path.includes("/") && (
                          <span className="text-[9px] font-mono text-muted-foreground opacity-40 truncate ml-auto shrink-0">
                            {file.path.split("/").slice(0, -1).join("/")}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="p-4 shrink-0 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[9px] font-mono text-muted-foreground opacity-50">
                    {scaffold.files.length} files · ready to use
                  </p>
                  <motion.button
                    onClick={downloadZip}
                    disabled={downloading}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-mono font-bold"
                    style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", color: "hsl(263,90%,74%)" }}
                    whileHover={{ scale: 1.02 } as any}
                    whileTap={{ scale: 0.98 }}
                  >
                    {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    {downloading ? "Zipping…" : "Download ZIP"}
                  </motion.button>
                </div>
              </div>

              {/* Code preview */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {selectedFile && (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2.5 shrink-0"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-40" />
                      <span className="text-[11px] font-mono text-white">{selectedFile.path}</span>
                      <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: `${LANG_COLORS[selectedFile.language] ?? "#9CA3AF"}22`,
                          color: LANG_COLORS[selectedFile.language] ?? "#9CA3AF",
                          border: `1px solid ${LANG_COLORS[selectedFile.language] ?? "#9CA3AF"}33`,
                        }}
                      >
                        {selectedFile.language}
                      </span>
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedFile.path}
                        className="flex-1 overflow-auto"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <pre className="p-6 text-[12px] font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap break-words"
                          style={{ minHeight: "100%" }}
                        >
                          {selectedFile.content}
                        </pre>
                      </motion.div>
                    </AnimatePresence>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
