import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Video
} from "lucide-react";
import { format } from "date-fns";

interface InterviewSchedule {
  id: string;
  interview_type: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  location: string | null;
  interviewer_name: string | null;
  interviewer_email: string | null;
  notes: string | null;
  status: string;
  application_id: string | null;
  job_applications?: {
    company: string;
    job_title: string;
  };
}

export const InterviewScheduler = () => {
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    application_id: "",
    interview_type: "phone_screen",
    scheduled_at: "",
    duration_minutes: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    location: "",
    interviewer_name: "",
    interviewer_email: "",
    notes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      setProfileId(profile.id);

      // Load interviews
      const { data: interviewsData } = await supabase
        .from("interview_schedules")
        .select(`
          *,
          job_applications(company, job_title)
        `)
        .eq("profile_id", profile.id)
        .order("scheduled_at", { ascending: true });

      setInterviews(interviewsData || []);

      // Load applications for dropdown
      const { data: appsData } = await supabase
        .from("job_applications")
        .select("id, company, job_title")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      setApplications(appsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

    try {
      const { error } = await supabase
        .from("interview_schedules")
        .insert({
          profile_id: profileId,
          ...formData,
          application_id: formData.application_id || null
        });

      if (error) throw error;

      toast.success("Interview scheduled successfully!");
      setDialogOpen(false);
      setFormData({
        application_id: "",
        interview_type: "phone_screen",
        scheduled_at: "",
        duration_minutes: 60,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: "",
        interviewer_name: "",
        interviewer_email: "",
        notes: ""
      });
      loadData();
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast.error("Failed to schedule interview");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("interview_schedules")
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Interview marked as ${status}`);
      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-success"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInterviewTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      phone_screen: "Phone Screen",
      technical: "Technical",
      behavioral: "Behavioral",
      onsite: "On-site",
      final: "Final Round"
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Interview Schedule
              </CardTitle>
              <CardDescription>
                Manage your upcoming and past interviews
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Interview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule New Interview</DialogTitle>
                  <DialogDescription>
                    Add details for your upcoming interview
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="application">Related Application (Optional)</Label>
                    <Select
                      value={formData.application_id}
                      onValueChange={(value) => setFormData({ ...formData, application_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an application" />
                      </SelectTrigger>
                      <SelectContent>
                        {applications.map((app) => (
                          <SelectItem key={app.id} value={app.id}>
                            {app.job_title} at {app.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="interview_type">Interview Type</Label>
                      <Select
                        value={formData.interview_type}
                        onValueChange={(value) => setFormData({ ...formData, interview_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone_screen">Phone Screen</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="onsite">On-site</SelectItem>
                          <SelectItem value="final">Final Round</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled_at">Date & Time</Label>
                    <Input
                      id="scheduled_at"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location / Video Link</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Address or video call link"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="interviewer_name">Interviewer Name</Label>
                      <Input
                        id="interviewer_name"
                        value={formData.interviewer_name}
                        onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="interviewer_email">Interviewer Email</Label>
                      <Input
                        id="interviewer_email"
                        type="email"
                        value={formData.interviewer_email}
                        onChange={(e) => setFormData({ ...formData, interviewer_email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Preparation notes, questions to ask, etc."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Schedule Interview</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {interviews.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No interviews scheduled yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <Card key={interview.id} className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{getInterviewTypeLabel(interview.interview_type)}</h4>
                          {getStatusBadge(interview.status)}
                        </div>
                        {interview.job_applications && (
                          <p className="text-sm text-muted-foreground">
                            {interview.job_applications.job_title} at {interview.job_applications.company}
                          </p>
                        )}
                      </div>
                      {interview.status === 'scheduled' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(interview.id, 'completed')}
                          >
                            Mark Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(interview.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(interview.scheduled_at), "PPP")}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {format(new Date(interview.scheduled_at), "p")} ({interview.duration_minutes} min)
                      </div>
                      {interview.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {interview.location.includes('http') ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                          {interview.location}
                        </div>
                      )}
                      {interview.interviewer_name && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          {interview.interviewer_name}
                        </div>
                      )}
                    </div>

                    {interview.notes && (
                      <div className="mt-4 p-3 rounded-lg bg-background">
                        <p className="text-sm">{interview.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
