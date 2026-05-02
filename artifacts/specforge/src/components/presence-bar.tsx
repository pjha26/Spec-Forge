import { useState, useEffect } from "react";
import { Eye } from "lucide-react";

interface Viewer {
  sessionId: string;
  name: string;
  color: string;
  joinedAt: string;
}

interface PresenceBarProps {
  specId: number;
}

export function PresenceBar({ specId }: PresenceBarProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);

  useEffect(() => {
    const es = new EventSource(`/api/specs/${specId}/presence`);
    es.onmessage = (e) => {
      try {
        const { viewers: v } = JSON.parse(e.data);
        if (Array.isArray(v)) setViewers(v);
      } catch {}
    };
    return () => es.close();
  }, [specId]);

  if (viewers.length < 2) return null;

  const others = viewers.slice(0, 5);
  const overflow = viewers.length - 5;

  return (
    <div
      className="print-hide flex items-center gap-2.5 px-4 py-2"
      style={{
        background: "rgba(6,182,212,0.05)",
        borderBottom: "1px solid rgba(6,182,212,0.15)",
      }}
    >
      <Eye className="w-3 h-3 shrink-0" style={{ color: "#06B6D4" }} />
      <div className="flex items-center -space-x-1.5">
        {others.map((viewer) => (
          <div
            key={viewer.sessionId}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-2"
            style={{
              background: viewer.color,
              border: "2px solid rgba(8,8,14,0.9)",
            }}
            title={viewer.name}
          >
            {viewer.name[0]?.toUpperCase()}
          </div>
        ))}
        {overflow > 0 && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "2px solid rgba(8,8,14,0.9)",
            }}
          >
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-[10px] font-mono" style={{ color: "#06B6D4" }}>
        {viewers.length} people viewing live
      </span>
    </div>
  );
}
