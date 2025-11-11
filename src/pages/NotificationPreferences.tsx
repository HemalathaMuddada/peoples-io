import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bell, Mail, Loader2, Volume2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pushNotificationManager } from "@/utils/pushNotifications";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NotificationPreference {
  id: string;
  notification_type: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  sound_enabled?: boolean;
  push_enabled?: boolean;
}

const notificationTypes = [
  { key: "job_match", label: "Job Matches", description: "When we find jobs that match your profile" },
  { key: "message", label: "Messages", description: "When you receive new messages" },
  { key: "achievement", label: "Achievements", description: "When you unlock badges or reach milestones" },
  { key: "interview_reminder", label: "Interview Reminders", description: "24-hour reminders before scheduled interviews", critical: true },
  { key: "application_deadline", label: "Application Deadlines", description: "Reminders about upcoming application deadlines", critical: true },
  { key: "follow_up_reminder", label: "Follow-up Reminders", description: "Suggestions to follow up on pending applications" },
  { key: "weekly_digest", label: "Weekly Digest", description: "Weekly summary of your activity and progress" },
  { key: "coaching_session", label: "Coaching Sessions", description: "Reminders and updates about coaching sessions" },
  { key: "learning_milestone", label: "Learning Milestones", description: "Progress updates on learning paths and courses" },
  { key: "company_insight", label: "Company Insights", description: "New insights about companies you're interested in" },
];

export default function NotificationPreferences() {
  const [user, setUser] = useState<any>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check push notification support
    setPushSupported(pushNotificationManager.isSupported());
    setPushPermission(pushNotificationManager.getPermissionStatus());

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPreferences(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPreferences(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPreferences = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      setPreferences(data || []);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (
    notificationType: string,
    field: "email_enabled" | "in_app_enabled" | "sound_enabled" | "push_enabled",
    value: boolean
  ) => {
    if (!user) return;

    // Handle push notification permission request
    if (field === 'push_enabled' && value) {
      const permission = await pushNotificationManager.requestPermission();
      setPushPermission(permission);
      
      if (permission !== 'granted') {
        toast.error("Push notifications permission denied. Please enable in browser settings.");
        return;
      }
    }

    setSaving(true);
    try {
      const existingPref = preferences.find((p) => p.notification_type === notificationType);

      if (existingPref) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({ [field]: value } as any)
          .eq("user_id", user.id)
          .eq("notification_type", notificationType);

        if (error) throw error;

        setPreferences((prev) =>
          prev.map((p) =>
            p.notification_type === notificationType ? { ...p, [field]: value } : p
          )
        );
      } else {
        const { data, error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            notification_type: notificationType,
            [field]: value,
          } as any)
          .select()
          .single();

        if (error) throw error;

        setPreferences((prev) => [...prev, data]);
      }

      toast.success("Preferences updated");
    } catch (error) {
      console.error("Error updating preference:", error);
      toast.error("Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const getPreferenceValue = (notificationType: string, field: "email_enabled" | "in_app_enabled" | "sound_enabled" | "push_enabled") => {
    const pref = preferences.find((p) => p.notification_type === notificationType);
    return pref ? pref[field] ?? (field === 'push_enabled' ? false : true) : true;
  };

  if (!user) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to manage your notification preferences</CardDescription>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Notification Preferences</h1>
              <p className="text-muted-foreground">
                Choose how you'd like to receive notifications. You can enable email, in-app notifications, sounds, or browser push notifications.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/notification-analytics'}
              >
                View Analytics
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/notification-scheduling'}
              >
                Smart Scheduling
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/notification-reports'}
              >
                Weekly Reports
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Manage which notifications you want to receive and how
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {pushSupported && pushPermission !== 'granted' && (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    Push notifications require permission.{' '}
                    <button
                      onClick={async () => {
                        const permission = await pushNotificationManager.requestPermission();
                        setPushPermission(permission);
                        if (permission === 'granted') {
                          toast.success('Push notifications enabled!');
                        }
                      }}
                      className="font-medium underline"
                    >
                      Enable push notifications
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              
              {notificationTypes.map((type, index) => {
                const emailEnabled = getPreferenceValue(type.key, "email_enabled");
                const inAppEnabled = getPreferenceValue(type.key, "in_app_enabled");
                const soundEnabled = getPreferenceValue(type.key, "sound_enabled");
                const pushEnabled = getPreferenceValue(type.key, "push_enabled");
                const isCritical = type.key.includes('interview') || type.key.includes('deadline');

                return (
                  <div key={type.key}>
                    {index > 0 && <Separator className="my-6" />}
                    <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-1 flex items-center gap-2">
                      {type.label}
                      {isCritical && (
                        <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
                          Critical
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 ml-4">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            id={`${type.key}-email`}
                            checked={emailEnabled}
                            onCheckedChange={(checked) =>
                              updatePreference(type.key, "email_enabled", checked)
                            }
                            disabled={saving}
                          />
                          <Label htmlFor={`${type.key}-email`} className="cursor-pointer text-sm">
                            Email
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            id={`${type.key}-inapp`}
                            checked={inAppEnabled}
                            onCheckedChange={(checked) =>
                              updatePreference(type.key, "in_app_enabled", checked)
                            }
                            disabled={saving}
                          />
                          <Label htmlFor={`${type.key}-inapp`} className="cursor-pointer text-sm">
                            In-App
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            id={`${type.key}-sound`}
                            checked={soundEnabled}
                            onCheckedChange={(checked) =>
                              updatePreference(type.key, "sound_enabled", checked)
                            }
                            disabled={saving}
                          />
                          <Label htmlFor={`${type.key}-sound`} className="cursor-pointer text-sm">
                            Sound
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <Switch
                            id={`${type.key}-push`}
                            checked={pushEnabled}
                            onCheckedChange={(checked) =>
                              updatePreference(type.key, "push_enabled", checked)
                            }
                            disabled={saving || pushPermission !== 'granted'}
                          />
                          <Label htmlFor={`${type.key}-push`} className="cursor-pointer text-sm">
                            Push
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={() => window.history.back()}>
            Done
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
