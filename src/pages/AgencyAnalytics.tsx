import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Briefcase, 
  Building2, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock, 
  XCircle,
  BarChart3,
  DollarSign,
  Trophy
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

interface RelationshipMetrics {
  employer_name: string;
  employer_id: string;
  jobs_posted: number;
  applications_received: number;
  interviews_scheduled: number;
  offers_made: number;
  relationship_status: string;
  start_date: string;
}

interface OverviewMetrics {
  total_clients: number;
  active_relationships: number;
  pending_relationships: number;
  total_jobs_posted: number;
  total_applications: number;
  total_placements: number;
  placement_rate: number;
}

export default function AgencyAnalytics() {
  const [loading, setLoading] = useState(true);
  const [overviewMetrics, setOverviewMetrics] = useState<OverviewMetrics | null>(null);
  const [clientMetrics, setClientMetrics] = useState<RelationshipMetrics[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's agency org
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("org_id")
        .eq("user_id", user.id)
        .eq("role", "agency_admin")
        .single();

      if (!userRoles) {
        toast.error("You must be an agency admin to view analytics");
        return;
      }

      const agencyOrgId = userRoles.org_id;

      // Calculate date filter
      const dateFilter = getDateFilter(selectedPeriod);

      // Fetch relationships
      const { data: relationships, error: relError } = await supabase
        .from("agency_client_relationships")
        .select(`
          *,
          organizations!agency_client_relationships_employer_org_id_fkey(
            company_name,
            name
          )
        `)
        .eq("agency_org_id", agencyOrgId);

      if (relError) throw relError;

      // Fetch jobs posted by agency
      const jobsQuery = supabase
        .from("job_postings")
        .select("id, employer_org_id, created_at")
        .eq("posting_org_id", agencyOrgId)
        .eq("posted_by_agency", true);

      if (dateFilter) {
        jobsQuery.gte("created_at", dateFilter);
      }

      const { data: jobs, error: jobsError } = await jobsQuery;
      if (jobsError) throw jobsError;

      // Fetch applications for agency-posted jobs
      const jobIds = (jobs || []).map(j => j.id);
      let applications: any[] = [];
      
      if (jobIds.length > 0) {
        const { data: apps, error: appsError } = await (supabase as any)
          .from("job_applications")
          .select("id, job_id, status")
          .in("job_id", jobIds);

        if (appsError) throw appsError;
        applications = apps || [];
      }

      // Calculate metrics per client
      const clientMetricsMap = new Map<string, RelationshipMetrics>();

      relationships?.forEach(rel => {
        const employerName = rel.organizations?.company_name || rel.organizations?.name || "Unknown";
        const employerJobs = jobs?.filter(j => j.employer_org_id === rel.employer_org_id) || [];
        const employerJobIds = employerJobs.map(j => j.id);
        const employerApps = applications.filter(a => employerJobIds.includes(a.job_id));

        clientMetricsMap.set(rel.employer_org_id, {
          employer_name: employerName,
          employer_id: rel.employer_org_id,
          jobs_posted: employerJobs.length,
          applications_received: employerApps.length,
          interviews_scheduled: employerApps.filter(a => a.status === "interviewing").length,
          offers_made: employerApps.filter(a => a.status === "offer").length,
          relationship_status: rel.status,
          start_date: rel.start_date,
        });
      });

      setClientMetrics(Array.from(clientMetricsMap.values()));

      // Calculate overview metrics
      const totalPlacements = applications.filter(a => a.status === "offer").length;
      const overview: OverviewMetrics = {
        total_clients: relationships?.length || 0,
        active_relationships: relationships?.filter(r => r.status === "approved").length || 0,
        pending_relationships: relationships?.filter(r => r.status === "pending").length || 0,
        total_jobs_posted: jobs?.length || 0,
        total_applications: applications.length,
        total_placements: totalPlacements,
        placement_rate: applications.length > 0 
          ? Math.round((totalPlacements / applications.length) * 100) 
          : 0,
      };

      setOverviewMetrics(overview);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = (period: string): string | null => {
    const now = new Date();
    switch (period) {
      case "7d":
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case "30d":
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case "90d":
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case "declined":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Declined</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading analytics...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agency Analytics</h1>
          <p className="text-muted-foreground">Track your agency's performance and client relationships</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/agency-analytics-dashboard")} variant="default">
            <BarChart3 className="h-4 w-4 mr-2" />
            Detailed Analytics
          </Button>
          <Button onClick={() => navigate("/recruiter-leaderboard")} variant="outline">
            <Trophy className="h-4 w-4 mr-2" />
            Leaderboard
          </Button>
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics?.total_clients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overviewMetrics?.active_relationships || 0} active, {overviewMetrics?.pending_relationships || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs Posted</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics?.total_jobs_posted || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all client relationships
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics?.total_applications || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total candidates applied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Placements</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics?.total_placements || 0}</div>
            <p className="text-xs text-muted-foreground">
              {overviewMetrics?.placement_rate || 0}% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Client Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle>Client Performance Breakdown</CardTitle>
          </div>
          <CardDescription>
            Detailed metrics for each client relationship
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Jobs Posted</TableHead>
                <TableHead className="text-center">Applications</TableHead>
                <TableHead className="text-center">Interviews</TableHead>
                <TableHead className="text-center">Offers</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientMetrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No client data available
                  </TableCell>
                </TableRow>
              ) : (
                clientMetrics.map((client) => {
                  const successRate = client.applications_received > 0
                    ? Math.round((client.offers_made / client.applications_received) * 100)
                    : 0;

                  return (
                    <TableRow key={client.employer_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {client.employer_name}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(client.relationship_status)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{client.jobs_posted}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{client.applications_received}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{client.interviews_scheduled}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default">{client.offers_made}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-medium">{successRate}%</span>
                          <Progress value={successRate} className="w-20 h-2" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Relationship Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Partnerships</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {clientMetrics.filter(c => c.relationship_status === "approved").length}
            </div>
            <div className="mt-4 space-y-2">
              {clientMetrics
                .filter(c => c.relationship_status === "approved")
                .slice(0, 3)
                .map(client => (
                  <div key={client.employer_id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{client.employer_name}</span>
                    <span className="font-medium">{client.jobs_posted} jobs</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {clientMetrics.filter(c => c.relationship_status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Awaiting employer approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declined Requests</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {clientMetrics.filter(c => c.relationship_status === "declined").length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Review and improve proposals
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
