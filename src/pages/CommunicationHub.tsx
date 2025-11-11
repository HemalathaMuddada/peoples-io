import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Send, History, FileText, Plus, Edit, Trash2, Copy, Activity, Users, Clock, Sparkles, Pen } from "lucide-react";
import { ActivityTimeline } from "@/components/recruiter/ActivityTimeline";
import { BulkEmailSender } from "@/components/communications/BulkEmailSender";
import { ScheduledEmailsList } from "@/components/communications/ScheduledEmailsList";
import { TemplateLibrary } from "@/components/communications/TemplateLibrary";
import { SignatureBuilder } from "@/components/communications/SignatureBuilder";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { appendSignatureToBody } from "@/utils/emailSignature";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

interface Communication {
  id: string;
  recipient_email: string;
  subject: string;
  body: string;
  sent_at: string;
  template_id?: string;
  message_templates?: Template;
}

export default function CommunicationHub() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [templateCategory, setTemplateCategory] = useState("general");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
    fetchCommunications();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunications = async () => {
    try {
      const { data, error } = await supabase
        .from("candidate_communications")
        .select("*, message_templates(*)")
        .order("sent_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCommunications(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !subject || !body) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Append signature to body
      const bodyWithSignature = await appendSignatureToBody(body);
      
      const { data, error } = await supabase
        .from("candidate_communications")
        .insert({
          recipient_email: recipientEmail,
          subject,
          body: bodyWithSignature,
          sent_by: user?.id,
          template_id: selectedTemplate?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email via SendGrid
      const { error: emailError } = await supabase.functions.invoke("send-communication-email", {
        body: {
          to: recipientEmail,
          subject,
          body: bodyWithSignature,
        },
      });

      if (emailError) {
        console.error("Email sending error:", emailError);
        toast({
          title: "Partial Success",
          description: "Communication logged but email failed to send. Check console for details.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Email sent successfully via SendGrid",
        });
      }

      setRecipientEmail("");
      setSubject("");
      setBody("");
      setSelectedTemplate(null);
      fetchCommunications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName || !templateSubject || !templateBody) {
      toast({
        title: "Error",
        description: "Please fill in all template fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("message_templates").insert({
        name: templateName,
        subject: templateSubject,
        body: templateBody,
        category: templateCategory,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template created successfully",
      });

      setTemplateName("");
      setTemplateSubject("");
      setTemplateBody("");
      setTemplateCategory("general");
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const { error } = await supabase
        .from("message_templates")
        .update({
          name: templateName,
          subject: templateSubject,
          body: templateBody,
          category: templateCategory,
        })
        .eq("id", editingTemplate.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template updated successfully",
      });

      setEditingTemplate(null);
      setTemplateName("");
      setTemplateSubject("");
      setTemplateBody("");
      setTemplateCategory("general");
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("message_templates")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyToCompose = (template: Template) => {
    setSelectedTemplate(template);
    setSubject(template.subject);
    setBody(template.body);
  };

  const handleSelectFromLibrary = (template: { name: string; subject: string; body: string; category: string }) => {
    setSubject(template.subject);
    setBody(template.body);
    fetchTemplates(); // Refresh templates list
    toast({
      title: "Template Selected",
      description: "You can now customize and send this email",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      interview_invite: "bg-blue-500",
      rejection: "bg-red-500",
      offer: "bg-green-500",
      follow_up: "bg-yellow-500",
      screening: "bg-purple-500",
      general: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Communication Hub
        </h1>
        <p className="text-muted-foreground">
          Send templated emails to candidates and track communications
        </p>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="compose">
            <Send className="h-4 w-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Users className="h-4 w-4 mr-2" />
            Bulk Email
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Clock className="h-4 w-4 mr-2" />
            Scheduled
          </TabsTrigger>
          <TabsTrigger value="library">
            <Sparkles className="h-4 w-4 mr-2" />
            Library
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            My Templates
          </TabsTrigger>
          <TabsTrigger value="signatures">
            <Pen className="h-4 w-4 mr-2" />
            Signatures
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Activity className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Select Template (Optional)</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                id="recipient"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="candidate@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email body"
                rows={10}
              />
              <p className="text-sm text-muted-foreground">
                Use placeholders like {`{{candidate_name}}`}, {`{{job_title}}`}, etc.
              </p>
            </div>

            <Button onClick={handleSendEmail} disabled={sending} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending..." : "Send Email"}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <BulkEmailSender templates={templates} />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <ScheduledEmailsList />
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <TemplateLibrary onSelectTemplate={handleSelectFromLibrary} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Create Template"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Interview Invitation"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-category">Category</Label>
                  <Select value={templateCategory} onValueChange={setTemplateCategory}>
                    <SelectTrigger id="template-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interview_invite">Interview Invite</SelectItem>
                      <SelectItem value="rejection">Rejection</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="follow_up">Follow-Up</SelectItem>
                      <SelectItem value="screening">Screening</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-subject">Subject</Label>
                  <Input
                    id="template-subject"
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    placeholder="Email subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-body">Body</Label>
                  <Textarea
                    id="template-body"
                    value={templateBody}
                    onChange={(e) => setTemplateBody(e.target.value)}
                    placeholder="Email body with {{placeholders}}"
                    rows={10}
                  />
                </div>

                <Button
                  onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  className="w-full"
                >
                  {editingTemplate ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{template.name}</h3>
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToCompose(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingTemplate(template);
                        setTemplateName(template.name);
                        setTemplateSubject(template.subject);
                        setTemplateBody(template.body);
                        setTemplateCategory(template.category);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-muted-foreground">Subject:</p>
                  <p>{template.subject}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-muted-foreground">Preview:</p>
                  <p className="line-clamp-2 text-muted-foreground">{template.body}</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="signatures" className="space-y-4">
          <SignatureBuilder />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="space-y-4">
            {communications.map((comm) => (
              <Card key={comm.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{comm.recipient_email}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(comm.sent_at), "PPp")}
                    </span>
                  </div>
                  {comm.message_templates && (
                    <Badge className={getCategoryColor(comm.message_templates.category)}>
                      {comm.message_templates.name}
                    </Badge>
                  )}
                  <div>
                    <p className="font-medium">{comm.subject}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {comm.body}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <ActivityTimeline />
        </TabsContent>
      </Tabs>
    </div>
  );
}
