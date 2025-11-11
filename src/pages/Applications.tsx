import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Building2, Trash2, BarChart, TrendingUp, Clock, Target, Briefcase, Calendar, MessageSquare, Sparkles, CheckCircle2, ExternalLink, MapPin, DollarSign, FileText, Edit2, Send, History, Bell } from "lucide-react";
import { toast } from "sonner";
import { ApplicationReminders } from "@/components/applications/ApplicationReminders";
import AvailabilityTab from "@/components/applications/AvailabilityTab";
import { PredictiveAnalytics } from "@/components/applications/PredictiveAnalytics";
import { InterviewScheduler } from "@/components/applications/InterviewScheduler";
import { FollowUpCenter } from "@/components/applications/FollowUpCenter";
import { useTeam } from "@/contexts/TeamContext";
import { TeamFilterBadge } from "@/components/teams/TeamFilterBadge";

interface Application {
  id: string;
  job_title: string;
  company: string;
  status: string;
  notes: string | null;
  applied_at: string | null;
  created_at: string;
  job_posting_id: string;
}

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  salary_min: number | null;
  salary_max: number | null;
  remote: boolean;
  url: string | null;
  posted_date: string | null;
  seniority: string | null;
  skills_extracted: string[] | null;
}

interface InterviewQuestion {
  category: string;
  question: string;
  answerTips: string;
}

interface InterviewPrep {
  questions: InterviewQuestion[];
  companyResearch: {
    focusAreas: string[];
    keyTopics: string[];
  };
}

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned", color: "bg-muted" },
  { value: "applied", label: "Applied", color: "bg-primary" },
  { value: "interview", label: "Interview", color: "bg-warning" },
  { value: "offer", label: "Offer", color: "bg-success" },
  { value: "rejected", label: "Rejected", color: "bg-destructive" },
];

export default function Applications() {
  const { selectedTeam } = useTeam();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tracker");
  
  // Interview Prep State
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState("");

  // Analytics State
  const [analytics, setAnalytics] = useState<any>(null);

  // Detail Dialog State
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAppDetail, setSelectedAppDetail] = useState<Application | null>(null);
  const [jobDetails, setJobDetails] = useState<JobPosting | null>(null);
  const [loadingJobDetails, setLoadingJobDetails] = useState(false);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [applicationEvents, setApplicationEvents] = useState<any[]>([]);
  const [editingCoverLetter, setEditingCoverLetter] = useState<string | null>(null);
  const [coverLetterContent, setCoverLetterContent] = useState("");
  const [resending, setResending] = useState(false);
  const [resumeVersions, setResumeVersions] = useState<any[]>([]);
  const [selectedResumeVersion, setSelectedResumeVersion] = useState<string | null>(null);
  const [loadingResumeVersions, setLoadingResumeVersions] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profileId) {
      loadApplications();
    }
  }, [profileId, selectedTeam]);

  useEffect(() => {
    if (applications.length > 0 && activeTab === "analytics") {
      calculateAnalytics();
    }
  }, [applications, activeTab]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      setProfileId(data?.id || null);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadApplications = async () => {
    if (!profileId) return;

    try {
      let query = supabase
        .from("job_applications")
        .select("*")
        .eq("profile_id", profileId)
        .is("deleted_at", null);

      // Filter by team if selected
      if (selectedTeam) {
        query = query.eq("team_id", selectedTeam.id);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error("Error loading applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = () => {
    const byStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const appliedCount = byStatus.applied || 0;
    const interviewCount = byStatus.interview || 0;
    const offerCount = byStatus.offer || 0;
    const rejectedCount = byStatus.rejected || 0;
    const responseRate = appliedCount > 0 
      ? Math.round(((interviewCount + offerCount) / appliedCount) * 100) 
      : 0;
    const successRate = appliedCount > 0
      ? Math.round((offerCount / appliedCount) * 100)
      : 0;

    // Calculate average response time
    const responseTimes = applications
      .filter(app => app.applied_at && app.status !== "planned")
      .map(app => {
        const applied = new Date(app.applied_at!);
        const updated = new Date(app.created_at);
        return Math.floor((updated.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));
      });
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // Applications by month
    const byMonth = applications.reduce((acc, app) => {
      const month = new Date(app.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const applicationsByMonth = Object.entries(byMonth)
      .map(([month, count]) => ({ month, count }))
      .slice(-6);

    // Success rate by company
    const companyStats = applications.reduce((acc, app) => {
      if (!acc[app.company]) {
        acc[app.company] = { total: 0, offers: 0, interviews: 0, rejected: 0 };
      }
      acc[app.company].total += 1;
      if (app.status === 'offer') acc[app.company].offers += 1;
      if (app.status === 'interview') acc[app.company].interviews += 1;
      if (app.status === 'rejected') acc[app.company].rejected += 1;
      return acc;
    }, {} as Record<string, { total: number; offers: number; interviews: number; rejected: number }>);

    const successByCompany = Object.entries(companyStats)
      .map(([company, stats]) => ({
        company,
        total: stats.total,
        successRate: stats.total > 0 ? Math.round((stats.offers / stats.total) * 100) : 0,
        responseRate: stats.total > 0 ? Math.round(((stats.offers + stats.interviews) / stats.total) * 100) : 0,
        offers: stats.offers,
        interviews: stats.interviews,
        rejected: stats.rejected
      }))
      .filter(item => item.total >= 2) // Only show companies with 2+ applications
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);

    // Success rate by job title
    const titleStats = applications.reduce((acc, app) => {
      if (!acc[app.job_title]) {
        acc[app.job_title] = { total: 0, offers: 0, interviews: 0, rejected: 0 };
      }
      acc[app.job_title].total += 1;
      if (app.status === 'offer') acc[app.job_title].offers += 1;
      if (app.status === 'interview') acc[app.job_title].interviews += 1;
      if (app.status === 'rejected') acc[app.job_title].rejected += 1;
      return acc;
    }, {} as Record<string, { total: number; offers: number; interviews: number; rejected: number }>);

    const successByTitle = Object.entries(titleStats)
      .map(([title, stats]) => ({
        title,
        total: stats.total,
        successRate: stats.total > 0 ? Math.round((stats.offers / stats.total) * 100) : 0,
        responseRate: stats.total > 0 ? Math.round(((stats.offers + stats.interviews) / stats.total) * 100) : 0,
        offers: stats.offers,
        interviews: stats.interviews,
        rejected: stats.rejected
      }))
      .filter(item => item.total >= 2) // Only show titles with 2+ applications
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);

    // Application method analysis (based on whether job_posting_id exists)
    const withJobPosting = applications.filter(app => app.job_posting_id).length;
    const manualEntry = applications.length - withJobPosting;
    
    const methodStats = [
      { 
        method: 'AI Matched', 
        count: withJobPosting,
        offers: applications.filter(app => app.job_posting_id && app.status === 'offer').length,
        interviews: applications.filter(app => app.job_posting_id && app.status === 'interview').length
      },
      { 
        method: 'Manual', 
        count: manualEntry,
        offers: applications.filter(app => !app.job_posting_id && app.status === 'offer').length,
        interviews: applications.filter(app => !app.job_posting_id && app.status === 'interview').length
      }
    ].map(item => ({
      ...item,
      successRate: item.count > 0 ? Math.round((item.offers / item.count) * 100) : 0,
      responseRate: item.count > 0 ? Math.round(((item.offers + item.interviews) / item.count) * 100) : 0
    }));

    // Top companies
    const companyCounts = applications.reduce((acc, app) => {
      acc[app.company] = (acc[app.company] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCompanies = Object.entries(companyCounts)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setAnalytics({
      totalApplications: applications.length,
      byStatus,
      responseRate,
      averageResponseTime: avgResponseTime,
      successRate,
      applicationsByMonth,
      topCompanies,
      successByCompany,
      successByTitle,
      methodStats
    });
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      const application = applications.find(a => a.id === id);
      
      if (status === "applied" && !application?.applied_at) {
        updates.applied_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("job_applications")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Update or create application metrics
      const { data: existingMetric } = await supabase
        .from("application_metrics")
        .select("*")
        .eq("application_id", id)
        .single();

      const metricUpdates: any = {};

      if (status === "applied" && !existingMetric) {
        // Create new metric when first applied
        await supabase
          .from("application_metrics")
          .insert({
            application_id: id,
            response_received: false,
            interview_granted: false,
          });
      } else if (existingMetric) {
        // Update existing metric based on status
        if (status === "interview" || status === "offer") {
          metricUpdates.response_received = true;
          metricUpdates.interview_granted = true;

          // Calculate time to response if not already set
          if (!existingMetric.time_to_response_hours && application?.applied_at) {
            const appliedAt = new Date(application.applied_at);
            const now = new Date();
            metricUpdates.time_to_response_hours = Math.floor(
              (now.getTime() - appliedAt.getTime()) / (1000 * 60 * 60)
            );
          }
        } else if (status === "rejected") {
          metricUpdates.response_received = true;

          // Calculate time to response if not already set
          if (!existingMetric.time_to_response_hours && application?.applied_at) {
            const appliedAt = new Date(application.applied_at);
            const now = new Date();
            metricUpdates.time_to_response_hours = Math.floor(
              (now.getTime() - appliedAt.getTime()) / (1000 * 60 * 60)
            );
          }
        }

        if (Object.keys(metricUpdates).length > 0) {
          await supabase
            .from("application_metrics")
            .update(metricUpdates)
            .eq("id", existingMetric.id);
        }
      }

      setApplications(prev =>
        prev.map(app =>
          app.id === id ? { ...app, ...updates } : app
        )
      );

      toast.success("Status updated");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const deleteApplication = async (id: string) => {
    if (!confirm("Remove this application from your tracker?")) return;

    try {
      const { error } = await supabase
        .from("job_applications")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setApplications(prev => prev.filter(app => app.id !== id));
      toast.success("Application removed");
    } catch (error: any) {
      console.error("Error deleting application:", error);
      toast.error("Failed to remove application");
    }
  };

  const generateInterviewPrep = async (app: Application) => {
    try {
      setGenerating(true);
      setSelectedApp(app);

      // Fetch job posting details
      const { data: job } = await supabase
        .from("job_postings")
        .select("*")
        .eq("id", app.job_posting_id)
        .single();

      if (!job) {
        toast.error("Job details not found");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-interview-questions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobTitle: job.title,
            company: job.company,
            jobDescription: job.description,
            seniority: job.seniority
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate questions");

      const data = await response.json();
      setInterviewPrep(data);

      // Save to database
      await supabase
        .from("interview_prep")
        .upsert({
          application_id: app.id,
          questions: data.questions,
          company_research: data.companyResearch
        });

      toast.success("Interview prep generated!");
    } catch (error: any) {
      console.error("Error generating prep:", error);
      toast.error(error.message || "Failed to generate interview prep");
    } finally {
      setGenerating(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedApp) return;

    try {
      await supabase
        .from("interview_prep")
        .upsert({
          application_id: selectedApp.id,
          preparation_notes: notes
        });

      toast.success("Notes saved!");
    } catch (error) {
      toast.error("Failed to save notes");
    }
  };

  const getSuggestedResumeVersion = (versions: any[], applicationDate: string) => {
    if (!versions.length) return null;

    const appDate = new Date(applicationDate).getTime();
    
    // Find versions created before or on the application date
    const validVersions = versions.filter(v => {
      const versionDate = new Date(v.created_at).getTime();
      return versionDate <= appDate;
    });

    if (!validVersions.length) {
      // If no version before app date, return the oldest version
      return versions[versions.length - 1].id;
    }

    // Find the version created closest to the application date
    const suggested = validVersions.reduce((closest, current) => {
      const closestDiff = Math.abs(appDate - new Date(closest.created_at).getTime());
      const currentDiff = Math.abs(appDate - new Date(current.created_at).getTime());
      return currentDiff < closestDiff ? current : closest;
    });

    return suggested.id;
  };

  const openDetailDialog = async (app: Application) => {
    setSelectedAppDetail(app);
    setDetailDialogOpen(true);
    setLoadingJobDetails(true);
    setLoadingResumeVersions(true);
    setCoverLetters([]);
    setApplicationEvents([]);
    setResumeVersions([]);
    setSelectedResumeVersion(null);

    try {
      // Fetch job details
      const { data: jobData, error: jobError } = await supabase
        .from("job_postings")
        .select("*")
        .eq("id", app.job_posting_id)
        .single();

      if (jobError) throw jobError;
      setJobDetails(jobData);

      // Fetch cover letters
      const { data: docsData, error: docsError } = await supabase
        .from("application_documents")
        .select("*")
        .eq("application_id", app.id)
        .order("created_at", { ascending: false });

      if (!docsError && docsData) {
        setCoverLetters(docsData);
      }

      // Fetch application events
      const { data: eventsData, error: eventsError } = await supabase
        .from("application_events")
        .select("*")
        .eq("application_id", app.id)
        .order("event_date", { ascending: false });

      if (!eventsError && eventsData) {
        setApplicationEvents(eventsData);
      }

      // Fetch resume versions
      let fetchedVersions: any[] = [];
      if (profileId) {
        const { data: resumesData } = await supabase
          .from("resumes")
          .select("id")
          .eq("profile_id", profileId);

        if (resumesData && resumesData.length > 0) {
          const resumeIds = resumesData.map(r => r.id);
          const { data: versionsData } = await supabase
            .from("resume_versions")
            .select("*")
            .in("resume_id", resumeIds)
            .order("created_at", { ascending: false });

          if (versionsData) {
            fetchedVersions = versionsData;
            setResumeVersions(versionsData);
          }
        }
      }

      // Fetch current application metric to see if version is already linked
      const { data: metricData } = await supabase
        .from("application_metrics")
        .select("resume_version_id")
        .eq("application_id", app.id)
        .single();

      if (metricData?.resume_version_id) {
        setSelectedResumeVersion(metricData.resume_version_id);
      } else if (fetchedVersions.length > 0) {
        // Smart suggestion: automatically suggest the best matching version
        const applicationDate = app.applied_at || app.created_at;
        const suggestedVersionId = getSuggestedResumeVersion(fetchedVersions, applicationDate);
        if (suggestedVersionId) {
          setSelectedResumeVersion(suggestedVersionId);
          toast.info("Smart suggestion: Resume version matched based on application date", {
            description: "You can change this selection if needed"
          });
        }
      }
    } catch (error) {
      console.error("Error loading application details:", error);
      toast.error("Failed to load application details");
    } finally {
      setLoadingJobDetails(false);
      setLoadingResumeVersions(false);
    }
  };

  const linkResumeVersion = async (versionId: string) => {
    if (!selectedAppDetail) return;

    try {
      // Check if metric exists
      const { data: existingMetric } = await supabase
        .from("application_metrics")
        .select("id")
        .eq("application_id", selectedAppDetail.id)
        .single();

      if (existingMetric) {
        // Update existing metric
        const { error } = await supabase
          .from("application_metrics")
          .update({ resume_version_id: versionId })
          .eq("id", existingMetric.id);

        if (error) throw error;
      } else {
        // Create new metric
        const { error } = await supabase
          .from("application_metrics")
          .insert({
            application_id: selectedAppDetail.id,
            resume_version_id: versionId,
            response_received: selectedAppDetail.status === "interview" || selectedAppDetail.status === "offer" || selectedAppDetail.status === "rejected",
            interview_granted: selectedAppDetail.status === "interview" || selectedAppDetail.status === "offer",
          });

        if (error) throw error;
      }

      setSelectedResumeVersion(versionId);
      toast.success("Resume version linked successfully!");
    } catch (error) {
      console.error("Error linking resume version:", error);
      toast.error("Failed to link resume version");
    }
  };

  const updateCoverLetter = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from("application_documents")
        .update({ content: coverLetterContent })
        .eq("id", documentId);

      if (error) throw error;

      setCoverLetters(prev => 
        prev.map(doc => doc.id === documentId ? { ...doc, content: coverLetterContent } : doc)
      );
      setEditingCoverLetter(null);
      toast.success("Cover letter updated!");
    } catch (error) {
      console.error("Error updating cover letter:", error);
      toast.error("Failed to update cover letter");
    }
  };

  const resendApplication = async () => {
    if (!selectedAppDetail) return;
    
    try {
      setResending(true);
      
      // Update applied_at to current time
      const { error } = await supabase
        .from("job_applications")
        .update({ 
          applied_at: new Date().toISOString(),
          status: "applied"
        })
        .eq("id", selectedAppDetail.id);

      if (error) throw error;

      // Create event for resend
      await supabase
        .from("application_events")
        .insert({
          application_id: selectedAppDetail.id,
          event_type: "resent",
          event_date: new Date().toISOString(),
          metadata: { note: "Application resent" }
        });

      // Reload events
      const { data: eventsData } = await supabase
        .from("application_events")
        .select("*")
        .eq("application_id", selectedAppDetail.id)
        .order("event_date", { ascending: false });

      if (eventsData) {
        setApplicationEvents(eventsData);
      }

      setApplications(prev =>
        prev.map(app =>
          app.id === selectedAppDetail.id 
            ? { ...app, applied_at: new Date().toISOString(), status: "applied" } 
            : app
        )
      );

      toast.success("Application resent!");
    } catch (error) {
      console.error("Error resending application:", error);
      toast.error("Failed to resend application");
    } finally {
      setResending(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "technical": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "behavioral": return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case "scenario": return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
      case "culture": return "bg-green-500/10 text-green-700 dark:text-green-300";
      default: return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned": return "text-muted-foreground";
      case "applied": return "text-primary";
      case "interview": return "text-warning";
      case "offer": return "text-success";
      case "rejected": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const groupedApplications = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status.value] = applications.filter(app => app.status === status.value);
    return acc;
  }, {} as Record<string, Application[]>);

  const interviewApplications = applications.filter(app => 
    app.status === "applied" || app.status === "interview"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Applications Hub</h1>
        <p className="text-muted-foreground mt-2">
          Track applications, analyze performance, and prepare for interviews
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tracker" className="gap-2">
            <Target className="w-4 h-4" />
            Tracker
          </TabsTrigger>
          <TabsTrigger value="interview" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Interview Prep
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-2">
            <Calendar className="w-4 h-4" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="followup" className="gap-2">
            <Bell className="w-4 h-4" />
            Follow-ups
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="predictions" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Predictions
          </TabsTrigger>
        </TabsList>

        {/* APPLICATION TRACKER TAB */}
        <TabsContent value="tracker" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <TeamFilterBadge />
          </div>
          {applications.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                  Start saving jobs from the Job Matches page to track your applications here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {STATUS_OPTIONS.map((statusOption) => {
                const apps = groupedApplications[statusOption.value] || [];
                return (
                  <div key={statusOption.value} className="space-y-4">
                    <Card className="border-2 shadow-sm">
                      <CardHeader className="p-4 pb-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-sm uppercase tracking-wide">
                            {statusOption.label}
                          </h3>
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {apps.length}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                    <div className="space-y-3 min-h-[200px]">
                      {apps.map((app) => (
                        <Card 
                          key={app.id} 
                          className="shadow-sm hover:shadow-lg transition-all cursor-pointer border-l-4 hover:border-l-primary group"
                          onClick={() => openDetailDialog(app)}
                        >
                          <CardHeader className="p-4 pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                                  {app.job_title}
                                </CardTitle>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate font-medium">{app.company}</span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteApplication(app.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 space-y-2.5">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={app.status}
                                onValueChange={(value) => updateStatus(app.id, value)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              {app.applied_at
                                ? `Applied ${new Date(app.applied_at).toLocaleDateString()}`
                                : `Saved ${new Date(app.created_at).toLocaleDateString()}`}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* INTERVIEW PREP TAB */}
        <TabsContent value="interview" className="space-y-6">
          {interviewApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Upcoming Interviews</h3>
                <p className="text-sm text-muted-foreground">
                  Applications with interview status will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Application List */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="font-semibold">Select Application</h3>
                {interviewApplications.map((app) => (
                  <Card
                    key={app.id}
                    className={`cursor-pointer transition-all ${
                      selectedApp?.id === app.id ? "border-primary shadow-md" : ""
                    }`}
                    onClick={() => {
                      setSelectedApp(app);
                      setInterviewPrep(null);
                    }}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">{app.job_title}</CardTitle>
                      <CardDescription className="text-xs">{app.company}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {/* Interview Prep Content */}
              <div className="lg:col-span-2">
                {!selectedApp ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                      Select an application to start preparing
                    </CardContent>
                  </Card>
                ) : !interviewPrep ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                      <Sparkles className="w-12 h-12 text-primary" />
                      <h3 className="text-lg font-semibold">Generate Interview Prep</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm">
                        Get AI-generated interview questions, answer tips, and company research
                      </p>
                      <Button
                        onClick={() => generateInterviewPrep(selectedApp)}
                        disabled={generating}
                        className="bg-gradient-primary"
                      >
                        {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Generate Prep Material
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Tabs defaultValue="questions" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="questions">Questions</TabsTrigger>
                      <TabsTrigger value="research">Research</TabsTrigger>
                      <TabsTrigger value="notes">Notes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="questions" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Practice Questions</CardTitle>
                          <CardDescription>
                            Likely questions based on the job description
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Accordion type="single" collapsible className="space-y-2">
                            {interviewPrep.questions.map((q, idx) => (
                              <AccordionItem key={idx} value={`question-${idx}`}>
                                <AccordionTrigger className="text-left">
                                  <div className="flex items-start gap-3 flex-1">
                                    <Badge className={getCategoryColor(q.category)}>
                                      {q.category}
                                    </Badge>
                                    <span className="flex-1">{q.question}</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4 pl-4 border-l-2 border-primary/20">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-primary" />
                                      Answer Tips:
                                    </p>
                                    <p className="text-sm text-muted-foreground">{q.answerTips}</p>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="research" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Company Research</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <h4 className="font-semibold mb-3">Focus Areas</h4>
                            <div className="space-y-2">
                              {interviewPrep.companyResearch.focusAreas.map((area, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                  <span className="text-sm">{area}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-3">Key Topics to Prepare</h4>
                            <div className="flex flex-wrap gap-2">
                              {interviewPrep.companyResearch.keyTopics.map((topic, idx) => (
                                <Badge key={idx} variant="outline">{topic}</Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Preparation Notes</CardTitle>
                          <CardDescription>
                            Keep track of your prep work and key points
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Textarea
                            placeholder="Add your notes here..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={12}
                          />
                          <Button onClick={saveNotes}>Save Notes</Button>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* AVAILABILITY TAB */}
        <TabsContent value="availability">
          <AvailabilityTab />
          <div className="mt-6">
            <InterviewScheduler />
          </div>
        </TabsContent>

        {/* FOLLOW-UP CENTER TAB */}
        <TabsContent value="followup">
          <FollowUpCenter />
        </TabsContent>

        {/* PREDICTIVE ANALYTICS TAB */}
        <TabsContent value="predictions">
          <PredictiveAnalytics applications={applications} />
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          {!analytics || applications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Analytics Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Start applying to jobs to see your performance metrics
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Applications</CardDescription>
                    <CardTitle className="text-3xl">{analytics.totalApplications}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      All time
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Response Rate</CardDescription>
                    <CardTitle className="text-3xl">{analytics.responseRate}%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={analytics.responseRate} className="h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Avg Response Time</CardDescription>
                    <CardTitle className="text-3xl">{analytics.averageResponseTime}d</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Days to hear back
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Success Rate</CardDescription>
                    <CardTitle className="text-3xl">{analytics.successRate}%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={analytics.successRate} className="h-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Pipeline & Timeline */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Application Pipeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(analytics.byStatus).map(([status, count]) => (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="capitalize font-medium">{status}</span>
                          <Badge variant="secondary">{count as number}</Badge>
                        </div>
                        <Progress value={((count as number) / analytics.totalApplications) * 100} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Applications Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.applicationsByMonth.map(({ month, count }: any) => (
                        <div key={month} className="flex items-center justify-between">
                          <span className="text-sm">{month}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={(count / 20) * 100} className="w-24 h-2" />
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Success Rate by Company */}
              {analytics.successByCompany && analytics.successByCompany.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Success Rate by Company
                    </CardTitle>
                    <CardDescription>Companies where you've applied 2+ times</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.successByCompany.map((item: any) => (
                        <div key={item.company} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.company}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.total} applications • {item.offers} offers • {item.interviews} interviews
                              </p>
                            </div>
                            <Badge variant={item.successRate > 20 ? "default" : "secondary"}>
                              {item.successRate}% success
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                              <Progress value={item.successRate} className="h-2" />
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-muted-foreground mb-1">Response Rate</div>
                              <Progress value={item.responseRate} className="h-2" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Success Rate by Job Title */}
              {analytics.successByTitle && analytics.successByTitle.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="w-5 h-5" />
                      Success Rate by Job Title
                    </CardTitle>
                    <CardDescription>Roles where you've applied 2+ times</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.successByTitle.map((item: any) => (
                        <div key={item.title} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.total} applications • {item.offers} offers • {item.interviews} interviews
                              </p>
                            </div>
                            <Badge variant={item.successRate > 20 ? "default" : "secondary"}>
                              {item.successRate}% success
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                              <Progress value={item.successRate} className="h-2" />
                            </div>
                            <div className="flex-1">
                              <div className="text-xs text-muted-foreground mb-1">Response Rate</div>
                              <Progress value={item.responseRate} className="h-2" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Application Method Comparison */}
              {analytics.methodStats && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Application Method Performance
                    </CardTitle>
                    <CardDescription>Compare AI-matched vs manual applications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.methodStats.map((item: any) => (
                        <div key={item.method} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{item.method}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.count} applications • {item.offers} offers • {item.interviews} interviews
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={item.successRate > analytics.successRate ? "default" : "secondary"}>
                                {item.successRate}% success
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                              <Progress value={item.successRate} className="h-2" />
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Response Rate</div>
                              <Progress value={item.responseRate} className="h-2" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enhanced Insights */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Insights & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.responseRate < 20 && (
                    <div className="flex gap-2">
                      <div className="text-2xl">💡</div>
                      <div>
                        <p className="text-sm font-medium">Low Response Rate</p>
                        <p className="text-sm text-muted-foreground">Consider tailoring your applications more to each role and highlighting relevant experience.</p>
                      </div>
                    </div>
                  )}
                  {analytics.averageResponseTime > 14 && (
                    <div className="flex gap-2">
                      <div className="text-2xl">⏱️</div>
                      <div>
                        <p className="text-sm font-medium">Slow Response Times</p>
                        <p className="text-sm text-muted-foreground">Companies are taking a while to respond. Follow up after 2 weeks if you haven't heard back.</p>
                      </div>
                    </div>
                  )}
                  {analytics.byStatus.planned > 5 && (
                    <div className="flex gap-2">
                      <div className="text-2xl">🎯</div>
                      <div>
                        <p className="text-sm font-medium">Pending Applications</p>
                        <p className="text-sm text-muted-foreground">You have {analytics.byStatus.planned} saved jobs. Time to start applying!</p>
                      </div>
                    </div>
                  )}
                  {analytics.successRate > 10 && (
                    <div className="flex gap-2">
                      <div className="text-2xl">🎉</div>
                      <div>
                        <p className="text-sm font-medium">Great Success Rate!</p>
                        <p className="text-sm text-muted-foreground">Your applications are resonating with employers. Keep up the momentum!</p>
                      </div>
                    </div>
                  )}
                  {analytics.successByCompany && analytics.successByCompany.length > 0 && analytics.successByCompany[0].successRate > 30 && (
                    <div className="flex gap-2">
                      <div className="text-2xl">🏆</div>
                      <div>
                        <p className="text-sm font-medium">High Success at {analytics.successByCompany[0].company}</p>
                        <p className="text-sm text-muted-foreground">You have a {analytics.successByCompany[0].successRate}% success rate here. Consider applying to similar companies.</p>
                      </div>
                    </div>
                  )}
                  {analytics.methodStats && analytics.methodStats[0]?.successRate > analytics.methodStats[1]?.successRate + 10 && (
                    <div className="flex gap-2">
                      <div className="text-2xl">📊</div>
                      <div>
                        <p className="text-sm font-medium">AI-Matched Jobs Performing Better</p>
                        <p className="text-sm text-muted-foreground">Your success rate is {analytics.methodStats[0].successRate}% with AI-matched jobs vs {analytics.methodStats[1].successRate}% with manual applications.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Application Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Application Details</DialogTitle>
            <DialogDescription>
              View complete information about this application
            </DialogDescription>
          </DialogHeader>

          {selectedAppDetail && (
            <div className="space-y-6">
              {/* Application Overview */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold">{selectedAppDetail.job_title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="font-medium">{selectedAppDetail.company}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge className={getStatusColor(selectedAppDetail.status)} variant="outline">
                    Status: {selectedAppDetail.status.charAt(0).toUpperCase() + selectedAppDetail.status.slice(1)}
                  </Badge>
                  {selectedAppDetail.applied_at && (
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      Applied: {new Date(selectedAppDetail.applied_at).toLocaleDateString()}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    Created: {new Date(selectedAppDetail.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Job Details */}
              {loadingJobDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : jobDetails ? (
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Job Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {jobDetails.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="text-sm font-medium">{jobDetails.location}</p>
                        </div>
                      </div>
                    )}

                    {jobDetails.remote && (
                      <div className="flex items-start gap-2">
                        <Target className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Work Type</p>
                          <p className="text-sm font-medium">Remote</p>
                        </div>
                      </div>
                    )}

                    {(jobDetails.salary_min || jobDetails.salary_max) && (
                      <div className="flex items-start gap-2">
                        <DollarSign className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Salary Range</p>
                          <p className="text-sm font-medium">
                            {jobDetails.salary_min?.toLocaleString()} - {jobDetails.salary_max?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {jobDetails.seniority && (
                      <div className="flex items-start gap-2">
                        <Briefcase className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Seniority</p>
                          <p className="text-sm font-medium capitalize">{jobDetails.seniority}</p>
                        </div>
                      </div>
                    )}

                    {jobDetails.posted_date && (
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Posted Date</p>
                          <p className="text-sm font-medium">
                            {new Date(jobDetails.posted_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {jobDetails.skills_extracted && jobDetails.skills_extracted.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-2">Required Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {jobDetails.skills_extracted.map((skill, idx) => (
                          <Badge key={idx} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {jobDetails.description && (
                    <div>
                      <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Job Description
                      </p>
                      <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg max-h-60 overflow-y-auto">
                        {jobDetails.description}
                      </div>
                    </div>
                  )}

                  {jobDetails.url && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={jobDetails.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Original Job Posting
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No job details available</p>
              )}

              <Separator />

              {/* Cover Letters */}
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Cover Letters
                </h4>
                {coverLetters.length > 0 ? (
                  <div className="space-y-4">
                    {coverLetters.map((doc) => (
                      <Card key={doc.id} className="border-primary/20">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-sm capitalize">{doc.document_type}</CardTitle>
                              <CardDescription className="text-xs">
                                Generated: {new Date(doc.created_at).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            {editingCoverLetter === doc.id ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updateCoverLetter(doc.id)}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCoverLetter(null);
                                    setCoverLetterContent("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCoverLetter(doc.id);
                                  setCoverLetterContent(doc.content);
                                }}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {editingCoverLetter === doc.id ? (
                            <Textarea
                              value={coverLetterContent}
                              onChange={(e) => setCoverLetterContent(e.target.value)}
                              className="min-h-[200px] font-mono text-sm"
                            />
                          ) : (
                            <div className="bg-muted/30 p-4 rounded-lg max-h-60 overflow-y-auto">
                              <p className="text-sm whitespace-pre-wrap">{doc.content}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No cover letters generated yet</p>
                )}
              </div>

              <Separator />

              {/* Resume Version Tracking */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Resume Version
                  </h4>
                  {selectedResumeVersion && (
                    <Badge variant="outline" className="bg-primary/10">
                      Linked for A/B Testing
                    </Badge>
                  )}
                </div>
                
                {loadingResumeVersions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : resumeVersions.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Link this application to a resume version to track which version performs best in A/B testing.
                    </p>
                    <Select value={selectedResumeVersion || ""} onValueChange={linkResumeVersion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select resume version used..." />
                      </SelectTrigger>
                      <SelectContent>
                        {resumeVersions.map((version) => (
                          <SelectItem key={version.id} value={version.id}>
                            {version.title} - {new Date(version.created_at || '').toLocaleDateString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedResumeVersion && (
                      <p className="text-xs text-muted-foreground">
                        ✓ This application will count toward metrics for the selected resume version
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No resume versions found. Create resume versions to enable A/B testing.
                  </p>
                )}
              </div>

              <Separator />
              <div className="space-y-4">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Application Timeline
                </h4>
                {applicationEvents.length > 0 ? (
                  <div className="space-y-3">
                    {applicationEvents.map((event, idx) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="relative flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          {idx < applicationEvents.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm capitalize">{event.event_type.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.event_date).toLocaleString()}
                            </p>
                          </div>
                          {event.metadata && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {JSON.stringify(event.metadata)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-muted/30">
                    <CardContent className="py-8">
                      <div className="text-center">
                        <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No timeline events yet</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Separator />

              {/* Application Notes */}
              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Your Notes</h4>
                {selectedAppDetail.notes ? (
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm">{selectedAppDetail.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No notes added yet</p>
                )}
              </div>

              <Separator />

              {/* Application Reminders */}
              <ApplicationReminders applicationId={selectedAppDetail.id} />

              {/* Actions */}
              <div className="flex gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={resendApplication}
                  disabled={resending}
                >
                  {resending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Resend Application
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailDialogOpen(false);
                      setSelectedAppDetail(null);
                      setJobDetails(null);
                      setCoverLetters([]);
                      setApplicationEvents([]);
                      setEditingCoverLetter(null);
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      deleteApplication(selectedAppDetail.id);
                      setDetailDialogOpen(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}