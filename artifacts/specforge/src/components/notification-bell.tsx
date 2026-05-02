import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, Zap, RefreshCw, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

interface Notification {
  id: number;
  type: "sync_complete" | "sync_failed" | "share_viewed";
  title: string;
  message: string;
  specId?: number | null;
  read: boolean;
  createdAt: string;
}

const TYPE_META = {
  sync_complete: { icon: RefreshCw, color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  sync_failed:   { icon: AlertTriangle, color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  share_viewed:  { icon: Zap, color: "#06B6D4", bg: "rgba(6,182,212,0.1)" },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNew, setHasNew] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();

    const es = new EventSource("/api/notifications/stream");
    es.onmessage = (e) => {
      try {
        const { notification } = JSON.parse(e.data);
        if (notification) {
          setNotifications(prev => [notification, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
          setHasNew(true);
          setTimeout(() => setHasNew(false), 3000);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PUT" });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
        style={{
          background: open ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${open ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`,
          color: open ? "hsl(263,90%,74%)" : "hsl(var(--muted-foreground))",
        }}
      >
        <Bell className={`w-3.5 h-3.5 ${hasNew ? "animate-bounce" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #7C3AED, #06B6D4)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-full top-0 ml-2 z-50 rounded-xl overflow-hidden"
          style={{
            width: "300px",
            background: "rgba(10,10,16,0.98)",
            border: "1px solid rgba(139,92,246,0.25)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <span className="text-xs font-bold font-mono text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] font-mono transition-colors"
                style={{ color: "hsl(263,90%,70%)" }}
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                No notifications yet
              </div>
            ) : (
              notifications.map(notif => {
                const meta = TYPE_META[notif.type] ?? TYPE_META.sync_complete;
                const Icon = meta.icon;
                return (
                  <div
                    key={notif.id}
                    className="flex gap-3 px-4 py-3 cursor-pointer transition-all duration-150"
                    style={{
                      background: notif.read ? "transparent" : "rgba(139,92,246,0.05)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                    onClick={() => !notif.read && markRead(notif.id)}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: meta.bg, border: `1px solid ${meta.color}33` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-white truncate">{notif.title}</p>
                        {!notif.read && (
                          <div className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: "hsl(263,90%,70%)" }}
                          />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{notif.message}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-muted-foreground font-mono opacity-60">
                          {formatDistanceToNow(new Date(notif.createdAt))} ago
                        </span>
                        {notif.specId && (
                          <Link href={`/app/specs/${notif.specId}`} onClick={() => setOpen(false)}>
                            <span className="text-[9px] font-mono cursor-pointer transition-colors"
                              style={{ color: "hsl(263,90%,70%)" }}
                            >
                              View →
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
