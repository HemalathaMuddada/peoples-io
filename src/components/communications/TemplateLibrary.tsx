import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Eye, Copy, Star, Sparkles } from "lucide-react";

interface TemplatePreset {
  name: string;
  subject: string;
  body: string;
  category: string;
  description: string;
  variables: string[];
}

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    name: "Interview Invitation - Phone Screen",
    category: "interview_invite",
    description: "Professional phone screening invitation",
    subject: "Interview Opportunity - {{job_title}} at {{company}}",
    body: `Dear {{candidate_name}},

Thank you for your interest in the {{job_title}} position at {{company}}. We were impressed by your background and experience, and we'd like to invite you for an initial phone screening.

Interview Details:
• Date: [Please suggest 2-3 options]
• Duration: 30 minutes
• Format: Phone/Video Call
• Interviewer: [Name, Title]

During this conversation, we'll discuss your experience, the role requirements, and answer any questions you may have about the position and our company.

Please reply with your availability for the coming week, and we'll send you a calendar invitation.

We look forward to speaking with you!

Best regards,
{{recruiter_name}}
{{company}}`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
  {
    name: "Interview Invitation - On-Site",
    category: "interview_invite",
    description: "Formal on-site interview invitation",
    subject: "On-Site Interview - {{job_title}} at {{company}}",
    body: `Dear {{candidate_name}},

We're excited to invite you to an on-site interview for the {{job_title}} position at {{company}}.

Interview Details:
• Date & Time: [Specific date and time]
• Location: {{company}} Office
  [Full address]
• Duration: 2-3 hours
• Dress Code: Business Casual

Your Interview Schedule:
1. [Time] - [Interviewer 1, Title] - Technical Discussion
2. [Time] - [Interviewer 2, Title] - Behavioral Interview
3. [Time] - [Interviewer 3, Title] - Team Culture Fit
4. [Time] - Office Tour & Q&A

What to Bring:
• Valid photo ID
• Portfolio/work samples (if applicable)
• Any questions you have for us

Parking information and building access details will be sent in a follow-up email.

If you need to reschedule or have any questions, please don't hesitate to reach out.

We're looking forward to meeting you!

Best regards,
{{recruiter_name}}
{{company}}`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
  {
    name: "Application Received",
    category: "screening",
    description: "Acknowledgment of application receipt",
    subject: "Application Received - {{job_title}} at {{company}}",
    body: `Dear {{candidate_name}},

Thank you for applying for the {{job_title}} position at {{company}}. We've received your application and wanted to confirm that it's under review.

What Happens Next:
Our recruitment team is carefully reviewing all applications. If your qualifications match our needs, we'll reach out within 5-7 business days to schedule an initial conversation.

In the Meantime:
• Learn more about {{company}}: [Company website/careers page]
• Connect with us on LinkedIn: [LinkedIn link]
• Check out our recent blog posts: [Blog link]

We appreciate your interest in joining our team and will be in touch soon.

Best regards,
{{recruiter_name}}
{{company}} Recruitment Team`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
  {
    name: "Rejection - Not Moving Forward",
    category: "rejection",
    description: "Professional rejection after initial review",
    subject: "Update on Your Application - {{job_title}}",
    body: `Dear {{candidate_name}},

Thank you for taking the time to apply for the {{job_title}} position at {{company}} and for your interest in our organization.

After careful consideration of your application, we've decided to move forward with other candidates whose experience more closely aligns with the specific requirements of this role.

This decision doesn't reflect on your qualifications or potential. We encourage you to:
• Keep an eye on our careers page for future opportunities
• Stay connected with us on LinkedIn
• Apply for other roles that match your skills and interests

We truly appreciate the time you invested in your application and wish you the very best in your job search.

Best regards,
{{recruiter_name}}
{{company}}`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
  {
    name: "Rejection - After Interview",
    category: "rejection",
    description: "Thoughtful rejection after interview process",
    subject: "Following Up on Your Interview - {{job_title}}",
    body: `Dear {{candidate_name}},

Thank you for taking the time to interview for the {{job_title}} position at {{company}}. It was a pleasure getting to know you and learning more about your experience and career goals.

After thoughtful consideration and discussion with our team, we've decided to move forward with another candidate whose background more closely aligns with the specific needs of this particular role at this time.

This was not an easy decision. We were genuinely impressed by [specific positive aspect of their interview/background]. Your skills in [specific area] stood out, and we encourage you to stay in touch.

We'd love to:
• Keep your resume on file for future opportunities
• Connect with you on LinkedIn
• Consider you for other roles that may be a better fit

Thank you again for your interest in {{company}} and for the time you invested in our interview process. We wish you continued success in your career.

Best regards,
{{recruiter_name}}
{{company}}`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
  {
    name: "Offer Extended",
    category: "offer",
    description: "Job offer notification",
    subject: "Job Offer - {{job_title}} at {{company}}",
    body: `Dear {{candidate_name}},

We're thrilled to extend an offer for the {{job_title}} position at {{company}}!

After meeting with you and discussing your background, we're confident that you'll be a great addition to our team.

Offer Details:
• Position: {{job_title}}
• Department: [Department Name]
• Start Date: [Proposed Date]
• Reporting To: [Manager Name]

Compensation & Benefits:
• Annual Salary: $[Amount]
• Signing Bonus: $[Amount if applicable]
• Equity/Stock Options: [Details if applicable]
• Benefits Package: [Health, dental, vision, 401k, etc.]
• PTO: [Days] per year

Next Steps:
1. Review the attached formal offer letter
2. Schedule a call with our HR team for any questions
3. Provide your decision by [Date]

We're excited about the possibility of you joining our team and contributing to our mission. Please don't hesitate to reach out with any questions.

Congratulations!

Best regards,
{{recruiter_name}}
{{company}}`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
  {
    name: "Follow-Up After Application",
    category: "follow_up",
    description: "Checking in after application submission",
    subject: "Checking In - {{job_title}} Application",
    body: `Dear {{candidate_name}},

I wanted to personally reach out regarding your application for the {{job_title}} position at {{company}}.

We've reviewed your resume and are interested in learning more about your experience, particularly in [specific area of interest from their background].

Current Status:
Your application is progressing through our review process. I wanted to give you an update and see if you have any questions about the role or {{company}}.

Next Steps:
We're planning to schedule initial interviews within the next week. I'll be reaching out soon to coordinate timing if we move forward.

If your availability has changed or if you have any questions in the meantime, please feel free to reply to this email.

Thank you for your patience and continued interest in {{company}}.

Best regards,
{{recruiter_name}}
{{company}}`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
  {
    name: "Follow-Up After Interview",
    category: "follow_up",
    description: "Status update after interview",
    subject: "Thank You & Next Steps - {{job_title}} Interview",
    body: `Dear {{candidate_name}},

Thank you again for taking the time to interview for the {{job_title}} position yesterday. It was great to discuss your experience and learn more about your career goals.

Our team was impressed by [specific positive aspect discussed in the interview]. Your insights on [specific topic] particularly resonated with us.

Next Steps:
• Our team is currently reviewing all interviews
• We expect to make a decision by [Date]
• We'll reach out by [Date] with an update, regardless of the outcome

If you have any additional questions or want to provide any supplementary information, please don't hesitate to reach out.

Thank you for your continued interest in {{company}}.

Best regards,
{{recruiter_name}}
{{company}}`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
  {
    name: "Schedule Change Request",
    category: "general",
    description: "Requesting to reschedule interview",
    subject: "Interview Rescheduling - {{job_title}}",
    body: `Dear {{candidate_name}},

I hope this email finds you well. I need to reach out regarding your scheduled interview for the {{job_title}} position on [original date/time].

Unfortunately, due to [brief reason - interviewer conflict/emergency], we need to reschedule your interview.

Alternative Options:
Please let me know your availability for any of the following times:
• [Option 1: Date & Time]
• [Option 2: Date & Time]
• [Option 3: Date & Time]

We sincerely apologize for any inconvenience this may cause and truly appreciate your flexibility and understanding.

If none of these times work, please suggest 2-3 times that work best for you, and we'll do our best to accommodate.

Thank you for your patience, and we look forward to speaking with you soon.

Best regards,
{{recruiter_name}}
{{company}}`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
  {
    name: "Reference Check Request",
    category: "screening",
    description: "Professional reference verification",
    subject: "Reference Check - {{candidate_name}}",
    body: `Dear {{candidate_name}},

As we move forward in the interview process for the {{job_title}} position, we'd like to conduct reference checks as part of our standard hiring procedure.

What We Need:
Please provide 3 professional references who can speak to your:
• Work performance and accomplishments
• Technical skills and capabilities
• Team collaboration and communication
• Overall professional character

For Each Reference, Please Include:
• Full Name
• Job Title
• Company
• Relationship to you (e.g., "Former Manager", "Colleague")
• Email address
• Phone number
• Dates you worked together

Timeline:
We'd appreciate receiving this information by [Date]. This will help us move your application forward efficiently.

Confidentiality:
We'll reach out to references only after confirming with you, and we'll handle all information with discretion.

Please reply to this email with your reference information. If you have any questions, don't hesitate to ask.

Thank you!

Best regards,
{{recruiter_name}}
{{company}}`,
    variables: ["candidate_name", "job_title", "company", "recruiter_name"],
  },
];

interface TemplateLibraryProps {
  onSelectTemplate: (template: { name: string; subject: string; body: string; category: string }) => void;
}

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewTemplate, setPreviewTemplate] = useState<TemplatePreset | null>(null);
  const { toast } = useToast();

  const categories = [
    { value: "all", label: "All Templates", count: TEMPLATE_PRESETS.length },
    { value: "interview_invite", label: "Interview Invites", count: TEMPLATE_PRESETS.filter(t => t.category === "interview_invite").length },
    { value: "screening", label: "Screening", count: TEMPLATE_PRESETS.filter(t => t.category === "screening").length },
    { value: "rejection", label: "Rejections", count: TEMPLATE_PRESETS.filter(t => t.category === "rejection").length },
    { value: "offer", label: "Offers", count: TEMPLATE_PRESETS.filter(t => t.category === "offer").length },
    { value: "follow_up", label: "Follow-ups", count: TEMPLATE_PRESETS.filter(t => t.category === "follow_up").length },
    { value: "general", label: "General", count: TEMPLATE_PRESETS.filter(t => t.category === "general").length },
  ];

  const filteredTemplates = TEMPLATE_PRESETS.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = async (template: TemplatePreset) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Save to user's templates
      const { error } = await supabase.from("message_templates").insert({
        name: template.name,
        subject: template.subject,
        body: template.body,
        category: template.category,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Template Added",
        description: "Template has been added to your templates",
      });

      // Also pass to parent for immediate use
      onSelectTemplate({
        name: template.name,
        subject: template.subject,
        body: template.body,
        category: template.category,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      interview_invite: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      rejection: "bg-red-500/10 text-red-600 dark:text-red-400",
      offer: "bg-green-500/10 text-green-600 dark:text-green-400",
      follow_up: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
      screening: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      general: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-5 w-5" />
        <h3 className="font-semibold">Professional Template Library</h3>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-7">
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="relative">
              {cat.label}
              <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                {cat.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Templates Grid */}
      <ScrollArea className="h-[600px]">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.name} className="p-4 space-y-3 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getCategoryBadgeColor(template.category)}>
                      {template.category.replace("_", " ")}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-sm">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.description}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs">
                  <p className="font-medium text-muted-foreground">Subject:</p>
                  <p className="truncate">{template.subject}</p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>{previewTemplate?.name}</DialogTitle>
                    </DialogHeader>
                    {previewTemplate && (
                      <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-4 pr-4">
                          <div>
                            <Badge className={getCategoryBadgeColor(previewTemplate.category)}>
                              {previewTemplate.category.replace("_", " ")}
                            </Badge>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium mb-2">Subject:</p>
                            <p className="text-sm p-3 bg-muted rounded">{previewTemplate.subject}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Body:</p>
                            <div className="text-sm p-4 bg-muted rounded whitespace-pre-wrap">
                              {previewTemplate.body}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Available Variables:</p>
                            <div className="flex flex-wrap gap-2">
                              {previewTemplate.variables.map((variable) => (
                                <Badge key={variable} variant="secondary">
                                  {`{{${variable}}}`}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <Button
                            onClick={() => {
                              handleUseTemplate(previewTemplate);
                              setPreviewTemplate(null);
                            }}
                            className="w-full"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Use This Template
                          </Button>
                        </div>
                      </ScrollArea>
                    )}
                  </DialogContent>
                </Dialog>

                <Button
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Use
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No templates found matching your search</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
