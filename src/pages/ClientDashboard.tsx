import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MessageSquare, TrendingUp, Users, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SessionScheduling } from "@/components/coaching/SessionScheduling";
import { DirectMessaging } from "@/components/coaching/DirectMessaging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClientDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    upcomingSessions: 0,
    unreadMessages: 0,
    activeMentors: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate("/auth");
      return;
    }

    setUser(authUser);
    await fetchStats(authUser.id);
    setLoading(false);
  };

  const fetchStats = async (userId: string) => {
    // Fetch total sessions - simplified query
    const { data: allSessions } = await supabase
      .from("mentorship_sessions")
      .select("id, status, scheduled_at");

    // Fetch unread messages
    const { data: messages } = await supabase
      .from("messages")
      .select("id")
      .eq("recipient_id", userId)
      .eq("read", false);

    // Fetch active mentors from mentorship_requests
    const { data: requests } = await supabase
      .from("mentorship_requests")
      .select("mentor_id")
      .eq("mentee_id", userId)
      .eq("status", "accepted");

    const totalSessions = allSessions?.length || 0;
    const upcomingSessions = allSessions?.filter(s => 
      s.status === "scheduled" && new Date(s.scheduled_at) > new Date()
    ).length || 0;
    const uniqueMentors = new Set(requests?.map(r => r.mentor_id) || []);

    setStats({
      totalSessions,
      upcomingSessions,
      unreadMessages: messages?.length || 0,
      activeMentors: uniqueMentors.size,
    });
  };

  if (loading || !user) {
    return (
      <AppLayout user={null}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Coaching Journey</h1>
          <p className="text-muted-foreground mt-2">
            Track your progress and connect with coaches
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold">{stats.upcomingSessions}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Coaches</p>
                  <p className="text-2xl font-bold">{stats.activeMentors}</p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <Button onClick={() => navigate("/coaches")} size="lg">
            <BookOpen className="w-4 h-4 mr-2" />
            Find a Coach
          </Button>
        </div>

        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <SessionScheduling userId={user.id} />
          </TabsContent>

          <TabsContent value="messages">
            <DirectMessaging userId={user.id} />
          </TabsContent>

          <TabsContent value="progress">
            <div className="text-center py-12 text-muted-foreground">
              <p>Progress tracking coming soon...</p>
              <p className="text-sm mt-2">Track your milestones and achievements with your coaches</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
