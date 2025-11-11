import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  Award,
  Star,
  Zap,
  Crown,
  Sparkles
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface RecruiterStats {
  recruiter_id: string;
  recruiter_name: string;
  recruiter_email: string;
  placements_count: number;
  revenue_generated: number;
  applications_processed: number;
  client_satisfaction_score: number;
  active_clients_count: number;
  jobs_posted: number;
  response_time_hours: number;
  badges: RecruiterBadge[];
  rank: number;
}

interface RecruiterBadge {
  badge_type: string;
  badge_level: string;
  earned_at: string;
}

export default function RecruiterLeaderboard() {
  const [recruiters, setRecruiters] = useState<RecruiterStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  const [sortBy, setSortBy] = useState<"placements" | "revenue" | "satisfaction">("placements");

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's org
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole) return;

      // Get all recruiters in the org
      const { data: orgRecruiters } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!user_roles_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("org_id", userRole.org_id)
        .in("role", ["agency_admin", "recruiter"]);

      if (!orgRecruiters) return;

      // Calculate date range
      const { start, end } = getPeriodDates(period);

      // Fetch performance data for each recruiter
      const recruiterStats = await Promise.all(
        orgRecruiters
          .filter((r: any) => r.profiles)
          .map(async (recruiter: any) => {
            const profile = recruiter.profiles;

            // Get assignments
            const { data: assignments } = await (supabase as any)
              .from("client_recruiter_assignments")
              .select("relationship_id")
              .eq("recruiter_id", profile.id);

            const relationshipIds = (assignments || []).map((a: any) => a.relationship_id);

            // Get clients' employer org ids
            const { data: relationships } = await (supabase as any)
              .from("agency_client_relationships")
              .select("employer_org_id")
              .in("id", relationshipIds)
              .eq("status", "active");

            const employerOrgIds = (relationships || []).map((r: any) => r.employer_org_id);

            // Count placements (offers made)
            let placementsCount = 0;
            let appsProcessed = 0;
            let jobsPosted = 0;

            if (employerOrgIds.length > 0) {
              // Get jobs for these employers
              const { data: jobs } = await supabase
                .from("job_postings")
                .select("id")
                .in("employer_org_id", employerOrgIds)
                .gte("created_at", start.toISOString())
                .lte("created_at", end.toISOString());

              const jobIds = (jobs || []).map(j => j.id);
              jobsPosted = jobs?.length || 0;

              if (jobIds.length > 0) {
                // Count placements
                const { count: offers } = await (supabase as any)
                  .from("job_applications")
                  .select("id", { count: "exact", head: true })
                  .in("job_id", jobIds)
                  .eq("status", "offer");

                placementsCount = offers || 0;

                // Count all applications
                const { count: apps } = await (supabase as any)
                  .from("job_applications")
                  .select("id", { count: "exact", head: true })
                  .in("job_id", jobIds);

                appsProcessed = apps || 0;
              }
            }

            // Calculate revenue (example: $5000 per placement)
            const revenueGenerated = placementsCount * 5000;

            // Mock client satisfaction (in production, get from ratings)
            const clientSatisfaction = placementsCount > 0 
              ? Math.min(5, 3.5 + (placementsCount * 0.2)) 
              : 0;

            // Get badges
            const { data: badges } = await (supabase as any)
              .from("recruiter_badges")
              .select("badge_type, badge_level, earned_at")
              .eq("recruiter_id", profile.id)
              .gte("period_start", start.toISOString().split("T")[0])
              .lte("period_end", end.toISOString().split("T")[0]);

            return {
              recruiter_id: profile.id,
              recruiter_name: profile.full_name || "Unknown",
              recruiter_email: profile.email || "",
              placements_count: placementsCount,
              revenue_generated: revenueGenerated,
              applications_processed: appsProcessed,
              client_satisfaction_score: clientSatisfaction,
              active_clients_count: employerOrgIds.length,
              jobs_posted: jobsPosted,
              response_time_hours: 2.5, // Mock data
              badges: badges || [],
              rank: 0,
            };
          })
      );

      // Sort and rank
      const sorted = recruiterStats.sort((a, b) => {
        if (sortBy === "placements") return b.placements_count - a.placements_count;
        if (sortBy === "revenue") return b.revenue_generated - a.revenue_generated;
        return b.client_satisfaction_score - a.client_satisfaction_score;
      });

      // Assign ranks
      sorted.forEach((r, i) => r.rank = i + 1);

      setRecruiters(sorted);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getPeriodDates = (period: string) => {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case "week":
        start.setDate(end.getDate() - 7);
        break;
      case "month":
        start.setMonth(end.getMonth() - 1);
        break;
      case "quarter":
        start.setMonth(end.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return { start, end };
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600">🥇 Champion</Badge>;
    if (rank === 2) return <Badge className="bg-gradient-to-r from-gray-300 to-gray-500">🥈 Runner-up</Badge>;
    if (rank === 3) return <Badge className="bg-gradient-to-r from-amber-500 to-amber-700">🥉 Third Place</Badge>;
    return null;
  };

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case "top_performer": return <Trophy className="h-4 w-4" />;
      case "placement_master": return <Target className="h-4 w-4" />;
      case "client_champion": return <Users className="h-4 w-4" />;
      case "speed_demon": return <Zap className="h-4 w-4" />;
      case "revenue_king": return <DollarSign className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (level: string) => {
    switch (level) {
      case "platinum": return "bg-gradient-to-r from-purple-400 to-pink-500 text-white";
      case "gold": return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
      case "silver": return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case "bronze": return "bg-gradient-to-r from-amber-600 to-amber-800 text-white";
      default: return "bg-muted";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Recruiter Leaderboard
          </h1>
          <p className="text-muted-foreground">Top performers and achievements</p>
        </div>
        <div className="flex gap-4">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top 3 Podium */}
      {recruiters.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Second Place */}
          <Card className="relative pt-12 border-gray-300">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-300 to-gray-500 flex items-center justify-center border-4 border-background">
                <Medal className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <Avatar className="h-16 w-16 border-4 border-gray-300">
                  <AvatarFallback className="bg-gradient-to-r from-gray-300 to-gray-500 text-white">
                    {getInitials(recruiters[1].recruiter_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-lg">{recruiters[1].recruiter_name}</CardTitle>
              <Badge className="mx-auto bg-gradient-to-r from-gray-300 to-gray-500">
                🥈 2nd Place
              </Badge>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="text-3xl font-bold text-gray-600">
                {recruiters[1].placements_count}
              </div>
              <p className="text-sm text-muted-foreground">Placements</p>
              <div className="text-lg font-semibold text-green-600">
                ${recruiters[1].revenue_generated.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          {/* First Place */}
          <Card className="relative pt-12 border-yellow-400 shadow-lg">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center border-4 border-background shadow-lg">
                <Crown className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <Avatar className="h-20 w-20 border-4 border-yellow-400">
                  <AvatarFallback className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-xl">
                    {getInitials(recruiters[0].recruiter_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-xl">{recruiters[0].recruiter_name}</CardTitle>
              <Badge className="mx-auto bg-gradient-to-r from-yellow-400 to-yellow-600">
                🏆 Champion
              </Badge>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="text-4xl font-bold text-yellow-600">
                {recruiters[0].placements_count}
              </div>
              <p className="text-sm text-muted-foreground">Placements</p>
              <div className="text-xl font-semibold text-green-600">
                ${recruiters[0].revenue_generated.toLocaleString()}
              </div>
              <div className="flex flex-wrap gap-1 justify-center mt-3">
                {recruiters[0].badges.slice(0, 3).map((badge, i) => (
                  <Badge key={i} className={`${getBadgeColor(badge.badge_level)} gap-1 text-xs`}>
                    {getBadgeIcon(badge.badge_type)}
                    {badge.badge_level}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Third Place */}
          <Card className="relative pt-12 border-amber-600">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-500 to-amber-700 flex items-center justify-center border-4 border-background">
                <Medal className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <Avatar className="h-16 w-16 border-4 border-amber-600">
                  <AvatarFallback className="bg-gradient-to-r from-amber-500 to-amber-700 text-white">
                    {getInitials(recruiters[2].recruiter_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle className="text-lg">{recruiters[2].recruiter_name}</CardTitle>
              <Badge className="mx-auto bg-gradient-to-r from-amber-500 to-amber-700">
                🥉 3rd Place
              </Badge>
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <div className="text-3xl font-bold text-amber-700">
                {recruiters[2].placements_count}
              </div>
              <p className="text-sm text-muted-foreground">Placements</p>
              <div className="text-lg font-semibold text-green-600">
                ${recruiters[2].revenue_generated.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Full Rankings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Complete Rankings</CardTitle>
              <CardDescription>All recruiters performance metrics</CardDescription>
            </div>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placements">By Placements</SelectItem>
                <SelectItem value="revenue">By Revenue</SelectItem>
                <SelectItem value="satisfaction">By Satisfaction</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recruiters.map((recruiter) => (
              <Card key={recruiter.recruiter_id} className={`${recruiter.rank <= 3 ? 'border-primary/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12">
                      {getRankIcon(recruiter.rank)}
                    </div>
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(recruiter.recruiter_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{recruiter.recruiter_name}</h4>
                        {getRankBadge(recruiter.rank)}
                      </div>
                      <p className="text-sm text-muted-foreground">{recruiter.recruiter_email}</p>
                      {recruiter.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {recruiter.badges.map((badge, i) => (
                            <Badge key={i} className={`${getBadgeColor(badge.badge_level)} gap-1 text-xs`}>
                              {getBadgeIcon(badge.badge_type)}
                              {badge.badge_type.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-6 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {recruiter.placements_count}
                        </div>
                        <p className="text-xs text-muted-foreground">Placements</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          ${(recruiter.revenue_generated / 1000).toFixed(0)}K
                        </div>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {recruiter.client_satisfaction_score.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground">Rating</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          {recruiter.active_clients_count}
                        </div>
                        <p className="text-xs text-muted-foreground">Clients</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
