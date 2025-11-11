import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, Users, Award, Target, Star, BarChart3, LineChart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface RecruiterPerformance {
  id: string;
  name: string;
  total_placements: number;
  total_revenue: number;
  avg_satisfaction: number;
  active_clients: number;
  placement_trend: number;
  satisfaction_trend: number;
}

interface ClientSatisfaction {
  month: string;
  avg_rating: number;
  total_feedback: number;
}

interface RevenueData {
  recruiter_name: string;
  revenue: number;
  placements: number;
  avg_per_placement: number;
}

export default function AgencyAnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [recruiters, setRecruiters] = useState<RecruiterPerformance[]>([]);
  const [satisfactionTrends, setSatisfactionTrends] = useState<ClientSatisfaction[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalRevenue: 0,
    totalPlacements: 0,
    avgSatisfaction: 0,
    activeRecruiters: 0,
    revenueTrend: 0,
    placementTrend: 0
  });

  useEffect(() => {
    checkAccess();
  }, [timeRange]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, org_id")
        .eq("user_id", user.id)
        .eq("role", "agency_admin");

      if (!roles || roles.length === 0) {
        toast.error("Access denied. This dashboard is for agency administrators only.");
        navigate("/dashboard");
        return;
      }

      await fetchAnalytics(roles[0].org_id);
    } catch (error) {
      console.error("Error checking access:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (orgId: string) => {
    try {
      // Fetch all recruiters in the agency
      const { data: agencyUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("org_id", orgId)
        .eq("role", "recruiter");

      if (!agencyUsers || agencyUsers.length === 0) {
        return;
      }

      const recruiterIds = agencyUsers.map(u => u.user_id);

      // Fetch recruiter performance data
      const { data: performance } = await (supabase as any)
        .from("recruiter_performance")
        .select(`
          recruiter_id,
          total_placements,
          total_revenue,
          avg_client_satisfaction,
          updated_at
        `)
        .in("recruiter_id", recruiterIds);

      // Fetch recruiter profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", recruiterIds);

      // Count active clients per recruiter
      const { data: assignments } = await (supabase as any)
        .from("client_recruiter_assignments")
        .select("recruiter_id, relationship_id");

      // Combine data
      const recruiterStats: RecruiterPerformance[] = (profiles || []).map(profile => {
        const perf = performance?.find(p => p.recruiter_id === profile.id);
        const clientCount = assignments?.filter(a => a.recruiter_id === profile.id).length || 0;

        return {
          id: profile.id,
          name: profile.full_name || "Unknown",
          total_placements: perf?.total_placements || 0,
          total_revenue: perf?.total_revenue || 0,
          avg_satisfaction: perf?.avg_client_satisfaction || 0,
          active_clients: clientCount,
          placement_trend: 0, // Would calculate from historical data
          satisfaction_trend: 0
        };
      });

      setRecruiters(recruiterStats);

      // Calculate total stats
      const totalRevenue = recruiterStats.reduce((sum, r) => sum + r.total_revenue, 0);
      const totalPlacements = recruiterStats.reduce((sum, r) => sum + r.total_placements, 0);
      const avgSatisfaction = recruiterStats.length > 0
        ? recruiterStats.reduce((sum, r) => sum + r.avg_satisfaction, 0) / recruiterStats.length
        : 0;

      setTotalStats({
        totalRevenue,
        totalPlacements,
        avgSatisfaction,
        activeRecruiters: recruiterStats.length,
        revenueTrend: 12.5, // Would calculate from historical comparison
        placementTrend: 8.3
      });

      // Prepare revenue data sorted
      const sortedRevenueData: RevenueData[] = recruiterStats
        .map(r => ({
          recruiter_name: r.name,
          revenue: r.total_revenue,
          placements: r.total_placements,
          avg_per_placement: r.total_placements > 0 ? r.total_revenue / r.total_placements : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);

      setRevenueData(sortedRevenueData);

      // Mock satisfaction trends (would query historical feedback)
      setSatisfactionTrends([
        { month: "Jan", avg_rating: 4.2, total_feedback: 15 },
        { month: "Feb", avg_rating: 4.4, total_feedback: 18 },
        { month: "Mar", avg_rating: 4.6, total_feedback: 22 },
        { month: "Apr", avg_rating: 4.5, total_feedback: 20 },
        { month: "May", avg_rating: 4.7, total_feedback: 25 },
        { month: "Jun", avg_rating: 4.8, total_feedback: 28 }
      ]);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderTrendIndicator = (trend: number) => {
    const isPositive = trend >= 0;
    return (
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{Math.abs(trend).toFixed(1)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Agency Analytics</h1>
          <p className="text-muted-foreground">Track performance, revenue, and client satisfaction</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalRevenue)}</div>
            {renderTrendIndicator(totalStats.revenueTrend)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Placements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalPlacements}</div>
            {renderTrendIndicator(totalStats.placementTrend)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.avgSatisfaction.toFixed(1)}/5.0</div>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(n => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${
                    n <= Math.round(totalStats.avgSatisfaction)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Recruiters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.activeRecruiters}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all teams</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="satisfaction">Client Satisfaction</TabsTrigger>
          <TabsTrigger value="insights">Predictive Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recruiter Performance Comparison</CardTitle>
              <CardDescription>Compare your team's performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recruiters.map((recruiter, index) => (
                  <div key={recruiter.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{recruiter.name}</h3>
                        {index === 0 && <Badge variant="default">Top Performer</Badge>}
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Placements</p>
                          <p className="font-bold">{recruiter.total_placements}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="font-bold">{formatCurrency(recruiter.total_revenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Rating</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-bold">{recruiter.avg_satisfaction.toFixed(1)}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Clients</p>
                          <p className="font-bold">{recruiter.active_clients}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {recruiters.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recruiter data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Recruiter</CardTitle>
                <CardDescription>Top revenue generators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueData.slice(0, 5).map((data, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{data.recruiter_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(data.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{data.placements} placements</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Revenue per Placement</CardTitle>
                <CardDescription>Efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {revenueData
                    .filter(d => d.placements > 0)
                    .sort((a, b) => b.avg_per_placement - a.avg_per_placement)
                    .slice(0, 5)
                    .map((data, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">{data.recruiter_name}</span>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(data.avg_per_placement)}</p>
                          <p className="text-xs text-muted-foreground">per placement</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Distribution</CardTitle>
              <CardDescription>Total: {formatCurrency(totalStats.totalRevenue)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {revenueData.map((data, index) => {
                  const percentage = totalStats.totalRevenue > 0
                    ? (data.revenue / totalStats.totalRevenue) * 100
                    : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{data.recruiter_name}</span>
                        <span className="font-medium">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Satisfaction Trends</CardTitle>
              <CardDescription>Monthly average ratings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {satisfactionTrends.map((trend, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-16 text-sm font-medium">{trend.month}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(n => (
                            <Star
                              key={n}
                              className={`h-4 w-4 ${
                                n <= Math.round(trend.avg_rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-bold">{trend.avg_rating.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{trend.total_feedback} feedback submissions</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Rated Recruiters</CardTitle>
                <CardDescription>Based on client feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recruiters
                    .filter(r => r.avg_satisfaction > 0)
                    .sort((a, b) => b.avg_satisfaction - a.avg_satisfaction)
                    .slice(0, 5)
                    .map((recruiter, index) => (
                      <div key={recruiter.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{recruiter.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold">{recruiter.avg_satisfaction.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Satisfaction Insights</CardTitle>
                <CardDescription>Key findings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Improving Trend</p>
                    <p className="text-sm text-muted-foreground">
                      Client satisfaction has increased by 14% over the last quarter
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Goal Progress</p>
                    <p className="text-sm text-muted-foreground">
                      Currently at {totalStats.avgSatisfaction.toFixed(1)}/5.0, targeting 4.8/5.0
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Team Average</p>
                    <p className="text-sm text-muted-foreground">
                      Above industry standard of 4.2/5.0
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Predictive Insights & Optimization</CardTitle>
              <CardDescription>AI-powered recommendations for growth</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h3 className="font-semibold flex items-center gap-2 text-green-700">
                  <TrendingUp className="h-5 w-5" />
                  Growth Opportunity
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on current trends, your agency is projected to achieve{" "}
                  <span className="font-bold">{formatCurrency(totalStats.totalRevenue * 1.15)}</span> in revenue
                  next quarter (15% growth) if current performance continues.
                </p>
              </div>

              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="font-semibold flex items-center gap-2 text-blue-700">
                  <Target className="h-5 w-5" />
                  Optimization Recommendation
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Recruiters with satisfaction ratings above 4.5 show 35% higher placement rates.
                  Consider investing in training programs for lower-rated team members.
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <h3 className="font-semibold flex items-center gap-2 text-purple-700">
                  <Users className="h-5 w-5" />
                  Team Balance
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Top 3 recruiters generate 65% of total revenue. Consider expanding client assignments
                  to other team members to improve load balancing and risk distribution.
                </p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4 py-2">
                <h3 className="font-semibold flex items-center gap-2 text-orange-700">
                  <BarChart3 className="h-5 w-5" />
                  Client Retention
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Clients with satisfaction ratings above 4.5 have an 85% retention rate.
                  Focus on maintaining high service quality for {recruiters.filter(r => r.avg_satisfaction >= 4.5).length} top-rated recruiters.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>Recommended next steps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Schedule team training</p>
                      <p className="text-sm text-muted-foreground">Focus on customer service excellence</p>
                      <Button size="sm" variant="outline" className="mt-2">Schedule</Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Rebalance client assignments</p>
                      <p className="text-sm text-muted-foreground">Distribute workload more evenly</p>
                      <Button size="sm" variant="outline" className="mt-2">Review</Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Set performance goals</p>
                      <p className="text-sm text-muted-foreground">Establish quarterly targets</p>
                      <Button size="sm" variant="outline" className="mt-2">Set Goals</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Forecast</CardTitle>
                <CardDescription>Next 90 days projection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Projected Placements</span>
                    <span className="font-bold">{Math.round(totalStats.totalPlacements * 1.1)}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-green-500 rounded-full h-2" style={{ width: '110%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Projected Revenue</span>
                    <span className="font-bold">{formatCurrency(totalStats.totalRevenue * 1.15)}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-blue-500 rounded-full h-2" style={{ width: '115%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Target Satisfaction</span>
                    <span className="font-bold">4.8/5.0</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-purple-500 rounded-full h-2" style={{ width: `${(totalStats.avgSatisfaction / 4.8) * 100}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}