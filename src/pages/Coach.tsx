import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Send, Sparkles, FileText, Target, TrendingUp, Eye } from "lucide-react";
import { toast } from "sonner";
import { streamChat } from "@/utils/streamUtils";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const quickActions = [
  { label: "Analyze my resume", prompt: "Can you analyze my resume and give me an ATS score with improvement suggestions?", icon: FileText },
  { label: "Find matching jobs", prompt: "What job opportunities match my profile and experience?", icon: Target },
  { label: "Improve my LinkedIn", prompt: "How can I improve my LinkedIn profile to attract more recruiters?", icon: TrendingUp },
  { label: "Skill recommendations", prompt: "What skills should I learn to be more competitive for my target roles?", icon: Sparkles },
];

interface Resume {
  id: string;
  file_name: string;
  created_at: string;
  file_url?: string;
  text_content?: string;
}

export default function Coach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI Career Coach. I'm here to help you land your next great opportunity faster. I can analyze your resume, find matching jobs, improve your LinkedIn profile, and guide your upskilling journey. What would you like to work on today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProfile();
    loadResumes();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      setProfileId(profile?.id || null);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadResumes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("resumes")
        .select("id, file_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setResumes(data || []);
      if (data && data.length > 0) {
        setSelectedResumeId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading resumes:", error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    // If asking about resume analysis and no resume selected, prompt user
    if (textToSend.toLowerCase().includes("resume") && !selectedResumeId && resumes.length > 0) {
      toast.error("Please select a resume first");
      return;
    }

    // Add resume context to the message if available
    let enrichedMessage = textToSend;
    if (selectedResumeId && textToSend.toLowerCase().includes("resume")) {
      enrichedMessage = `${textToSend}\n\n(Using resume ID: ${selectedResumeId})`;
    }

    const userMessage: Message = { role: "user", content: enrichedMessage };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantMessage = "";
    const updateAssistant = (chunk: string) => {
      assistantMessage += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => 
            i === prev.length - 1 ? { ...m, content: assistantMessage } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantMessage }];
      });
    };

    try {
      // Get the user's session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to use the career coach");
        setIsLoading(false);
        return;
      }

      const conversationMessages = [...messages, userMessage];
      
      for await (const _ of streamChat(
        conversationMessages,
        updateAssistant,
        profileId || undefined,
        session.access_token
      )) {
        // Stream is updating through updateAssistant callback
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      if (error.message.includes("429")) {
        toast.error("Rate limit reached. Please wait a moment and try again.");
      } else if (error.message.includes("402")) {
        toast.error("AI credits depleted. Please add credits to continue.");
      } else {
        toast.error("Failed to send message. Please try again.");
      }
      
      // Remove failed assistant message
      setMessages(prev => prev.filter(m => m.content !== ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  const handlePreviewResume = async () => {
    if (!selectedResumeId) return;
    
    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, file_name, file_url, text_content, created_at")
        .eq("id", selectedResumeId)
        .single();

      if (error) throw error;
      
      setPreviewResume(data);
      setPreviewOpen(true);
    } catch (error) {
      console.error("Error loading resume:", error);
      toast.error("Failed to load resume preview");
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)]">
      <Card className="shadow-lg h-full flex flex-col">
        <CardHeader className="border-b bg-gradient-subtle">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">AI Career Coach</CardTitle>
              <p className="text-sm text-muted-foreground">24/7 personalized career guidance</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Resume Selector */}
          {resumes.length > 0 && (
            <div className="p-4 border-b bg-muted/30">
              <p className="text-sm font-medium mb-2">Selected Resume:</p>
              <div className="flex gap-2">
                <select
                  value={selectedResumeId || ""}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                >
                  {resumes.map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.file_name} ({new Date(resume.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewResume}
                  disabled={!selectedResumeId}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="p-4 border-b bg-muted/30">
              <p className="text-sm font-medium mb-3">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="justify-start gap-2 h-auto py-2 text-left"
                      onClick={() => handleQuickAction(action.prompt)}
                      disabled={action.label.includes("resume") && !selectedResumeId}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-xs">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-gradient-primary text-white text-sm">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-4 py-3 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className="bg-secondary text-sm">
                        You
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-gradient-primary text-white text-sm">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-3 bg-muted">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your resume, jobs, skills, or career strategy..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-primary"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Resume Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewResume?.file_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] mt-4">
            {previewResume?.file_url ? (
              <iframe
                src={previewResume.file_url}
                className="w-full h-[800px] border rounded"
                title="Resume Preview"
              />
            ) : previewResume?.text_content ? (
              <div className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {previewResume.text_content}
                </pre>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No preview available
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
