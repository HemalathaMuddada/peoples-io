import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Eye, Bookmark, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a78bfa', '#fb923c', '#38bdf8'];

const EventAnalytics = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["event-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("event_analytics")
        .select("*")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch favorites data
  const { data: favoritesData } = useQuery({
    queryKey: ["favorite-events-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_events")
        .select("*");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  // Process data for charts
  const getCategoryData = () => {
    if (!analyticsData) return [];
    
    const categoryCount: Record<string, number> = {};
    analyticsData.forEach((item) => {
      if (item.event_category) {
        categoryCount[item.event_category] = (categoryCount[item.event_category] || 0) + 1;
      }
    });

    return Object.entries(categoryCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  };

  const getInteractionTrends = () => {
    if (!analyticsData) return [];

    const trendData: Record<string, Record<string, number>> = {};
    
    analyticsData.forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!trendData[date]) {
        trendData[date] = { view: 0, favorite: 0, click: 0 };
      }
      trendData[date][item.interaction_type] = (trendData[date][item.interaction_type] || 0) + 1;
    });

    return Object.entries(trendData)
      .map(([date, data]) => ({ date, ...data }))
      .slice(-14); // Last 14 days
  };

  const getEngagementMetrics = () => {
    if (!analyticsData) return { views: 0, favorites: 0, clicks: 0 };

    return {
      views: analyticsData.filter(d => d.interaction_type === 'view').length,
      favorites: analyticsData.filter(d => d.interaction_type === 'favorite').length,
      clicks: analyticsData.filter(d => d.interaction_type === 'click').length,
    };
  };

  const getTopEvents = () => {
    if (!analyticsData) return [];

    const eventCount: Record<string, { title: string; count: number }> = {};
    
    analyticsData.forEach((item) => {
      if (!eventCount[item.event_url]) {
        eventCount[item.event_url] = { title: item.event_title, count: 0 };
      }
      eventCount[item.event_url].count++;
    });

    return Object.entries(eventCount)
      .map(([url, data]) => ({ name: data.title.substring(0, 40) + '...', count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const categoryData = getCategoryData();
  const trendData = getInteractionTrends();
  const metrics = getEngagementMetrics();
  const topEvents = getTopEvents();

  return (
    <AppLayout user={user}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Event Analytics
          </h1>
          <p className="text-muted-foreground text-lg">
            Track event engagement, popular categories, and user trends
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics.views}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
              <Bookmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{favoritesData?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Event Clicks</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics.clicks}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {new Set(analyticsData?.map(d => d.user_id).filter(Boolean)).size}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trends">Engagement Trends</TabsTrigger>
            <TabsTrigger value="categories">Popular Categories</TabsTrigger>
            <TabsTrigger value="events">Top Events</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Interaction Trends</CardTitle>
                <CardDescription>
                  Daily views, favorites, and clicks over the last 14 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="view" stroke="#8884d8" name="Views" />
                      <Line type="monotone" dataKey="favorite" stroke="#82ca9d" name="Favorites" />
                      <Line type="monotone" dataKey="click" stroke="#ffc658" name="Clicks" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No trend data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Categories Distribution</CardTitle>
                <CardDescription>
                  Most popular event categories by total interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No category data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Events</CardTitle>
                <CardDescription>
                  Most viewed and interacted events in the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : topEvents.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topEvents} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={200} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" name="Interactions" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No event data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default EventAnalytics;
