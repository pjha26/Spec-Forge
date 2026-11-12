export function parseGitHubRepo(input: string) {
  const match = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/?$/i.exec(input.trim());
  const owner = match?.[1];
  const repo = match?.[2]?.replace(/\.git$/i, "");
  if (!owner || !repo || [".", ".."].includes(owner) || [".", ".."].includes(repo)) return null;
  return { owner, repo };
}

export async function githubSource(input: string) {
  const source = parseGitHubRepo(input);
  if (!source) throw new Error("Enter a public GitHub repository URL");
  const url = "https://api.github.com/repos/" + encodeURIComponent(source.owner) + "/" + encodeURIComponent(source.repo);
  const options = { signal: AbortSignal.timeout(10_000), redirect: "error" as const };
  const repoResponse = await fetch(url, options);
  if (!repoResponse.ok) throw new Error("Could not read this public GitHub repository");
  const repo = await repoResponse.json() as { description?: string; language?: string };
  const readmeResponse = await fetch(url + "/readme", options);
  let readme = "";
  if (readmeResponse.ok) {
    const file = await readmeResponse.json() as { content?: string; encoding?: string };
    if (file.encoding === "base64" && file.content) readme = Buffer.from(file.content.slice(0, 16_000), "base64").toString("utf8").slice(0, 10_000);
  }
  return JSON.stringify({ url: input, description: repo.description, language: repo.language, readme });
}
