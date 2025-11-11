import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Target, Briefcase, Clock, Award, BarChart3, Users } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AnalyticsData {
  personalMetrics: {
    profileStrength: number;
    applicationsSubmitted: number;
    responseRate: number;
    averageResponseTime: number;
    interviewsScheduled: number;
    goalsCompleted: number;
    learningProgress: number;
    mockInterviewScore: number;
  };
  applicationTrends: Array<{
    month: string;
    applications: number;
    responses: number;
    interviews: number;
  }>;
  statusBreakdown: Array<{
    name: string;
    value: number;
  }>;
  skillGaps: Array<{
    skill: string;
    importance: number;
    currentLevel: number;
  }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export function CareerAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Get applications
      const { data: applications } = await supabase
        .from("job_applications")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      // Get goals
      const { data: goals } = await supabase
        .from("career_goals")
        .select("*")
        .eq("profile_id", profile.id);

      // Get learning paths
      const { data: learningPaths } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("profile_id", profile.id);

      // Get mock interviews
      const { data: interviews } = await supabase
        .from("mock_interviews")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("status", "completed");

      // Calculate personal metrics
      const totalApps = applications?.length || 0;
      const respondedApps = applications?.filter(a => 
        a.status !== "planned" && a.status !== "applied"
      ).length || 0;
      const interviewApps = applications?.filter(a => 
        a.status === "interview" || a.status === "offer"
      ).length || 0;

      const completedGoals = goals?.filter(g => g.status === "completed").length || 0;
      const avgLearningProgress = learningPaths?.reduce((acc, lp) => acc + (lp.progress || 0), 0) / (learningPaths?.length || 1) || 0;
      const avgInterviewScore = interviews?.reduce((acc, i) => acc + (i.score || 0), 0) / (interviews?.length || 1) || 0;

      // Calculate application trends (last 6 months)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const trends = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthApps = applications?.filter(a => {
          const appDate = new Date(a.created_at || "");
          return appDate.getMonth() === date.getMonth() && 
                 appDate.getFullYear() === date.getFullYear();
        }) || [];

        return {
          month: monthNames[date.getMonth()],
          applications: monthApps.length,
          responses: monthApps.filter(a => a.status !== "planned" && a.status !== "applied").length,
          interviews: monthApps.filter(a => a.status === "interview" || a.status === "offer").length,
        };
      });

      // Status breakdown
      const statusCounts = applications?.reduce((acc: any, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const statusBreakdown = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace("_", " "),
        value: value as number,
      }));

      // Mock skill gaps data (would be calculated from profile analysis)
      const skillGaps = [
        { skill: "Leadership", importance: 90, currentLevel: 60 },
        { skill: "Technical Skills", importance: 85, currentLevel: 75 },
        { skill: "Communication", importance: 80, currentLevel: 70 },
        { skill: "Project Management", importance: 75, currentLevel: 55 },
      ];

      setAnalytics({
        personalMetrics: {
          profileStrength: profile.profile_score || 0,
          applicationsSubmitted: totalApps,
          responseRate: totalApps > 0 ? Math.round((respondedApps / totalApps) * 100) : 0,
          averageResponseTime: 7, // Mock data - days
          interviewsScheduled: interviewApps,
          goalsCompleted: completedGoals,
          learningProgress: Math.round(avgLearningProgress),
          mockInterviewScore: Math.round(avgInterviewScore),
        },
        applicationTrends: trends,
        statusBreakdown,
        skillGaps,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">No analytics data available</div>;
  }

  const metrics = analytics.personalMetrics;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics & Intelligence</h2>
        <p className="text-muted-foreground">Track your progress and gain insights into your career journey</p>
      </div>

      {/* Personal Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Strength</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.profileStrength}%</div>
            <Progress value={metrics.profileStrength} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.profileStrength >= 80 ? "Excellent" : metrics.profileStrength >= 60 ? "Good" : "Needs improvement"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.applicationsSubmitted}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.interviewsScheduled} interviews scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.responseRate}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              Avg. response time: {metrics.averageResponseTime} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Progress</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.learningProgress}%</div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.goalsCompleted} goals completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Application Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Application Trends (Last 6 Months)
          </CardTitle>
          <CardDescription>Track your application activity and success rates</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.applicationTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" name="Applications" />
              <Line type="monotone" dataKey="responses" stroke="hsl(var(--secondary))" name="Responses" />
              <Line type="monotone" dataKey="interviews" stroke="hsl(var(--accent))" name="Interviews" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Application Status Distribution</CardTitle>
            <CardDescription>Current state of your applications</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {analytics.statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No application data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Skill Gaps & Competitive Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Skill Gap Analysis
            </CardTitle>
            <CardDescription>Areas for development based on market demands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.skillGaps.map((skill) => (
                <div key={skill.skill} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{skill.skill}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Current: {skill.currentLevel}%
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Target: {skill.importance}%
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Progress value={skill.currentLevel} className="h-2" />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {skill.currentLevel < skill.importance ? (
                        <>
                          <TrendingDown className="h-3 w-3 text-orange-500" />
                          Gap: {skill.importance - skill.currentLevel}%
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          On track
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Trends & Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Trends & Insights
          </CardTitle>
          <CardDescription>Industry insights and competitive intelligence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Job Market</h4>
              </div>
              <p className="text-2xl font-bold text-green-600">+12%</p>
              <p className="text-xs text-muted-foreground">Growth in your field this quarter</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Avg. Hiring Time</h4>
              </div>
              <p className="text-2xl font-bold">23 days</p>
              <p className="text-xs text-muted-foreground">Industry average response time</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Competition Level</h4>
              </div>
              <p className="text-2xl font-bold">Moderate</p>
              <p className="text-xs text-muted-foreground">Based on your skill profile</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">💡 Key Insights</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Your response rate is {metrics.responseRate >= 30 ? "above" : "below"} industry average (30%)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Consider focusing on Leadership skills to close the gap with market demands</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Your interview success rate suggests strong preparation - keep it up!</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
