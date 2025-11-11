import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, TrendingUp, Calendar, Bell, Loader2, Activity } from "lucide-react";
import { format } from "date-fns";

interface EngagementPattern {
  best_hour: number;
  best_day: string;
  total_engagements: number;
  avg_response_time_minutes: number;
  preferred_channel: string;
}

interface ScheduledNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  channel: string;
  scheduled_for: string;
  status: string;
  created_at: string;
  sent_at?: string;
}

interface OptimalTime {
  hour_of_day: number;
  day_of_week: number;
  engagement_score: number;
  avg_open_rate: number;
}

export default function NotificationScheduling() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<EngagementPattern | null>(null);
  const [scheduled, setScheduled] = useState<ScheduledNotification[]>([]);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTime[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    try {
      // Fetch engagement patterns
      const { data: patternData, error: patternError } = await supabase
        .rpc('get_user_engagement_patterns', { p_user_id: userId });

      if (patternError) throw patternError;
      if (patternData && patternData.length > 0) {
        setPatterns(patternData[0]);
      }

      // Fetch optimal times
      const { data: timesData, error: timesError } = await supabase
        .rpc('get_user_optimal_send_time', { p_user_id: userId });

      if (timesError) throw timesError;
      setOptimalTimes(timesData || []);

      // Fetch scheduled notifications
      const { data: scheduledData, error: scheduledError } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('scheduled_for', { ascending: true });

      if (scheduledError) throw scheduledError;
      setScheduled(scheduledData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load scheduling data");
    } finally {
      setLoading(false);
    }
  };

  const cancelScheduled = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .update({ status: 'cancelled' })
        .eq('id', notificationId);

      if (error) throw error;

      setScheduled(prev => prev.filter(n => n.id !== notificationId));
      toast.success("Notification cancelled");
    } catch (error) {
      console.error("Error cancelling notification:", error);
      toast.error("Failed to cancel notification");
    }
  };

  const getDayName = (dayNum: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum] || 'Unknown';
  };

  const formatTime = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  };

  if (!user) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to view notification scheduling</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="container max-w-6xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Smart Notification Scheduling</h1>
          <p className="text-muted-foreground">
            AI-powered scheduling optimizes notification delivery based on your engagement patterns
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="patterns" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="patterns">
                <Activity className="h-4 w-4 mr-2" />
                Your Patterns
              </TabsTrigger>
              <TabsTrigger value="optimal">
                <TrendingUp className="h-4 w-4 mr-2" />
                Optimal Times
              </TabsTrigger>
              <TabsTrigger value="scheduled">
                <Calendar className="h-4 w-4 mr-2" />
                Scheduled ({scheduled.filter(n => n.status === 'pending').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="patterns">
              <Card>
                <CardHeader>
                  <CardTitle>Your Engagement Patterns</CardTitle>
                  <CardDescription>
                    Based on your last 30 days of notification interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {patterns ? (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Best Time
                        </div>
                        <div className="text-2xl font-bold">
                          {patterns.best_hour !== null ? formatTime(patterns.best_hour) : 'N/A'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Best Day
                        </div>
                        <div className="text-2xl font-bold">
                          {patterns.best_day || 'N/A'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Bell className="h-4 w-4" />
                          Total Engagements
                        </div>
                        <div className="text-2xl font-bold">
                          {patterns.total_engagements}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Activity className="h-4 w-4" />
                          Avg Response Time
                        </div>
                        <div className="text-2xl font-bold">
                          {Math.round(patterns.avg_response_time_minutes)} min
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <TrendingUp className="h-4 w-4" />
                          Preferred Channel
                        </div>
                        <div className="text-2xl font-bold capitalize">
                          {patterns.preferred_channel || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Not enough engagement data yet</p>
                      <p className="text-sm mt-2">
                        Interact with notifications to build your pattern profile
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="optimal">
              <Card>
                <CardHeader>
                  <CardTitle>Optimal Send Times</CardTitle>
                  <CardDescription>
                    Times when you're most likely to engage with notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {optimalTimes.length > 0 ? (
                    <div className="space-y-4">
                      {optimalTimes.map((time, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {formatTime(time.hour_of_day)} on {getDayName(time.day_of_week)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {time.avg_open_rate.toFixed(1)}% open rate
                              </span>
                            </div>
                          </div>
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            Score: {time.engagement_score.toFixed(2)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No optimal times calculated yet</p>
                      <p className="text-sm mt-2">
                        Continue engaging with notifications to see patterns
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scheduled">
              <Card>
                <CardHeader>
                  <CardTitle>Scheduled Notifications</CardTitle>
                  <CardDescription>
                    Notifications queued for optimal delivery times
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {scheduled.length > 0 ? (
                    <div className="space-y-4">
                      {scheduled.map((notification) => (
                        <div key={notification.id} className="flex items-start justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{notification.title}</h4>
                              <Badge variant={
                                notification.status === 'pending' ? 'default' :
                                notification.status === 'sent' ? 'secondary' :
                                notification.status === 'failed' ? 'destructive' : 'outline'
                              }>
                                {notification.status}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {notification.channel}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Scheduled: {format(new Date(notification.scheduled_for), 'PPp')}</span>
                              {notification.sent_at && (
                                <span>Sent: {format(new Date(notification.sent_at), 'PPp')}</span>
                              )}
                            </div>
                          </div>
                          {notification.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelScheduled(notification.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No scheduled notifications</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}