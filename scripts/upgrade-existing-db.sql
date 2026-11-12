BEGIN;

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id text;

WITH known_owners AS (
  SELECT conversation_id, min(user_id) AS user_id
  FROM specs
  WHERE conversation_id IS NOT NULL
  GROUP BY conversation_id
  HAVING count(DISTINCT user_id) = 1 AND count(user_id) = count(*)
)
UPDATE conversations
SET user_id = known_owners.user_id
FROM known_owners
WHERE conversations.id = known_owners.conversation_id
  AND conversations.user_id IS NULL;

CREATE TABLE IF NOT EXISTS github_webhook_deliveries (
  spec_id integer NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  digest text NOT NULL,
  PRIMARY KEY (spec_id, digest)
);

CREATE INDEX IF NOT EXISTS specs_github_webhook_repo_idx
ON specs (regexp_replace(lower(btrim(input_value)), '([.]git)?/?$', ''))
WHERE input_type = 'github_url' AND webhook_secret IS NOT NULL;

COMMIT;
