import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TrendingUp, Sparkles, Target, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { subWeeks, format, addWeeks } from "date-fns";

interface VersionPrediction {
  version_id: string;
  version_title: string;
  current_response_rate: number;
  predicted_response_rate: number;
  current_interview_rate: number;
  predicted_interview_rate: number;
  confidence: "high" | "medium" | "low";
  trend: "improving" | "declining" | "stable";
  recommendation: string;
  data_points: number;
  prediction_chart: PredictionPoint[];
}

interface PredictionPoint {
  week: string;
  actual_response?: number;
  actual_interview?: number;
  predicted_response?: number;
  predicted_interview?: number;
  is_prediction: boolean;
}

export default function ResumePredictiveAnalytics() {
  const [predictions, setPredictions] = useState<VersionPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bestVersion, setBestVersion] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPredictions();
  }, []);

  const getEnhancedPredictions = async (versions: any[], profileId: string) => {
    // Prepare data for ML analysis
    const versionsData = await Promise.all(
      versions.map(async (version) => {
        const { data: metrics } = await supabase
          .from("application_metrics")
          .select(`
            *,
            job_applications!inner(
              applied_at,
              created_at,
              job_title,
              company
            )
          `)
          .eq("resume_version_id", version.id);

        if (!metrics || metrics.length < 3) return null;

        const applications = metrics.map((m: any) => {
          const appDate = new Date(m.job_applications.applied_at || m.job_applications.created_at);
          return {
            date: appDate.toISOString(),
            month: appDate.getMonth(),
            dayOfWeek: appDate.getDay(),
            responseReceived: m.response_received || false,
            interviewGranted: m.interview_granted || false,
            responseTimeHours: m.time_to_response_hours,
            jobTitle: m.job_applications.job_title,
            company: m.job_applications.company,
          };
        });

        return {
          versionId: version.id,
          versionTitle: version.title || "Untitled",
          applications,
        };
      })
    );

    const validVersionsData = versionsData.filter(v => v !== null);

    if (validVersionsData.length === 0) {
      throw new Error("No versions with sufficient data");
    }

    // Call edge function for enhanced ML predictions
    const { data, error } = await supabase.functions.invoke('predict-resume-performance', {
      body: { versions: validVersionsData }
    });

    if (error) {
      console.error("Edge function error:", error);
      throw error;
    }

    if (!data || !data.predictions) {
      throw new Error("Invalid response from prediction service");
    }

    // Transform to match VersionPrediction interface
    return data.predictions.map((pred: any) => {
      // Build prediction chart data
      const chartData: PredictionPoint[] = [];
      
      // Add 4 weeks of historical/current data
      for (let i = 4; i >= 1; i--) {
        chartData.push({
          week: format(subWeeks(new Date(), i), "MMM d"),
          actual_response: pred.currentResponseRate,
          actual_interview: pred.currentInterviewRate,
          is_prediction: false,
        });
      }

      // Add 4 weeks of future predictions
      for (let i = 1; i <= 4; i++) {
        chartData.push({
          week: format(addWeeks(new Date(), i), "MMM d"),
          predicted_response: pred.predictedResponseRate,
          predicted_interview: pred.predictedInterviewRate,
          is_prediction: true,
        });
      }

      return {
        version_id: pred.versionId,
        version_title: pred.versionTitle,
        current_response_rate: pred.currentResponseRate,
        predicted_response_rate: pred.predictedResponseRate,
        current_interview_rate: pred.currentInterviewRate,
        predicted_interview_rate: pred.predictedInterviewRate,
        confidence: pred.confidence,
        trend: pred.confidence === "high" && pred.predictedInterviewRate > pred.currentInterviewRate 
          ? "improving" as const
          : pred.predictedInterviewRate < pred.currentInterviewRate 
          ? "declining" as const 
          : "stable" as const,
        recommendation: `${pred.recommendation}${pred.externalFactors && pred.externalFactors.length > 0 ? '\n\nExternal Factors: ' + pred.externalFactors.join(', ') : ''}${pred.optimalTiming ? '\n\nOptimal Timing: ' + pred.optimalTiming : ''}`,
        data_points: validVersionsData.find((v: any) => v.versionId === pred.versionId)?.applications.length || 0,
        prediction_chart: chartData,
      };
    });
  };

  const loadPredictions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) return;

      // Fetch all resumes and their versions
      const { data: resumes } = await supabase
        .from("resumes")
        .select("id")
        .eq("profile_id", profile.id);

      if (!resumes || resumes.length === 0) return;

      const resumeIds = resumes.map(r => r.id);
      const { data: versions } = await supabase
        .from("resume_versions")
        .select("*")
        .in("resume_id", resumeIds)
        .order("created_at", { ascending: false });

      if (!versions || versions.length === 0) {
        setLoading(false);
        return;
      }

      // First, try to use enhanced ML predictions from edge function
      try {
        const enhancedPredictions = await getEnhancedPredictions(versions, profile.id);
        if (enhancedPredictions && enhancedPredictions.length > 0) {
          setPredictions(enhancedPredictions);
          const best = enhancedPredictions.reduce((prev, current) =>
            current.predicted_interview_rate > prev.predicted_interview_rate ? current : prev
          );
          setBestVersion(best.version_id);
          setLoading(false);
          return;
        }
      } catch (mlError) {
        console.warn("Enhanced ML predictions unavailable, falling back to basic analysis:", mlError);
      }

      // Analyze each version and make predictions
      const versionPredictions: VersionPrediction[] = await Promise.all(
        versions.map(async (version) => {
          const { data: metrics } = await supabase
            .from("application_metrics")
            .select(`
              *,
              job_applications!inner(
                applied_at,
                created_at
              )
            `)
            .eq("resume_version_id", version.id);

          if (!metrics || metrics.length < 3) {
            // Not enough data for prediction
            return null;
          }

          // Group by week for the last 12 weeks
          const startDate = subWeeks(new Date(), 12);
          const weeklyData: Map<string, { responses: number; interviews: number; total: number }> = new Map();

          metrics.forEach((m: any) => {
            const appDate = new Date(m.job_applications.applied_at || m.job_applications.created_at);
            if (appDate >= startDate) {
              const weekKey = format(appDate, "yyyy-'W'ww");
              const existing = weeklyData.get(weekKey) || { responses: 0, interviews: 0, total: 0 };
              existing.total += 1;
              if (m.response_received) existing.responses += 1;
              if (m.interview_granted) existing.interviews += 1;
              weeklyData.set(weekKey, existing);
            }
          });

          // Convert to array and sort
          const sortedWeeks = Array.from(weeklyData.entries())
            .map(([week, data]) => ({
              week,
              responseRate: data.total > 0 ? (data.responses / data.total) * 100 : 0,
              interviewRate: data.total > 0 ? (data.interviews / data.total) * 100 : 0,
              applications: data.total,
            }))
            .sort((a, b) => a.week.localeCompare(b.week));

          if (sortedWeeks.length < 3) return null;

          // Calculate linear regression for prediction
          const predictResponse = linearRegression(sortedWeeks.map((w, i) => ({ x: i, y: w.responseRate })));
          const predictInterview = linearRegression(sortedWeeks.map((w, i) => ({ x: i, y: w.interviewRate })));

          // Predict next 4 weeks
          const futureWeeks = 4;
          const currentIndex = sortedWeeks.length;
          const predictedResponseRate = predictResponse.slope * currentIndex + predictResponse.intercept;
          const predictedInterviewRate = predictInterview.slope * currentIndex + predictInterview.intercept;

          // Determine confidence based on data consistency
          const responseVariance = calculateVariance(sortedWeeks.map(w => w.responseRate));
          const interviewVariance = calculateVariance(sortedWeeks.map(w => w.interviewRate));
          const avgVariance = (responseVariance + interviewVariance) / 2;
          
          let confidence: "high" | "medium" | "low";
          if (avgVariance < 100 && sortedWeeks.length >= 8) confidence = "high";
          else if (avgVariance < 200 && sortedWeeks.length >= 5) confidence = "medium";
          else confidence = "low";

          // Determine trend
          let trend: "improving" | "declining" | "stable";
          const avgSlope = (predictResponse.slope + predictInterview.slope) / 2;
          if (avgSlope > 2) trend = "improving";
          else if (avgSlope < -2) trend = "declining";
          else trend = "stable";

          // Calculate current rates
          const currentResponseRate = sortedWeeks[sortedWeeks.length - 1].responseRate;
          const currentInterviewRate = sortedWeeks[sortedWeeks.length - 1].interviewRate;

          // Generate recommendation
          let recommendation = "";
          if (trend === "improving" && predictedInterviewRate > 30) {
            recommendation = "Strong upward trend detected. This version is highly recommended for your next applications.";
          } else if (trend === "declining" && predictedInterviewRate < 15) {
            recommendation = "Performance is declining. Consider using a different resume version.";
          } else if (predictedInterviewRate > currentInterviewRate + 5) {
            recommendation = "Expected to perform better in the coming weeks. Good choice for upcoming applications.";
          } else if (predictedInterviewRate < currentInterviewRate - 5) {
            recommendation = "Performance may decline. Monitor closely or consider alternatives.";
          } else {
            recommendation = "Stable performance expected. Suitable for continued use.";
          }

          // Build prediction chart data
          const chartData: PredictionPoint[] = sortedWeeks.map(w => ({
            week: w.week,
            actual_response: w.responseRate,
            actual_interview: w.interviewRate,
            is_prediction: false,
          }));

          // Add future predictions
          for (let i = 1; i <= futureWeeks; i++) {
            const futureDate = addWeeks(new Date(), i);
            const futureWeek = format(futureDate, "yyyy-'W'ww");
            const futureIndex = currentIndex + i - 1;
            
            chartData.push({
              week: futureWeek,
              predicted_response: Math.max(0, Math.min(100, predictResponse.slope * futureIndex + predictResponse.intercept)),
              predicted_interview: Math.max(0, Math.min(100, predictInterview.slope * futureIndex + predictInterview.intercept)),
              is_prediction: true,
            });
          }

          return {
            version_id: version.id,
            version_title: version.title || "Untitled",
            current_response_rate: currentResponseRate,
            predicted_response_rate: Math.max(0, Math.min(100, predictedResponseRate)),
            current_interview_rate: currentInterviewRate,
            predicted_interview_rate: Math.max(0, Math.min(100, predictedInterviewRate)),
            confidence,
            trend,
            recommendation,
            data_points: sortedWeeks.length,
            prediction_chart: chartData,
          };
        })
      );

      // Filter out null values (versions without enough data)
      const validPredictions = versionPredictions.filter(p => p !== null) as VersionPrediction[];

      // Find best predicted version
      if (validPredictions.length > 0) {
        const best = validPredictions.reduce((prev, current) =>
          current.predicted_interview_rate > prev.predicted_interview_rate ? current : prev
        );
        setBestVersion(best.version_id);
      }

      setPredictions(validPredictions);
    } catch (error) {
      console.error("Error loading predictions:", error);
      toast.error("Failed to load predictive analytics");
    } finally {
      setLoading(false);
    }
  };

  // Simple linear regression
  const linearRegression = (points: { x: number; y: number }[]) => {
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    points.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  const calculateVariance = (values: number[]) => {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <Badge className="bg-success">High Confidence</Badge>;
      case "medium":
        return <Badge variant="secondary">Medium Confidence</Badge>;
      default:
        return <Badge variant="outline">Low Confidence</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-5 w-5 text-success" />;
      case "declining":
        return <TrendingUp className="h-5 w-5 text-destructive rotate-180" />;
      default:
        return <Target className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Predictive Analytics
          </CardTitle>
          <CardDescription>Not enough data for predictions</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Insufficient Data</AlertTitle>
            <AlertDescription>
              At least 3 weeks of application data is needed for each resume version to generate predictions.
              Continue applying to jobs to build your performance history.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Performance Predictions
          </CardTitle>
          <CardDescription>
            Machine learning forecasts to help you choose the best resume version for your next applications
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Best Recommendation */}
      {bestVersion && (
        <Alert className="border-primary bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Recommended for Next Applications</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-2">
              <p className="font-medium">
                {predictions.find(p => p.version_id === bestVersion)?.version_title}
              </p>
              <p className="text-sm">
                Predicted to achieve {predictions.find(p => p.version_id === bestVersion)?.predicted_interview_rate.toFixed(1)}% interview rate
                based on current trends.
              </p>
              <Button variant="default" size="sm" onClick={() => navigate("/resumes")} className="mt-2">
                Use This Version
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Prediction Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {predictions.map((prediction) => (
          <Card key={prediction.version_id} className={prediction.version_id === bestVersion ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {prediction.version_title}
                    {getTrendIcon(prediction.trend)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getConfidenceBadge(prediction.confidence)}
                    <Badge variant="outline" className="text-xs">
                      {prediction.data_points} weeks of data
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Metrics Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Response Rate</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{prediction.current_response_rate.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground">current</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-primary">
                      {prediction.predicted_response_rate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">predicted</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground">Interview Rate</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{prediction.current_interview_rate.toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground">current</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-success">
                      {prediction.predicted_interview_rate.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">predicted</span>
                  </div>
                </div>
              </div>

              {/* Prediction Chart */}
              <div className="pt-4 border-t">
                <div className="text-sm font-medium mb-4">Performance Forecast</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={prediction.prediction_chart}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <ReferenceLine 
                      x={prediction.prediction_chart.find(p => p.is_prediction)?.week || ""} 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeDasharray="3 3"
                      label={{ value: "Forecast", position: "top", fontSize: 10 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual_interview" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Actual Interview Rate"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted_interview" 
                      stroke="hsl(var(--success))" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      name="Predicted Interview Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Recommendation */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {prediction.recommendation}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Methodology Note */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">About These Predictions</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>
            Predictions are generated using linear regression analysis on your historical application data.
            Confidence levels are based on data consistency and sample size.
          </p>
          <p>
            <strong>High confidence:</strong> 8+ weeks of data with low variance (±10%)
          </p>
          <p>
            <strong>Medium confidence:</strong> 5+ weeks of data with moderate variance (±15%)
          </p>
          <p>
            <strong>Low confidence:</strong> Less than 5 weeks or high variance
          </p>
          <p className="pt-2 border-t">
            Note: Predictions are estimates based on past performance. Actual results may vary based on job market conditions,
            application timing, and other external factors.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
