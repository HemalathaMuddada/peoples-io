import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Briefcase, MapPin, Calendar, Mail, Phone, Eye, User, Clock, CalendarPlus, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { InterviewFeedbackDialog } from "@/components/interviews/InterviewFeedbackDialog";
import { InterviewFeedbackView } from "@/components/interviews/InterviewFeedbackView";

interface Interview {
  id: string;
  interview_type: string;
  scheduled_at: string;
  location: string | null;
  meeting_link: string | null;
  status: string;
  interviewer_name: string | null;
  interview_feedback: any[];
}

interface Application {
  id: string;
  profile_id: string;
  job_id: string;
  status: string;
  applied_at: string;
  notes: string | null;
  interviews: Interview[];
  job_postings: {
    title: string;
    company: string;
    location: string;
  };
  candidate_profiles: {
    user_id: string;
    current_title: string;
    headline: string;
    location: string;
    years_experience: number;
  };
}

const statusOptions = [
  { value: "applied", label: "Applied", variant: "secondary" as const },
  { value: "planned", label: "Screening", variant: "default" as const },
  { value: "interview", label: "Interview", variant: "default" as const },
  { value: "offer", label: "Offer", variant: "default" as const },
  { value: "rejected", label: "Rejected", variant: "outline" as const },
];

export default function RecruiterApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<"applied" | "planned" | "interview" | "offer" | "rejected" | "">("");
  const [statusNotes, setStatusNotes] = useState("");
  const [showInterviewDialog, setShowInterviewDialog] = useState(false);
  const [interviewData, setInterviewData] = useState({
    type: "phone",
    date: "",
    time: "",
    location: "",
    interviewerName: "",
    interviewerEmail: "",
    notes: ""
  });
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [expandedApplications, setExpandedApplications] = useState<Set<string>>(new Set());
  const [currentOrgId, setCurrentOrgId] = useState<string>("");

  useEffect(() => {
    checkRecruiterAndLoadApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [searchTerm, statusFilter, applications]);

  const checkRecruiterAndLoadApplications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, org_id')
        .eq('user_id', user.id);

      const hasRecruiterRole = roles?.some(r => r.role === 'recruiter');
      
      if (!hasRecruiterRole) {
        navigate("/dashboard");
        return;
      }

      const companyOrgId = roles?.find(r => r.role === 'recruiter')?.org_id;
      if (!companyOrgId) {
        toast.error("No company organization found");
        return;
      }

      await loadApplications(companyOrgId);
      setCurrentOrgId(companyOrgId);
    } catch (error) {
      console.error("Error checking role:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async (companyOrgId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("job_applications")
        .select(`
          id,
          profile_id,
          job_id,
          status,
          applied_at,
          notes,
          job_postings!inner(
            title,
            company,
            location,
            org_id
          ),
          candidate_profiles!inner(
            user_id,
            current_title,
            headline,
            location,
            years_experience
          ),
          interviews(
            id,
            interview_type,
            scheduled_at,
            location,
            meeting_link,
            status,
            interviewer_name,
            interview_feedback(*)
          )
        `)
        .eq("job_postings.org_id", companyOrgId)
        .order("applied_at", { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (error) {
      console.error("Error loading applications:", error);
      toast.error("Failed to load applications");
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    if (statusFilter !== "all") {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.candidate_profiles.current_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.candidate_profiles.headline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.job_postings.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredApplications(filtered);
  };

  const handleStatusChange = async () => {
    if (!selectedApplication || !newStatus) return;

    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ 
          status: newStatus,
          notes: statusNotes || selectedApplication.notes
        })
        .eq("id", selectedApplication.id);

      if (error) throw error;

      setApplications(prev => 
        prev.map(app => 
          app.id === selectedApplication.id 
            ? { ...app, status: newStatus, notes: statusNotes || app.notes }
            : app
        )
      );

      toast.success("Application status updated");
      setShowStatusDialog(false);
      setSelectedApplication(null);
      setNewStatus("");
      setStatusNotes("");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.variant || "secondary";
  };

  const getStatusCounts = () => {
    const counts: Record<string, number> = {};
    statusOptions.forEach(opt => {
      counts[opt.value] = applications.filter(app => app.status === opt.value).length;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const handleScheduleInterview = async () => {
    if (!selectedApplication || !interviewData.date || !interviewData.time) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const scheduledAt = `${interviewData.date}T${interviewData.time}:00`;

      // Insert interview record
      const { data: interview, error: interviewError } = await (supabase as any)
        .from("interviews")
        .insert({
          application_id: selectedApplication.id,
          interview_type: interviewData.type,
          scheduled_at: scheduledAt,
          location: interviewData.location || null,
          interviewer_name: interviewData.interviewerName || null,
          interviewer_email: interviewData.interviewerEmail || null,
          notes: interviewData.notes || null,
          status: "scheduled"
        })
        .select()
        .single();

      if (interviewError) throw interviewError;

      // Get candidate email from auth users
      const { data: { user } } = await supabase.auth.admin.getUserById(
        selectedApplication.candidate_profiles.user_id
      );

      // Send email notification
      if (user?.email) {
        await supabase.functions.invoke("send-email", {
          body: {
            to: user.email,
            subject: `Interview Scheduled: ${selectedApplication.job_postings.title}`,
            template: "interview-scheduled",
            data: {
              userName: selectedApplication.candidate_profiles.current_title || "Candidate",
              jobTitle: selectedApplication.job_postings.title,
              company: selectedApplication.job_postings.company,
              interviewDate: format(new Date(scheduledAt), "MMMM d, yyyy"),
              interviewTime: format(new Date(scheduledAt), "h:mm a"),
              interviewType: interviewData.type,
              location: interviewData.location,
              interviewUrl: `${window.location.origin}/applications`
            }
          }
        });

        // Create calendar events in connected calendars
        try {
          const endTime = new Date(new Date(scheduledAt).getTime() + 60 * 60 * 1000).toISOString();
          
          await supabase.functions.invoke('create-calendar-event', {
            body: {
              interviewId: interview.id,
              title: `Interview: ${selectedApplication.job_postings.title}`,
              description: `Interview with candidate for ${selectedApplication.job_postings.title} position at ${selectedApplication.job_postings.company}.\n\nType: ${interviewData.type}\nLocation: ${interviewData.location || 'TBD'}`,
              startTime: scheduledAt,
              endTime,
              location: interviewData.location || '',
              attendees: [user.email],
              meetingLink: null,
            },
          });
        } catch (calError: any) {
          console.error('Failed to create calendar event:', calError);
          // Don't fail the entire operation if calendar creation fails
          toast.info('Interview scheduled, but calendar event creation failed. You may need to reconnect your calendar in Profile > Calendar.');
        }
      }

      // Update application status to interview if not already
      if (selectedApplication.status !== "interview") {
        await supabase
          .from("job_applications")
          .update({ status: "interview" })
          .eq("id", selectedApplication.id);

        setApplications(prev =>
          prev.map(app =>
            app.id === selectedApplication.id
              ? { ...app, status: "interview" }
              : app
          )
        );
      }

      toast.success("Interview scheduled and invitation sent!");
      setShowInterviewDialog(false);
      setSelectedApplication(null);
      setInterviewData({
        type: "phone",
        date: "",
        time: "",
        location: "",
        interviewerName: "",
        interviewerEmail: "",
        notes: ""
      });
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast.error("Failed to schedule interview");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Application Management</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage candidate applications through your hiring pipeline
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statusOptions.map((status) => (
          <Card key={status.value}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{statusCounts[status.value] || 0}</div>
              <div className="text-sm text-muted-foreground">{status.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            {filteredApplications.length} application{filteredApplications.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by candidate or job title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No applications found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplications.map((application) => (
                <Card key={application.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge variant={getStatusBadgeVariant(application.status)}>
                            {statusOptions.find(s => s.value === application.status)?.label || application.status}
                          </Badge>
                          <h4 className="font-semibold">
                            {application.candidate_profiles.current_title || "Candidate"}
                          </h4>
                        </div>

                        {application.candidate_profiles.headline && (
                          <p className="text-sm text-muted-foreground">
                            {application.candidate_profiles.headline}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {application.job_postings.title}
                          </span>
                          {application.candidate_profiles.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {application.candidate_profiles.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Applied {format(new Date(application.applied_at), "MMM d, yyyy")}
                          </span>
                          {application.candidate_profiles.years_experience > 0 && (
                            <span>
                              {application.candidate_profiles.years_experience} years exp.
                            </span>
                          )}
                        </div>

                        {application.notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs">
                            <strong>Notes:</strong> {application.notes}
                          </div>
                        )}

                        {/* Interviews Section */}
                        {application.interviews && application.interviews.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedApplications);
                                if (expandedApplications.has(application.id)) {
                                  newExpanded.delete(application.id);
                                } else {
                                  newExpanded.add(application.id);
                                }
                                setExpandedApplications(newExpanded);
                              }}
                              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                            >
                              <Calendar className="h-3 w-3" />
                              {application.interviews.length} Interview{application.interviews.length !== 1 ? 's' : ''}
                            </button>

                            {expandedApplications.has(application.id) && (
                              <div className="space-y-2 mt-2">
                                {application.interviews.map((interview) => (
                                  <div key={interview.id} className="p-3 bg-muted/50 rounded border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
                                          {interview.interview_type}
                                        </Badge>
                                        <span className="text-xs">
                                          {format(new Date(interview.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                                        </span>
                                      </div>
                                      {interview.status === 'completed' && interview.interview_feedback && interview.interview_feedback.length === 0 && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedInterview(interview);
                                            setSelectedApplication(application);
                                            setShowFeedbackDialog(true);
                                          }}
                                        >
                                          <MessageSquare className="h-3 w-3 mr-1" />
                                          Add Feedback
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {interview.interview_feedback && interview.interview_feedback.length > 0 && (
                                      <div className="mt-2">
                                        <InterviewFeedbackView feedback={interview.interview_feedback[0]} />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/profile/${application.candidate_profiles.user_id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedApplication(application);
                            setShowInterviewDialog(true);
                          }}
                        >
                          <CalendarPlus className="h-4 w-4 mr-1" />
                          Schedule Interview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedApplication(application);
                            setNewStatus(application.status as "applied" | "planned" | "interview" | "offer" | "rejected");
                            setStatusNotes(application.notes || "");
                            setShowStatusDialog(true);
                          }}
                        >
                          Update Status
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interview Scheduling Dialog */}
      <Dialog open={showInterviewDialog} onOpenChange={setShowInterviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Send an interview invitation to the candidate
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Interview Type *</Label>
              <Select value={interviewData.type} onValueChange={(value) => setInterviewData({ ...interviewData, type: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone Screen</SelectItem>
                  <SelectItem value="video">Video Interview</SelectItem>
                  <SelectItem value="onsite">On-site Interview</SelectItem>
                  <SelectItem value="technical">Technical Interview</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={interviewData.date}
                  onChange={(e) => setInterviewData({ ...interviewData, date: e.target.value })}
                  className="mt-1"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={interviewData.time}
                  onChange={(e) => setInterviewData({ ...interviewData, time: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Location / Meeting Link</Label>
              <Input
                value={interviewData.location}
                onChange={(e) => setInterviewData({ ...interviewData, location: e.target.value })}
                placeholder="Office address or video call link"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Interviewer Name</Label>
                <Input
                  value={interviewData.interviewerName}
                  onChange={(e) => setInterviewData({ ...interviewData, interviewerName: e.target.value })}
                  placeholder="John Smith"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Interviewer Email</Label>
                <Input
                  type="email"
                  value={interviewData.interviewerEmail}
                  onChange={(e) => setInterviewData({ ...interviewData, interviewerEmail: e.target.value })}
                  placeholder="john@company.com"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={interviewData.notes}
                onChange={(e) => setInterviewData({ ...interviewData, notes: e.target.value })}
                placeholder="Additional details for the candidate..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInterviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleInterview}>
              Schedule & Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
            <DialogDescription>
              Change the status of this application and add notes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Status</label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as "applied" | "planned" | "interview" | "offer" | "rejected")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add notes about this status change..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={!newStatus}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview Feedback Dialog */}
      {selectedInterview && selectedApplication && (
        <InterviewFeedbackDialog
          open={showFeedbackDialog}
          onOpenChange={setShowFeedbackDialog}
          interviewId={selectedInterview.id}
          candidateName={selectedApplication.candidate_profiles.current_title || "Candidate"}
          jobTitle={selectedApplication.job_postings.title}
          onSuccess={() => {
            if (currentOrgId) {
              loadApplications(currentOrgId);
            }
          }}
        />
      )}
    </div>
  );
}
