import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Bell, BellOff, CheckCircle2, AlertCircle } from "lucide-react";
import { pushNotificationManager } from "@/utils/pushNotifications";

export default function PushNotificationSetup() {
  const [user, setUser] = useState<any>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Check current permission status
    setPermission(pushNotificationManager.getPermissionStatus());

    return () => subscription.unsubscribe();
  }, []);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const result = await pushNotificationManager.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Push notifications enabled!');
        
        // Save preference to database
        if (user) {
          await pushNotificationManager.savePushPreference(user.id, true);
        }

        // Show a test notification
        await pushNotificationManager.showNotification(
          'Notifications Enabled!',
          {
            body: 'You\'ll now receive important alerts even when the app is closed.',
          }
        );
      } else if (result === 'denied') {
        toast.error('Notifications blocked. Please enable them in your browser settings.');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (user) {
      await pushNotificationManager.savePushPreference(user.id, false);
      toast.success('Push notifications disabled');
    }
  };

  if (!user) {
    return (
      <AppLayout user={user}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please sign in to set up push notifications</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const isSupported = pushNotificationManager.isSupported();

  return (
    <AppLayout user={user}>
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Push Notifications</h1>
          <p className="text-muted-foreground">
            Get instant alerts for critical updates like interview reminders and urgent messages
          </p>
        </div>

        {!isSupported && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your browser doesn't support push notifications. Try using a modern browser like Chrome, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {permission === 'granted' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Notifications Enabled
                </>
              ) : (
                <>
                  <Bell className="h-5 w-5" />
                  Enable Push Notifications
                </>
              )}
            </CardTitle>
            <CardDescription>
              {permission === 'granted'
                ? 'You\'re all set! You\'ll receive important notifications even when the app is closed.'
                : 'Receive instant alerts for critical updates'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {permission === 'default' && (
              <>
                <div className="space-y-4">
                  <h3 className="font-medium">You'll be notified about:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Interview reminders (24 hours before)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Application deadlines approaching</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Urgent messages from coaches or recruiters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Time-sensitive job opportunities</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={handleEnableNotifications}
                  disabled={!isSupported || loading}
                  className="w-full"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  {loading ? 'Setting up...' : 'Enable Push Notifications'}
                </Button>
              </>
            )}

            {permission === 'granted' && (
              <>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Push notifications are active. You can manage individual notification types in your notification preferences.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/notification-preferences'}
                    className="flex-1"
                  >
                    Manage Preferences
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisableNotifications}
                    className="flex-1"
                  >
                    <BellOff className="mr-2 h-4 w-4" />
                    Disable
                  </Button>
                </div>
              </>
            )}

            {permission === 'denied' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Notifications are blocked. To enable them, please update your browser settings:
                  <ul className="mt-2 ml-4 list-disc text-sm">
                    <li>Click the lock icon in your address bar</li>
                    <li>Find "Notifications" in the permissions list</li>
                    <li>Change it to "Allow"</li>
                    <li>Refresh this page</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
