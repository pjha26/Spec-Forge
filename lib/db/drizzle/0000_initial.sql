CREATE TABLE "specs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"title" text NOT NULL,
	"spec_type" text NOT NULL,
	"input_type" text NOT NULL,
	"input_value" text NOT NULL,
	"image_input" text,
	"content" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"complexity_score" integer,
	"tech_debt_risks" jsonb,
	"complexity_summary" text,
	"mermaid_diagram" text,
	"conversation_id" integer,
	"share_token" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"webhook_secret" text,
	"last_synced_at" timestamp,
	"team_id" integer,
	"ai_model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"multi_agent" boolean DEFAULT false NOT NULL,
	"extended_thinking" boolean DEFAULT false NOT NULL,
	"thinking_content" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"spec_id" integer,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"spec_id" integer NOT NULL,
	"content" text NOT NULL,
	"complexity_score" integer,
	"tech_debt_risks" text,
	"complexity_summary" text,
	"mermaid_diagram" text,
	"triggered_by" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"username" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"owner_id" text NOT NULL,
	"custom_system_prompt" text,
	"sso_enabled" text DEFAULT 'false',
	"notify_email" text,
	"digest_frequency" text DEFAULT 'off' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"preferred_stack" text,
	"domain" text,
	"always_include_sections" jsonb,
	"preferred_model" text,
	"default_spec_type" text,
	"extra_context" text,
	"linear_api_key" text,
	"linear_team_id" text,
	"jira_api_key" text,
	"jira_base_url" text,
	"jira_project_key" text,
	"slack_webhook_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_knowledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"doc_type" text DEFAULT 'doc' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"user_id" text,
	"username" text,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sso_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"provider" text DEFAULT 'saml' NOT NULL,
	"entity_id" text NOT NULL,
	"sso_url" text NOT NULL,
	"certificate" text NOT NULL,
	"sp_entity_id" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sso_config_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "spec_conflicts" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"spec1_id" integer NOT NULL,
	"spec2_id" integer NOT NULL,
	"conflict_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"spec1_excerpt" text,
	"spec2_excerpt" text,
	"suggestion" text,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_health_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"spec_id" integer NOT NULL,
	"alignment_score" integer NOT NULL,
	"drift_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"triggered_by" text DEFAULT 'cron' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_spec_id" integer NOT NULL,
	"target_spec_id" integer NOT NULL,
	"relationship_type" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"spec_id" integer NOT NULL,
	"section_title" text NOT NULL,
	"issue_title" text NOT NULL,
	"issue_id" text NOT NULL,
	"issue_url" text NOT NULL,
	"platform" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"event_type" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp,
	"last_status" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_annotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"spec_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"username" text DEFAULT '' NOT NULL,
	"selected_text" text DEFAULT '' NOT NULL,
	"section_title" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'verified' NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_audit_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"spec_id" integer NOT NULL,
	"triggered_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"discrepancies" jsonb,
	"summary" text,
	"commit_sha" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "specs_share_token_unique" ON "specs" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_unique" ON "team_members" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_dep_unique" ON "spec_dependencies" USING btree ("source_spec_id","target_spec_id","relationship_type");