import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, MapPin, DollarSign, Clock, Building2, Loader2, Plus, ExternalLink, CheckCircle2, FileText, Send, ArrowRight, Sparkles, TrendingUp, AlertCircle, Bell, Filter } from "lucide-react";
import { toast } from "sonner";
import { FetchJobsButton } from "@/components/FetchJobsButton";
import { JobAlertsTab } from "@/components/jobs/JobAlertsTab";
import { JobFilters, FilterState } from "@/components/jobs/JobFilters";
import { SimilarJobs } from "@/components/jobs/SimilarJobs";
import { CompanyResearch } from "@/components/jobs/CompanyResearch";
import { SalaryInsights } from "@/components/jobs/SalaryInsights";
import { useTeam } from "@/contexts/TeamContext";
import { TeamFilterBadge } from "@/components/teams/TeamFilterBadge";

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  seniority: string;
  salary_min: number;
  salary_max: number;
  skills_extracted: string[];
  posted_date: string;
  url?: string;
}

interface JobMatch {
  id: string;
  match_score: number;
  reasons: string[];
  job_postings: JobPosting;
}

interface JobApplication {
  id: string;
  job_posting_id: string;
  status: string;
  applied_at: string | null;
  created_at: string;
}

interface Resume {
  id: string;
  file_name: string;
  file_url: string;
  ats_score: number | null;
}

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

export default function Jobs() {
  const { selectedTeam } = useTeam();
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [generatingMatches, setGeneratingMatches] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{ job: JobPosting; match: JobMatch } | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [applyingJob, setApplyingJob] = useState<{ id: string; title: string; company: string; url?: string; description?: string } | null>(null);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [healthScore, setHealthScore] = useState<any>(null);
  const [loadingHealthScore, setLoadingHealthScore] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    location: "",
    salaryMin: 0,
    salaryMax: 300000,
    seniority: [],
    remote: null,
    skills: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profileId) {
      loadJobMatches();
      loadApplications();
      loadResumes();
    }
  }, [profileId, selectedTeam]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("candidate_profiles")
        .select("id, salary_range_min, salary_range_max")
        .eq("user_id", user.id)
        .single();

      setProfileId(data?.id || null);
      setProfile(data);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadApplications = async () => {
    if (!profileId) return;

    try {
      let query = supabase
        .from("job_applications")
        .select("id, job_posting_id, status, applied_at, created_at")
        .eq("profile_id", profileId);

      // Filter by team if selected
      if (selectedTeam) {
        query = query.eq("team_id", selectedTeam.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error loading applications:", error);
    }
  };

  const loadResumes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("resumes")
        .select("id, file_name, file_url, ats_score")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResumes(data || []);
      
      // Auto-select first resume if available
      if (data && data.length > 0) {
        setSelectedResumeId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading resumes:", error);
    }
  };

  const loadJobMatches = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("job_matches")
        .select(`
          id,
          match_score,
          reasons,
          job_postings (*)
        `)
        .eq("profile_id", profileId);

      // Filter by team if selected
      if (selectedTeam) {
        query = query.eq("job_postings.team_id", selectedTeam.id);
      }

      const { data, error } = await query.order("match_score", { ascending: false });

      if (error) throw error;

      // If no matches exist, generate them
      if (!data || data.length === 0) {
        await generateMatches();
        return;
      }

      setMatches(data as JobMatch[]);
    } catch (error: any) {
      console.error("Error loading matches:", error);
      toast.error("Failed to load job matches");
    } finally {
      setLoading(false);
    }
  };

  const generateMatches = async () => {
    try {
      setGeneratingMatches(true);
      toast.info("Analyzing job matches for your profile...");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-job-matches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate matches');
      }

      const result = await response.json();
      
      if (result.count > 0) {
        toast.success(`Found ${result.count} matching opportunities!`);
        // Reload matches
        await loadJobMatches();
      } else {
        toast.info("No matching jobs found at this time");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error generating matches:", error);
      toast.error("Failed to generate job matches");
      setLoading(false);
    } finally {
      setGeneratingMatches(false);
    }
  };

  const applyToJob = async (jobId: string, jobTitle: string, company: string) => {
    if (!profileId) {
      toast.error("Please complete your profile first");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("job_applications")
        .insert({
          profile_id: profileId,
          job_posting_id: jobId,
          job_title: jobTitle,
          company: company,
          status: "planned",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("You've already saved this job");
          return;
        }
        throw error;
      }

      if (data) {
        setApplications(prev => [...prev, {
          id: data.id,
          job_posting_id: jobId,
          status: data.status,
          applied_at: null,
          created_at: data.created_at
        }]);
      }

      toast.success("Job saved to your tracker!");
    } catch (error: any) {
      console.error("Error applying:", error);
      toast.error("Failed to save job");
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const updates: any = { status };
      
      if (status === "applied") {
        updates.applied_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("job_applications")
        .update(updates)
        .eq("id", applicationId);

      if (error) throw error;

      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId ? { ...app, ...updates } : app
        )
      );

      toast.success("Status updated");
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const getJobApplication = (jobId: string) => {
    return applications.find(app => app.job_posting_id === jobId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "applied": return "bg-primary text-primary-foreground";
      case "interview": return "bg-warning text-warning-foreground";
      case "offer": return "bg-success text-success-foreground";
      case "rejected": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const openApplyDialog = (jobId: string, jobTitle: string, company: string, url?: string, description?: string) => {
    setApplyingJob({ id: jobId, title: jobTitle, company, url, description });
    setApplyDialogOpen(true);
    setCoverLetter("");
    setHealthScore(null);
  };

  const generateCoverLetter = async () => {
    if (!selectedResumeId || !applyingJob) return;

    try {
      setGeneratingCoverLetter(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-letter`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobTitle: applyingJob.title,
            company: applyingJob.company,
            jobDescription: applyingJob.description,
            resumeId: selectedResumeId
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to generate cover letter");

      const data = await response.json();
      setCoverLetter(data.coverLetter);
      toast.success("Cover letter generated!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to generate cover letter");
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  const calculateHealthScore = async () => {
    if (!selectedResumeId || !applyingJob) return;

    try {
      setLoadingHealthScore(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const application = getJobApplication(applyingJob.id);
      const appliedDate = application?.created_at;
      const jobPostedDate = Date.now(); // In production, get from job posting
      const hoursElapsed = appliedDate 
        ? Math.floor((Date.now() - new Date(appliedDate).getTime()) / (1000 * 60 * 60))
        : 0;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-application-strength`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicationId: application?.id,
            jobDescription: applyingJob.description,
            resumeId: selectedResumeId,
            hasCoverLetter: coverLetter.length > 0,
            appliedWithinHours: hoursElapsed
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to analyze application");

      const data = await response.json();
      setHealthScore(data);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to calculate health score");
    } finally {
      setLoadingHealthScore(false);
    }
  };

  const handleApplySubmit = async () => {
    if (!applyingJob) return;

    const application = getJobApplication(applyingJob.id);
    
    if (!application) {
      toast.error("Please save the job first");
      return;
    }

    try {
      const updates: any = { status: "applied", applied_at: new Date().toISOString() };

      const { error } = await supabase
        .from("job_applications")
        .update(updates)
        .eq("id", application.id);

      if (error) throw error;

      setApplications(prev =>
        prev.map(app =>
          app.id === application.id ? { ...app, ...updates } : app
        )
      );

      toast.success("Application marked as applied! Good luck!");
      setApplyDialogOpen(false);
      
      // Optionally open the job posting
      if (applyingJob.url) {
        setTimeout(() => {
          window.open(applyingJob.url, '_blank');
        }, 500);
      }
    } catch (error: any) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application");
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const formatSalary = (min: number, max: number) => {
    const format = (num: number) => `$${(num / 1000).toFixed(0)}k`;
    return `${format(min)} - ${format(max)}`;
  };

  const handleBulkApply = async () => {
    if (!profileId) {
      toast.error("Please complete your profile first");
      return;
    }

    // Show confirmation dialog
    const matchCount = filteredMatches.length;
    const alreadyApplied = filteredMatches.filter(m => getJobApplication(m.job_postings.id)).length;
    const newApplications = matchCount - alreadyApplied;

    if (newApplications === 0) {
      toast.info("You've already applied to all matched jobs!");
      return;
    }

    if (!confirm(`Apply to ${newApplications} matched job${newApplications === 1 ? '' : 's'}? AI-generated cover letters will be created for each application.`)) {
      return;
    }

    try {
      setBulkApplying(true);
      toast.info("Processing applications...", { duration: 5000 });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-apply-to-matches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process applications');
      }

      const result = await response.json();

      if (result.applicationsCreated > 0) {
        toast.success(
          `🎉 Successfully applied to ${result.applicationsCreated} job${result.applicationsCreated === 1 ? '' : 's'}!`,
          { duration: 5000 }
        );
        // Reload applications to show updated status
        await loadApplications();
      } else {
        toast.info(result.message || "No new applications created");
      }
    } catch (error: any) {
      console.error("Bulk apply error:", error);
      toast.error(error.message || "Failed to process applications");
    } finally {
      setBulkApplying(false);
    }
  };

  // Apply filters to matches
  const filteredMatches = matches.filter(match => {
    const job = match.job_postings;
    
    // Location filter
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    
    // Salary filter
    if (job.salary_max < filters.salaryMin || job.salary_min > filters.salaryMax) {
      return false;
    }
    
    // Seniority filter
    if (filters.seniority.length > 0 && !filters.seniority.includes(job.seniority.toLowerCase())) {
      return false;
    }
    
    // Remote filter
    if (filters.remote !== null && job.remote !== filters.remote) {
      return false;
    }
    
    // Skills filter
    if (filters.skills.length > 0) {
      const jobSkills = job.skills_extracted?.map(s => s.toLowerCase()) || [];
      const hasAllSkills = filters.skills.every(skill => 
        jobSkills.some(js => js.includes(skill.toLowerCase()))
      );
      if (!hasAllSkills) return false;
    }
    
    return true;
  });

  if (loading || generatingMatches) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {generatingMatches ? "Finding your perfect matches..." : "Loading job matches..."}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Matches & Alerts</h1>
        <p className="text-muted-foreground mt-2">
          Find personalized opportunities and set up alerts
        </p>
      </div>

      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matches">
            <Briefcase className="w-4 h-4 mr-2" />
            Matches ({filteredMatches.length})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="w-4 h-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building2 className="w-4 h-4 mr-2" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="insights">
            <TrendingUp className="w-4 h-4 mr-2" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-6">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <TeamFilterBadge />
              <Button 
                onClick={() => setShowFilters(!showFilters)} 
                variant="outline"
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
                {(filters.location || filters.seniority.length > 0 || filters.skills.length > 0) && (
                  <Badge variant="secondary" className="ml-1">Active</Badge>
                )}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBulkApply}
                disabled={bulkApplying || filteredMatches.length === 0}
                className="gap-2"
                size="default"
              >
                {bulkApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Apply to All Matches
                  </>
                )}
              </Button>
              <FetchJobsButton onJobsFetched={generateMatches} />
              <Button 
                onClick={generateMatches} 
                variant="outline"
                disabled={generatingMatches}
              >
                {generatingMatches && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Refresh Matches
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {showFilters && (
              <div className="lg:col-span-1">
                <JobFilters 
                  onFiltersChange={setFilters} 
                  initialFilters={filters}
                />
              </div>
            )}
            
            <div className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}>

          {filteredMatches.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Briefcase className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {matches.length === 0 ? "No job matches yet" : "No jobs match your filters"}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                  {matches.length === 0 
                    ? "We'll analyze available positions and find the best matches for your profile"
                    : "Try adjusting your filters to see more opportunities"}
                </p>
                {matches.length === 0 && (
                  <Button onClick={generateMatches} disabled={generatingMatches}>
                    {generatingMatches && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Find My Matches
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
            {filteredMatches.map((match) => {
              const job = match.job_postings;
              const application = getJobApplication(job.id);
              return (
                <Card key={match.id} className="shadow-card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedJob({ job, match })}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <CardTitle className="text-xl">{job.title}</CardTitle>
                            <Badge className={`${getMatchColor(match.match_score)} bg-transparent border font-semibold`}>
                              {match.match_score}% Match
                            </Badge>
                            {application && (
                              <Badge className={getStatusColor(application.status)}>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {STATUS_OPTIONS.find(s => s.value === application.status)?.label}
                              </Badge>
                            )}
                          </div>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span className="font-medium">{job.company}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                          {job.remote && (
                            <>
                              <span>•</span>
                              <Badge variant="secondary" className="text-xs">Remote</Badge>
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    {!application ? (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          applyToJob(job.id, job.title, job.company);
                        }} 
                        className="bg-gradient-primary shrink-0"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Save Job
                      </Button>
                    ) : (
                      <Badge className={`${getStatusColor(application.status)} shrink-0`}>
                        {STATUS_OPTIONS.find(s => s.value === application.status)?.label}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {match.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {match.reasons.map((reason, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300">
                          ✓ {reason}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      {formatSalary(job.salary_min, job.salary_max)}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Briefcase className="w-4 h-4" />
                      {job.seniority}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {new Date(job.posted_date).toLocaleDateString()}
                    </div>
                  </div>

                  {job.skills_extracted?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {job.skills_extracted.slice(0, 6).map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills_extracted.length > 6 && (
                        <Badge variant="outline">+{job.skills_extracted.length - 6} more</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
           })}
          </div>
          )}
            </div>
          </div>

          <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
            <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto grid md:grid-cols-3 gap-6">
              {selectedJob && (() => {
                const application = getJobApplication(selectedJob.job.id);
                return (
                  <>
                    <div className="md:col-span-2 space-y-6">
                    <DialogHeader>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-8 h-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <DialogTitle className="text-2xl">{selectedJob.job.title}</DialogTitle>
                            {application && (
                              <Badge className={getStatusColor(application.status)}>
                                {STATUS_OPTIONS.find(s => s.value === application.status)?.label}
                              </Badge>
                            )}
                          </div>
                          <DialogDescription className="flex items-center gap-2 text-base flex-wrap">
                            <span className="font-medium text-foreground">{selectedJob.job.company}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {selectedJob.job.location}
                            </span>
                            {selectedJob.job.remote && (
                              <>
                                <span>•</span>
                                <Badge variant="secondary">Remote</Badge>
                              </>
                            )}
                          </DialogDescription>
                        </div>
                        <Badge className={`${getMatchColor(selectedJob.match.match_score)} bg-transparent border font-semibold text-lg px-3 py-1 shrink-0`}>
                          {selectedJob.match.match_score}% Match
                        </Badge>
                      </div>
                    </DialogHeader>

                    <div className="space-y-6">
                      {application && (
                        <div className="p-4 rounded-lg bg-muted/50 border">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="font-semibold mb-1">Application Status</h3>
                              <p className="text-sm text-muted-foreground">
                                {application.applied_at 
                                  ? `Applied on ${new Date(application.applied_at).toLocaleDateString()}`
                                  : "Saved to tracker"}
                              </p>
                            </div>
                            <Select
                              value={application.status}
                              onValueChange={(value) => updateApplicationStatus(application.id, value)}
                            >
                              <SelectTrigger className="w-[140px]">
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
                        </div>
                      )}

                      {selectedJob.match.reasons.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3">Why This Matches</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedJob.match.reasons.map((reason, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-300">
                                ✓ {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-muted-foreground" />
                        <span className="font-medium">{formatSalary(selectedJob.job.salary_min, selectedJob.job.salary_max)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-muted-foreground" />
                        <span>{selectedJob.job.seniority}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <span>{new Date(selectedJob.job.posted_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Job Description</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{selectedJob.job.description}</p>
                    </div>

                    {selectedJob.job.skills_extracted?.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.job.skills_extracted.map((skill) => (
                            <Badge key={skill} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                      <div className="flex gap-3 pt-4">
                        {!application ? (
                          <Button 
                            onClick={() => {
                              applyToJob(selectedJob.job.id, selectedJob.job.title, selectedJob.job.company);
                            }} 
                            className="bg-gradient-primary flex-1"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Save to Tracker
                          </Button>
                        ) : application.status === "planned" ? (
                          <Button 
                            onClick={() => openApplyDialog(selectedJob.job.id, selectedJob.job.title, selectedJob.job.company, selectedJob.job.url, selectedJob.job.description)}
                            className="bg-gradient-primary flex-1"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Apply Now
                          </Button>
                        ) : null}
                        
                        {selectedJob.job.url && application && application.status !== "planned" && (
                          <Button 
                            variant="outline"
                            className="flex-1"
                            onClick={() => window.open(selectedJob.job.url, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Job Posting
                          </Button>
                        )}
                      </div>
                    </div>
                    </div>

                    {/* Similar Jobs Sidebar */}
                    <div className="md:col-span-1">
                      <SimilarJobs
                        currentJob={selectedJob.job}
                        allJobs={matches.map(m => m.job_postings)}
                        onJobClick={(job) => {
                          const match = matches.find(m => m.job_postings.id === job.id);
                          if (match) setSelectedJob({ job, match });
                        }}
                      />
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>

          <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">Ready to Apply?</DialogTitle>
                <DialogDescription>
                  Prepare your application for <span className="font-semibold text-foreground">{applyingJob?.title}</span> at <span className="font-semibold text-foreground">{applyingJob?.company}</span>
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="prepare" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="prepare">Prepare</TabsTrigger>
                  <TabsTrigger value="cover-letter" disabled={!selectedResumeId}>Cover Letter</TabsTrigger>
                  <TabsTrigger value="health" disabled={!selectedResumeId}>Health Score</TabsTrigger>
                </TabsList>

                <TabsContent value="prepare" className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Select Resume</h3>
                    {resumes.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center">
                          <FileText className="w-12 h-12 text-muted-foreground mb-3 mx-auto" />
                          <p className="text-sm text-muted-foreground mb-3">No resumes uploaded yet</p>
                          <Button variant="outline" size="sm" onClick={() => window.location.href = '/resumes'}>
                            Upload Resume
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <Select value={selectedResumeId || ""} onValueChange={setSelectedResumeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a resume" />
                        </SelectTrigger>
                        <SelectContent>
                          {resumes.map((resume) => (
                            <SelectItem key={resume.id} value={resume.id}>
                              {resume.file_name} {resume.ats_score && `(${resume.ats_score}% ATS)`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="cover-letter" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        AI Cover Letter Generator
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!coverLetter ? (
                        <div className="text-center py-8">
                          <Button onClick={generateCoverLetter} disabled={generatingCoverLetter} className="bg-gradient-primary">
                            {generatingCoverLetter && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Generate Cover Letter
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={12} />
                          <Button onClick={generateCoverLetter} variant="outline" size="sm">
                            Regenerate
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="health" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Application Health Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!healthScore ? (
                        <div className="text-center py-8">
                          <Button onClick={calculateHealthScore} disabled={loadingHealthScore}>
                            {loadingHealthScore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Calculate Score
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-primary">{healthScore.percentage}/100</div>
                            <Progress value={healthScore.percentage} className="mt-2" />
                          </div>
                          <div className="space-y-2">
                            {healthScore.factors.map((f: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/50">
                                <span className="text-sm">{f.factor}</span>
                                <Badge variant={f.status === "good" ? "default" : "secondary"}>
                                  {f.points}/{f.maxPoints}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setApplyDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleApplySubmit} disabled={!selectedResumeId} className="bg-gradient-primary flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  {applyingJob?.url ? "Apply on Company Site" : "Mark as Applied"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="alerts">
          <JobAlertsTab profileId={profileId} />
        </TabsContent>

        <TabsContent value="companies" className="space-y-6">
          <CompanyResearch allJobs={matches.map(m => m.job_postings)} />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <SalaryInsights 
            jobs={filteredMatches.map(m => m.job_postings)} 
            userTargetMin={profile?.salary_range_min}
            userTargetMax={profile?.salary_range_max}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
