import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Mail, Users, Eye, Send, Search, Clock, Calendar as CalendarIcon, Lightbulb } from "lucide-react";
import { format, addDays, addHours, setHours, setMinutes } from "date-fns";
import { appendSignatureToBody } from "@/utils/emailSignature";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

interface Candidate {
  id: string;
  email: string;
  full_name: string;
  current_title?: string;
  location?: string;
  job_title?: string;
  company?: string;
}

interface BulkEmailSenderProps {
  templates: Template[];
}

export function BulkEmailSender({ templates }: BulkEmailSenderProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [previewCandidate, setPreviewCandidate] = useState<Candidate | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [showOptimalTime, setShowOptimalTime] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCandidates();
  }, [statusFilter]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name
        `)
        .not("email", "is", null)
        .order("full_name", { ascending: true });

      // Also get candidates with applications
      const { data: profileData, error: profileError } = await query;
      
      if (profileError) throw profileError;

      // Enhance with application data if available
      const { data: appData } = await supabase
        .from("job_applications")
        .select(`
          profile_id,
          job_title,
          company,
          status
        `)
        .in("profile_id", profileData?.map(p => {
          const profile = p as any;
          return profile.id;
        }) || []);

      const candidatesWithApps = profileData?.map((profile: any) => {
        const app = appData?.find((a: any) => a.profile_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || "Unknown",
          job_title: app?.job_title,
          company: app?.company,
        };
      });

      setCandidates(candidatesWithApps || []);
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

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setSubject(template.subject);
      setBody(template.body);
    }
  };

  const toggleCandidate = (candidateId: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(candidateId)) {
      newSelected.delete(candidateId);
    } else {
      newSelected.add(candidateId);
    }
    setSelectedCandidates(newSelected);
  };

  const toggleAll = () => {
    if (selectedCandidates.size === filteredCandidates.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(filteredCandidates.map((c) => c.id)));
    }
  };

  const replaceVariables = (text: string, candidate: Candidate): string => {
    return text
      .replace(/\{\{candidate_name\}\}/g, candidate.full_name)
      .replace(/\{\{email\}\}/g, candidate.email)
      .replace(/\{\{job_title\}\}/g, candidate.job_title || "[Job Title]")
      .replace(/\{\{company\}\}/g, candidate.company || "[Company]")
      .replace(/\{\{location\}\}/g, candidate.location || "[Location]")
      .replace(/\{\{current_title\}\}/g, candidate.current_title || "[Current Title]");
  };

  const handlePreview = (candidate: Candidate) => {
    setPreviewCandidate(candidate);
    setShowPreview(true);
  };

  const handleBulkSend = async () => {
    if (selectedCandidates.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one candidate",
        variant: "destructive",
      });
      return;
    }

    if (!subject || !body) {
      toast({
        title: "Error",
        description: "Please provide subject and body",
        variant: "destructive",
      });
      return;
    }

    const selectedCandidatesList = candidates.filter((c) =>
      selectedCandidates.has(c.id)
    );

    // If scheduling is enabled, save to scheduled_emails table
    if (scheduleMode && scheduledDate) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Combine date and time
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduledFor = setMinutes(setHours(scheduledDate, hours), minutes);

        // Prepare personalized recipients
        const recipients = selectedCandidatesList.map((candidate) => ({
          id: candidate.id,
          email: candidate.email,
          name: candidate.full_name,
          personalized_subject: replaceVariables(subject, candidate),
          personalized_body: replaceVariables(body, candidate),
        }));

        // Append signature to the first recipient to save it (will be applied to all)
        const bodyWithSignature = await appendSignatureToBody(body);

        const { error } = await supabase.from("scheduled_emails").insert({
          created_by: user?.id,
          template_id: selectedTemplate?.id,
          subject,
          body: bodyWithSignature,
          recipients,
          scheduled_for: scheduledFor.toISOString(),
          total_count: recipients.length,
        });

        if (error) throw error;

        toast({
          title: "Email Scheduled",
          description: `Email scheduled for ${format(scheduledFor, "PPp")} to ${recipients.length} recipients`,
        });

        // Reset form
        setSelectedCandidates(new Set());
        setSubject("");
        setBody("");
        setSelectedTemplate(null);
        setScheduleMode(false);
        setScheduledDate(undefined);
        return;
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    // Immediate send
    setSending(true);
    setProgress(0);

    const total = selectedCandidatesList.length;
    let sent = 0;
    let failed = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const candidate of selectedCandidatesList) {
        try {
          const personalizedSubject = replaceVariables(subject, candidate);
          const personalizedBody = replaceVariables(body, candidate);
          
          // Append signature
          const bodyWithSignature = await appendSignatureToBody(personalizedBody);

          // Log to database
          const { error: dbError } = await supabase
            .from("candidate_communications")
            .insert({
              recipient_email: candidate.email,
              subject: personalizedSubject,
              body: bodyWithSignature,
              sent_by: user?.id,
              template_id: selectedTemplate?.id,
            });

          if (dbError) throw dbError;

          // Send via SendGrid
          const { error: emailError } = await supabase.functions.invoke(
            "send-communication-email",
            {
              body: {
                to: candidate.email,
                subject: personalizedSubject,
                body: bodyWithSignature,
              },
            }
          );

          if (emailError) {
            console.error("Email error:", emailError);
            failed++;
          } else {
            sent++;
          }
        } catch (error) {
          console.error(`Failed to send to ${candidate.email}:`, error);
          failed++;
        }

        setProgress(Math.round(((sent + failed) / total) * 100));
        
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      toast({
        title: "Bulk Send Complete",
        description: `Successfully sent ${sent} emails. ${failed > 0 ? `${failed} failed.` : ""}`,
      });

      // Reset form
      setSelectedCandidates(new Set());
      setSubject("");
      setBody("");
      setSelectedTemplate(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
      setProgress(0);
    }
  };

  const getOptimalSendTime = () => {
    // Based on email engagement research:
    // - Tuesday-Thursday are best days
    // - 9-11 AM and 2-3 PM are optimal times
    const now = new Date();
    let optimalDate = addDays(now, 1);
    
    // If it's Friday, Saturday, or Sunday, suggest Monday
    const dayOfWeek = optimalDate.getDay();
    if (dayOfWeek === 5) optimalDate = addDays(optimalDate, 3); // Friday -> Monday
    if (dayOfWeek === 6) optimalDate = addDays(optimalDate, 2); // Saturday -> Monday
    if (dayOfWeek === 0) optimalDate = addDays(optimalDate, 1); // Sunday -> Monday
    
    return {
      date: optimalDate,
      time: "09:00",
      reason: "Tuesday-Thursday at 9-11 AM typically has the highest engagement rates",
    };
  };

  const applyOptimalTime = () => {
    const optimal = getOptimalSendTime();
    setScheduledDate(optimal.date);
    setScheduledTime(optimal.time);
    setShowOptimalTime(false);
    toast({
      title: "Optimal Time Applied",
      description: optimal.reason,
    });
  };

  const filteredCandidates = candidates.filter(
    (c) =>
      c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Template & Message */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <h3 className="font-semibold">Email Content</h3>
          </div>

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
            <Label htmlFor="bulk-subject">Subject</Label>
            <Input
              id="bulk-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-body">Message</Label>
            <Textarea
              id="bulk-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body"
              rows={12}
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Available variables:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{"{{candidate_name}}"}</Badge>
                <Badge variant="outline">{"{{email}}"}</Badge>
                <Badge variant="outline">{"{{job_title}}"}</Badge>
                <Badge variant="outline">{"{{company}}"}</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Right: Recipient Selection */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <h3 className="font-semibold">Recipients</h3>
            </div>
            <Badge variant="secondary">
              {selectedCandidates.size} selected
            </Badge>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pb-2 border-b">
            <Checkbox
              checked={
                selectedCandidates.size === filteredCandidates.length &&
                filteredCandidates.length > 0
              }
              onCheckedChange={toggleAll}
            />
            <Label className="cursor-pointer" onClick={toggleAll}>
              Select All ({filteredCandidates.length})
            </Label>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading candidates...</p>
              ) : filteredCandidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No candidates found</p>
              ) : (
                filteredCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Checkbox
                        checked={selectedCandidates.has(candidate.id)}
                        onCheckedChange={() => toggleCandidate(candidate.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {candidate.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {candidate.email}
                        </p>
                        {candidate.job_title && (
                          <p className="text-xs text-muted-foreground">
                            {candidate.job_title}
                            {candidate.company && ` at ${candidate.company}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePreview(candidate)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Send Button */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="schedule-mode"
                  checked={scheduleMode}
                  onCheckedChange={(checked) => setScheduleMode(checked as boolean)}
                />
                <Label htmlFor="schedule-mode" className="cursor-pointer">
                  Schedule for later
                </Label>
              </div>
            </div>
            <Button
              onClick={handleBulkSend}
              disabled={sending || selectedCandidates.size === 0 || (scheduleMode && !scheduledDate)}
              size="lg"
            >
              {scheduleMode ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Email
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? `Sending... ${progress}%` : "Send Now"}
                </>
              )}
            </Button>
          </div>

          {scheduleMode && (
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Scheduled Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1 space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setShowOptimalTime(true)}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Suggest Optimal Time
              </Button>
            </div>
          )}

          {sending && (
            <Progress value={progress} className="mt-2" />
          )}
        </div>
      </Card>

      {/* Optimal Time Suggestion Dialog */}
      <Dialog open={showOptimalTime} onOpenChange={setShowOptimalTime}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Optimal Send Time Suggestion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Recommended Time</p>
                  <p className="text-2xl font-bold text-primary my-2">
                    {format(getOptimalSendTime().date, "EEEE, MMMM d")} at {getOptimalSendTime().time}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getOptimalSendTime().reason}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowOptimalTime(false)}>
                Cancel
              </Button>
              <Button onClick={applyOptimalTime}>
                Apply Suggestion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview - {previewCandidate?.full_name}</DialogTitle>
          </DialogHeader>
          {previewCandidate && (
            <div className="space-y-4">
              <div>
                <Label>To:</Label>
                <p className="text-sm">{previewCandidate.email}</p>
              </div>
              <div>
                <Label>Subject:</Label>
                <p className="text-sm font-medium">
                  {replaceVariables(subject, previewCandidate)}
                </p>
              </div>
              <div>
                <Label>Body:</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                  {replaceVariables(body, previewCandidate)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
