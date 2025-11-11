import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Minus, Award, Clock, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface VersionMetrics {
  version_id: string;
  version_title: string;
  created_at: string;
  total_applications: number;
  response_rate: number;
  interview_rate: number;
  avg_response_time: number;
}

export default function ResumePerformanceComparison() {
  const [metrics, setMetrics] = useState<VersionMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [bestVersion, setBestVersion] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

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
            created_at: version.created_at,
            total_applications: total,
            response_rate: total > 0 ? Math.round((responses / total) * 100) : 0,
            interview_rate: total > 0 ? Math.round((interviews / total) * 100) : 0,
            avg_response_time: avgResponseTime,
          };
        })
      );

      // Filter out versions with no applications
      const activeMetrics = versionMetrics.filter(m => m.total_applications > 0);

      // Find best performing version
      if (activeMetrics.length > 0) {
        const best = activeMetrics.reduce((prev, current) => 
          (current.interview_rate > prev.interview_rate) ? current : prev
        );
        setBestVersion(best.version_id);
      }

      setMetrics(activeMetrics);
    } catch (error) {
      console.error("Error loading metrics:", error);
      toast.error("Failed to load performance metrics");
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceTrend = (index: number, metric: 'response_rate' | 'interview_rate'): JSX.Element => {
    if (index === metrics.length - 1) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const current = metrics[index][metric];
    const previous = metrics[index + 1][metric];
    
    if (current > previous) return <TrendingUp className="h-4 w-4 text-success" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const chartColors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--success))'];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
          <CardDescription>No resume versions with tracked applications yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start applying to jobs with different resume versions and link them to see performance comparisons.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const comparisonData = metrics.map((m, i) => ({
    name: m.version_title.length > 15 ? m.version_title.substring(0, 15) + "..." : m.version_title,
    fullName: m.version_title,
    responseRate: m.response_rate,
    interviewRate: m.interview_rate,
    applications: m.total_applications,
  }));

  const responseTimeData = metrics
    .filter(m => m.avg_response_time > 0)
    .map((m, i) => ({
      name: m.version_title.length > 15 ? m.version_title.substring(0, 15) + "..." : m.version_title,
      hours: m.avg_response_time,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Resume Performance Comparison
          </CardTitle>
          <CardDescription>
            Side-by-side analysis of your resume versions' success metrics
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Versions Tested</CardDescription>
            <CardTitle className="text-3xl">{metrics.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Applications</CardDescription>
            <CardTitle className="text-3xl">
              {metrics.reduce((sum, m) => sum + m.total_applications, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Best Response Rate</CardDescription>
            <CardTitle className="text-3xl text-success">
              {Math.max(...metrics.map(m => m.response_rate))}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Best Interview Rate</CardDescription>
            <CardTitle className="text-3xl text-success">
              {Math.max(...metrics.map(m => m.interview_rate))}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Response & Interview Rate Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response Rate vs Interview Rate</CardTitle>
          <CardDescription>Compare success metrics across resume versions</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelFormatter={(label) => {
                  const item = comparisonData.find(d => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <Legend />
              <Bar dataKey="responseRate" fill="hsl(var(--primary))" name="Response Rate %" radius={[8, 8, 0, 0]} />
              <Bar dataKey="interviewRate" fill="hsl(var(--success))" name="Interview Rate %" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Application Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Application Volume by Version</CardTitle>
          <CardDescription>Number of applications sent with each resume version</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="applications" fill="hsl(var(--accent))" name="Applications" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Response Time Comparison */}
      {responseTimeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Average Response Time
            </CardTitle>
            <CardDescription>How quickly companies respond to each version (in hours)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                  name="Avg Response Time (hrs)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detailed Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Version Comparison</CardTitle>
          <CardDescription>Complete breakdown of performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <Card key={metric.version_id} className={metric.version_id === bestVersion ? "border-success" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {metric.version_title}
                        {metric.version_id === bestVersion && (
                          <Badge variant="default" className="bg-success">
                            <Award className="h-3 w-3 mr-1" />
                            Best Performer
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Created {new Date(metric.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Send className="h-4 w-4" />
                        Applications
                      </div>
                      <div className="text-2xl font-bold">{metric.total_applications}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        Response Rate
                        {getPerformanceTrend(index, 'response_rate')}
                      </div>
                      <div className="text-2xl font-bold">{metric.response_rate}%</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Award className="h-4 w-4" />
                        Interview Rate
                        {getPerformanceTrend(index, 'interview_rate')}
                      </div>
                      <div className="text-2xl font-bold">{metric.interview_rate}%</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Avg Response
                      </div>
                      <div className="text-2xl font-bold">
                        {metric.avg_response_time > 0 ? `${metric.avg_response_time}h` : "N/A"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
