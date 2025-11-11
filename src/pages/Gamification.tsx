import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, Zap, Award, TrendingUp, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserPoints {
  total_points: number;
  level: number;
  points_to_next_level: number;
}

interface Achievement {
  achievement_key: string;
  earned_at: string;
  progress: number;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: string;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string;
}

const ICON_MAP: Record<string, any> = {
  Trophy, Flame, Zap, Award, TrendingUp, Target,
  Send: Target, Rocket: Zap, MessageSquare: Award,
  Users: Trophy, GraduationCap: Award, Star: Zap
};

export default function Gamification() {
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load user points
    let { data: pointsData } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!pointsData) {
      // Initialize user points
      const { data: newPoints } = await supabase
        .from("user_points")
        .insert({ user_id: user.id })
        .select()
        .single();
      pointsData = newPoints;
    }
    setUserPoints(pointsData);

    // Load achievements with definitions
    const { data: achievementsData } = await supabase
      .from("user_achievements")
      .select(`
        *,
        achievement_definitions (
          name,
          description,
          icon,
          points,
          category
        )
      `)
      .eq("user_id", user.id);

    const formattedAchievements = achievementsData?.map((a: any) => ({
      ...a,
      name: a.achievement_definitions.name,
      description: a.achievement_definitions.description,
      icon: a.achievement_definitions.icon,
      points: a.achievement_definitions.points,
      category: a.achievement_definitions.category,
    })) || [];
    setAchievements(formattedAchievements);

    // Load streak
    let { data: streakData } = await supabase
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!streakData) {
      const { data: newStreak } = await supabase
        .from("user_streaks")
        .insert({ user_id: user.id })
        .select()
        .single();
      streakData = newStreak;
    }
    setStreak(streakData);

    // Load leaderboard (top 10 users by points)
    const { data: leaderboardData } = await supabase
      .from("user_points")
      .select("user_id, total_points, level")
      .order("total_points", { ascending: false })
      .limit(10);
    
    setLeaderboard(leaderboardData || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const levelProgress = userPoints ? 
    ((userPoints.points_to_next_level - (100 * Math.pow(1.5, userPoints.level - 1))) / (100 * Math.pow(1.5, userPoints.level - 1))) * 100 
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Progress</h1>
            <p className="text-muted-foreground">Track your achievements and compete with others</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Level & Points</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Level {userPoints?.level || 1}</div>
              <p className="text-xs text-muted-foreground mb-2">
                {userPoints?.total_points || 0} total points
              </p>
              <Progress value={levelProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {Math.round((100 * Math.pow(1.5, (userPoints?.level || 1) - 1)) - (userPoints?.points_to_next_level || 0))} / {Math.round(100 * Math.pow(1.5, (userPoints?.level || 1) - 1))} XP to next level
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{streak?.current_streak || 0} days</div>
              <p className="text-xs text-muted-foreground">
                Longest: {streak?.longest_streak || 0} days
              </p>
              <div className="mt-4 flex gap-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-8 flex-1 rounded ${
                      i < (streak?.current_streak || 0) 
                        ? "bg-orange-500" 
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Achievements</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{achievements.length}</div>
              <p className="text-xs text-muted-foreground">achievements unlocked</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="achievements" className="space-y-4">
          <TabsList>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Achievements</CardTitle>
                <CardDescription>Badges you've earned on your journey</CardDescription>
              </CardHeader>
              <CardContent>
                {achievements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No achievements yet. Start completing your profile and applying to jobs!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {achievements.map((achievement) => {
                      const Icon = ICON_MAP[achievement.icon] || Award;
                      return (
                        <div
                          key={achievement.achievement_key}
                          className="flex flex-col items-center text-center p-4 border rounded-lg bg-gradient-to-b from-primary/10 to-transparent"
                        >
                          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                            <Icon className="w-8 h-8 text-primary" />
                          </div>
                          <h4 className="font-semibold text-sm mb-1">{achievement.name}</h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {achievement.description}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            +{achievement.points} XP
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(achievement.earned_at).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>See how you rank against other job seekers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? "bg-yellow-500 text-white" :
                          index === 1 ? "bg-gray-400 text-white" :
                          index === 2 ? "bg-orange-500 text-white" :
                          "bg-muted"
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">Anonymous User</p>
                          <p className="text-sm text-muted-foreground">Level {entry.level}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{entry.total_points} XP</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
