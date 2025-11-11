import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Users, TrendingUp, Award, Target } from "lucide-react";

interface TeamMetrics {
  team_id: string;
  team_name: string;
  total_interviews: number;
  avg_overall_rating: number;
  avg_technical_rating: number;
  avg_communication_rating: number;
  avg_culture_fit_rating: number;
  avg_problem_solving_rating: number;
  hire_rate: number;
  member_count: number;
}

export default function TeamPerformanceAnalytics() {
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeamMetrics();
  }, []);

  const fetchTeamMetrics = async () => {
    try {
      setIsLoading(true);

      // Fetch all teams
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name");

      if (teamsError) throw teamsError;

      if (!teams || teams.length === 0) {
        setTeamMetrics([]);
        return;
      }

      // Fetch metrics for each team
      const metricsPromises = teams.map(async (team) => {
        // Get team members
        const { data: members, error: membersError } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", team.id);

        if (membersError) throw membersError;

        const memberIds = members?.map(m => m.user_id) || [];
        const memberCount = memberIds.length;

        if (memberIds.length === 0) {
          return {
            team_id: team.id,
            team_name: team.name,
            total_interviews: 0,
            avg_overall_rating: 0,
            avg_technical_rating: 0,
            avg_communication_rating: 0,
            avg_culture_fit_rating: 0,
            avg_problem_solving_rating: 0,
            hire_rate: 0,
            member_count: 0,
          };
        }

        // Get profiles for these users
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", memberIds);

        if (profilesError) throw profilesError;

        const profileNames = profiles?.map(p => p.full_name).filter(Boolean) || [];

        if (profileNames.length === 0) {
          return {
            team_id: team.id,
            team_name: team.name,
            total_interviews: 0,
            avg_overall_rating: 0,
            avg_technical_rating: 0,
            avg_communication_rating: 0,
            avg_culture_fit_rating: 0,
            avg_problem_solving_rating: 0,
            hire_rate: 0,
            member_count: memberCount,
          };
        }

        // Get feedback for interviews conducted by team members
        const { data: feedbackData, error: feedbackError } = await supabase
          .from("interview_feedback")
          .select(`
            overall_rating,
            technical_skills_rating,
            communication_rating,
            culture_fit_rating,
            problem_solving_rating,
            recommendation,
            interviews!inner(interviewer_name)
          `);

        if (feedbackError) throw feedbackError;

        // Filter feedback for team members
        const interviewsWithFeedback = (feedbackData || []).filter((f: any) => 
          f.interviews && profileNames.includes(f.interviews.interviewer_name)
        );

        const totalInterviews = interviewsWithFeedback.length;

        if (totalInterviews === 0) {
          return {
            team_id: team.id,
            team_name: team.name,
            total_interviews: 0,
            avg_overall_rating: 0,
            avg_technical_rating: 0,
            avg_communication_rating: 0,
            avg_culture_fit_rating: 0,
            avg_problem_solving_rating: 0,
            hire_rate: 0,
            member_count: memberCount,
          };
        }

        // Calculate averages
        let totalOverall = 0;
        let totalTechnical = 0;
        let totalCommunication = 0;
        let totalCultureFit = 0;
        let totalProblemSolving = 0;
        let hireRecommendations = 0;

        interviewsWithFeedback.forEach((feedback: any) => {
          totalOverall += feedback.overall_rating || 0;
          totalTechnical += feedback.technical_skills_rating || 0;
          totalCommunication += feedback.communication_rating || 0;
          totalCultureFit += feedback.culture_fit_rating || 0;
          totalProblemSolving += feedback.problem_solving_rating || 0;
          if (feedback.recommendation === "strong_hire" || feedback.recommendation === "hire") {
            hireRecommendations++;
          }
        });

        return {
          team_id: team.id,
          team_name: team.name,
          total_interviews: totalInterviews,
          avg_overall_rating: Number((totalOverall / totalInterviews).toFixed(2)),
          avg_technical_rating: Number((totalTechnical / totalInterviews).toFixed(2)),
          avg_communication_rating: Number((totalCommunication / totalInterviews).toFixed(2)),
          avg_culture_fit_rating: Number((totalCultureFit / totalInterviews).toFixed(2)),
          avg_problem_solving_rating: Number((totalProblemSolving / totalInterviews).toFixed(2)),
          hire_rate: Number(((hireRecommendations / totalInterviews) * 100).toFixed(1)),
          member_count: memberCount,
        };
      });

      const metrics = await Promise.all(metricsPromises);
      setTeamMetrics(metrics.filter(m => m.total_interviews > 0));
    } catch (error) {
      console.error("Error fetching team metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (teamMetrics.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Team Performance Analytics</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">No team interview data available yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const topTeam = [...teamMetrics].sort((a, b) => b.avg_overall_rating - a.avg_overall_rating)[0];
  const totalInterviews = teamMetrics.reduce((sum, t) => sum + t.total_interviews, 0);
  const avgHireRate = teamMetrics.reduce((sum, t) => sum + t.hire_rate, 0) / teamMetrics.length;
  const totalMembers = teamMetrics.reduce((sum, t) => sum + t.member_count, 0);

  // Prepare data for overall ratings chart
  const overallRatingsData = teamMetrics.map((team) => ({
    name: team.team_name,
    "Overall Rating": team.avg_overall_rating,
    "Hire Rate": team.hire_rate,
  }));

  // Prepare data for skills comparison radar chart
  const skillsComparisonData = teamMetrics.map((team) => ({
    team: team.team_name,
    Technical: team.avg_technical_rating,
    Communication: team.avg_communication_rating,
    "Culture Fit": team.avg_culture_fit_rating,
    "Problem Solving": team.avg_problem_solving_rating,
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Team Performance Analytics</h1>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMetrics.length}</div>
            <p className="text-xs text-muted-foreground">{totalMembers} total members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInterviews}</div>
            <p className="text-xs text-muted-foreground">Across all teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hire Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgHireRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Company average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Team</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topTeam.team_name}</div>
            <p className="text-xs text-muted-foreground">{topTeam.avg_overall_rating.toFixed(1)} avg rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Ratings Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance Overview</CardTitle>
          <CardDescription>Average overall rating and hire rate by team</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={overallRatingsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="Overall Rating" fill="hsl(var(--primary))" />
              <Bar yAxisId="right" dataKey="Hire Rate" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Skills Radar Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {teamMetrics.map((team) => (
          <Card key={team.team_id}>
            <CardHeader>
              <CardTitle>{team.team_name}</CardTitle>
              <CardDescription>
                {team.total_interviews} interviews • {team.member_count} members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  { subject: "Technical", value: team.avg_technical_rating, fullMark: 5 },
                  { subject: "Communication", value: team.avg_communication_rating, fullMark: 5 },
                  { subject: "Culture Fit", value: team.avg_culture_fit_rating, fullMark: 5 },
                  { subject: "Problem Solving", value: team.avg_problem_solving_rating, fullMark: 5 },
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} />
                  <Radar name={team.team_name} dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall Rating:</span>
                  <span className="font-semibold">{team.avg_overall_rating.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hire Rate:</span>
                  <span className="font-semibold">{team.hire_rate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
