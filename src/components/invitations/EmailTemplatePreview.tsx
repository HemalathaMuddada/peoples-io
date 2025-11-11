import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, Save, RotateCcw, Mail, Code, Bell, UserPlus, MessageSquare, Award } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailTemplate {
  id?: string;
  org_id: string;
  template_type: string;
  subject: string;
  html_content: string;
  variables: string[];
  is_active: boolean;
}

interface TemplateDefinition {
  type: string;
  name: string;
  description: string;
  icon: any;
  defaultSubject: string;
  defaultHtml: string;
  variables: string[];
  previewData: Record<string, string>;
}

const TEMPLATE_LIBRARY: TemplateDefinition[] = [
  {
    type: "company_invitation",
    name: "Company Invitation",
    description: "Invite users to join your organization",
    icon: UserPlus,
    defaultSubject: "You're Invited to Join {{organizationName}}",
    variables: ["organizationName", "inviterName", "role", "inviteLink", "expiresAt"],
    previewData: {
      organizationName: "Acme Corporation",
      inviterName: "John Doe",
      role: "Hiring Manager",
      inviteLink: "https://example.com/accept-invitation?token=abc123",
      expiresAt: "December 31, 2024",
    },
    defaultHtml: `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #6366f1;
      margin-bottom: 10px;
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 20px;
    }
    .content {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 30px;
    }
    .invite-box {
      background-color: #f9fafb;
      border-left: 4px solid #6366f1;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #6366f1;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚀</div>
      <h1 class="title">You're Invited to Join {{organizationName}}</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p><strong>{{inviterName}}</strong> has invited you to join <strong>{{organizationName}}</strong>.</p>
      <div class="invite-box">
        <div><strong>Organization:</strong> {{organizationName}}</div>
        <div><strong>Your Role:</strong> {{role}}</div>
        <div><strong>Invited By:</strong> {{inviterName}}</div>
      </div>
      <div style="text-align: center;">
        <a href="{{inviteLink}}" class="button">Accept Invitation</a>
      </div>
      <p style="font-size: 14px; color: #f59e0b;">⚠️ This invitation expires on {{expiresAt}}</p>
    </div>
    <div class="footer">
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "welcome",
    name: "Welcome Email",
    description: "Welcome new users to the platform",
    icon: Mail,
    defaultSubject: "Welcome to {{platformName}}, {{userName}}!",
    variables: ["platformName", "userName", "loginLink"],
    previewData: {
      platformName: "Career Platform",
      userName: "Jane Smith",
      loginLink: "https://example.com/login",
    },
    defaultHtml: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 48px; margin-bottom: 10px; }
    .title { font-size: 28px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
    .content { font-size: 16px; color: #4b5563; margin-bottom: 30px; }
    .button { display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎉</div>
      <h1 class="title">Welcome to {{platformName}}!</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>We're thrilled to have you join our community! Your account has been successfully created.</p>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Complete your profile</li>
        <li>Upload your resume</li>
        <li>Browse job opportunities</li>
        <li>Connect with mentors</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{loginLink}}" class="button">Get Started</a>
      </div>
      <p>If you have any questions, our support team is here to help!</p>
    </div>
    <div class="footer">
      <p>© 2024 {{platformName}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "reminder",
    name: "Application Reminder",
    description: "Remind users about pending actions",
    icon: Bell,
    defaultSubject: "Reminder: {{actionType}} - {{jobTitle}}",
    variables: ["userName", "actionType", "jobTitle", "company", "dueDate", "actionLink"],
    previewData: {
      userName: "Alex Johnson",
      actionType: "Interview Scheduled",
      jobTitle: "Senior Developer",
      company: "Tech Corp",
      dueDate: "Tomorrow at 2:00 PM",
      actionLink: "https://example.com/interview/123",
    },
    defaultHtml: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .icon { font-size: 48px; margin-bottom: 10px; }
    .title { font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
    .reminder-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">⏰</div>
      <h1 class="title">Reminder: {{actionType}}</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>This is a friendly reminder about your upcoming action:</p>
      <div class="reminder-box">
        <div><strong>Position:</strong> {{jobTitle}}</div>
        <div><strong>Company:</strong> {{company}}</div>
        <div><strong>When:</strong> {{dueDate}}</div>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{actionLink}}" class="button">View Details</a>
      </div>
      <p>Don't forget to prepare and mark your calendar!</p>
    </div>
    <div class="footer">
      <p>© 2024 Career Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "follow_up",
    name: "Follow-Up Email",
    description: "Follow up after applications or interviews",
    icon: MessageSquare,
    defaultSubject: "Following Up: {{jobTitle}} at {{company}}",
    variables: ["userName", "jobTitle", "company", "interviewDate", "nextSteps"],
    previewData: {
      userName: "Sarah Wilson",
      jobTitle: "Product Manager",
      company: "Innovation Labs",
      interviewDate: "Last Monday",
      nextSteps: "We'll review your application and get back to you within 5 business days.",
    },
    defaultHtml: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .icon { font-size: 48px; margin-bottom: 10px; }
    .title { font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
    .info-box { background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">📧</div>
      <h1 class="title">Thank You for Your Interest</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>Thank you for taking the time to interview for the {{jobTitle}} position at {{company}} on {{interviewDate}}.</p>
      <div class="info-box">
        <strong>Next Steps:</strong>
        <p>{{nextSteps}}</p>
      </div>
      <p>We appreciate your interest in joining our team and the effort you put into the interview process.</p>
      <p>If you have any questions in the meantime, please don't hesitate to reach out.</p>
      <p>Best regards,<br>The {{company}} Team</p>
    </div>
    <div class="footer">
      <p>© 2024 Career Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "achievement",
    name: "Achievement Unlocked",
    description: "Celebrate user milestones and achievements",
    icon: Award,
    defaultSubject: "🎉 Achievement Unlocked: {{achievementName}}",
    variables: ["userName", "achievementName", "achievementDescription", "pointsEarned", "dashboardLink"],
    previewData: {
      userName: "Mike Chen",
      achievementName: "Profile Master",
      achievementDescription: "Completed 100% of your profile",
      pointsEarned: "100",
      dashboardLink: "https://example.com/dashboard",
    },
    defaultHtml: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .icon { font-size: 64px; margin-bottom: 10px; }
    .title { font-size: 28px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
    .achievement-box { background-color: #fef3c7; border: 2px solid #f59e0b; padding: 30px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .points { font-size: 32px; font-weight: bold; color: #f59e0b; margin: 10px 0; }
    .button { display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">🏆</div>
      <h1 class="title">Congratulations, {{userName}}!</h1>
    </div>
    <div class="content">
      <div class="achievement-box">
        <h2>{{achievementName}}</h2>
        <p>{{achievementDescription}}</p>
        <div class="points">+{{pointsEarned}} Points</div>
      </div>
      <p>You've reached a new milestone in your career journey. Keep up the great work!</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardLink}}" class="button">View Dashboard</a>
      </div>
      <p>Continue building your profile and unlocking more achievements!</p>
    </div>
    <div class="footer">
      <p>© 2024 Career Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
];

const getTemplateDefinition = (type: string): TemplateDefinition => {
  return TEMPLATE_LIBRARY.find(t => t.type === type) || TEMPLATE_LIBRARY[0];
};

export function EmailTemplatePreview() {
  const [selectedType, setSelectedType] = useState<string>("company_invitation");
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});

  const currentTemplate = getTemplateDefinition(selectedType);

  useEffect(() => {
    fetchTemplate();
  }, [selectedType]);

  useEffect(() => {
    // Initialize with default values when switching templates
    setSubject(currentTemplate.defaultSubject);
    setHtmlContent(currentTemplate.defaultHtml);
    setPreviewData(currentTemplate.previewData);
  }, [selectedType]);

  const fetchTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) return;

      const { data: templateData, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("template_type", selectedType)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (templateData) {
        const currentDef = getTemplateDefinition(selectedType);
        setTemplate({
          ...templateData,
          variables: Array.isArray(templateData.variables) ? templateData.variables as string[] : currentDef.variables,
        });
        setSubject(templateData.subject);
        setHtmlContent(templateData.html_content);
      } else {
        setTemplate(null);
      }
    } catch (error) {
      console.error("Error fetching template:", error);
      toast.error("Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    let preview = htmlContent;
    Object.entries(previewData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, "g"), value);
    });
    return preview;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization found");

      const templateData = {
        org_id: profile.org_id,
        template_type: selectedType,
        subject,
        html_content: htmlContent,
        variables: currentTemplate.variables,
        is_active: true,
        created_by: user.id,
      };

      if (template?.id) {
        const { error } = await supabase
          .from("email_templates")
          .update(templateData)
          .eq("id", template.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_templates")
          .insert([templateData]);

        if (error) throw error;
      }

      toast.success("Template saved successfully!");
      fetchTemplate();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSubject(currentTemplate.defaultSubject);
    setHtmlContent(currentTemplate.defaultHtml);
    setPreviewData(currentTemplate.previewData);
    toast.info("Template reset to default");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading template...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Template Library Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Template Library</CardTitle>
          <CardDescription>
            Select an email template type to customize
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_LIBRARY.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedType === template.type;
              return (
                <Card
                  key={template.type}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "border-primary ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedType(template.type)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Icon className="h-8 w-8 text-primary" />
                      {isSelected && <Badge>Selected</Badge>}
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = currentTemplate.icon;
                  return <Icon className="h-5 w-5" />;
                })()}
                {currentTemplate.name} Template
              </CardTitle>
              <CardDescription>
                Customize the {currentTemplate.name.toLowerCase()} for your organization
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {template && (
                <Badge variant="secondary">Custom Template Active</Badge>
              )}
              {!template && (
                <Badge variant="outline">Using Default Template</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
            />
            <p className="text-sm text-muted-foreground">
              Available variables: {currentTemplate.variables.map(v => `{{${v}}}`).join(", ")}
            </p>
          </div>

          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Edit HTML
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="test">Test Data</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="html">HTML Content</Label>
                <Textarea
                  id="html"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="HTML email template"
                  className="font-mono text-sm min-h-[400px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Email Preview</CardTitle>
                  <CardDescription>
                    Subject: {subject.replace(/{{(\w+)}}/g, (_, key) => previewData[key as keyof typeof previewData] || `{{${key}}}`)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="border rounded-lg p-4 bg-white"
                    dangerouslySetInnerHTML={{ __html: renderPreview() }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Customize the preview data to see how the email will look with different values
              </p>
              <div className="grid gap-4">
                {currentTemplate.variables.map((variable) => (
                  <div key={variable} className="space-y-2">
                    <Label>{variable.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Label>
                    <Input
                      value={previewData[variable] || ""}
                      onChange={(e) => setPreviewData({ ...previewData, [variable]: e.target.value })}
                      placeholder={`Enter ${variable}`}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Template"}
            </Button>
            <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Full Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Full Email Preview</DialogTitle>
                  <DialogDescription>
                    This is how your invitation email will appear to recipients
                  </DialogDescription>
                </DialogHeader>
                <div 
                  className="bg-white p-6 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: renderPreview() }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
