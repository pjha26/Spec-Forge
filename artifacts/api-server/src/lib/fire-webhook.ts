export async function fireSlackNotification(
  webhookUrl: string,
  title: string,
  body: string,
  specUrl?: string,
): Promise<void> {
  const url = new URL(webhookUrl);
  if (url.origin !== "https://hooks.slack.com" || url.username || url.password || !/^\/services\/[\w-]+\/[\w-]+\/[\w-]+$/.test(url.pathname) || url.search || url.hash) {
    throw new Error("Enter a valid Slack incoming webhook URL");
  }
  const blocks: object[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "⚡ SpecForge" },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${title}*\n${body}` },
    },
  ];

  if (specUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open Spec →" },
          url: specUrl,
          style: "primary",
        },
      ],
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: "Sent by <https://specforge.app|SpecForge>" }],
  });

  const response = await fetch(url, {
    redirect: "error",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Slack rejected the webhook");
}
