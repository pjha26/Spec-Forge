import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useGetOrCreateSpecChat } from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

interface SpecChatProps {
  specId: number;
}

export function SpecChat({ specId }: SpecChatProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const getOrCreateChat = useGetOrCreateSpecChat();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Use raw fetch for messages since there's no hook for useListAnthropicMessages with queryKey out of the box in our specific setup, 
  // actually wait, there is a useListAnthropicMessages, but it's for all. Wait, we need to fetch messages for THIS conversation.
  // Let's just fetch it manually if there's no generated hook for it, or use the generic fetch.
  // Actually, we need to see what API endpoint is for listing messages.
  // The prompt says: Messages are listed with `useListAnthropicMessages(conversationId, { query: { enabled: !!conversationId, queryKey: ... } })`
  // Wait, I need to see if useListAnthropicMessages exists and takes conversationId.
  // Let's assume it doesn't and use a custom query just in case, but let's try to import it first. 
  // Ah, the prompt says "Messages are listed with `useListAnthropicMessages(conversationId...". No wait, there is no such hook in api.ts. Let's write a generic useQuery.

  const { data: conversationData, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/anthropic/conversations', conversationId],
    queryFn: () => customFetch<any>(`/api/anthropic/conversations/${conversationId}`),
    enabled: !!conversationId
  });

  useEffect(() => {
    async function init() {
      try {
        const conv = await getOrCreateChat.mutateAsync({ id: specId });
        setConversationId(conv.id);
      } catch (err) {
        console.error("Failed to init chat", err);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, [specId]);

  const handleSend = async () => {
    if (!message.trim() || !conversationId || isStreaming) return;

    const content = message;
    setMessage("");
    
    // Optimistic UI
    const tempMsg = { id: Date.now(), role: "user", content, createdAt: new Date().toISOString() };
    queryClient.setQueryData(['/api/anthropic/conversations', conversationId], (old: any) => {
      if (!old) return old;
      return { ...old, messages: [...(old.messages || []), tempMsg] };
    });

    try {
      setIsStreaming(true);
      setStreamedContent("");

      const response = await fetch(`/api/anthropic/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        setStreamedContent(prev => prev + chunk);
      }
      
      await refetchMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationData?.messages, streamedContent]);

  if (isInitializing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground gap-4 h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin opacity-50" />
        <p className="font-mono text-sm">Initializing AI context...</p>
      </div>
    );
  }

  const messages = conversationData?.messages || [];

  return (
    <div className="flex flex-col h-[500px] sm:h-[600px] w-full bg-[#0a0a0a]">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && !streamedContent && (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div className="max-w-md space-y-4">
              <Bot className="w-12 h-12 mx-auto text-primary/50" />
              <h3 className="font-mono font-bold text-lg">Ask Your Doc</h3>
              <p className="text-sm text-muted-foreground">
                Ask anything about this spec — architecture decisions, trade-offs, how to implement a specific component...
              </p>
            </div>
          </div>
        )}
        
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.map((msg: any) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center mt-1 ${msg.role === "user" ? "bg-secondary" : "bg-primary/20 text-primary"}`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`flex-1 overflow-hidden rounded-md p-4 text-sm prose prose-invert max-w-none ${msg.role === "user" ? "bg-secondary/30" : "bg-card border border-border"}`}>
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap m-0">{msg.content}</p>
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          
          {isStreaming && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center mt-1 bg-primary/20 text-primary">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 overflow-hidden rounded-md p-4 text-sm prose prose-invert max-w-none bg-card border border-border">
                <ReactMarkdown>{streamedContent}</ReactMarkdown>
                <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>
      </ScrollArea>
      
      <div className="p-4 bg-card border-t border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <Input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about this spec..."
            className="bg-[#0a0a0a] border-border focus-visible:ring-primary font-mono text-sm h-12"
            disabled={isStreaming}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={!message.trim() || isStreaming} 
            className="shrink-0 h-12 w-12 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
