import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, AlertCircle, Lightbulb, X, Bell } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface VersionAlert {
  version_id: string;
  version_title: string;
  alert_type: "low_response" | "low_interview" | "slow_response" | "underused";
  severity: "warning" | "critical";
  current_value: number;
  best_value: number;
  best_version_title: string;
  recommendation: string;
}

interface VersionMetrics {
  version_id: string;
  version_title: string;
  total_applications: number;
  response_rate: number;
  interview_rate: number;
  avg_response_time: number;
}

export default function ResumePerformanceAlerts() {
  const [alerts, setAlerts] = useState<VersionAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadAlerts();
    // Load dismissed alerts from localStorage
    const dismissed = localStorage.getItem("dismissedResumeAlerts");
    if (dismissed) {
      setDismissedAlerts(new Set(JSON.parse(dismissed)));
    }
  }, []);

  const loadAlerts = async () => {
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

      // Fetch metrics for each version
      const versionMetrics: VersionMetrics[] = await Promise.all(
        versions.map(async (version) => {
          const { data: metricsData } = await supabase
            .from("application_metrics")
            .select("*")
            .eq("resume_version_id", version.id);

          const total = metricsData?.length || 0;
          const responses = metricsData?.filter(m => m.response_received).length || 0;
          const interviews = metricsData?.filter(m => m.interview_granted).length || 0;
          
          const responseTimes = metricsData
            ?.filter(m => m.time_to_response_hours !== null)
            .map(m => m.time_to_response_hours) || [];
          
          const avgResponseTime = responseTimes.length > 0
            ? Math.round(responseTimes.reduce((a, b) => a + (b || 0), 0) / responseTimes.length)
            : 0;

          return {
            version_id: version.id,
            version_title: version.title || "Untitled",
            total_applications: total,
            response_rate: total > 0 ? (responses / total) * 100 : 0,
            interview_rate: total > 0 ? (interviews / total) * 100 : 0,
            avg_response_time: avgResponseTime,
          };
        })
      );

      // Filter out versions with no applications
      const activeMetrics = versionMetrics.filter(m => m.total_applications > 0);

      if (activeMetrics.length < 2) {
        setLoading(false);
        return;
      }

      // Generate alerts
      const generatedAlerts: VersionAlert[] = [];

      // Find best performing metrics
      const bestResponseRate = Math.max(...activeMetrics.map(m => m.response_rate));
      const bestInterviewRate = Math.max(...activeMetrics.map(m => m.interview_rate));
      const bestResponseVersion = activeMetrics.find(m => m.response_rate === bestResponseRate);
      const bestInterviewVersion = activeMetrics.find(m => m.interview_rate === bestInterviewRate);

      activeMetrics.forEach((metric) => {
        // Alert for low response rate (more than 20% worse than best)
        if (
          bestResponseVersion &&
          metric.version_id !== bestResponseVersion.version_id &&
          metric.response_rate < bestResponseRate - 20 &&
          metric.total_applications >= 5
        ) {
          generatedAlerts.push({
            version_id: metric.version_id,
            version_title: metric.version_title,
            alert_type: "low_response",
            severity: metric.response_rate < bestResponseRate - 40 ? "critical" : "warning",
            current_value: metric.response_rate,
            best_value: bestResponseRate,
            best_version_title: bestResponseVersion.version_title,
            recommendation: `Your "${metric.version_title}" resume has a ${metric.response_rate.toFixed(1)}% response rate, which is ${(bestResponseRate - metric.response_rate).toFixed(1)}% lower than "${bestResponseVersion.version_title}". Consider switching to the better performing version for future applications.`,
          });
        }

        // Alert for low interview rate (more than 15% worse than best)
        if (
          bestInterviewVersion &&
          metric.version_id !== bestInterviewVersion.version_id &&
          metric.interview_rate < bestInterviewRate - 15 &&
          metric.total_applications >= 5
        ) {
          generatedAlerts.push({
            version_id: metric.version_id,
            version_title: metric.version_title,
            alert_type: "low_interview",
            severity: metric.interview_rate < bestInterviewRate - 30 ? "critical" : "warning",
            current_value: metric.interview_rate,
            best_value: bestInterviewRate,
            best_version_title: bestInterviewVersion.version_title,
            recommendation: `Your "${metric.version_title}" resume has a ${metric.interview_rate.toFixed(1)}% interview rate, which is ${(bestInterviewRate - metric.interview_rate).toFixed(1)}% lower than "${bestInterviewVersion.version_title}". This version may not be highlighting your strengths effectively.`,
          });
        }

        // Alert for slow response time (50% slower than best)
        if (metric.avg_response_time > 0) {
          const fastestResponseTimes = activeMetrics
            .filter(m => m.avg_response_time > 0)
            .map(m => m.avg_response_time);
          
          if (fastestResponseTimes.length > 1) {
            const bestResponseTime = Math.min(...fastestResponseTimes);
            const bestResponseTimeVersion = activeMetrics.find(m => m.avg_response_time === bestResponseTime);
            
            if (
              bestResponseTimeVersion &&
              metric.version_id !== bestResponseTimeVersion.version_id &&
              metric.avg_response_time > bestResponseTime * 1.5
            ) {
              generatedAlerts.push({
                version_id: metric.version_id,
                version_title: metric.version_title,
                alert_type: "slow_response",
                severity: "warning",
                current_value: metric.avg_response_time,
                best_value: bestResponseTime,
                best_version_title: bestResponseTimeVersion.version_title,
                recommendation: `Companies take ${metric.avg_response_time}h on average to respond to "${metric.version_title}", compared to ${bestResponseTime}h for "${bestResponseTimeVersion.version_title}". A faster response time often indicates better alignment with job requirements.`,
              });
            }
          }
        }
      });

      // Remove alerts that have been dismissed
      const activeAlerts = generatedAlerts.filter(
        alert => !dismissedAlerts.has(`${alert.version_id}-${alert.alert_type}`)
      );

      setAlerts(activeAlerts);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (versionId: string, alertType: string) => {
    const alertKey = `${versionId}-${alertType}`;
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(alertKey);
    setDismissedAlerts(newDismissed);
    localStorage.setItem("dismissedResumeAlerts", JSON.stringify([...newDismissed]));
    setAlerts(alerts.filter(a => `${a.version_id}-${a.alert_type}` !== alertKey));
    toast.success("Alert dismissed");
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "low_response":
      case "low_interview":
        return <TrendingDown className="h-5 w-5" />;
      case "slow_response":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertTitle = (alertType: string) => {
    switch (alertType) {
      case "low_response":
        return "Low Response Rate Detected";
      case "low_interview":
        return "Low Interview Rate Detected";
      case "slow_response":
        return "Slower Response Time";
      default:
        return "Performance Alert";
    }
  };

  if (loading) {
    return null;
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <Card className="border-warning bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <Bell className="h-5 w-5" />
          Performance Alerts ({alerts.length})
        </CardTitle>
        <CardDescription>
          We've detected opportunities to improve your application success rate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert, index) => (
          <Alert
            key={`${alert.version_id}-${alert.alert_type}-${index}`}
            variant={alert.severity === "critical" ? "destructive" : "default"}
            className="relative"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getAlertIcon(alert.alert_type)}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <AlertTitle className="mb-1">
                    {getAlertTitle(alert.alert_type)}
                  </AlertTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => dismissAlert(alert.version_id, alert.alert_type)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <AlertDescription className="text-sm">
                  <div className="space-y-3">
                    <p>{alert.recommendation}</p>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          Current: {alert.alert_type.includes("response") && !alert.alert_type.includes("slow") 
                            ? `${alert.current_value.toFixed(1)}%` 
                            : alert.alert_type === "slow_response"
                            ? `${alert.current_value}h`
                            : alert.current_value.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="font-mono bg-success">
                          Best: {alert.alert_type.includes("response") && !alert.alert_type.includes("slow")
                            ? `${alert.best_value.toFixed(1)}%`
                            : alert.alert_type === "slow_response"
                            ? `${alert.best_value}h`
                            : alert.best_value.toFixed(1)}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Lightbulb className="h-4 w-4 text-warning" />
                      <span className="text-xs font-medium">Recommended Action:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => navigate("/resumes")}
                      >
                        Switch to "{alert.best_version_title}"
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
