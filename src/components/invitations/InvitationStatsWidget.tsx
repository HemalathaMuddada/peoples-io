import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, CheckCircle, Clock, TrendingUp, Mail } from "lucide-react";

interface InvitationStats {
  total: number;
  accepted: number;
  pending: number;
  expired: number;
  acceptanceRate: number;
  avgTimeToAccept: number;
  topInviters: Array<{
    name: string;
    email: string;
    count: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  roleDistribution: Array<{
    role: string;
    count: number;
  }>;
}

const COLORS = {
  accepted: "hsl(var(--chart-1))",
  pending: "hsl(var(--chart-2))",
  expired: "hsl(var(--chart-3))",
};

export function InvitationStatsWidget() {
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: invitations, error: invError } = await supabase
        .from("company_invitations")
        .select("*, invited_by");

      if (invError) throw invError;

      if (!invitations) {
        setStats(null);
        return;
      }

      const total = invitations.length;
      const accepted = invitations.filter(inv => inv.accepted_at !== null).length;
      const pending = invitations.filter(
        inv => inv.accepted_at === null && new Date(inv.expires_at) >= new Date()
      ).length;
      const expired = invitations.filter(
        inv => inv.accepted_at === null && new Date(inv.expires_at) < new Date()
      ).length;

      const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

      // Calculate average time to accept
      const acceptedInvitations = invitations.filter(inv => inv.accepted_at !== null);
      let avgTimeToAccept = 0;
      if (acceptedInvitations.length > 0) {
        const totalTime = acceptedInvitations.reduce((sum, inv) => {
          const created = new Date(inv.created_at).getTime();
          const accepted = new Date(inv.accepted_at!).getTime();
          return sum + (accepted - created);
        }, 0);
        avgTimeToAccept = Math.round(totalTime / acceptedInvitations.length / (1000 * 60 * 60)); // hours
      }

      // Get inviter information
      const inviterIds = [...new Set(invitations.map(inv => inv.invited_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", inviterIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Count invitations per inviter
      const inviterCounts = invitations.reduce((acc, inv) => {
        if (inv.invited_by) {
          acc[inv.invited_by] = (acc[inv.invited_by] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topInviters = Object.entries(inviterCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => {
          const profile = profileMap.get(id);
          return {
            name: profile?.full_name || "Unknown",
            email: profile?.email || "",
            count,
          };
        });

      // Role distribution
      const roleCounts = invitations.reduce((acc, inv) => {
        acc[inv.role] = (acc[inv.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const roleDistribution = Object.entries(roleCounts).map(([role, count]) => ({
        role: role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        count,
      }));

      const statusDistribution = [
        { name: "Accepted", value: accepted, color: COLORS.accepted },
        { name: "Pending", value: pending, color: COLORS.pending },
        { name: "Expired", value: expired, color: COLORS.expired },
      ].filter(item => item.value > 0);

      setStats({
        total,
        accepted,
        pending,
        expired,
        acceptanceRate,
        avgTimeToAccept,
        topInviters,
        statusDistribution,
        roleDistribution,
      });
    } catch (error) {
      console.error("Error fetching invitation stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            Loading statistics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitation Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No invitation data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Key Metrics Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Invitations</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            All time invitations sent
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Acceptance Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.acceptanceRate}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.accepted} of {stats.total} accepted
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending}</div>
          <p className="text-xs text-muted-foreground">
            Awaiting acceptance
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Time to Accept</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.avgTimeToAccept < 24 
              ? `${stats.avgTimeToAccept}h` 
              : `${Math.round(stats.avgTimeToAccept / 24)}d`}
          </div>
          <p className="text-xs text-muted-foreground">
            Average response time
          </p>
        </CardContent>
      </Card>

      {/* Status Distribution Pie Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
          <CardDescription>Current invitation status breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="hsl(var(--primary))"
                dataKey="value"
              >
                {stats.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Role Distribution Bar Chart */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Invitations by Role</CardTitle>
          <CardDescription>Distribution of invitation roles</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.roleDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="role" 
                className="text-xs"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Inviters */}
      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Most Active Inviters
          </CardTitle>
          <CardDescription>Users who have sent the most invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.topInviters.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No inviter data available</p>
            ) : (
              stats.topInviters.map((inviter, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{inviter.name}</p>
                      <p className="text-sm text-muted-foreground">{inviter.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {inviter.count} invitation{inviter.count !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
