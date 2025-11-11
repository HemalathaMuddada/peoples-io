import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Star, Award, TrendingUp, Target, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface InterviewerBadge {
  type: string;
  level: string;
  earnedAt: string;
}

interface InterviewerStats {
  rank: number;
  name: string;
  totalInterviews: number;
  avgRating: number;
  strongHireRate: number;
  badges: InterviewerBadge[];
  avgTechnical: number;
  avgCommunication: number;
  avgCultureFit: number;
  avgProblemSolving: number;
}

export default function InterviewerLeaderboard() {
  const navigate = useNavigate();
  const [interviewers, setInterviewers] = useState<InterviewerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  const [sortBy, setSortBy] = useState<"rating" | "interviews" | "hireRate">("rating");

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const { startDate } = getPeriodDates(period);

      const { data: feedbackData } = await supabase
        .from("interview_feedback")
        .select(`
          *,
          interviews!inner(
            id,
            interviewer_name,
            scheduled_at
          )
        `)
        .gte("created_at", startDate);

      // Group by interviewer
      const interviewerMap = new Map<string, any>();

      feedbackData?.forEach((feedback) => {
        const name = feedback.interviews?.interviewer_name || "Unknown";
        if (!interviewerMap.has(name)) {
          interviewerMap.set(name, {
            name,
            totalInterviews: 0,
            ratings: [],
            technical: [],
            communication: [],
            cultureFit: [],
            problemSolving: [],
            recommendations: [],
          });
        }

        const interviewer = interviewerMap.get(name);
        interviewer.totalInterviews++;
        if (feedback.rating_overall) interviewer.ratings.push(feedback.rating_overall);
        if (feedback.rating_technical) interviewer.technical.push(feedback.rating_technical);
        if (feedback.rating_communication) interviewer.communication.push(feedback.rating_communication);
        if (feedback.rating_culture_fit) interviewer.cultureFit.push(feedback.rating_culture_fit);
        if (feedback.rating_problem_solving) interviewer.problemSolving.push(feedback.rating_problem_solving);
        if (feedback.recommendation) interviewer.recommendations.push(feedback.recommendation);
      });

      // Calculate stats and assign badges
      const stats: InterviewerStats[] = Array.from(interviewerMap.values()).map((interviewer) => {
        const avgRating = interviewer.ratings.length
          ? interviewer.ratings.reduce((a: number, b: number) => a + b, 0) / interviewer.ratings.length
          : 0;
        const strongHireRate = interviewer.recommendations.length
          ? (interviewer.recommendations.filter((r: string) => r === "strong_hire").length / interviewer.recommendations.length) * 100
          : 0;

        const badges = assignBadges(interviewer, avgRating, strongHireRate);

        return {
          rank: 0,
          name: interviewer.name,
          totalInterviews: interviewer.totalInterviews,
          avgRating: Number(avgRating.toFixed(2)),
          strongHireRate: Number(strongHireRate.toFixed(1)),
          badges,
          avgTechnical: interviewer.technical.length ? Number((interviewer.technical.reduce((a: number, b: number) => a + b, 0) / interviewer.technical.length).toFixed(2)) : 0,
          avgCommunication: interviewer.communication.length ? Number((interviewer.communication.reduce((a: number, b: number) => a + b, 0) / interviewer.communication.length).toFixed(2)) : 0,
          avgCultureFit: interviewer.cultureFit.length ? Number((interviewer.cultureFit.reduce((a: number, b: number) => a + b, 0) / interviewer.cultureFit.length).toFixed(2)) : 0,
          avgProblemSolving: interviewer.problemSolving.length ? Number((interviewer.problemSolving.reduce((a: number, b: number) => a + b, 0) / interviewer.problemSolving.length).toFixed(2)) : 0,
        };
      });

      // Sort by selected criteria
      const sortedStats = sortInterviewers(stats, sortBy);

      // Assign ranks
      sortedStats.forEach((stat, index) => {
        stat.rank = index + 1;
      });

      setInterviewers(sortedStats);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sortInterviewers = (stats: InterviewerStats[], criteria: string) => {
    return [...stats].sort((a, b) => {
      switch (criteria) {
        case "rating":
          return b.avgRating - a.avgRating;
        case "interviews":
          return b.totalInterviews - a.totalInterviews;
        case "hireRate":
          return b.strongHireRate - a.strongHireRate;
        default:
          return b.avgRating - a.avgRating;
      }
    });
  };

  const assignBadges = (interviewer: any, avgRating: number, strongHireRate: number): InterviewerBadge[] => {
    const badges: InterviewerBadge[] = [];
    const now = new Date().toISOString();

    // Rating-based badges
    if (avgRating >= 4.8) {
      badges.push({ type: "excellence", level: "platinum", earnedAt: now });
    } else if (avgRating >= 4.5) {
      badges.push({ type: "excellence", level: "gold", earnedAt: now });
    } else if (avgRating >= 4.0) {
      badges.push({ type: "excellence", level: "silver", earnedAt: now });
    }

    // Volume badges
    if (interviewer.totalInterviews >= 100) {
      badges.push({ type: "volume", level: "platinum", earnedAt: now });
    } else if (interviewer.totalInterviews >= 50) {
      badges.push({ type: "volume", level: "gold", earnedAt: now });
    } else if (interviewer.totalInterviews >= 25) {
      badges.push({ type: "volume", level: "silver", earnedAt: now });
    }

    // Strong hire rate badges
    if (strongHireRate >= 60) {
      badges.push({ type: "talent_spotter", level: "gold", earnedAt: now });
    } else if (strongHireRate >= 40) {
      badges.push({ type: "talent_spotter", level: "silver", earnedAt: now });
    }

    // Specialty badges
    if (interviewer.technical.length >= 10) {
      const avgTech = interviewer.technical.reduce((a: number, b: number) => a + b, 0) / interviewer.technical.length;
      if (avgTech >= 4.5) {
        badges.push({ type: "technical_expert", level: "gold", earnedAt: now });
      }
    }

    return badges;
  };

  const getPeriodDates = (period: string) => {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { startDate: startDate.toISOString() };
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Trophy className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Trophy className="h-6 w-6 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white">🥇 Champion</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-white">🥈 Runner-up</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600 text-white">🥉 Third Place</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case "excellence":
        return <Star className="h-4 w-4" />;
      case "volume":
        return <Users className="h-4 w-4" />;
      case "talent_spotter":
        return <Target className="h-4 w-4" />;
      case "technical_expert":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Award className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (level: string) => {
    switch (level) {
      case "platinum":
        return "bg-gradient-to-r from-blue-400 to-cyan-400";
      case "gold":
        return "bg-gradient-to-r from-yellow-400 to-orange-400";
      case "silver":
        return "bg-gradient-to-r from-gray-300 to-gray-400";
      default:
        return "bg-gradient-to-r from-gray-200 to-gray-300";
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-8 w-8 text-primary" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const topThree = interviewers.slice(0, 3);
  const restOfInterviewers = interviewers.slice(3);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Interviewer Leaderboard</h1>
          </div>
          <p className="text-muted-foreground">Top performing interviewers based on ratings and impact</p>
        </div>
        <div className="flex gap-4">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">By Rating</SelectItem>
              <SelectItem value="interviews">By Interviews</SelectItem>
              <SelectItem value="hireRate">By Hire Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top 3 Podium */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Second Place */}
          {topThree[1] && (
            <Card className="md:mt-8">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">{getRankIcon(2)}</div>
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarFallback className="text-lg bg-gradient-to-br from-secondary to-secondary/50">
                    {getInitials(topThree[1].name)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{topThree[1].name}</CardTitle>
                {getRankBadge(2)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-3xl font-bold">{topThree[1].avgRating.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{topThree[1].totalInterviews} interviews</p>
                  <p className="text-sm text-muted-foreground">{topThree[1].strongHireRate}% strong hire rate</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {topThree[1].badges.map((badge, idx) => (
                    <div
                      key={idx}
                      className={`${getBadgeColor(badge.level)} px-2 py-1 rounded-full flex items-center gap-1 text-xs text-white`}
                    >
                      {getBadgeIcon(badge.type)}
                      <span className="capitalize">{badge.type.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* First Place */}
          {topThree[0] && (
            <Card className="border-2 border-primary shadow-lg">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">{getRankIcon(1)}</div>
                <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary">
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/50">
                    {getInitials(topThree[0].name)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-2xl">{topThree[0].name}</CardTitle>
                {getRankBadge(1)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                    <span className="text-4xl font-bold">{topThree[0].avgRating.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{topThree[0].totalInterviews} interviews</p>
                  <p className="text-sm text-muted-foreground">{topThree[0].strongHireRate}% strong hire rate</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {topThree[0].badges.map((badge, idx) => (
                    <div
                      key={idx}
                      className={`${getBadgeColor(badge.level)} px-2 py-1 rounded-full flex items-center gap-1 text-xs text-white`}
                    >
                      {getBadgeIcon(badge.type)}
                      <span className="capitalize">{badge.type.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Third Place */}
          {topThree[2] && (
            <Card className="md:mt-8">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">{getRankIcon(3)}</div>
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  <AvatarFallback className="text-lg bg-gradient-to-br from-accent to-accent/50">
                    {getInitials(topThree[2].name)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{topThree[2].name}</CardTitle>
                {getRankBadge(3)}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-3xl font-bold">{topThree[2].avgRating.toFixed(1)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{topThree[2].totalInterviews} interviews</p>
                  <p className="text-sm text-muted-foreground">{topThree[2].strongHireRate}% strong hire rate</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {topThree[2].badges.map((badge, idx) => (
                    <div
                      key={idx}
                      className={`${getBadgeColor(badge.level)} px-2 py-1 rounded-full flex items-center gap-1 text-xs text-white`}
                    >
                      {getBadgeIcon(badge.type)}
                      <span className="capitalize">{badge.type.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Complete Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Rankings</CardTitle>
          <CardDescription>All interviewers ranked by {sortBy === "rating" ? "average rating" : sortBy === "interviews" ? "total interviews" : "strong hire rate"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="detailed">Detailed View</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {interviewers.map((interviewer) => (
                <Button
                  key={interviewer.name}
                  variant="outline"
                  className="w-full justify-between h-auto p-4"
                  onClick={() => navigate(`/interviewer/${encodeURIComponent(interviewer.name)}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12">
                      {interviewer.rank <= 3 ? getRankIcon(interviewer.rank) : <span className="font-bold text-muted-foreground">#{interviewer.rank}</span>}
                    </div>
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/50">
                        {getInitials(interviewer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-semibold text-lg">{interviewer.name}</div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{interviewer.totalInterviews} interviews</span>
                        <span>{interviewer.strongHireRate}% hire rate</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {interviewer.badges.slice(0, 3).map((badge, idx) => (
                        <div key={idx} className={`${getBadgeColor(badge.level)} p-1.5 rounded-full`}>
                          {getBadgeIcon(badge.type)}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-2xl">{interviewer.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                </Button>
              ))}
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4">
              {interviewers.map((interviewer) => (
                <Card key={interviewer.name} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/interviewer/${encodeURIComponent(interviewer.name)}`)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12">
                          {interviewer.rank <= 3 ? getRankIcon(interviewer.rank) : <span className="font-bold text-2xl text-muted-foreground">#{interviewer.rank}</span>}
                        </div>
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-primary/50">
                            {getInitials(interviewer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-xl font-bold">{interviewer.name}</h3>
                          <div className="flex gap-2 mt-2">
                            {interviewer.badges.map((badge, idx) => (
                              <div
                                key={idx}
                                className={`${getBadgeColor(badge.level)} px-2 py-1 rounded-full flex items-center gap-1 text-xs text-white`}
                              >
                                {getBadgeIcon(badge.type)}
                                <span className="capitalize">{badge.type.replace("_", " ")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end mb-2">
                          <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                          <span className="text-3xl font-bold">{interviewer.avgRating.toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{interviewer.totalInterviews} interviews</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Technical</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(interviewer.avgTechnical / 5) * 100} className="h-2" />
                          <span className="text-sm font-semibold">{interviewer.avgTechnical.toFixed(1)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Communication</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(interviewer.avgCommunication / 5) * 100} className="h-2" />
                          <span className="text-sm font-semibold">{interviewer.avgCommunication.toFixed(1)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Culture Fit</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(interviewer.avgCultureFit / 5) * 100} className="h-2" />
                          <span className="text-sm font-semibold">{interviewer.avgCultureFit.toFixed(1)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Problem Solving</p>
                        <div className="flex items-center gap-2">
                          <Progress value={(interviewer.avgProblemSolving / 5) * 100} className="h-2" />
                          <span className="text-sm font-semibold">{interviewer.avgProblemSolving.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Strong Hire Rate</span>
                        <span className="font-semibold text-primary">{interviewer.strongHireRate}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
