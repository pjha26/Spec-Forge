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

COMMIT;
