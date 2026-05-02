import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Trash2, Plus, MessageSquare } from "lucide-react";
import { 
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  useGetAnthropicConversation,
  useDeleteAnthropicConversation,
  useSendAnthropicMessage
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListAnthropicConversationsQueryKey, getGetAnthropicConversationQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

export function AIChat() {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useListAnthropicConversations();
  const { data: activeConversation } = useGetAnthropicConversation(activeConvId!, {
    query: { enabled: !!activeConvId }
  });

  const createConv = useCreateAnthropicConversation();
  const deleteConv = useDeleteAnthropicConversation();
  const sendMessage = useSendAnthropicMessage();

  const handleCreateNew = async () => {
    const conv = await createConv.mutateAsync({
      data: { title: "New Conversation" }
    });
    queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
    setActiveConvId(conv.id);
  };

  const handleDelete = async (id: number) => {
    await deleteConv.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
    if (activeConvId === id) setActiveConvId(null);
  };

  const handleSend = async () => {
    if (!message.trim() || !activeConvId) return;

    const content = message;
    setMessage("");

    // Optimistically update UI
    const tempMessage = { id: Date.now(), role: "user", content, createdAt: new Date().toISOString() };
    queryClient.setQueryData(getGetAnthropicConversationQueryKey(activeConvId), (old: any) => {
      if (!old) return old;
      return { ...old, messages: [...old.messages, tempMessage] };
    });

    try {
      await sendMessage.mutateAsync({
        data: { content }
      });
      queryClient.invalidateQueries({ queryKey: getGetAnthropicConversationQueryKey(activeConvId) });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConversation?.messages]);

  return (
    <div className="flex h-full border border-border rounded-md overflow-hidden bg-card text-card-foreground">
      <div className="w-1/3 border-r border-border flex flex-col bg-background/50">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-mono text-sm font-bold flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" /> Assistant
          </h3>
          <Button variant="ghost" size="icon" onClick={handleCreateNew} className="h-7 w-7 text-muted-foreground hover:text-primary">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations?.map(conv => (
              <div 
                key={conv.id}
                className={`flex items-center justify-between p-2 rounded cursor-pointer group text-sm transition-colors ${activeConvId === conv.id ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"}`}
                onClick={() => setActiveConvId(conv.id)}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {conversations?.length === 0 && (
              <div className="text-center p-4 text-xs text-muted-foreground">
                No active sessions
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col bg-[#0a0a0a]">
        {activeConvId ? (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {activeConversation?.messages?.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-secondary" : "bg-primary/20 text-primary"}`}>
                      {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] rounded-md p-3 text-sm prose prose-invert prose-sm ${msg.role === "user" ? "bg-secondary/50" : "bg-card border border-border"}`}>
                      {msg.role === "user" ? msg.content : (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
            <div className="p-3 bg-card border-t border-border">
              <div className="flex items-center gap-2">
                <Input 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask a question..."
                  className="bg-background border-border focus-visible:ring-primary font-mono text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button size="icon" onClick={handleSend} disabled={sendMessage.isPending || !message.trim()} className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3">
            <Bot className="w-8 h-8 opacity-20" />
            <span className="font-mono text-sm">Select or create a conversation</span>
          </div>
        )}
      </div>
    </div>
  );
}