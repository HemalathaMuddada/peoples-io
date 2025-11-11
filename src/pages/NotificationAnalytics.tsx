import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Mail, Bell, Smartphone, Activity, Target } from "lucide-react";
import { format, subDays } from "date-fns";

interface AnalyticsData {
  notification_type: string;
  channel: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_failed: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  click_through_rate: number;
}

interface TrendData {
  time_bucket: string;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
}

interface UserEngagement {
  total_notifications_received: number;
  total_opened: number;
  total_clicked: number;
  average_open_rate: number;
  most_engaged_type: string;
  least_engaged_type: string;
  preferred_channel: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function NotificationAnalytics() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [userEngagement, setUserEngagement] = useState<UserEngagement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAnalytics(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAnalytics(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [dateRange]);

  const fetchAnalytics = async (userId: string) => {
    setLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(dateRange)).toISOString();
      const endDate = new Date().toISOString();

      // Fetch analytics data
      const { data: analyticsData, error: analyticsError } = await supabase.rpc(
        'get_notification_analytics',
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_user_id: userId,
        }
      );

      if (analyticsError) throw analyticsError;
      setAnalytics(analyticsData || []);

      // Fetch trend data
      const { data: trendData, error: trendError } = await supabase.rpc(
        'get_notification_engagement_trends',
        {
          p_start_date: startDate,
          p_end_date: endDate,
          p_granularity: parseInt(dateRange) > 7 ? 'day' : 'hour',
        }
      );

      if (trendError) throw trendError;
      setTrends(
        (trendData || []).map((item: any) => ({
          ...item,
          time_bucket: format(new Date(item.time_bucket), parseInt(dateRange) > 7 ? 'MMM dd' : 'HH:mm'),
        }))
      );

      // Fetch user engagement summary
      const { data: engagementData, error: engagementError } = await supabase.rpc(
        'get_user_engagement_summary',
        { p_user_id: userId }
      );

      if (engagementError) throw engagementError;
      setUserEngagement(engagementData?.[0] || null);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const channelData = analytics.reduce((acc: any[], item) => {
    const existing = acc.find((d) => d.channel === item.channel);
    if (existing) {
      existing.value += item.total_sent;
    } else {
      acc.push({ channel: item.channel, value: item.total_sent });
    }
    return acc;
  }, []);

  const typePerformance = analytics
    .reduce((acc: any[], item) => {
      const existing = acc.find((d) => d.type === item.notification_type);
      if (existing) {
        existing.sent += item.total_sent;
        existing.opened += item.total_opened;
        existing.clicked += item.total_clicked;
      } else {
        acc.push({
          type: item.notification_type,
          sent: item.total_sent,
          opened: item.total_opened,
          clicked: item.total_clicked,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 8);

  if (!user) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to view notification analytics</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Notification Analytics</h1>
            <p className="text-muted-foreground">
              Track delivery rates, engagement, and user interaction patterns
            </p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        {userEngagement && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userEngagement.total_notifications_received}</div>
                <p className="text-xs text-muted-foreground">
                  Preferred: {userEngagement.preferred_channel || 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Opened</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userEngagement.total_opened}</div>
                <p className="text-xs text-muted-foreground">
                  {userEngagement.average_open_rate}% open rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clicked</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userEngagement.total_clicked}</div>
                <p className="text-xs text-muted-foreground">
                  {userEngagement.total_opened > 0
                    ? Math.round((userEngagement.total_clicked / userEngagement.total_opened) * 100)
                    : 0}% CTR
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Engaged</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">
                  {userEngagement.most_engaged_type || 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Top notification type
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="types">By Type</TabsTrigger>
            <TabsTrigger value="channels">By Channel</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Channel Distribution</CardTitle>
                  <CardDescription>Notifications sent by channel</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ channel, percent }) =>
                          `${channel}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Types</CardTitle>
                  <CardDescription>Notifications by engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={typePerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sent" fill="#3b82f6" name="Sent" />
                      <Bar dataKey="opened" fill="#10b981" name="Opened" />
                      <Bar dataKey="clicked" fill="#f59e0b" name="Clicked" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Notification Type</CardTitle>
                <CardDescription>Detailed metrics for each notification type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.map((item, index) => (
                    <div key={index} className="flex flex-col space-y-2 pb-4 border-b last:border-0">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{item.notification_type}</h4>
                          <p className="text-sm text-muted-foreground">{item.channel}</p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">{item.total_sent} sent</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Delivery</div>
                          <div className="font-medium">{item.delivery_rate}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Open</div>
                          <div className="font-medium">{item.open_rate}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Click</div>
                          <div className="font-medium">{item.click_rate}%</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">CTR</div>
                          <div className="font-medium">{item.click_through_rate}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="channels" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {['email', 'in_app', 'push'].map((channel) => {
                const channelStats = analytics.filter((a) => a.channel === channel);
                const totalSent = channelStats.reduce((sum, s) => sum + s.total_sent, 0);
                const avgOpenRate =
                  channelStats.length > 0
                    ? channelStats.reduce((sum, s) => sum + s.open_rate, 0) / channelStats.length
                    : 0;

                const Icon = channel === 'email' ? Mail : channel === 'push' ? Smartphone : Bell;

                return (
                  <Card key={channel}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </CardTitle>
                      <CardDescription>{totalSent} notifications sent</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Open Rate</span>
                          <span className="font-medium">{avgOpenRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Types</span>
                          <span className="font-medium">{channelStats.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends Over Time</CardTitle>
                <CardDescription>Track how users interact with notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time_bucket" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="total_sent"
                      stroke="#3b82f6"
                      name="Sent"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="total_opened"
                      stroke="#10b981"
                      name="Opened"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="total_clicked"
                      stroke="#f59e0b"
                      name="Clicked"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="open_rate"
                      stroke="#8b5cf6"
                      name="Open Rate %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
