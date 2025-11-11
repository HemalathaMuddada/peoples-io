import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Users, TrendingUp, Eye, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface JobPosting {
  id: string;
  title: string;
  location: string;
  status: string;
  created_at: string;
  application_count: number;
}

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  interviewStage: number;
  offerStage: number;
}

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    interviewStage: 0,
    offerStage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    checkRecruiterRoleAndFetch();
  }, []);

  const checkRecruiterRoleAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has recruiter role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, org_id, organizations(company_name)')
        .eq('user_id', user.id);

      const hasRecruiterRole = roles?.some(r => r.role === 'recruiter');
      const hasPlatformAdminRole = roles?.some(r => r.role === 'platform_admin');
      
      if (!hasRecruiterRole) {
        if (hasPlatformAdminRole && roles?.length === 1) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
        return;
      }

      // Set company name
      const orgInfo = roles?.find(r => r.org_id);
      if (orgInfo) {
        setCompanyName((orgInfo as any).organizations?.company_name || "Your Company");
      }

      // Fetch company data
      await fetchCompanyData(roles[0].org_id);
    } catch (error) {
      console.error("Error checking role:", error);
      navigate("/dashboard");
    }
  };

  const fetchCompanyData = async (orgId: string) => {
    try {
      // Fetch jobs
      const { data: jobsData, error: jobsError } = await (supabase as any)
        .from("job_postings")
        .select("id, title, location, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;

      // Get application counts for each job
      const jobsWithCounts = await Promise.all(
        (jobsData || []).map(async (job: any) => {
          const { count } = await (supabase as any)
            .from("job_applications")
            .select("id", { count: "exact", head: true })
            .eq("job_id", job.id);

          return {
            ...job,
            status: "active", // Default status since table doesn't have this column
            application_count: count || 0,
          };
        })
      );

      setJobs(jobsWithCounts);

      // Calculate stats
      const totalApplications = jobsWithCounts.reduce((sum, job) => sum + job.application_count, 0);
      const activeJobs = jobsWithCounts.length; // All jobs are considered active

      // Get interview and offer counts
      const jobIds = jobsData?.map(j => j.id) || [];
      let interviewCount = 0;
      let offerCount = 0;

      if (jobIds.length > 0) {
        const { count: interviews } = await (supabase as any)
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .in("job_id", jobIds)
          .eq("status", "interview");

        const { count: offers } = await (supabase as any)
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .in("job_id", jobIds)
          .eq("status", "offer");

        interviewCount = interviews || 0;
        offerCount = offers || 0;
      }

      setStats({
        totalJobs: jobsData?.length || 0,
        activeJobs,
        totalApplications,
        interviewStage: interviewCount,
        offerStage: offerCount,
      });
    } catch (error) {
      console.error("Error fetching company data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "draft":
        return "outline";
      case "closed":
        return "secondary";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recruiter Dashboard</h1>
          <p className="text-muted-foreground">
            Manage hiring for {companyName}
          </p>
        </div>
        <Button onClick={() => navigate("/recruiter/post-job")}>
          <Plus className="h-4 w-4 mr-2" />
          Post New Job
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJobs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeJobs} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">Currently hiring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">Total received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviewStage}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.offerStage}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalApplications > 0
                ? `${Math.round((stats.offerStage / stats.totalApplications) * 100)}% rate`
                : "0% rate"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Job List */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="active">
            Active ({jobs.filter(j => j.status === "active").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                <Button onClick={() => navigate("/recruiter/post-job")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Your First Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription className="mt-1">{job.location}</CardDescription>
                        <div className="mt-2">
                          <Badge variant={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {job.application_count}
                        </p>
                        <p className="text-xs text-muted-foreground">Applications</p>
                      </div>
                      <Link to={`/recruiter/job-matches?job=${job.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Candidates
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs
              .filter(j => j.status === "active")
              .map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription className="mt-1">{job.location}</CardDescription>
                        <div className="mt-2">
                          <Badge variant="default">Active</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {job.application_count}
                        </p>
                        <p className="text-xs text-muted-foreground">Applications</p>
                      </div>
                      <Link to={`/recruiter/job-matches?job=${job.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Candidates
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
