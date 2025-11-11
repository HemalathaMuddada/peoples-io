import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, TrendingUp, Calendar, Loader2, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NotificationReports() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPreference(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPreference(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPreference = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("email_enabled")
        .eq("user_id", userId)
        .eq("notification_type", "weekly_digest")
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setWeeklyEnabled(data?.email_enabled ?? false);
    } catch (error) {
      console.error("Error fetching preference:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWeeklyReport = async (enabled: boolean) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .eq("notification_type", "weekly_digest")
        .single();

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({ email_enabled: enabled })
          .eq("user_id", user.id)
          .eq("notification_type", "weekly_digest");

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            notification_type: "weekly_digest",
            email_enabled: enabled,
            in_app_enabled: false,
          });

        if (error) throw error;
      }

      setWeeklyEnabled(enabled);
      toast.success(enabled ? "Weekly reports enabled" : "Weekly reports disabled");
    } catch (error) {
      console.error("Error updating preference:", error);
      toast.error("Failed to update preference");
    }
  };

  const sendTestReport = async () => {
    if (!user) return;

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-weekly-analytics-report', {
        body: { testMode: true, userId: user.id },
      });

      if (error) throw error;

      toast.success("Test report sent! Check your email.");
    } catch (error) {
      console.error("Error sending test report:", error);
      toast.error("Failed to send test report");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to manage weekly reports</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Weekly Analytics Reports</h1>
          <p className="text-muted-foreground">
            Get comprehensive email summaries of your notification engagement every Monday
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Weekly Email Reports
                </CardTitle>
                <CardDescription>
                  Receive detailed analytics and personalized recommendations every Monday morning
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="weekly-reports" className="text-base font-medium">
                      Enable Weekly Reports
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get a comprehensive summary delivered to your inbox every Monday
                    </p>
                  </div>
                  <Switch
                    id="weekly-reports"
                    checked={weeklyEnabled}
                    onCheckedChange={toggleWeeklyReport}
                  />
                </div>

                {weeklyEnabled && (
                  <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                      You'll receive your next report on Monday morning. The report includes:
                      <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
                        <li>Total notifications sent, opened, and clicked</li>
                        <li>Engagement rates and trends over time</li>
                        <li>Your personal engagement patterns (best times and days)</li>
                        <li>Performance breakdown by notification type</li>
                        <li>Personalized recommendations to improve engagement</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  What's Included
                </CardTitle>
                <CardDescription>
                  Here's what you'll see in your weekly analytics report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">📊 Performance Metrics</h4>
                    <p className="text-sm text-muted-foreground">
                      See your overall engagement statistics including open rates, click-through rates, 
                      and how you compare to previous weeks.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">📈 Engagement Patterns</h4>
                    <p className="text-sm text-muted-foreground">
                      Discover when you're most active and which notification types you engage with most.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">📋 Type Breakdown</h4>
                    <p className="text-sm text-muted-foreground">
                      View detailed analytics for each notification type to understand what matters most to you.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">💡 Smart Recommendations</h4>
                    <p className="text-sm text-muted-foreground">
                      Get personalized tips to optimize your notification settings based on your behavior.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {weeklyEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Preview Report
                  </CardTitle>
                  <CardDescription>
                    Send yourself a test report to see what it looks like
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={sendTestReport}
                    disabled={sending}
                    className="w-full sm:w-auto"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Test Report
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    This will send a report based on your last 7 days of activity
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => window.history.back()}>
                Back
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/notification-preferences'}
              >
                Manage All Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}