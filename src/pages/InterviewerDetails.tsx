import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, Star, Calendar, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface InterviewerStats {
  interviewerName: string;
  totalInterviews: number;
  averageRating: number;
  ratingsOverTime: Array<{
    date: string;
    rating: number;
  }>;
  ratingBreakdown: {
    technical: number;
    communication: number;
    culture_fit: number;
    problem_solving: number;
  };
  recommendationStats: {
    strong_hire: number;
    hire: number;
    maybe: number;
    no_hire: number;
  };
  recentInterviews: Array<{
    id: string;
    scheduled_at: string;
    rating: number;
    recommendation: string;
    candidate_name: string;
    job_title: string;
  }>;
}

export default function InterviewerDetails() {
  const { interviewerName } = useParams<{ interviewerName: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<InterviewerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (interviewerName) {
      fetchInterviewerStats();
    }
  }, [interviewerName]);

  const fetchInterviewerStats = async () => {
    setIsLoading(true);
    try {
      const decodedName = decodeURIComponent(interviewerName || "");

      // Fetch all interviews and feedback for this interviewer
      const { data: interviews } = await supabase
        .from("interviews")
        .select(`
          id,
          scheduled_at,
          interviewer_name,
          job_applications!inner(
            id,
            job_postings(title)
          ),
          interview_feedback(
            rating_overall,
            rating_technical,
            rating_communication,
            rating_culture_fit,
            rating_problem_solving,
            recommendation,
            created_at
          )
        `)
        .eq("interviewer_name", decodedName)
        .order("scheduled_at", { ascending: false });

      if (!interviews || interviews.length === 0) {
        setStats(null);
        return;
      }

      // Calculate statistics
      const feedbackData = interviews
        .filter(i => i.interview_feedback && i.interview_feedback.length > 0)
        .map(i => ({
          ...i,
          feedback: i.interview_feedback[0]
        }));

      const totalInterviews = interviews.length;
      const avgRating = feedbackData.length > 0
        ? feedbackData.reduce((sum, i) => sum + (i.feedback.rating_overall || 0), 0) / feedbackData.length
        : 0;

      // Ratings over time
      const ratingsOverTime = feedbackData.map(i => ({
        date: format(new Date(i.scheduled_at), "MMM dd"),
        rating: i.feedback.rating_overall || 0,
      })).reverse();

      // Rating breakdown
      const ratingBreakdown = {
        technical: feedbackData.filter(i => i.feedback.rating_technical).length > 0
          ? feedbackData.reduce((sum, i) => sum + (i.feedback.rating_technical || 0), 0) / 
            feedbackData.filter(i => i.feedback.rating_technical).length
          : 0,
        communication: feedbackData.filter(i => i.feedback.rating_communication).length > 0
          ? feedbackData.reduce((sum, i) => sum + (i.feedback.rating_communication || 0), 0) / 
            feedbackData.filter(i => i.feedback.rating_communication).length
          : 0,
        culture_fit: feedbackData.filter(i => i.feedback.rating_culture_fit).length > 0
          ? feedbackData.reduce((sum, i) => sum + (i.feedback.rating_culture_fit || 0), 0) / 
            feedbackData.filter(i => i.feedback.rating_culture_fit).length
          : 0,
        problem_solving: feedbackData.filter(i => i.feedback.rating_problem_solving).length > 0
          ? feedbackData.reduce((sum, i) => sum + (i.feedback.rating_problem_solving || 0), 0) / 
            feedbackData.filter(i => i.feedback.rating_problem_solving).length
          : 0,
      };

      // Recommendation stats
      const recommendationStats = {
        strong_hire: feedbackData.filter(i => i.feedback.recommendation === "strong_hire").length,
        hire: feedbackData.filter(i => i.feedback.recommendation === "hire").length,
        maybe: feedbackData.filter(i => i.feedback.recommendation === "maybe").length,
        no_hire: feedbackData.filter(i => i.feedback.recommendation === "no_hire").length,
      };

      // Recent interviews
      const recentInterviews = feedbackData.slice(0, 10).map(i => ({
        id: i.id,
        scheduled_at: i.scheduled_at,
        rating: i.feedback.rating_overall || 0,
        recommendation: i.feedback.recommendation || "maybe",
        candidate_name: "Candidate", // We don't have candidate names in this query
        job_title: i.job_applications?.job_postings?.title || "N/A",
      }));

      setStats({
        interviewerName: decodedName,
        totalInterviews,
        averageRating: Number(avgRating.toFixed(2)),
        ratingsOverTime,
        ratingBreakdown: {
          technical: Number(ratingBreakdown.technical.toFixed(2)),
          communication: Number(ratingBreakdown.communication.toFixed(2)),
          culture_fit: Number(ratingBreakdown.culture_fit.toFixed(2)),
          problem_solving: Number(ratingBreakdown.problem_solving.toFixed(2)),
        },
        recommendationStats,
        recentInterviews,
      });
    } catch (error) {
      console.error("Error fetching interviewer stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      strong_hire: { variant: "default", label: "Strong Hire" },
      hire: { variant: "secondary", label: "Hire" },
      maybe: { variant: "outline", label: "Maybe" },
      no_hire: { variant: "destructive", label: "No Hire" },
    };
    const config = variants[recommendation] || variants.maybe;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="ghost" onClick={() => navigate("/interview-analytics")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Analytics
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">No data found for this interviewer.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/interview-analytics")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{stats.interviewerName}</h1>
          <p className="text-muted-foreground">Interview performance and trends</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInterviews}</div>
            <p className="text-xs text-muted-foreground">Conducted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}/5</div>
            <p className="text-xs text-muted-foreground">Overall score</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Strong Hires</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recommendationStats.strong_hire}</div>
            <p className="text-xs text-muted-foreground">Recommended</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hire Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalInterviews > 0
                ? Math.round(((stats.recommendationStats.strong_hire + stats.recommendationStats.hire) / stats.totalInterviews) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Positive recommendations</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ratings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Trend</CardTitle>
            <CardDescription>Performance over recent interviews</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.ratingsOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[0, 5]} className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="rating" stroke="hsl(var(--chart-1))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rating Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Breakdown</CardTitle>
            <CardDescription>Average scores by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { category: "Technical", rating: stats.ratingBreakdown.technical },
                  { category: "Communication", rating: stats.ratingBreakdown.communication },
                  { category: "Culture Fit", rating: stats.ratingBreakdown.culture_fit },
                  { category: "Problem Solving", rating: stats.ratingBreakdown.problem_solving },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="category" className="text-xs" />
                <YAxis domain={[0, 5]} className="text-xs" />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="rating" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recommendation Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendation Distribution</CardTitle>
          <CardDescription>Breakdown of hiring recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">{stats.recommendationStats.strong_hire}</div>
              <Badge variant="default">Strong Hire</Badge>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">{stats.recommendationStats.hire}</div>
              <Badge variant="secondary">Hire</Badge>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-yellow-600">{stats.recommendationStats.maybe}</div>
              <Badge variant="outline">Maybe</Badge>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600">{stats.recommendationStats.no_hire}</div>
              <Badge variant="destructive">No Hire</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Interviews */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Interviews</CardTitle>
          <CardDescription>Latest {stats.recentInterviews.length} interviews conducted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentInterviews.map((interview) => (
              <div key={interview.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">{interview.job_title}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(interview.scheduled_at), "PPP")}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{interview.rating.toFixed(1)}</span>
                  </div>
                  {getRecommendationBadge(interview.recommendation)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
