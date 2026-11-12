import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";

const require = createRequire(new URL("../lib/db/package.json", import.meta.url));
const { Pool } = require("pg");

async function startApi(t, enableAutoSync = false) {
  const port = await new Promise((resolve, reject) => {
    const server = createServer().once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(err => err ? reject(err) : resolve(port));
    });
  });
  const origin = "http://127.0.0.1:" + port;
  const server = spawn(process.execPath, ["artifacts/api-server/dist/index.mjs"], {
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), PUBLIC_URL: origin, LOCAL_DEV: "false", OPENAI_API_KEY: "", AI_INTEGRATIONS_OPENAI_API_KEY: "", OLLAMA_MODEL: "", NOTION_API_KEY: "", STATIC_DIR: resolve("artifacts/specforge/dist"), ENABLE_GITHUB_AUTO_SYNC: String(enableAutoSync) },
    stdio: ["ignore", "ignore", "inherit"],
  });
  t.after(() => server.kill());

  const call = (path, token, method = "GET", body) => fetch(origin + "/api" + path, {
    method,
    headers: { ...(token ? { Authorization: "Bearer " + token } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });

  let ready = false;
  for (let i = 0; i < 50 && server.exitCode === null; i++) {
    try { ready = (await call("/readyz")).ok; } catch {}
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, "API and database should be ready");

  return { origin, call };
}

test("Free release, spec editing, authorization and sharing", { timeout: 35_000 }, async t => {
  const database = new URL(process.env.DATABASE_URL);
  assert.match(database.pathname, /_test$/, "Use a disposable database ending in _test");
  const pool = new Pool({ connectionString: database.href });
  t.after(() => pool.end());

  const { origin, call } = await startApi(t);

  const prefix = randomUUID();
  const users = Object.fromEntries(["owner", "editor", "viewer", "outsider"].map(role => [role, prefix + "-" + role]));
  const tokens = Object.fromEntries(Object.keys(users).map(role => [role, randomUUID()]));
  for (const [role, id] of Object.entries(users)) {
    await pool.query("INSERT INTO sessions (sid, sess, expire) VALUES ($1, $2, now() + interval '1 hour')",
      [tokens[role], JSON.stringify({ user: { id, name: role } })]);
  }
  const capabilities = await (await call("/capabilities")).json();
  assert.deepEqual(capabilities, { localAI: false, localVision: false, githubAutoSync: false, notionExport: false });
  assert.equal((await call("/webhooks/github", null, "POST", {})).status, 503);
  const landing = await fetch(origin);
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /<!doctype html>/i);
  assert.equal((await fetch(origin + "/app/specs/1")).status, 200);
  const draftResponse = await call("/specs", tokens.owner, "POST", {
    title: "Free draft",
    specType: "api_design",
    inputType: "description",
    inputValue: "Let library members reserve study rooms.",
  });
  assert.equal(draftResponse.status, 201);
  const draftPath = "/specs/" + (await draftResponse.json()).id;
  const stream = await call(draftPath + "/stream", tokens.owner, "POST");
  assert.equal(stream.status, 200);
  const events = await stream.text();
  assert.match(events, /Template draft/);
  assert.match(events, /reserve study rooms/);
  assert.match(events, /"done":true/);
  const draft = await (await call(draftPath, tokens.owner)).json();
  assert.equal(draft.status, "completed");
  assert.equal(draft.aiModel, "template");
  assert.match(draft.mermaidDiagram, /flowchart/);
  const versions = await (await call(draftPath + "/versions", tokens.owner)).json();
  assert.ok(versions.versions.length > 0);
  assert.equal((await call(draftPath + "/export/docx", tokens.owner)).status, 200);
  assert.equal((await call(draftPath + "/insights", tokens.owner, "POST")).status, 503);

  const changes = { content: draft.content + "\n\n## Decision\n\nUse one booking per member.", previousContent: draft.content };
  const edit = await call(draftPath + "/content", tokens.owner, "PATCH", changes);
  assert.equal(edit.status, 200);
  assert.equal((await edit.json()).content, changes.content);
  assert.equal((await call(draftPath + "/content", tokens.owner, "PATCH", changes)).status, 409);
  assert.equal((await call(draftPath + "/content", tokens.outsider, "PATCH", changes)).status, 404);
  const editVersions = await (await call(draftPath + "/versions", tokens.owner)).json();
  assert.equal(editVersions.versions.length, versions.versions.length + 1);
  assert.equal(editVersions.versions[0].triggeredBy, "edit");

  const { rows: [team] } = await pool.query("INSERT INTO teams (name, owner_id) VALUES ($1, $2) RETURNING id", [prefix, users.owner]);
  for (const role of ["owner", "editor", "viewer"]) {
    await pool.query("INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)", [team.id, users[role], role]);
  }
  const { rows: [spec] } = await pool.query(
    "INSERT INTO specs (title, user_id, team_id, spec_type, input_type, input_value, content, status) VALUES ($1, $2, $3, 'feature_spec', 'description', 'private input', 'private fixture', 'completed') RETURNING id",
    [prefix, users.owner, team.id],
  );
  const path = "/specs/" + spec.id;
  assert.equal((await call("/specs")).status, 401);
  assert.equal((await call("/specs", tokens.outsider)).status, 200);
  assert.ok(!(await (await call("/specs", tokens.outsider)).json()).some(row => row.id === spec.id));
  const search = await (await call("/search?q=" + prefix, tokens.outsider)).json();
  assert.deepEqual(search.results, []);
  for (const suffix of ["", "/export/docx", "/presence"]) {
    assert.equal((await call(path + suffix, tokens.outsider)).status, 404, suffix);
  }
  assert.equal((await call(path, tokens.outsider, "DELETE")).status, 404);
  assert.equal((await call(path + "/chat", tokens.outsider, "POST")).status, 404);
  for (const role of ["editor", "viewer"]) {
    assert.equal((await call(path, tokens[role])).status, 200);
    assert.equal((await call(path + "/share", tokens[role], "POST")).status, 403);
    assert.equal((await call(path + "/share", tokens[role], "DELETE")).status, 403);
    assert.equal((await call(path, tokens[role], "DELETE")).status, 403);
    assert.equal((await call(path + "/content", tokens[role], "PATCH", changes)).status, 403);
  }

  const linkResponse = await call(path + "/share", tokens.owner, "POST");
  assert.equal(linkResponse.status, 200);
  const { shareToken } = await linkResponse.json();
  assert.ok(shareToken);
  assert.ok(!Object.hasOwn(await (await call(path, tokens.viewer)).json(), "shareToken"));
  const publicPath = "/specs/share/" + shareToken;
  const publicResponse = await call(publicPath);
  assert.equal(publicResponse.status, 200);
  assert.equal(publicResponse.headers.get("cache-control"), "no-store");
  assert.ok(!Object.hasOwn(await publicResponse.json(), "inputValue"));
  assert.equal((await call(path + "/share", tokens.owner, "DELETE")).status, 204);
  assert.equal((await call(publicPath)).status, 404);

  const repo = "https://github.com/specforge-fixture/" + prefix;
  const secret = randomUUID();
  const payload = JSON.stringify({
    ref: "refs/heads/main",
    repository: { html_url: repo, default_branch: "main" },
  });
  const { rows: [hookSpec] } = await pool.query(
    "INSERT INTO specs (title, user_id, spec_type, input_type, input_value, status, webhook_secret) VALUES ($1, $2, 'feature_spec', 'github_url', $3, 'completed', $4) RETURNING id",
    [prefix, users.owner, repo.toUpperCase() + ".git/", secret],
  );
  await pool.query("INSERT INTO github_webhook_deliveries (spec_id, digest) VALUES ($1, $2)",
    [hookSpec.id, createHash("sha256").update(payload).digest("hex")]);
  const webhookApi = await startApi(t, true);
  const delivery = await fetch(webhookApi.origin + "/api/webhooks/github", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Event": "push",
      "X-Hub-Signature-256": "sha256=" + createHmac("sha256", secret).update(payload).digest("hex"),
    },
    body: payload,
    signal: AbortSignal.timeout(8000),
  });
  assert.equal(delivery.status, 200);
  assert.deepEqual(await delivery.json(), { processed: 0 });

  const presence = await call(path + "/presence", tokens.viewer);
  assert.equal(presence.status, 200);
  const reader = presence.body.getReader();
  assert.equal((await reader.read()).done, false);
  await pool.query("DELETE FROM team_members WHERE team_id = $1 AND user_id = $2", [team.id, users.viewer]);
  while (!(await reader.read()).done) {}
  assert.equal((await call(path + "/presence", tokens.viewer)).status, 404);
});
