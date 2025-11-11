import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, TrendingUp, Users, Briefcase, MessageSquare, Award } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Recruiter {
  id: string;
  full_name: string;
  email: string;
  total_placements: number;
  avg_rating: number;
  active_jobs: number;
}

interface JobPerformance {
  id: string;
  job_title: string;
  company: string;
  posted_at: string;
  applications: number;
  interviews: number;
  placements: number;
  status: string;
}

interface Feedback {
  id: string;
  rating: number;
  feedback_text: string;
  created_at: string;
  recruiter_name: string;
}

export default function EmployerPortal() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [jobPerformance, setJobPerformance] = useState<JobPerformance[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [relationshipId, setRelationshipId] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is org_admin or hiring_manager
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, org_id")
        .eq("user_id", user.id)
        .in("role", ["org_admin", "hiring_manager"]);

      if (!roles || roles.length === 0) {
        toast.error("Access denied. This portal is for employers only.");
        navigate("/dashboard");
        return;
      }

      await fetchDashboardData(roles[0].org_id);
    } catch (error) {
      console.error("Error checking access:", error);
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async (orgId: string) => {
    try {
      // Fetch assigned recruiters and their performance
      const { data: relationships } = await (supabase as any)
        .from("agency_client_relationships")
        .select(`
          id,
          agency_org_id,
          status,
          client_recruiter_assignments (
            recruiter_id,
            profiles!client_recruiter_assignments_recruiter_id_fkey (
              id,
              full_name,
              email
            )
          )
        `)
        .eq("employer_org_id", orgId)
        .eq("status", "approved");

      if (relationships && relationships.length > 0) {
        setRelationshipId(relationships[0].id);
        const recruiterIds = relationships.flatMap((r: any) => 
          r.client_recruiter_assignments?.map((a: any) => a.recruiter_id) || []
        );

        // Fetch performance data for recruiters
        const { data: performance } = await (supabase as any)
          .from("recruiter_performance")
          .select("*")
          .in("recruiter_id", recruiterIds);

        // Combine data
        const recruitersData = relationships.flatMap((r: any) => 
          r.client_recruiter_assignments?.map((a: any) => {
            const perf = performance?.find((p: any) => p.recruiter_id === a.recruiter_id);
            return {
              id: a.profiles.id,
              full_name: a.profiles.full_name,
              email: a.profiles.email,
              total_placements: perf?.total_placements || 0,
              avg_rating: perf?.avg_client_satisfaction || 0,
              active_jobs: 0
            };
          }) || []
        );

        setRecruiters(recruitersData);

        // Fetch job postings created by these agencies
        const { data: jobs } = await (supabase as any)
          .from("job_postings")
          .select("*")
          .eq("employer_org_id", orgId)
          .eq("posted_by_agency", true)
          .order("created_at", { ascending: false })
          .limit(10);

        if (jobs) {
          setJobPerformance(jobs.map((job: any) => ({
            id: job.id,
            job_title: job.job_title,
            company: job.company,
            posted_at: job.created_at,
            applications: 0,
            interviews: 0,
            placements: 0,
            status: job.status || "active"
          })));
        }
      }

      // Fetch feedback history
      const { data: feedback } = await (supabase as any)
        .from("recruiter_client_feedback")
        .select(`
          id,
          rating,
          feedback_text,
          created_at,
          recruiter_id,
          profiles!recruiter_client_feedback_recruiter_id_fkey (
            full_name
          )
        `)
        .eq("employer_org_id", orgId)
        .order("created_at", { ascending: false });

      if (feedback) {
        setFeedbackHistory(feedback.map((f: any) => ({
          id: f.id,
          rating: f.rating,
          feedback_text: f.feedback_text,
          created_at: f.created_at,
          recruiter_name: f.profiles?.full_name || "Unknown"
        })));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedRecruiter || rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!relationshipId) {
      toast.error("No active relationship found");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("org_id")
        .eq("user_id", user?.id)
        .single();

      if (!roles) {
        throw new Error("Could not find organization");
      }

      const { error } = await (supabase as any)
        .from("recruiter_client_feedback")
        .insert({
          relationship_id: relationshipId,
          recruiter_id: selectedRecruiter,
          employer_org_id: roles.org_id,
          submitted_by: user?.id,
          rating,
          feedback_text: feedbackText,
          categories: []
        });

      if (error) throw error;

      toast.success("Feedback submitted successfully!");
      setDialogOpen(false);
      setRating(0);
      setFeedbackText("");
      setSelectedRecruiter(null);
      
      // Refresh data
      await fetchDashboardData(roles.org_id);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number, interactive = false, onClick?: (n: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-5 w-5 ${
              n <= count
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            onClick={() => interactive && onClick && onClick(n)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employer Portal</h1>
        <p className="text-muted-foreground">Manage your agency relationships and track performance</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Recruiters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recruiters.length}</div>
            <p className="text-xs text-muted-foreground">Active partnerships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Placements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recruiters.reduce((sum, r) => sum + r.total_placements, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Successful hires</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Job Postings</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobPerformance.length}</div>
            <p className="text-xs text-muted-foreground">Currently recruiting</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="recruiters" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recruiters">Recruiters</TabsTrigger>
          <TabsTrigger value="performance">Job Performance</TabsTrigger>
          <TabsTrigger value="feedback">Feedback History</TabsTrigger>
        </TabsList>

        <TabsContent value="recruiters" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your Assigned Recruiters</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {recruiters.map((recruiter) => (
              <Card key={recruiter.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{recruiter.full_name}</CardTitle>
                      <CardDescription>{recruiter.email}</CardDescription>
                    </div>
                    <Dialog open={dialogOpen && selectedRecruiter === recruiter.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (open) setSelectedRecruiter(recruiter.id);
                      else setSelectedRecruiter(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Rate
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rate {recruiter.full_name}</DialogTitle>
                          <DialogDescription>
                            Share your experience working with this recruiter
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Rating</Label>
                            {renderStars(rating, true, setRating)}
                          </div>
                          <div>
                            <Label htmlFor="feedback">Feedback (Optional)</Label>
                            <Textarea
                              id="feedback"
                              placeholder="Share your thoughts..."
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              rows={4}
                            />
                          </div>
                          <Button
                            onClick={handleSubmitFeedback}
                            disabled={submitting || rating === 0}
                            className="w-full"
                          >
                            {submitting ? "Submitting..." : "Submit Feedback"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Performance</span>
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(recruiter.avg_rating))}
                      <span className="text-sm font-medium">
                        {recruiter.avg_rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Placements</span>
                    <Badge variant="secondary">{recruiter.total_placements}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}

            {recruiters.length === 0 && (
              <Card className="col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No recruiters assigned yet. Contact your agency partner to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <h2 className="text-xl font-semibold">Job Posting Performance</h2>
          
          <div className="space-y-3">
            {jobPerformance.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{job.job_title}</CardTitle>
                      <CardDescription>{job.company}</CardDescription>
                    </div>
                    <Badge>{job.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{job.applications}</div>
                      <div className="text-xs text-muted-foreground">Applications</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{job.interviews}</div>
                      <div className="text-xs text-muted-foreground">Interviews</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{job.placements}</div>
                      <div className="text-xs text-muted-foreground">Placements</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {jobPerformance.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No active job postings yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <h2 className="text-xl font-semibold">Feedback History</h2>
          
          <div className="space-y-3">
            {feedbackHistory.map((feedback) => (
              <Card key={feedback.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{feedback.recruiter_name}</CardTitle>
                      <CardDescription>
                        {new Date(feedback.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {renderStars(feedback.rating)}
                  </div>
                </CardHeader>
                {feedback.feedback_text && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feedback.feedback_text}</p>
                  </CardContent>
                )}
              </Card>
            ))}

            {feedbackHistory.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    No feedback submitted yet. Rate your recruiters to see history here.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}