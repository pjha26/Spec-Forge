import { motion, AnimatePresence } from "framer-motion";
import { X, Server, Smartphone, MessageSquare, GitBranch, ShoppingCart, Layers, Brain, Database, ArrowRight, Sparkles } from "lucide-react";

export type SpecTypeValue = "system_design" | "api_design" | "db_schema" | "feature_spec";

export interface SpecTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  specType: SpecTypeValue;
  tags: string[];
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  gradient: string;
  border: string;
}

export const SPEC_TEMPLATES: SpecTemplate[] = [
  {
    id: "saas-api",
    title: "SaaS REST API",
    subtitle: "Multi-tenant backend with auth & billing",
    description: `Build a production-ready multi-tenant SaaS REST API with the following requirements:

- JWT authentication with refresh tokens and OAuth2 (Google, GitHub)
- Multi-tenancy with organization/workspace isolation at the database level
- Stripe billing integration: subscription plans, usage-based metering, webhooks
- Role-based access control (owner, admin, member, viewer)
- Rate limiting per plan tier
- PostgreSQL with row-level security, Redis for caching and sessions
- OpenAPI 3.0 documentation
- Background job processing for emails, webhooks, report generation
- Audit log for all data mutations
- Tech stack: Node.js, TypeScript, Express, Drizzle ORM, PostgreSQL, Redis`,
    specType: "system_design",
    tags: ["Node.js", "PostgreSQL", "Stripe", "Redis", "JWT"],
    icon: Server,
    color: "hsl(var(--primary))",
    gradient: "linear-gradient(135deg, rgba(var(--primary-rgb),0.18), rgba(var(--primary-rgb),0.08))",
    border: "rgba(var(--primary-rgb),0.35)",
  },
  {
    id: "mobile-app",
    title: "Mobile App",
    subtitle: "Cross-platform React Native with offline sync",
    description: `Design a production-ready cross-platform mobile application with:

- Expo (React Native) targeting iOS and Android
- Offline-first architecture with local SQLite and background sync to server
- Push notifications (Expo Notifications) with deep linking
- Social authentication (Apple Sign-In, Google, Email/Password)
- Camera, gallery, and file upload capabilities
- Real-time updates via WebSocket for collaborative features
- In-app purchases via RevenueCat (iOS App Store + Google Play)
- Analytics with Mixpanel/Amplitude event tracking
- Crash reporting with Sentry
- OTA updates via Expo EAS Update`,
    specType: "feature_spec",
    tags: ["Expo", "React Native", "SQLite", "Push Notifs", "RevenueCat"],
    icon: Smartphone,
    color: "#10B981",
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.1))",
    border: "rgba(16,185,129,0.35)",
  },
  {
    id: "realtime-chat",
    title: "Real-time Chat",
    subtitle: "Scalable messaging with presence & channels",
    description: `Design a scalable real-time messaging system supporting:

- WebSocket connections with Socket.io, horizontal scaling via Redis pub/sub
- Direct messages, group channels, and broadcast announcements
- Typing indicators, read receipts, message reactions
- Online/offline presence tracking across devices
- File and image attachments stored in S3-compatible object storage
- Message threading and reply chains
- End-to-end encryption for DMs using Signal Protocol
- Message search with Elasticsearch
- Push notification fallback when user is offline
- Moderation: mute, ban, message deletion
- Tech stack: Node.js, Socket.io, Redis, PostgreSQL, S3`,
    specType: "system_design",
    tags: ["WebSocket", "Redis", "Socket.io", "S3", "E2E Encrypt"],
    icon: MessageSquare,
    color: "#06B6D4",
    gradient: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.1))",
    border: "rgba(6,182,212,0.35)",
  },
  {
    id: "data-pipeline",
    title: "Data Pipeline",
    subtitle: "ETL with job queues, workers & observability",
    description: `Design a production data pipeline system for:

- Ingesting data from multiple sources: REST APIs, webhooks, S3 CSV/JSON files, PostgreSQL CDC
- Transformation layer with configurable business rules and data validation
- Output to data warehouse (Snowflake or BigQuery) and operational databases
- Job scheduling with cron expressions and dependency graphs (like Airflow DAGs)
- Dead-letter queues, automatic retry with exponential backoff
- Exactly-once processing semantics using idempotency keys
- Real-time data quality monitoring and anomaly detection
- Schema registry for evolving schemas
- OpenLineage for data provenance tracking
- Grafana dashboards for pipeline health and SLA monitoring
- Tech stack: Python, Apache Kafka, dbt, PostgreSQL, Redis, Docker`,
    specType: "system_design",
    tags: ["Kafka", "Python", "dbt", "Snowflake", "Airflow"],
    icon: GitBranch,
    color: "#F59E0B",
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.1))",
    border: "rgba(245,158,11,0.35)",
  },
  {
    id: "ecommerce",
    title: "E-commerce Platform",
    subtitle: "Product catalog, cart, checkout & payments",
    description: `Design a full-featured e-commerce platform API with:

- Product catalog: variants (size, color), inventory tracking, digital products
- Shopping cart with guest and authenticated sessions, cart merge on login
- Checkout flow: address validation, tax calculation (TaxJar), shipping rates (Shippo API)
- Payment processing: Stripe (cards, Apple/Google Pay, Klarna), fraud detection
- Order management: fulfillment status, partial shipments, returns & refunds
- Promotions engine: discount codes, volume pricing, bundle deals, loyalty points
- Multi-vendor marketplace support with seller payouts via Stripe Connect
- Search and filtering with Elasticsearch: facets, full-text, semantic
- Product recommendations using collaborative filtering
- Admin dashboard: inventory alerts, sales reports, customer analytics`,
    specType: "api_design",
    tags: ["Stripe", "Elasticsearch", "PostgreSQL", "Redis", "Shippo"],
    icon: ShoppingCart,
    color: "#EC4899",
    gradient: "linear-gradient(135deg, rgba(236,72,153,0.2), rgba(168,85,247,0.1))",
    border: "rgba(236,72,153,0.35)",
  },
  {
    id: "microservices",
    title: "Microservices",
    subtitle: "API gateway, service mesh & message broker",
    description: `Architect a microservices system with:

- API Gateway (Kong or custom): routing, auth, rate limiting, request tracing
- Service discovery with Consul, health checks, circuit breakers (Hystrix pattern)
- Async communication via Apache Kafka with event-driven choreography
- Sync gRPC calls between services with protobuf schemas
- Distributed tracing with OpenTelemetry + Jaeger
- Centralized logging with ELK stack (Elasticsearch, Logstash, Kibana)
- Secrets management with HashiCorp Vault
- Container orchestration with Kubernetes: HPA, pod disruption budgets, resource limits
- GitOps deployment with ArgoCD and Helm charts
- Service-level objectives and error budgets
- Services: user-service, auth-service, notification-service, billing-service, file-service`,
    specType: "system_design",
    tags: ["Kubernetes", "Kafka", "gRPC", "Kong", "OpenTelemetry"],
    icon: Layers,
    color: "#6366F1",
    gradient: "linear-gradient(135deg, rgba(var(--primary-rgb),0.18), rgba(var(--primary-rgb),0.08))",
    border: "rgba(99,102,241,0.35)",
  },
  {
    id: "ml-platform",
    title: "ML Inference API",
    subtitle: "Model serving, batching & feature store",
    description: `Design a production ML inference platform with:

- Model serving layer supporting PyTorch, TensorFlow, ONNX, and HuggingFace models
- Dynamic batching for throughput optimization with configurable latency SLOs
- A/B testing and shadow mode for model comparison
- Feature store (Feast) for real-time and batch feature retrieval
- Model versioning and registry with MLflow
- GPU auto-scaling based on request queue depth
- Input validation, output confidence scores, and hallucination detection
- Async inference for long-running jobs with webhook callbacks
- Drift detection and model performance monitoring
- Rate limiting by API key and quota management
- Tech stack: Python, FastAPI, Triton Inference Server, Redis, PostgreSQL, Prometheus`,
    specType: "api_design",
    tags: ["PyTorch", "FastAPI", "Triton", "MLflow", "Feast"],
    icon: Brain,
    color: "#34D399",
    gradient: "linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))",
    border: "rgba(52,211,153,0.35)",
  },
  {
    id: "db-schema",
    title: "Multi-tenant DB Schema",
    subtitle: "RBAC, audit logs & soft deletes",
    description: `Design a multi-tenant PostgreSQL database schema for a SaaS application with:

- Organizations and workspaces with tenant isolation (row-level security)
- User accounts with profile, preferences, and avatar storage
- Role-based access control: system roles (superadmin, support) and workspace roles (owner, admin, member, viewer)
- Permission matrix: fine-grained resource/action permissions with inheritance
- Audit log table tracking all INSERT/UPDATE/DELETE with actor, timestamp, diff, IP
- Soft deletes with deleted_at timestamps and cascade behavior
- Subscription and billing tables: plans, features, usage meters, invoices
- Notification preferences and delivery log
- OAuth provider connections per user
- API keys with scopes, expiry, and usage tracking
- Full-text search indexes, GIN indexes for JSONB columns
- Seed data for development and test environments`,
    specType: "db_schema",
    tags: ["PostgreSQL", "RLS", "RBAC", "Audit Log", "JSONB"],
    icon: Database,
    color: "#F97316",
    gradient: "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(245,158,11,0.1))",
    border: "rgba(249,115,22,0.35)",
  },
];

const SPEC_TYPE_LABELS: Record<SpecTypeValue, string> = {
  system_design: "System Design",
  api_design: "API Design",
  db_schema: "DB Schema",
  feature_spec: "Feature Spec",
};

interface SpecTemplatesModalProps {
  onClose: () => void;
  onSelect: (template: SpecTemplate) => void;
}

export function SpecTemplatesModal({ onClose, onSelect }: SpecTemplatesModalProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(10px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.72)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        className="relative w-full max-w-5xl max-h-[88vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "linear-gradient(180deg, #0d0d18 0%, #090910 100%)",
          border: "1px solid rgba(var(--primary-rgb),0.2)",
          boxShadow: "0 32px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(var(--primary-rgb),0.06)",
        }}
        initial={{ scale: 0.88, opacity: 0, y: 28 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.85 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(var(--primary-rgb),0.25), rgba(var(--primary-rgb),0.12))",
                border: "1px solid rgba(var(--primary-rgb),0.35)",
              }}
            >
              <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Quick-start Templates</p>
              <p className="text-[11px] text-muted-foreground">Pick a template to pre-fill your generator — edit it before generating</p>
            </div>
          </motion.div>

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

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SPEC_TEMPLATES.map((tpl, i) => {
              const Icon = tpl.icon;
              return (
                <motion.button
                  key={tpl.id}
                  onClick={() => { onSelect(tpl); onClose(); }}
                  className="group text-left rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + i * 0.04, type: "spring", stiffness: 340, damping: 28 }}
                  whileHover={{
                    scale: 1.025,
                    background: tpl.gradient,
                    borderColor: tpl.border,
                    boxShadow: `0 8px 32px ${tpl.color}18`,
                  } as any}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Glow orb on hover */}
                  <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `radial-gradient(circle, ${tpl.color}, transparent)` }}
                  />

                  <div className="flex items-start justify-between gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${tpl.color}18`, border: `1px solid ${tpl.color}30` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: tpl.color }} />
                    </div>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        background: `${tpl.color}15`,
                        color: tpl.color,
                        border: `1px solid ${tpl.color}25`,
                      }}
                    >
                      {SPEC_TYPE_LABELS[tpl.specType]}
                    </span>
                  </div>

                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-bold text-white leading-tight">{tpl.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug">{tpl.subtitle}</p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {tpl.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "hsl(var(--muted-foreground))",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >{tag}</span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: tpl.color }}
                  >
                    Use template <ArrowRight className="w-3 h-3" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="px-7 py-3 shrink-0 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[10px] text-muted-foreground opacity-50 font-mono">
            Templates pre-fill the description — you can edit it before generating
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
