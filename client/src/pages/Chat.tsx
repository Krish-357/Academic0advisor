import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadChatHistory(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const formattedMessages = (data || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.created_at,
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('chat-orchestrator', {
        body: {
          message: input,
          chatHistory,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: data.timestamp,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Chat error",
        description: error.message || "Failed to send message",
      });
      
      // Remove the user message if request failed
      setMessages(prev => prev.filter(m => m !== userMessage));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Card className="h-[calc(100vh-12rem)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" />
              AI Guidance System
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Chat with our multi-agent AI system for personalized academic and career guidance
            </p>
          </CardHeader>
          <CardContent className="flex flex-col h-[calc(100%-8rem)]">
            <ScrollArea className="flex-1 pr-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Ask about course recommendations, career paths, study strategies, or anything related to your academic journey
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6 w-full max-w-2xl">
                    {[
                      "What courses should I take next semester?",
                      "Help me choose a major",
                      "What career paths match my interests?",
                      "Analyze my academic performance",
                    ].map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        className="text-left justify-start h-auto py-3"
                        onClick={() => setInput(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={message.role === 'user' ? 'bg-secondary' : 'bg-primary'}>
                          {message.role === 'user' ? (
                            <User className="h-4 w-4 text-white" />
                          ) : (
                            <Bot className="h-4 w-4 text-white" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`flex-1 rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-secondary text-white ml-12'
                            : 'bg-muted mr-12'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary">
                          <Bot className="h-4 w-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 rounded-lg p-3 bg-muted mr-12">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>

            <form onSubmit={sendMessage} className="flex gap-2 mt-4 pt-4 border-t">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your academic journey..."
                disabled={loading}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
