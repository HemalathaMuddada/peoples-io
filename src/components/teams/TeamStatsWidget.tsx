import { useEffect, useState } from "react";
import { useTeam } from "@/contexts/TeamContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileText, Mail, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface TeamStats {
  jobs: number;
  applications: number;
  invitations: number;
}

interface ComparisonStats extends TeamStats {
  avgJobs: number;
  avgApplications: number;
  avgInvitations: number;
}

export function TeamStatsWidget() {
  const { selectedTeam } = useTeam();
  const [stats, setStats] = useState<ComparisonStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (selectedTeam) {
      fetchStats();
    } else {
      setStats(null);
      setIsLoading(false);
    }
  }, [selectedTeam]);

  const fetchStats = async () => {
    if (!selectedTeam) return;

    setIsLoading(true);
    try {
      // Fetch team-specific stats
      const [jobsRes, appsRes, invitesRes] = await Promise.all([
        supabase
          .from("job_postings")
          .select("id", { count: "exact", head: true })
          .eq("team_id", selectedTeam.id),
        supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("team_id", selectedTeam.id),
        supabase
          .from("company_invitations")
          .select("id", { count: "exact", head: true })
          .eq("team_id", selectedTeam.id),
      ]);

      // Fetch all teams stats for averages
      const [allJobsRes, allAppsRes, allInvitesRes, teamsCountRes] = await Promise.all([
        supabase
          .from("job_postings")
          .select("id", { count: "exact", head: true })
          .not("team_id", "is", null),
        supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .not("team_id", "is", null),
        supabase
          .from("company_invitations")
          .select("id", { count: "exact", head: true })
          .not("team_id", "is", null),
        supabase
          .from("teams")
          .select("id", { count: "exact", head: true }),
      ]);

      const teamCount = teamsCountRes.count || 1;

      setStats({
        jobs: jobsRes.count || 0,
        applications: appsRes.count || 0,
        invitations: invitesRes.count || 0,
        avgJobs: (allJobsRes.count || 0) / teamCount,
        avgApplications: (allAppsRes.count || 0) / teamCount,
        avgInvitations: (allInvitesRes.count || 0) / teamCount,
      });
    } catch (error) {
      console.error("Error fetching team stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getComparisonBadge = (value: number, average: number) => {
    if (value > average) {
      return (
        <Badge variant="default" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          Above Avg
        </Badge>
      );
    } else if (value < average) {
      return (
        <Badge variant="secondary" className="gap-1">
          <TrendingDown className="h-3 w-3" />
          Below Avg
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Minus className="h-3 w-3" />
        Average
      </Badge>
    );
  };

  if (!selectedTeam) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Stats: {selectedTeam.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Team Stats: {selectedTeam.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Jobs */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span className="text-sm font-medium">Jobs</span>
            </div>
            <div className="text-3xl font-bold">{stats.jobs}</div>
            <div className="flex items-center gap-2">
              {getComparisonBadge(stats.jobs, stats.avgJobs)}
              <span className="text-xs text-muted-foreground">
                Avg: {stats.avgJobs.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Applications */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Applications</span>
            </div>
            <div className="text-3xl font-bold">{stats.applications}</div>
            <div className="flex items-center gap-2">
              {getComparisonBadge(stats.applications, stats.avgApplications)}
              <span className="text-xs text-muted-foreground">
                Avg: {stats.avgApplications.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Invitations */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="text-sm font-medium">Invitations</span>
            </div>
            <div className="text-3xl font-bold">{stats.invitations}</div>
            <div className="flex items-center gap-2">
              {getComparisonBadge(stats.invitations, stats.avgInvitations)}
              <span className="text-xs text-muted-foreground">
                Avg: {stats.avgInvitations.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
