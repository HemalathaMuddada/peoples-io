import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Mail,
  CheckCircle,
  Activity,
  Trophy,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamMetrics {
  teamId: string;
  teamName: string;
  totalMembers: number;
  activeMembers: number;
  totalInvitations: number;
  acceptedInvitations: number;
  acceptanceRate: number;
  recentActivity: number;
  activityPerMember: number;
}

export default function TeamComparison() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    fetchTeamsMetrics();
  }, []);

  const fetchTeamsMetrics = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all teams user has access to
      const { data: userTeams, error: teamsError } = await supabase
        .from("team_members")
        .select("team:teams(id, name)")
        .eq("user_id", user.id);

      if (teamsError) throw teamsError;

      const teamsList = userTeams?.map((tm: any) => tm.team).filter(Boolean) || [];

      // Fetch metrics for each team
      const metricsPromises = teamsList.map(async (team: any) => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get members
        const { data: members } = await supabase
          .from("team_members")
          .select("joined_at")
          .eq("team_id", team.id);

        // Get invitations
        const { data: invitations } = await supabase
          .from("team_invitations")
          .select("accepted_at")
          .eq("team_id", team.id);

        // Get activity
        const { data: activities } = await supabase
          .from("team_activity_log")
          .select("id")
          .eq("team_id", team.id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        const totalMembers = members?.length || 0;
        const activeMembers = members?.filter((m) => 
          new Date(m.joined_at) >= thirtyDaysAgo
        ).length || 0;
        const totalInvitations = invitations?.length || 0;
        const acceptedInvitations = invitations?.filter((i) => i.accepted_at).length || 0;
        const recentActivity = activities?.length || 0;

        return {
          teamId: team.id,
          teamName: team.name,
          totalMembers,
          activeMembers,
          totalInvitations,
          acceptedInvitations,
          acceptanceRate: totalInvitations > 0 
            ? Math.round((acceptedInvitations / totalInvitations) * 100) 
            : 0,
          recentActivity,
          activityPerMember: totalMembers > 0 
            ? Math.round((recentActivity / totalMembers) * 10) / 10 
            : 0,
        };
      });

      const metrics = await Promise.all(metricsPromises);
      setTeams(metrics);
      generateInsights(metrics);
    } catch (error) {
      console.error("Error fetching team metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (metrics: TeamMetrics[]) => {
    const newInsights: string[] = [];

    if (metrics.length === 0) return;

    // Find top performers
    const topByMembers = [...metrics].sort((a, b) => b.totalMembers - a.totalMembers)[0];
    const topByAcceptance = [...metrics].sort((a, b) => b.acceptanceRate - a.acceptanceRate)[0];
    const topByActivity = [...metrics].sort((a, b) => b.activityPerMember - a.activityPerMember)[0];

    if (topByMembers) {
      newInsights.push(
        `${topByMembers.teamName} is the largest team with ${topByMembers.totalMembers} members.`
      );
    }

    if (topByAcceptance && topByAcceptance.acceptanceRate > 0) {
      newInsights.push(
        `${topByAcceptance.teamName} has the highest invitation acceptance rate at ${topByAcceptance.acceptanceRate}%.`
      );
    }

    if (topByActivity && topByActivity.activityPerMember > 0) {
      newInsights.push(
        `${topByActivity.teamName} is the most active with ${topByActivity.activityPerMember} activities per member.`
      );
    }

    // Calculate averages
    const avgMembers = Math.round(
      metrics.reduce((sum, t) => sum + t.totalMembers, 0) / metrics.length
    );
    const avgAcceptance = Math.round(
      metrics.reduce((sum, t) => sum + t.acceptanceRate, 0) / metrics.length
    );

    newInsights.push(
      `Average team size is ${avgMembers} members with ${avgAcceptance}% average acceptance rate.`
    );

    // Find teams needing attention
    const lowActivity = metrics.filter((t) => t.activityPerMember < 2 && t.totalMembers > 0);
    if (lowActivity.length > 0) {
      newInsights.push(
        `${lowActivity.length} team(s) have low activity and may need engagement initiatives.`
      );
    }

    setInsights(newInsights);
  };

  const getBenchmarkIcon = (value: number, avg: number) => {
    if (value > avg * 1.2) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < avg * 0.8) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getPerformanceBadge = (value: number, avg: number) => {
    if (value > avg * 1.2) return <Badge className="bg-green-500">Above Average</Badge>;
    if (value < avg * 0.8) return <Badge variant="destructive">Below Average</Badge>;
    return <Badge variant="secondary">Average</Badge>;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading team comparison...</p>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate("/teams")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Teams Available</h3>
            <p className="text-muted-foreground mb-4">
              You need to be a member of at least one team to view comparisons.
            </p>
            <Button onClick={() => navigate("/teams")}>View Teams</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate averages for benchmarking
  const avgMembers = teams.reduce((sum, t) => sum + t.totalMembers, 0) / teams.length;
  const avgAcceptance = teams.reduce((sum, t) => sum + t.acceptanceRate, 0) / teams.length;
  const avgActivity = teams.reduce((sum, t) => sum + t.activityPerMember, 0) / teams.length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate("/teams")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
          <h1 className="text-3xl font-bold">Team Performance Comparison</h1>
          <p className="text-muted-foreground">
            Compare metrics across {teams.length} teams
          </p>
        </div>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Key Insights
          </CardTitle>
          <CardDescription>
            Top performers and organizational trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Metrics Comparison</CardTitle>
          <CardDescription>
            Side-by-side performance metrics with benchmarking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Total Members</TableHead>
                <TableHead>New Members (30d)</TableHead>
                <TableHead>Invitations</TableHead>
                <TableHead>Acceptance Rate</TableHead>
                <TableHead>Activity (30d)</TableHead>
                <TableHead>Activity/Member</TableHead>
                <TableHead>Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow 
                  key={team.teamId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/teams/${team.teamId}`)}
                >
                  <TableCell className="font-medium">{team.teamName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {team.totalMembers}
                      {getBenchmarkIcon(team.totalMembers, avgMembers)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{team.activeMembers}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {team.totalInvitations}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {team.acceptanceRate}%
                      {getBenchmarkIcon(team.acceptanceRate, avgAcceptance)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      {team.recentActivity}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {team.activityPerMember}
                      {getBenchmarkIcon(team.activityPerMember, avgActivity)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPerformanceBadge(
                      (team.totalMembers + team.acceptanceRate + team.activityPerMember) / 3,
                      (avgMembers + avgAcceptance + avgActivity) / 3
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {/* Average Row */}
              <TableRow className="font-medium bg-muted/50">
                <TableCell>Organization Average</TableCell>
                <TableCell>{Math.round(avgMembers)}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  {Math.round(
                    teams.reduce((sum, t) => sum + t.totalInvitations, 0) / teams.length
                  )}
                </TableCell>
                <TableCell>{Math.round(avgAcceptance)}%</TableCell>
                <TableCell>
                  {Math.round(
                    teams.reduce((sum, t) => sum + t.recentActivity, 0) / teams.length
                  )}
                </TableCell>
                <TableCell>{Math.round(avgActivity * 10) / 10}</TableCell>
                <TableCell>Benchmark</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Benchmark Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm">Above Average (20%+ higher)</span>
            </div>
            <div className="flex items-center gap-2">
              <Minus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Average (within 20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-sm">Below Average (20%+ lower)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
