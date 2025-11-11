import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CalendarSettings() {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState<'google' | 'outlook' | null>(null);

  const { data: connections, isLoading } = useQuery({
    queryKey: ['calendar-connections'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('calendar_connections')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await (supabase as any)
        .from('calendar_connections')
        .delete()
        .eq('id', connectionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
      toast.success('Calendar disconnected');
    },
    onError: (error: any) => {
      toast.error('Failed to disconnect calendar: ' + error.message);
    },
  });

  const connectGoogle = async () => {
    setConnecting('google');
    
    try {
      const redirectUri = `${window.location.origin}/calendar-callback`;
      
      const { data, error } = await supabase.functions.invoke('get-calendar-auth-url', {
        body: { provider: 'google', redirectUri },
      });

      if (error) throw error;
      
      window.location.href = data.authUrl;
    } catch (error: any) {
      toast.error('Failed to connect: ' + error.message);
      setConnecting(null);
    }
  };

  const connectOutlook = async () => {
    setConnecting('outlook');
    
    try {
      const redirectUri = `${window.location.origin}/calendar-callback`;
      
      const { data, error } = await supabase.functions.invoke('get-calendar-auth-url', {
        body: { provider: 'outlook', redirectUri },
      });

      if (error) throw error;
      
      window.location.href = data.authUrl;
    } catch (error: any) {
      toast.error('Failed to connect: ' + error.message);
      setConnecting(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading calendar settings...</div>;
  }

  const hasGoogle = connections?.some((c: any) => c.provider === 'google');
  const hasOutlook = connections?.some((c: any) => c.provider === 'outlook');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your calendars to automatically create interview events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              When you schedule an interview, calendar events will be automatically created in all connected calendars.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {/* Google Calendar */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Google Calendar</p>
                  {hasGoogle ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Connected: {connections?.find((c: any) => c.provider === 'google')?.email}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>
              </div>
              {hasGoogle ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(connections?.find((c: any) => c.provider === 'google')?.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={connectGoogle}
                  disabled={connecting === 'google'}
                >
                  {connecting === 'google' ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>

            {/* Outlook Calendar */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Outlook Calendar</p>
                  {hasOutlook ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Connected: {connections?.find((c: any) => c.provider === 'outlook')?.email}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not connected</p>
                  )}
                </div>
              </div>
              {hasOutlook ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(connections?.find((c: any) => c.provider === 'outlook')?.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={connectOutlook}
                  disabled={connecting === 'outlook'}
                >
                  {connecting === 'outlook' ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}