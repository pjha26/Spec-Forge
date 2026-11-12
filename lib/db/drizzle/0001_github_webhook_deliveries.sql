CREATE TABLE "github_webhook_deliveries" (
	"spec_id" integer NOT NULL,
	"digest" text NOT NULL,
	CONSTRAINT "github_webhook_deliveries_spec_id_digest_pk" PRIMARY KEY("spec_id","digest")
);
--> statement-breakpoint
ALTER TABLE "github_webhook_deliveries" ADD CONSTRAINT "github_webhook_deliveries_spec_id_specs_id_fk" FOREIGN KEY ("spec_id") REFERENCES "public"."specs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "specs_github_webhook_repo_idx" ON "specs" USING btree (regexp_replace(lower(btrim("input_value")), '([.]git)?/?$', '')) WHERE "input_type" = 'github_url' AND "webhook_secret" IS NOT NULL;