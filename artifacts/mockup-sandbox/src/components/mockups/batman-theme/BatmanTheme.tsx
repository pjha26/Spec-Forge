import { useState } from "react";

const BAT_YELLOW = "#F5C400";
const BAT_YELLOW_DARK = "#C49B00";
const BAT_YELLOW_GLOW = "rgba(245,196,0,0.18)";
const BAT_BG = "#060608";
const BAT_SIDEBAR = "#08080b";
const BAT_CARD = "#0e0e12";
const BAT_CARD2 = "#111116";
const BAT_BORDER = "#1e1e26";
const BAT_BORDER_ACCENT = "rgba(245,196,0,0.25)";
const BAT_TEXT = "#e8e8f0";
const BAT_MUTED = "#55556a";
const BAT_MUTED2 = "#3a3a4a";

const BatLogo = () => (
  <svg width="28" height="20" viewBox="0 0 100 60" fill={BAT_YELLOW}>
    <path d="M50 10 C35 10 20 20 10 15 C15 25 18 35 15 45 C22 40 30 38 38 42 C40 48 44 52 50 54 C56 52 60 48 62 42 C70 38 78 40 85 45 C82 35 85 25 90 15 C80 20 65 10 50 10Z" />
    <ellipse cx="36" cy="28" rx="7" ry="9" fill={BAT_BG} />
    <ellipse cx="64" cy="28" rx="7" ry="9" fill={BAT_BG} />
  </svg>
);

const BatSignal = () => (
  <div style={{
    position: "absolute",
    top: 0, left: "50%",
    transform: "translateX(-50%)",
    width: 400, height: 300,
    background: `conic-gradient(from 260deg at 50% -10%, transparent 15deg, ${BAT_YELLOW}08 30deg, ${BAT_YELLOW}14 45deg, ${BAT_YELLOW}08 60deg, transparent 75deg)`,
    pointerEvents: "none",
    zIndex: 0,
  }} />
);

const specs = [
  { id: 1, title: "Arkham API Design", type: "api_design", status: "completed", date: "May 3", icon: "◈" },
  { id: 2, title: "Batcave Database Schema", type: "database_schema", status: "completed", date: "May 2", icon: "⬡" },
  { id: 3, title: "Gotham System Design", type: "system_design", status: "generating", date: "May 1", icon: "⬢" },
  { id: 4, title: "Villain Tracker Feature", type: "feature_spec", status: "completed", date: "Apr 30", icon: "◈" },
];

const typeLabels: Record<string, string> = {
  api_design: "API Design",
  database_schema: "Database Schema",
  system_design: "System Design",
  feature_spec: "Feature Spec",
};

export function BatmanTheme() {
  const [active, setActive] = useState(1);
  const [inputVal, setInputVal] = useState("https://github.com/batman/arkham-api");
  const [specType, setSpecType] = useState("api_design");

  const activeSpec = specs.find(s => s.id === active)!;

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      fontFamily: "'Inter', sans-serif",
      background: BAT_BG,
      color: BAT_TEXT,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Sidebar */}
      <div style={{
        width: 220,
        background: BAT_SIDEBAR,
        borderRight: `1px solid ${BAT_BORDER}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: "18px 16px 14px",
          borderBottom: `1px solid ${BAT_BORDER}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 34, height: 34,
            background: BAT_YELLOW,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 12px ${BAT_YELLOW}55`,
          }}>
            <BatLogo />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", color: BAT_TEXT }}>
              SPECFORGE
            </div>
            <div style={{ fontSize: 10, color: BAT_YELLOW, letterSpacing: "0.12em", fontWeight: 600 }}>
              DARK KNIGHT
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "10px 8px", flex: 1 }}>
          {[
            { icon: "⚡", label: "Generate" },
            { icon: "📄", label: "My Specs", active: true },
            { icon: "🔍", label: "Search" },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "8px 10px",
              borderRadius: 7,
              marginBottom: 2,
              background: item.active ? BAT_YELLOW_GLOW : "transparent",
              border: item.active ? `1px solid ${BAT_BORDER_ACCENT}` : "1px solid transparent",
              cursor: "pointer",
              fontSize: 13,
              color: item.active ? BAT_YELLOW : BAT_MUTED,
              fontWeight: item.active ? 600 : 400,
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}

          <div style={{ marginTop: 20, marginBottom: 6, paddingLeft: 10, fontSize: 10, color: BAT_MUTED2, letterSpacing: "0.1em", fontWeight: 600 }}>
            RECENT SPECS
          </div>
          {specs.map(spec => (
            <div key={spec.id} onClick={() => setActive(spec.id)} style={{
              padding: "7px 10px",
              borderRadius: 6,
              marginBottom: 1,
              cursor: "pointer",
              background: active === spec.id ? BAT_YELLOW_GLOW : "transparent",
              border: active === spec.id ? `1px solid ${BAT_BORDER_ACCENT}` : "1px solid transparent",
              fontSize: 12,
              color: active === spec.id ? BAT_TEXT : BAT_MUTED,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {spec.title}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{
          padding: "12px 14px",
          borderTop: `1px solid ${BAT_BORDER}`,
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${BAT_YELLOW} 0%, ${BAT_YELLOW_DARK} 100%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: BAT_BG,
            boxShadow: `0 0 8px ${BAT_YELLOW}44`,
          }}>B</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: BAT_TEXT }}>Bruce Wayne</div>
            <div style={{ fontSize: 10, color: BAT_MUTED }}>bruce@wayne.ent</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        <BatSignal />

        {/* Header */}
        <div style={{
          padding: "14px 24px",
          borderBottom: `1px solid ${BAT_BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 5,
          background: `${BAT_BG}cc`,
          backdropFilter: "blur(8px)",
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: BAT_TEXT }}>
              {activeSpec.title}
            </h1>
            <div style={{ fontSize: 12, color: BAT_MUTED, marginTop: 2 }}>
              {typeLabels[activeSpec.type]} · Generated {activeSpec.date}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Share", "PDF", "GitHub"].map(label => (
              <button key={label} style={{
                padding: "7px 14px",
                borderRadius: 7,
                border: `1px solid ${BAT_BORDER_ACCENT}`,
                background: BAT_YELLOW_GLOW,
                color: BAT_YELLOW,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}>{label}</button>
            ))}
            <button style={{
              padding: "7px 16px",
              borderRadius: 7,
              border: "none",
              background: BAT_YELLOW,
              color: BAT_BG,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: `0 0 14px ${BAT_YELLOW}55`,
            }}>Regenerate</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 5 }}>
          {/* Spec content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {/* Stats bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 22 }}>
              {[
                { label: "Total Specs", val: "7", sub: "+2 this week" },
                { label: "Completed", val: "5", sub: "71% success" },
                { label: "GitHub Synced", val: "3", sub: "Auto-updating" },
              ].map(stat => (
                <div key={stat.label} style={{
                  flex: 1,
                  background: BAT_CARD,
                  border: `1px solid ${BAT_BORDER}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", top: 0, right: 0,
                    width: 60, height: 60,
                    background: `radial-gradient(circle, ${BAT_YELLOW}10 0%, transparent 70%)`,
                  }} />
                  <div style={{ fontSize: 22, fontWeight: 700, color: BAT_YELLOW, lineHeight: 1 }}>{stat.val}</div>
                  <div style={{ fontSize: 12, color: BAT_TEXT, marginTop: 4, fontWeight: 600 }}>{stat.label}</div>
                  <div style={{ fontSize: 11, color: BAT_MUTED, marginTop: 2 }}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Spec card */}
            <div style={{
              background: BAT_CARD,
              border: `1px solid ${BAT_BORDER}`,
              borderRadius: 12,
              overflow: "hidden",
            }}>
              {/* Tabs */}
              <div style={{
                display: "flex",
                borderBottom: `1px solid ${BAT_BORDER}`,
                padding: "0 20px",
                background: BAT_CARD2,
              }}>
                {["Overview", "Endpoints", "Schema", "Examples"].map((tab, i) => (
                  <div key={tab} style={{
                    padding: "12px 16px",
                    fontSize: 13,
                    fontWeight: i === 0 ? 600 : 400,
                    color: i === 0 ? BAT_YELLOW : BAT_MUTED,
                    borderBottom: i === 0 ? `2px solid ${BAT_YELLOW}` : "2px solid transparent",
                    cursor: "pointer",
                    marginBottom: -1,
                    letterSpacing: "0.01em",
                  }}>{tab}</div>
                ))}
              </div>

              <div style={{ padding: "22px 24px" }}>
                {/* Section */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}>
                    <div style={{ width: 3, height: 16, background: BAT_YELLOW, borderRadius: 2 }} />
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: BAT_TEXT, letterSpacing: "0.02em" }}>
                      Authentication Endpoints
                    </h3>
                  </div>
                  {[
                    { method: "POST", path: "/auth/login", desc: "Authenticate operative credentials" },
                    { method: "GET",  path: "/auth/verify", desc: "Verify active session token" },
                    { method: "POST", path: "/auth/logout", desc: "Terminate operative session" },
                  ].map(ep => (
                    <div key={ep.path} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      marginBottom: 6,
                      background: `${BAT_BG}99`,
                      border: `1px solid ${BAT_BORDER}`,
                    }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: ep.method === "POST" ? `${BAT_YELLOW}22` : `rgba(100,200,255,0.1)`,
                        color: ep.method === "POST" ? BAT_YELLOW : "#60c8ff",
                        fontFamily: "monospace",
                        letterSpacing: "0.05em",
                        minWidth: 42,
                        textAlign: "center",
                      }}>{ep.method}</span>
                      <code style={{ fontSize: 13, color: BAT_TEXT, flex: 1, fontFamily: "monospace" }}>{ep.path}</code>
                      <span style={{ fontSize: 12, color: BAT_MUTED }}>{ep.desc}</span>
                    </div>
                  ))}
                </div>

                {/* Code block */}
                <div style={{
                  background: "#04040600",
                  border: `1px solid ${BAT_BORDER}`,
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  <div style={{
                    padding: "8px 14px",
                    background: BAT_CARD2,
                    borderBottom: `1px solid ${BAT_BORDER}`,
                    fontSize: 11,
                    color: BAT_MUTED,
                    fontFamily: "monospace",
                    display: "flex",
                    justifyContent: "space-between",
                  }}>
                    <span>POST /auth/login — Request Body</span>
                    <span style={{ color: BAT_YELLOW, cursor: "pointer" }}>Copy</span>
                  </div>
                  <pre style={{
                    margin: 0,
                    padding: "14px 16px",
                    fontSize: 12,
                    lineHeight: 1.7,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: BAT_TEXT,
                    background: "#060608",
                    overflowX: "auto",
                  }}>{`{
  "username": <span style="color:${BAT_YELLOW}">"string"</span>,    <span style="color:${BAT_MUTED}">// Operative handle</span>
  "password": <span style="color:${BAT_YELLOW}">"string"</span>,    <span style="color:${BAT_MUTED}">// Encrypted passphrase</span>
  "mfa_code": <span style="color:"#60c8ff"">"string?"</span>   <span style="color:${BAT_MUTED}">// Optional 2FA</span>
}`}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel — Generate new */}
          <div style={{
            width: 280,
            borderLeft: `1px solid ${BAT_BORDER}`,
            background: BAT_SIDEBAR,
            padding: "20px 16px",
            overflowY: "auto",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: BAT_TEXT, marginBottom: 14, letterSpacing: "0.04em" }}>
              ⚡ GENERATE SPEC
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: BAT_MUTED, display: "block", marginBottom: 5, letterSpacing: "0.06em" }}>SPEC TYPE</label>
              {["api_design", "system_design", "database_schema", "feature_spec"].map(type => (
                <div key={type} onClick={() => setSpecType(type)} style={{
                  padding: "8px 12px",
                  borderRadius: 7,
                  marginBottom: 4,
                  cursor: "pointer",
                  background: specType === type ? BAT_YELLOW_GLOW : "transparent",
                  border: specType === type ? `1px solid ${BAT_BORDER_ACCENT}` : `1px solid ${BAT_BORDER}`,
                  fontSize: 12,
                  color: specType === type ? BAT_YELLOW : BAT_MUTED,
                  fontWeight: specType === type ? 600 : 400,
                }}>
                  {typeLabels[type]}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: BAT_MUTED, display: "block", marginBottom: 5, letterSpacing: "0.06em" }}>GITHUB REPO</label>
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 11px",
                  borderRadius: 7,
                  border: `1px solid ${BAT_BORDER_ACCENT}`,
                  background: BAT_CARD,
                  color: BAT_TEXT,
                  fontSize: 12,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "monospace",
                }}
              />
            </div>

            <button style={{
              width: "100%",
              padding: "11px",
              borderRadius: 8,
              border: "none",
              background: BAT_YELLOW,
              color: BAT_BG,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.04em",
              boxShadow: `0 0 20px ${BAT_YELLOW}44`,
              marginBottom: 20,
            }}>
              ⚡ GENERATE
            </button>

            <div style={{ fontSize: 11, color: BAT_MUTED, marginBottom: 8, letterSpacing: "0.06em" }}>RECENT ACTIVITY</div>
            {specs.map(spec => (
              <div key={spec.id} style={{
                padding: "9px 11px",
                borderRadius: 7,
                marginBottom: 5,
                background: BAT_CARD,
                border: `1px solid ${BAT_BORDER}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: spec.status === "completed" ? BAT_YELLOW : "#60c8ff",
                  flexShrink: 0,
                  boxShadow: spec.status === "completed" ? `0 0 6px ${BAT_YELLOW}88` : `0 0 6px #60c8ff88`,
                }} />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: BAT_TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {spec.title}
                  </div>
                  <div style={{ fontSize: 10, color: BAT_MUTED }}>{spec.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
