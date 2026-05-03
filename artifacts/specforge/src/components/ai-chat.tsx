import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Trash2,
  Plus,
  MessageSquare,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import {
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useDeleteAnthropicConversation,
  getListAnthropicConversationsQueryKey,
  getGetAnthropicConversationQueryKey,
  getListAnthropicMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: number | string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function AIChat() {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [message, setMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations, refetch: refetchConversations } = useListAnthropicConversations();
  const createConv = useCreateAnthropicConversation();
  const deleteConv = useDeleteAnthropicConversation();

  const loadMessages = useCallback(async (convId: number) => {
    try {
      const res = await fetch(`/api/anthropic/conversations/${convId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {}
  }, []);

  const selectConversation = useCallback(async (convId: number) => {
    setActiveConvId(convId);
    setStreamedContent("");
    await loadMessages(convId);
    if (window.innerWidth < 768) setShowSidebar(false);
  }, [loadMessages]);

  const handleCreateNew = async () => {
    const conv = await createConv.mutateAsync({ data: { title: "New conversation" } });
    await refetchConversations();
    setActiveConvId(conv.id);
    setMessages([]);
    setStreamedContent("");
    setShowSidebar(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteConv.mutateAsync({ id });
    await refetchConversations();
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isStreaming) return;

    const content = message.trim();
    setMessage("");

    let convId = activeConvId;

    if (!convId) {
      const title = content.length > 40 ? content.slice(0, 37) + "…" : content;
      const conv = await createConv.mutateAsync({ data: { title } });
      await refetchConversations();
      convId = conv.id;
      setActiveConvId(convId);
      setShowSidebar(false);
    }

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamedContent("");

    try {
      const res = await fetch(`/api/anthropic/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.content) {
              fullReply += parsed.content;
              setStreamedContent(fullReply);
            }
            if (parsed.done) {
              setStreamedContent("");
              await loadMessages(convId!);
              queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0 || streamedContent;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "rgba(8,8,14,0.95)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.2))",
              border: "1px solid rgba(139,92,246,0.4)",
              boxShadow: "0 0 10px rgba(139,92,246,0.2)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: "hsl(263,90%,74%)" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">AI Assistant</p>
            <p className="text-[10px] text-muted-foreground font-mono">Powered by Claude</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSidebar(s => !s)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors text-[10px] font-mono"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            title="Toggle history"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCreateNew}
            className="p-1.5 rounded-md transition-all duration-200"
            style={{
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.3)",
              color: "hsl(263,90%,74%)",
            }}
            title="New conversation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Conversation sidebar */}
        {showSidebar && (
          <div className="w-40 shrink-0 flex flex-col overflow-hidden"
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="px-2.5 py-2">
              <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">History</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-2 pb-2 space-y-0.5">
                {!conversations?.length && (
                  <div className="text-center py-6 text-[10px] text-muted-foreground font-mono">
                    No sessions yet
                  </div>
                )}
                {conversations?.map(conv => {
                  const active = activeConvId === conv.id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className="group flex items-center gap-1.5 p-2 rounded-md cursor-pointer text-[11px] transition-all duration-150"
                      style={active ? {
                        background: "rgba(139,92,246,0.18)",
                        border: "1px solid rgba(139,92,246,0.3)",
                        color: "hsl(263,90%,74%)",
                      } : {
                        background: "transparent",
                        border: "1px solid transparent",
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      <MessageSquare className="w-3 h-3 shrink-0" />
                      <span className="truncate flex-1">{conv.title}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all shrink-0"
                        onClick={(e) => handleDelete(e, conv.id)}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-4 py-4">
            {!hasMessages && (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 gap-5">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))",
                      border: "1px solid rgba(139,92,246,0.25)",
                    }}
                  >
                    <Bot className="w-6 h-6" style={{ color: "hsl(263,90%,70%)" }} />
                  </div>
                  <div className="absolute -inset-3 rounded-3xl opacity-20 blur-xl"
                    style={{ background: "radial-gradient(circle, rgba(139,92,246,0.6), transparent)" }}
                  />
                </div>
                <div className="space-y-1.5 w-full max-w-[200px]">
                  <p className="font-bold text-sm text-white">Ask me anything</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    I can help with your specs, architecture decisions, code questions, and more.
                  </p>
                </div>
                <div className="space-y-1.5 w-full max-w-[200px]">
                  {[
                    "Explain microservices vs monolith",
                    "Best practices for REST APIs",
                    "How do I design a database schema?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setMessage(prompt); inputRef.current?.focus(); }}
                      className="w-full text-left text-[10px] px-3 py-2 rounded-lg transition-all duration-150"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        color: "hsl(var(--muted-foreground))",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                        e.currentTarget.style.color = "";
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                    style={msg.role === "user" ? {
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    } : {
                      background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.2))",
                      border: "1px solid rgba(139,92,246,0.4)",
                    }}
                  >
                    {msg.role === "user"
                      ? <User className="w-3 h-3 text-muted-foreground" />
                      : <Bot className="w-3 h-3" style={{ color: "hsl(263,90%,74%)" }} />
                    }
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                      msg.role === "user" ? "prose-none" : "prose prose-invert prose-xs max-w-none"
                    }`}
                    style={msg.role === "user" ? {
                      background: "rgba(139,92,246,0.15)",
                      border: "1px solid rgba(139,92,246,0.25)",
                      color: "rgba(255,255,255,0.9)",
                    } : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    {msg.role === "user"
                      ? <p className="whitespace-pre-wrap m-0 text-xs">{msg.content}</p>
                      : <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    }
                  </div>
                </div>
              ))}

              {isStreaming && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                    style={{
                      background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.2))",
                      border: "1px solid rgba(139,92,246,0.4)",
                    }}
                  >
                    <Bot className="w-3 h-3" style={{ color: "hsl(263,90%,74%)" }} />
                  </div>
                  <div className="max-w-[85%] rounded-xl px-3 py-2.5"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {streamedContent ? (
                      <div className="prose prose-invert prose-xs max-w-none text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamedContent}</ReactMarkdown>
                        <span className="inline-block w-1.5 h-3.5 rounded-sm align-middle ml-0.5 animate-pulse"
                          style={{ background: "hsl(263,90%,64%)" }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{
                                background: "hsl(263,90%,64%)",
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: "0.8s",
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">thinking…</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 pb-10 shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything… (Enter to send)"
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none rounded-lg px-3 py-2.5 text-xs font-mono outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  color: "white",
                  minHeight: "38px",
                  maxHeight: "120px",
                  lineHeight: "1.5",
                  caretColor: "hsl(263,90%,70%)",
                }}
                onFocus={e => {
                  e.target.style.borderColor = "rgba(139,92,246,0.5)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)";
                }}
                onBlur={e => {
                  e.target.style.borderColor = "rgba(255,255,255,0.09)";
                  e.target.style.boxShadow = "none";
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || isStreaming}
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed btn-gradient"
              >
                {isStreaming
                  ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                  : <Send className="w-3.5 h-3.5 text-white" />
                }
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground font-mono mt-1.5 opacity-50 text-center">
              Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
