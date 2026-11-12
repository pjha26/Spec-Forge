import { Router } from "express";
import { db, conversations as conversationsTable, messages as messagesTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { getOpenAI } from "@workspace/integrations-openai-ai-server";
import {
  CreateAnthropicConversationBody,
  GetAnthropicConversationParams,
  DeleteAnthropicConversationParams,
  ListAnthropicMessagesParams,
  SendAnthropicMessageParams,
  SendAnthropicMessageBody,
} from "@workspace/api-zod";

const router = Router();

function formatConversation(c: { id: number; title: string; createdAt: Date }) {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
  };
}

function formatMessage(m: {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/conversations", async (req, res) => {
  try {
    const conversations = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, req.user!.id))
      .orderBy(desc(conversationsTable.createdAt));
    res.json(conversations.map(formatConversation));
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  const parsed = CreateAnthropicConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const [conv] = await db
      .insert(conversationsTable)
      .values({ userId: req.user!.id, title: parsed.data.title })
      .returning();
    res.status(201).json(formatConversation(conv));
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  const parsed = GetAnthropicConversationParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  try {
    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, parsed.data.id), eq(conversationsTable.userId, req.user!.id)));

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const messages = await db
      .select({ id: messagesTable.id, conversationId: messagesTable.conversationId, role: messagesTable.role, content: messagesTable.content, createdAt: messagesTable.createdAt })
      .from(messagesTable)
      .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
      .where(and(eq(messagesTable.conversationId, parsed.data.id), eq(conversationsTable.userId, req.user!.id)))
      .orderBy(messagesTable.createdAt);

    res.json({
      ...formatConversation(conv),
      messages: messages.map(formatMessage),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get conversation");
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  const parsed = DeleteAnthropicConversationParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  try {
    const result = await db
      .delete(conversationsTable)
      .where(and(eq(conversationsTable.id, parsed.data.id), eq(conversationsTable.userId, req.user!.id)))
      .returning();

    if (result.length === 0) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  const parsed = ListAnthropicMessagesParams.safeParse({
    id: Number(req.params.id),
  });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid conversation ID" });
    return;
  }

  try {
    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, parsed.data.id))
      .orderBy(messagesTable.createdAt);

    res.json(messages.map(formatMessage));
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  const paramsParsed = SendAnthropicMessageParams.safeParse({
    id: Number(req.params.id),
  });
  const bodyParsed = SendAnthropicMessageBody.safeParse(req.body);

  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const conversationId = paramsParsed.data.id;

  try {
    const [conv] = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.id, conversationId), eq(conversationsTable.userId, req.user!.id)));

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: bodyParsed.data.content,
    });

    const history = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(desc(messagesTable.createdAt)).limit(30);

    const chatMessages = history.reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 4096,
      stream: true,
      messages: [{ role: "system", content: `You are the SpecForge AI Assistant — a helpful, expert technical advisor embedded in SpecForge, an AI-powered tool that generates professional technical design documents for developers and teams.

You specialize in:
- Software architecture (system design, microservices, monoliths, event-driven systems)
- API design (REST, GraphQL, gRPC, OpenAPI, authentication patterns)
- Database design (relational schemas, NoSQL patterns, migrations, indexing)
- Feature specification (user stories, acceptance criteria, edge cases, PRDs)
- Code quality and tech debt analysis
- Engineering best practices, trade-offs, and decision-making

When answering:
- Be concise but thorough — give actionable advice with concrete examples
- Use code snippets, diagrams (described in text), or structured breakdowns when helpful
- Highlight trade-offs honestly — there are no perfect architectures
- Tailor your responses to the developer's context when possible
- Format responses with Markdown (headers, code blocks, bullet points) for clarity

You are friendly, direct, and pragmatic. You help developers build better software faster.`,
      }, ...chatMessages],
    });

    for await (const event of stream) {
      const content = event.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(
          `data: ${JSON.stringify({ content })}\n\n`
        );
      }
    }

    await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
    res.end();
  }
});

export default router;
