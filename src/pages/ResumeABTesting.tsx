import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, ArrowLeft, Plus, LineChart as LineChartIcon, History, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResumePerformanceComparison from "@/components/resume/ResumePerformanceComparison";
import ResumePerformanceAlerts from "@/components/resume/ResumePerformanceAlerts";
import ResumePerformanceHistory from "@/components/resume/ResumePerformanceHistory";
import ResumePredictiveAnalytics from "@/components/resume/ResumePredictiveAnalytics";

interface VersionMetrics {
  totalApplications: number;
  totalResponses: number;
  totalInterviews: number;
  responseRate: number;
  interviewRate: number;
  avgResponseTime: number;
}

interface ResumeVersion {
  id: string;
  title: string;
  created_at: string | null;
  resume_id: string;
  pdf_url: string | null;
  sections_json: any;
}

export default function ResumeABTesting() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [metrics, setMetrics] = useState<Record<string, VersionMetrics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get profile
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");
      setProfileId(profile.id);

      // Get resume versions via resumes table
      const { data: resumesData } = await supabase
        .from("resumes")
        .select("id")
        .eq("profile_id", profile.id);

      if (!resumesData || resumesData.length === 0) {
        setIsLoading(false);
        return;
      }

      const resumeIds = resumesData.map(r => r.id);
      
      const { data: versionsData, error: versionsError } = await supabase
        .from("resume_versions")
        .select("*")
        .in("resume_id", resumeIds);

      if (versionsError) throw versionsError;
      setVersions(versionsData || []);

      // Get metrics for each version
      const metricsMap: Record<string, VersionMetrics> = {};
      for (const version of versionsData || []) {
        const { data: metricsData, error: metricsError } = await supabase
          .from("application_metrics")
          .select("*")
          .eq("resume_version_id", version.id);

        if (!metricsError && metricsData) {
          const totalApplications = metricsData.length;
          const totalResponses = metricsData.filter(m => m.response_received).length;
          const totalInterviews = metricsData.filter(m => m.interview_granted).length;
          const avgResponseTime = metricsData
            .filter(m => m.time_to_response_hours)
            .reduce((sum, m) => sum + (m.time_to_response_hours || 0), 0) / totalApplications || 0;

          metricsMap[version.id] = {
            totalApplications,
            totalResponses,
            totalInterviews,
            responseRate: totalApplications > 0 ? (totalResponses / totalApplications) * 100 : 0,
            interviewRate: totalApplications > 0 ? (totalInterviews / totalApplications) * 100 : 0,
            avgResponseTime: Math.round(avgResponseTime),
          };
        }
      }
      setMetrics(metricsMap);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getWinnerBadge = (versionId: string): JSX.Element | null => {
    const versionMetric = metrics[versionId];
    if (!versionMetric) return null;

    const allMetrics = Object.values(metrics);
    const bestResponseRate = Math.max(...allMetrics.map((m) => m.responseRate));
    const bestInterviewRate = Math.max(...allMetrics.map((m) => m.interviewRate));

    if (versionMetric.responseRate === bestResponseRate && versionMetric.responseRate > 0) {
      return <Badge className="bg-green-500">Best Response Rate</Badge>;
    }
    if (versionMetric.interviewRate === bestInterviewRate && versionMetric.interviewRate > 0) {
      return <Badge className="bg-blue-500">Best Interview Rate</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BarChart className="h-8 w-8" />
                Resume A/B Testing
              </h1>
              <p className="text-muted-foreground">
                Track which resume versions perform best
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/resumes")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Version
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Predictions
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <LineChartIcon className="h-4 w-4" />
              Comparison
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ResumePerformanceAlerts />
            {versions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground mb-4">
                    No resume versions found. Create different versions to start A/B testing.
                  </p>
                  <Button onClick={() => navigate("/resumes")}>
                    Go to Resumes
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {versions.map((version) => {
                  const metric = metrics[version.id] || {
                    totalApplications: 0,
                    totalResponses: 0,
                    totalInterviews: 0,
                    responseRate: 0,
                    interviewRate: 0,
                    avgResponseTime: 0,
                  };

                  return (
                    <Card key={version.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{version.title}</CardTitle>
                            <CardDescription>
                              Created {new Date(version.created_at || '').toLocaleDateString()}
                            </CardDescription>
                          </div>
                          {getWinnerBadge(version.id)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Applications</span>
                            <span className="text-sm font-bold">{metric.totalApplications}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Response Rate</span>
                            <span className="text-sm font-bold">
                              {metric.responseRate.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={metric.responseRate} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {metric.totalResponses} responses received
                          </p>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Interview Rate</span>
                            <span className="text-sm font-bold">
                              {metric.interviewRate.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={metric.interviewRate} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {metric.totalInterviews} interviews granted
                          </p>
                        </div>

                        {metric.avgResponseTime > 0 && (
                          <div className="border-t pt-4">
                            <p className="text-sm text-muted-foreground">
                              Avg Response Time:{" "}
                              <span className="font-medium text-foreground">
                                {metric.avgResponseTime} hours
                              </span>
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {versions.length > 1 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Testing Insights</CardTitle>
                  <CardDescription>
                    Recommendations based on your A/B test results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const allMetrics = Object.entries(metrics);
                    if (allMetrics.length === 0) return null;

                    const bestResponse = allMetrics.reduce((best, [id, metric]) =>
                      metric.responseRate > metrics[best]?.responseRate ? id : best,
                      allMetrics[0][0]
                    );

                    const bestInterview = allMetrics.reduce((best, [id, metric]) =>
                      metric.interviewRate > metrics[best]?.interviewRate ? id : best,
                      allMetrics[0][0]
                    );

                    const bestResponseVersion = versions.find(v => v.id === bestResponse);
                    const bestInterviewVersion = versions.find(v => v.id === bestInterview);

                    return (
                      <>
                        {bestResponseVersion && (
                          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                            <p className="font-medium text-green-900 dark:text-green-100">
                              📈 Best for getting responses
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              "{bestResponseVersion.title}" has a {metrics[bestResponse].responseRate.toFixed(1)}% response rate
                            </p>
                          </div>
                        )}
                        {bestInterviewVersion && (
                          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              🎯 Best for landing interviews
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              "{bestInterviewVersion.title}" has a {metrics[bestInterview].interviewRate.toFixed(1)}% interview rate
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="predictions">
            <ResumePredictiveAnalytics />
          </TabsContent>

          <TabsContent value="comparison">
            <ResumePerformanceComparison />
          </TabsContent>

          <TabsContent value="history">
            <ResumePerformanceHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}