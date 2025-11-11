import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Session {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  meeting_link: string | null;
  notes: string | null;
  mentorship_request_id: string;
}

export function SessionScheduling({ userId }: { userId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  const fetchSessions = async () => {
    // Query mentorship_requests to get sessions
    const { data, error } = await supabase
      .from("mentorship_sessions")
      .select("*")
      .order("scheduled_at", { ascending: true });

    if (error) {
      toast({ title: "Error loading sessions", variant: "destructive" });
      setLoading(false);
      return;
    }

    setSessions(data || []);
    setLoading(false);
  };

  const cancelSession = async (sessionId: string) => {
    const { error } = await supabase
      .from("mentorship_sessions")
      .update({ status: "cancelled" })
      .eq("id", sessionId);

    if (error) {
      toast({ title: "Error cancelling session", variant: "destructive" });
    } else {
      toast({ title: "Session cancelled successfully" });
      fetchSessions();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "default";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  if (loading) return <div>Loading sessions...</div>;

  const upcomingSessions = sessions.filter(s => 
    s.status === "scheduled" && new Date(s.scheduled_at) > new Date()
  );
  const pastSessions = sessions.filter(s => 
    s.status !== "scheduled" || new Date(s.scheduled_at) <= new Date()
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingSessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No upcoming sessions. Find a mentor to schedule your first session!
            </p>
          ) : (
            upcomingSessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold">Mentorship Session</h4>
                  </div>
                  <Badge variant={getStatusColor(session.status)}>
                    {session.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(session.scheduled_at), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(session.scheduled_at), "h:mm a")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {session.duration_minutes} min
                  </div>
                </div>

                {session.notes && (
                  <p className="text-sm text-muted-foreground mb-3">{session.notes}</p>
                )}

                <div className="flex gap-2">
                  {session.meeting_link && (
                    <Button size="sm" asChild>
                      <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Video className="w-4 h-4 mr-1" />
                        Join Meeting
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => cancelSession(session.id)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {pastSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pastSessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-4 opacity-75">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">Mentorship Session</h4>
                  </div>
                  <Badge variant={getStatusColor(session.status)}>
                    {session.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(session.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
