import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Mail,
  CheckCircle,
  TrendingUp,
  Activity,
  UserCheck,
  Clock,
} from "lucide-react";

interface TeamAnalyticsProps {
  teamId: string;
}

interface AnalyticsData {
  totalMembers: number;
  activeMembers: number;
  totalInvitations: number;
  acceptedInvitations: number;
  pendingInvitations: number;
  acceptanceRate: number;
  recentActivity: number;
  roleDistribution: Record<string, number>;
  activityTrend: { date: string; count: number }[];
}

export function TeamAnalytics({ teamId }: TeamAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalMembers: 0,
    activeMembers: 0,
    totalInvitations: 0,
    acceptedInvitations: 0,
    pendingInvitations: 0,
    acceptanceRate: 0,
    recentActivity: 0,
    roleDistribution: {},
    activityTrend: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [teamId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch team members
      const { data: members, error: membersError } = await supabase
        .from("team_members")
        .select("role, joined_at")
        .eq("team_id", teamId);

      if (membersError) throw membersError;

      // Fetch team invitations
      const { data: invitations, error: invitationsError } = await supabase
        .from("team_invitations")
        .select("accepted_at, created_at")
        .eq("team_id", teamId);

      if (invitationsError) throw invitationsError;

      // Fetch activity logs for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activities, error: activitiesError } = await supabase
        .from("team_activity_log")
        .select("created_at, action_type")
        .eq("team_id", teamId)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (activitiesError) throw activitiesError;

      // Calculate metrics
      const totalMembers = members?.length || 0;
      const totalInvitations = invitations?.length || 0;
      const acceptedInvitations = invitations?.filter((inv) => inv.accepted_at)?.length || 0;
      const pendingInvitations = totalInvitations - acceptedInvitations;
      const acceptanceRate = totalInvitations > 0 
        ? Math.round((acceptedInvitations / totalInvitations) * 100) 
        : 0;

      // Active members (joined in last 30 days)
      const activeMembers = members?.filter((member) => {
        const joinedDate = new Date(member.joined_at);
        return joinedDate >= thirtyDaysAgo;
      })?.length || 0;

      // Role distribution
      const roleDistribution: Record<string, number> = {};
      members?.forEach((member) => {
        roleDistribution[member.role] = (roleDistribution[member.role] || 0) + 1;
      });

      // Activity trend (last 7 days)
      const activityTrend = generateActivityTrend(activities || []);
      const recentActivity = activities?.length || 0;

      setAnalytics({
        totalMembers,
        activeMembers,
        totalInvitations,
        acceptedInvitations,
        pendingInvitations,
        acceptanceRate,
        recentActivity,
        roleDistribution,
        activityTrend,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateActivityTrend = (activities: any[]) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split("T")[0];
    });

    return last7Days.map((date) => ({
      date,
      count: activities.filter((activity) => 
        activity.created_at.startsWith(date)
      ).length,
    }));
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      team_owner: "Owner",
      team_admin: "Admin",
      team_member: "Member",
    };
    return labels[role] || role;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeMembers} joined recently
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invitations Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalInvitations}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.pendingInvitations} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.acceptanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.acceptedInvitations} accepted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.recentActivity}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Team Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="roles" className="space-y-4">
            <TabsList>
              <TabsTrigger value="roles">Role Distribution</TabsTrigger>
              <TabsTrigger value="activity">Activity Trend</TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="space-y-4">
              <div className="space-y-3">
                {Object.entries(analytics.roleDistribution).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getRoleLabel(role)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2"
                          style={{
                            width: `${(count / analytics.totalMembers) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {count} ({Math.round((count / analytics.totalMembers) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  Activity over the last 7 days
                </p>
                <div className="flex items-end justify-between gap-2 h-32">
                  {analytics.activityTrend.map((day, index) => {
                    const maxCount = Math.max(
                      ...analytics.activityTrend.map((d) => d.count),
                      1
                    );
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center gap-2"
                      >
                        <div className="w-full bg-primary rounded-t" style={{ height: `${height}%` }} />
                        <span className="text-xs text-muted-foreground">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </span>
                        <span className="text-xs font-medium">{day.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
