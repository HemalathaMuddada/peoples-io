import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  Building2, 
  MessageSquare, 
  FileText, 
  Sparkles, 
  ArrowRight,
  Loader2,
  Target,
  Award,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

interface IntelligenceData {
  salary: {
    activeSessions: number;
    avgTargetSalary: number;
    lastSession?: any;
  };
  culture: {
    companiesAnalyzed: number;
    avgFitScore: number;
    topMatch?: any;
  };
  interviews: {
    totalCompleted: number;
    avgScore: number;
    recentInterview?: any;
  };
  resumes: {
    versionsCount: number;
    bestPerforming?: any;
    totalApplications: number;
  };
}

const CareerIntelligence = () => {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchIntelligenceData();
  }, []);

  const fetchIntelligenceData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Fetch salary data
      const { data: salaryData } = await supabase
        .from("negotiation_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Culture fit data - placeholder until user analyzes companies
      const cultureData: any[] = [];

      // Fetch interview data
      const { data: interviewData } = await supabase
        .from("mock_interviews")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      // Fetch resume versions and applications
      const { data: resumeVersions } = await supabase
        .from("resume_versions")
        .select("*, resumes!inner(user_id)")
        .eq("resumes.user_id", user.id);

      const { data: applications } = await supabase
        .from("job_applications")
        .select("*")
        .eq("profile_id", profile.id);

      // Calculate metrics
      const avgTargetSalary = salaryData?.reduce((acc, s) => acc + (s.target_salary || 0), 0) / (salaryData?.length || 1);
      const avgFitScore = 0; // Will be calculated when user uses culture fit feature
      const completedInterviews = interviewData?.filter(i => i.status === "completed") || [];
      const avgInterviewScore = completedInterviews.reduce((acc, i) => acc + (i.score || 0), 0) / (completedInterviews.length || 1);

      // Find best performing resume based on applications
      const bestResume = resumeVersions?.[0];

      setData({
        salary: {
          activeSessions: salaryData?.filter(s => s.outcome === "in_progress").length || 0,
          avgTargetSalary: avgTargetSalary || 0,
          lastSession: salaryData?.[0],
        },
        culture: {
          companiesAnalyzed: 0,
          avgFitScore: 0,
          topMatch: undefined,
        },
        interviews: {
          totalCompleted: completedInterviews.length,
          avgScore: avgInterviewScore || 0,
          recentInterview: completedInterviews[0],
        },
        resumes: {
          versionsCount: resumeVersions?.length || 0,
          bestPerforming: bestResume || null,
          totalApplications: applications?.length || 0,
        },
      });

      // Auto-generate recommendations
      if (salaryData || cultureData || interviewData || resumeVersions) {
        generateRecommendations({
          salaryData,
          cultureData,
          interviewData: completedInterviews,
          resumeVersions,
          applications,
        });
      }
    } catch (error: any) {
      console.error("Error fetching intelligence data:", error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecommendations = async (rawData: any) => {
    setIsGeneratingRecs(true);
    try {
      const { data: aiResponse, error } = await supabase.functions.invoke("generate-career-recommendations", {
        body: { intelligenceData: rawData },
      });

      if (error) throw error;
      setRecommendations(aiResponse.recommendations || []);
    } catch (error: any) {
      console.error("Error generating recommendations:", error);
      // Set fallback recommendations
      setRecommendations([
        "Continue building your profile across all intelligence features",
        "Practice more mock interviews to improve your confidence",
        "Analyze culture fit for target companies before applying",
        "Track your resume performance and iterate on what works",
      ]);
    } finally {
      setIsGeneratingRecs(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Career Intelligence Center
          </h1>
          <p className="text-muted-foreground">
            Your unified hub for salary insights, culture fit, interview prep, and resume performance
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/salary-negotiator")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Salary Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Math.round(data?.salary.avgTargetSalary || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg target salary
              </p>
              <Badge variant="secondary" className="mt-2">
                {data?.salary.activeSessions} active sessions
              </Badge>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/culture-fit")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Culture Fit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(data?.culture.avgFitScore || 0)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg fit score
              </p>
              <Badge variant="secondary" className="mt-2">
                {data?.culture.companiesAnalyzed} companies analyzed
              </Badge>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/career")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-600" />
                Interview Prep
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getScoreColor(data?.interviews.avgScore || 0)}`}>
                {Math.round(data?.interviews.avgScore || 0)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg interview score
              </p>
              <Badge variant="secondary" className="mt-2">
                {data?.interviews.totalCompleted} completed
              </Badge>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/resume-ab-testing")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                Resume Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.resumes.versionsCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active versions
              </p>
              <Badge variant="secondary" className="mt-2">
                {data?.resumes.totalApplications} applications
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* AI Recommendations */}
          <Card className="lg:col-span-2 border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Recommendations
              </CardTitle>
              <CardDescription>
                Personalized insights based on your intelligence data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGeneratingRecs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Generating insights...</span>
                </div>
              ) : recommendations.length > 0 ? (
                <ul className="space-y-4">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Target className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No recommendations yet. Use the intelligence features to get personalized insights.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate("/salary-negotiator")}>
                  Practice Negotiation
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate("/culture-fit")}>
                  Analyze Company
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate("/career")}>
                  Mock Interview
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button className="w-full justify-between" variant="outline" onClick={() => navigate("/resume-ab-testing")}>
                  Test Resume
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {data?.culture.topMatch && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                    Top Culture Match
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="font-semibold">{data.culture.topMatch.company_name}</div>
                    <div className="flex items-center gap-2">
                      <Progress value={data.culture.topMatch.fit_score} className="flex-1" />
                      <span className="text-sm font-semibold">{Math.round(data.culture.topMatch.fit_score)}%</span>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full mt-2" onClick={() => navigate("/culture-fit")}>
                      View Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Activity Highlights</CardTitle>
            <CardDescription>Latest updates from your intelligence features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.salary.lastSession && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-1" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Salary Negotiation</div>
                    <div className="text-sm text-muted-foreground">
                      {data.salary.lastSession.job_title} at {data.salary.lastSession.company || "Company"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Target: ${data.salary.lastSession.target_salary?.toLocaleString()}
                    </div>
                  </div>
                  <Badge variant={data.salary.lastSession.outcome === "in_progress" ? "secondary" : "outline"}>
                    {data.salary.lastSession.outcome}
                  </Badge>
                </div>
              )}

              {data?.interviews.recentInterview && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <MessageSquare className="h-5 w-5 text-purple-600 mt-1" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Mock Interview</div>
                    <div className="text-sm text-muted-foreground">
                      {data.interviews.recentInterview.job_title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Score: {data.interviews.recentInterview.score}%
                    </div>
                  </div>
                  <Badge variant="outline">{data.interviews.recentInterview.difficulty}</Badge>
                </div>
              )}

              {data?.resumes.bestPerforming && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <FileText className="h-5 w-5 text-orange-600 mt-1" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Best Resume Version</div>
                    <div className="text-sm text-muted-foreground">
                      {data.resumes.bestPerforming.version_title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Response rate: {Math.round(data.resumes.bestPerforming.responseRate)}%
                    </div>
                  </div>
                  <Badge variant="outline">Top performer</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CareerIntelligence;
