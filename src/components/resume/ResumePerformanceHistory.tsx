import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, Minus, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachWeekOfInterval, eachMonthOfInterval, subMonths, subWeeks } from "date-fns";

interface TimelineDataPoint {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  applications: number;
  responses: number;
  interviews: number;
  responseRate: number;
  interviewRate: number;
  avgResponseTime: number;
}

interface VersionHistory {
  version_id: string;
  version_title: string;
  timeline: TimelineDataPoint[];
  overallTrend: "improving" | "declining" | "stable";
  bestPeriod: string;
  worstPeriod: string;
}

type TimeRange = "4weeks" | "3months" | "6months" | "1year";
type Granularity = "weekly" | "monthly";

export default function ResumePerformanceHistory() {
  const [history, setHistory] = useState<VersionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("3months");
  const [granularity, setGranularity] = useState<Granularity>("weekly");

  useEffect(() => {
    loadHistory();
  }, [timeRange, granularity]);

  const loadHistory = async () => {
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

      // Calculate date range based on selection
      const endDate = new Date();
      let startDate: Date;
      switch (timeRange) {
        case "4weeks":
          startDate = subWeeks(endDate, 4);
          break;
        case "3months":
          startDate = subMonths(endDate, 3);
          break;
        case "6months":
          startDate = subMonths(endDate, 6);
          break;
        case "1year":
          startDate = subMonths(endDate, 12);
          break;
      }

      // Generate time periods
      const periods = granularity === "weekly"
        ? eachWeekOfInterval({ start: startDate, end: endDate })
        : eachMonthOfInterval({ start: startDate, end: endDate });

      // Fetch all applications with their metrics
      const versionHistories: VersionHistory[] = await Promise.all(
        versions.map(async (version) => {
          // Get all applications for this version
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

          if (!metrics || metrics.length === 0) {
            return {
              version_id: version.id,
              version_title: version.title || "Untitled",
              timeline: [],
              overallTrend: "stable" as const,
              bestPeriod: "",
              worstPeriod: "",
            };
          }

          // Group metrics by time period
          const timeline: TimelineDataPoint[] = periods.map((periodStart) => {
            const periodEnd = granularity === "weekly"
              ? endOfWeek(periodStart)
              : endOfMonth(periodStart);

            const periodMetrics = metrics.filter((m: any) => {
              const appDate = new Date(m.job_applications.applied_at || m.job_applications.created_at);
              return appDate >= periodStart && appDate <= periodEnd;
            });

            const applications = periodMetrics.length;
            const responses = periodMetrics.filter((m: any) => m.response_received).length;
            const interviews = periodMetrics.filter((m: any) => m.interview_granted).length;
            
            const responseTimes = periodMetrics
              .filter((m: any) => m.time_to_response_hours !== null)
              .map((m: any) => m.time_to_response_hours);
            
            const avgResponseTime = responseTimes.length > 0
              ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
              : 0;

            return {
              period: format(periodStart, granularity === "weekly" ? "MMM d" : "MMM yyyy"),
              periodStart,
              periodEnd,
              applications,
              responses,
              interviews,
              responseRate: applications > 0 ? (responses / applications) * 100 : 0,
              interviewRate: applications > 0 ? (interviews / applications) * 100 : 0,
              avgResponseTime,
            };
          });

          // Filter out periods with no data
          const activeTimeline = timeline.filter(t => t.applications > 0);

          // Calculate trend
          let overallTrend: "improving" | "declining" | "stable" = "stable";
          if (activeTimeline.length >= 2) {
            const recentPeriods = activeTimeline.slice(-3);
            const olderPeriods = activeTimeline.slice(0, Math.min(3, activeTimeline.length - 3));
            
            if (olderPeriods.length > 0) {
              const recentAvg = recentPeriods.reduce((sum, p) => sum + p.interviewRate, 0) / recentPeriods.length;
              const olderAvg = olderPeriods.reduce((sum, p) => sum + p.interviewRate, 0) / olderPeriods.length;
              
              if (recentAvg > olderAvg + 10) {
                overallTrend = "improving";
              } else if (recentAvg < olderAvg - 10) {
                overallTrend = "declining";
              }
            }
          }

          // Find best and worst periods
          const periodsWithData = timeline.filter(t => t.applications > 0);
          const bestPeriod = periodsWithData.length > 0
            ? periodsWithData.reduce((best, current) => 
                current.interviewRate > best.interviewRate ? current : best
              ).period
            : "";
          
          const worstPeriod = periodsWithData.length > 0
            ? periodsWithData.reduce((worst, current) => 
                current.interviewRate < worst.interviewRate ? current : worst
              ).period
            : "";

          return {
            version_id: version.id,
            version_title: version.title || "Untitled",
            timeline,
            overallTrend,
            bestPeriod,
            worstPeriod,
          };
        })
      );

      // Filter out versions with no timeline data
      setHistory(versionHistories.filter(h => h.timeline.some(t => t.applications > 0)));
    } catch (error) {
      console.error("Error loading history:", error);
      toast.error("Failed to load performance history");
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-success" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case "improving":
        return <Badge className="bg-success">Improving</Badge>;
      case "declining":
        return <Badge variant="destructive">Declining</Badge>;
      default:
        return <Badge variant="secondary">Stable</Badge>;
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

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Performance History
          </CardTitle>
          <CardDescription>No performance history available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>Start applying to jobs with your resume versions to build performance history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredHistory = selectedVersion === "all" 
    ? history 
    : history.filter(h => h.version_id === selectedVersion);

  // Prepare chart data
  const chartData = filteredHistory.length > 0 && filteredHistory[0].timeline.length > 0
    ? filteredHistory[0].timeline.map(point => {
        const dataPoint: any = {
          period: point.period,
        };
        
        filteredHistory.forEach(version => {
          const versionPoint = version.timeline.find(t => t.period === point.period);
          dataPoint[`${version.version_title}_response`] = versionPoint?.responseRate || 0;
          dataPoint[`${version.version_title}_interview`] = versionPoint?.interviewRate || 0;
          dataPoint[`${version.version_title}_apps`] = versionPoint?.applications || 0;
        });
        
        return dataPoint;
      })
    : [];

  const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Performance History Timeline
              </CardTitle>
              <CardDescription>Track how your resume versions perform over time</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4weeks">Last 4 Weeks</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={granularity} onValueChange={(value: Granularity) => setGranularity(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Version Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Filter by Version:</label>
            <Select value={selectedVersion} onValueChange={setSelectedVersion}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Versions</SelectItem>
                {history.map(h => (
                  <SelectItem key={h.version_id} value={h.version_id}>
                    {h.version_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Response Rate Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Response Rate Over Time</CardTitle>
          <CardDescription>Track how companies respond to your applications</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" className="text-xs" />
              <YAxis label={{ value: 'Response Rate (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              {filteredHistory.map((version, index) => (
                <Line
                  key={version.version_id}
                  type="monotone"
                  dataKey={`${version.version_title}_response`}
                  name={`${version.version_title} Response Rate`}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Interview Rate Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Rate Over Time</CardTitle>
          <CardDescription>Track how often applications lead to interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" className="text-xs" />
              <YAxis label={{ value: 'Interview Rate (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              {filteredHistory.map((version, index) => (
                <Area
                  key={version.version_id}
                  type="monotone"
                  dataKey={`${version.version_title}_interview`}
                  name={`${version.version_title} Interview Rate`}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.6}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trend Analysis Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredHistory.map((version) => (
          <Card key={version.version_id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{version.version_title}</CardTitle>
                {getTrendIcon(version.overallTrend)}
              </div>
              <div className="flex items-center gap-2">
                {getTrendBadge(version.overallTrend)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {version.bestPeriod && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Best Period:</span>
                  <p className="font-medium text-success">{version.bestPeriod}</p>
                </div>
              )}
              {version.worstPeriod && version.bestPeriod !== version.worstPeriod && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Needs Improvement:</span>
                  <p className="font-medium text-warning">{version.worstPeriod}</p>
                </div>
              )}
              <div className="text-sm">
                <span className="text-muted-foreground">Total Applications:</span>
                <p className="font-medium">
                  {version.timeline.reduce((sum, t) => sum + t.applications, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
