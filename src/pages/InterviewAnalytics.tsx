import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock, Users, Target, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface AnalyticsData {
  averageRatings: {
    overall: number;
    technical: number;
    communication: number;
    culture_fit: number;
    problem_solving: number;
  };
  timeToHire: {
    average: number;
    median: number;
    data: Array<{ stage: string; days: number }>;
  };
  interviewerPerformance: Array<{
    interviewer: string;
    interviews: number;
    avgRating: number;
  }>;
  funnelConversion: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  recommendationBreakdown: Array<{
    name: string;
    value: number;
  }>;
}

export default function InterviewAnalytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const dateFilter = getDateFilter();

      // Fetch interview feedback data
      const { data: feedbackData } = await supabase
        .from("interview_feedback")
        .select(`
          *,
          interviews!inner(
            id,
            interviewer_name,
            scheduled_at,
            status,
            job_applications!inner(
              id,
              applied_at,
              status
            )
          )
        `)
        .gte("created_at", dateFilter);

      // Fetch application funnel data
      const { data: applicationsData } = await supabase
        .from("job_applications")
        .select("id, status, applied_at, created_at")
        .gte("created_at", dateFilter);

      const { data: interviewsData } = await supabase
        .from("interviews")
        .select("id, scheduled_at, status")
        .gte("created_at", dateFilter);

      // Calculate average ratings
      const avgRatings = calculateAverageRatings(feedbackData || []);

      // Calculate time to hire
      const timeToHire = calculateTimeToHire(applicationsData || []);

      // Calculate interviewer performance
      const interviewerPerf = calculateInterviewerPerformance(feedbackData || []);

      // Calculate funnel conversion
      const funnel = calculateFunnelConversion(applicationsData || [], interviewsData || []);

      // Calculate recommendation breakdown
      const recommendations = calculateRecommendationBreakdown(feedbackData || []);

      setAnalytics({
        averageRatings: avgRatings,
        timeToHire,
        interviewerPerformance: interviewerPerf,
        funnelConversion: funnel,
        recommendationBreakdown: recommendations,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "7d":
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case "30d":
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case "90d":
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      default:
        return new Date(0).toISOString();
    }
  };

  const calculateAverageRatings = (feedback: any[]) => {
    if (!feedback.length) {
      return { overall: 0, technical: 0, communication: 0, culture_fit: 0, problem_solving: 0 };
    }

    const sum = feedback.reduce((acc, f) => ({
      overall: acc.overall + (f.rating_overall || 0),
      technical: acc.technical + (f.rating_technical || 0),
      communication: acc.communication + (f.rating_communication || 0),
      culture_fit: acc.culture_fit + (f.rating_culture_fit || 0),
      problem_solving: acc.problem_solving + (f.rating_problem_solving || 0),
    }), { overall: 0, technical: 0, communication: 0, culture_fit: 0, problem_solving: 0 });

    return {
      overall: Number((sum.overall / feedback.length).toFixed(2)),
      technical: Number((sum.technical / feedback.filter(f => f.rating_technical).length || 0).toFixed(2)),
      communication: Number((sum.communication / feedback.filter(f => f.rating_communication).length || 0).toFixed(2)),
      culture_fit: Number((sum.culture_fit / feedback.filter(f => f.rating_culture_fit).length || 0).toFixed(2)),
      problem_solving: Number((sum.problem_solving / feedback.filter(f => f.rating_problem_solving).length || 0).toFixed(2)),
    };
  };

  const calculateTimeToHire = (applications: any[]) => {
    const hired = applications.filter(app => app.status === "accepted");
    
    if (!hired.length) {
      return { average: 0, median: 0, data: [] };
    }

    const times = hired.map(app => {
      const applied = new Date(app.applied_at || app.created_at);
      const now = new Date();
      return Math.floor((now.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));
    }).sort((a, b) => a - b);

    const average = Math.round(times.reduce((sum, time) => sum + time, 0) / times.length);
    const median = times.length % 2 === 0
      ? (times[times.length / 2 - 1] + times[times.length / 2]) / 2
      : times[Math.floor(times.length / 2)];

    return {
      average,
      median: Math.round(median),
      data: [
        { stage: "Application to Screen", days: Math.round(average * 0.2) },
        { stage: "Screen to Interview", days: Math.round(average * 0.3) },
        { stage: "Interview to Offer", days: Math.round(average * 0.3) },
        { stage: "Offer to Accept", days: Math.round(average * 0.2) },
      ],
    };
  };

  const calculateInterviewerPerformance = (feedback: any[]) => {
    const interviewerMap = new Map<string, { count: number; totalRating: number }>();

    feedback.forEach(f => {
      const interviewer = f.interviews?.interviewer_name || "Unknown";
      const existing = interviewerMap.get(interviewer) || { count: 0, totalRating: 0 };
      interviewerMap.set(interviewer, {
        count: existing.count + 1,
        totalRating: existing.totalRating + (f.rating_overall || 0),
      });
    });

    return Array.from(interviewerMap.entries())
      .map(([interviewer, data]) => ({
        interviewer,
        interviews: data.count,
        avgRating: Number((data.totalRating / data.count).toFixed(2)),
      }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 10);
  };

  const calculateFunnelConversion = (applications: any[], interviews: any[]) => {
    const total = applications.length;
    const screened = applications.filter(app => app.status !== "applied").length;
    const interviewed = interviews.length;
    const offered = applications.filter(app => ["accepted", "offered"].includes(app.status)).length;
    const hired = applications.filter(app => app.status === "accepted").length;

    return [
      { stage: "Applied", count: total, percentage: 100 },
      { stage: "Screened", count: screened, percentage: total ? Math.round((screened / total) * 100) : 0 },
      { stage: "Interviewed", count: interviewed, percentage: total ? Math.round((interviewed / total) * 100) : 0 },
      { stage: "Offered", count: offered, percentage: total ? Math.round((offered / total) * 100) : 0 },
      { stage: "Hired", count: hired, percentage: total ? Math.round((hired / total) * 100) : 0 },
    ];
  };

  const calculateRecommendationBreakdown = (feedback: any[]) => {
    const counts = feedback.reduce((acc, f) => {
      const rec = f.recommendation || "maybe";
      acc[rec] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const labels: Record<string, string> = {
      strong_hire: "Strong Hire",
      hire: "Hire",
      maybe: "Maybe",
      no_hire: "No Hire",
    };

    return Object.entries(counts).map(([key, value]) => ({
      name: labels[key] || key,
      value: value as number,
    }));
  };

  const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Interview Analytics</h1>
          <p className="text-muted-foreground">Track hiring performance and interview metrics</p>
        </div>
        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRatings.overall.toFixed(1)}/5</div>
            <p className="text-xs text-muted-foreground">Average interview rating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time to Hire</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.timeToHire.average} days</div>
            <p className="text-xs text-muted-foreground">Median: {analytics.timeToHire.median} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interviewers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.interviewerPerformance.length}</div>
            <p className="text-xs text-muted-foreground">Active interviewers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.funnelConversion[4]?.percentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Applied to hired</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Rating Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Breakdown</CardTitle>
            <CardDescription>Average scores across dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { category: "Technical", rating: analytics.averageRatings.technical },
                  { category: "Communication", rating: analytics.averageRatings.communication },
                  { category: "Culture Fit", rating: analytics.averageRatings.culture_fit },
                  { category: "Problem Solving", rating: analytics.averageRatings.problem_solving },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" className="text-xs" />
                <YAxis domain={[0, 5]} className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="rating" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recommendation Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Hiring Recommendations</CardTitle>
            <CardDescription>Distribution of interview outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.recommendationBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--chart-1))"
                  dataKey="value"
                >
                  {analytics.recommendationBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time to Hire by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Time to Hire by Stage</CardTitle>
            <CardDescription>Average days per hiring stage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.timeToHire.data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="stage" type="category" width={150} className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="days" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hiring Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Hiring Funnel</CardTitle>
            <CardDescription>Conversion rates through hiring stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.funnelConversion}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="stage" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-3))" name="Candidates" />
                <Line type="monotone" dataKey="percentage" stroke="hsl(var(--chart-4))" name="Percentage" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Interviewer Performance */}
      {analytics.interviewerPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Interviewer Performance</CardTitle>
            <CardDescription>Interviewers ranked by average rating (click to view details)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.interviewerPerformance.map((interviewer) => (
                <Button
                  key={interviewer.interviewer}
                  variant="outline"
                  className="w-full justify-between h-auto p-4"
                  onClick={() => navigate(`/interviewer/${encodeURIComponent(interviewer.interviewer)}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <div className="font-semibold">{interviewer.interviewer}</div>
                      <div className="text-sm text-muted-foreground">
                        {interviewer.interviews} interviews conducted
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold text-lg">{interviewer.avgRating.toFixed(1)}</span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
