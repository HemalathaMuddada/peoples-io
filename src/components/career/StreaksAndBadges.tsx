import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Flame, 
  Trophy,
  Clock,
  Target,
  Zap,
  Loader2,
  Award,
  TrendingUp,
  Calendar,
  Share2
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Streak {
  current_streak: number;
  longest_streak: number;
  total_learning_days: number;
  last_activity_date: string;
}

interface BadgeData {
  id: string;
  badge_key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  tier: string;
  points: number;
}

interface EarnedBadge extends BadgeData {
  earned_at: string;
}

export const StreaksAndBadges = () => {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [allBadges, setAllBadges] = useState<BadgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      setProfileId(profile.id);

      // Load streak data
      const { data: streakData } = await supabase
        .from("learning_streaks")
        .select("*")
        .eq("profile_id", profile.id)
        .single();

      setStreak(streakData);

      // Load earned badges
      const { data: userBadges } = await supabase
        .from("user_learning_badges")
        .select(`
          *,
          learning_badges(*)
        `)
        .eq("profile_id", profile.id)
        .order("earned_at", { ascending: false });

      const formattedEarnedBadges = userBadges?.map((ub: any) => ({
        ...ub.learning_badges,
        earned_at: ub.earned_at
      })) || [];

      setEarnedBadges(formattedEarnedBadges);

      // Load all available badges
      const { data: badges } = await supabase
        .from("learning_badges")
        .select("*")
        .order("requirement_value");

      setAllBadges(badges || []);

      // Check for new badges to award
      if (streakData && profile.id) {
        await checkAndAwardBadges(profile.id, streakData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load streaks and badges");
    } finally {
      setLoading(false);
    }
  };

  const checkAndAwardBadges = async (profileId: string, streakData: Streak) => {
    try {
      // Get learning stats
      const { data: paths } = await supabase
        .from("learning_paths")
        .select("*, learning_path_courses(*)")
        .eq("profile_id", profileId);

      const completedPaths = paths?.filter(p => p.status === 'completed').length || 0;
      const completedCourses = paths?.reduce((sum, p) => 
        sum + (p.learning_path_courses?.filter((c: any) => c.completed)?.length || 0), 0) || 0;
      const totalTimeHours = paths?.reduce((sum, p) => 
        sum + ((p.total_time_spent_minutes || 0) / 60), 0) || 0;

      // Check each badge requirement
      for (const badge of allBadges) {
        // Skip if already earned
        if (earnedBadges.some(eb => eb.id === badge.id)) continue;

        let shouldAward = false;

        switch (badge.requirement_type) {
          case 'current_streak':
            shouldAward = streakData.current_streak >= badge.requirement_value;
            break;
          case 'longest_streak':
            shouldAward = streakData.longest_streak >= badge.requirement_value;
            break;
          case 'courses_completed':
            shouldAward = completedCourses >= badge.requirement_value;
            break;
          case 'hours_logged':
            shouldAward = totalTimeHours >= badge.requirement_value;
            break;
          case 'paths_completed':
            shouldAward = completedPaths >= badge.requirement_value;
            break;
          case 'total_learning_days':
            shouldAward = streakData.total_learning_days >= badge.requirement_value;
            break;
        }

        if (shouldAward) {
          await awardBadge(profileId, badge);
        }
      }
    } catch (error) {
      console.error("Error checking badges:", error);
    }
  };

  const awardBadge = async (profileId: string, badge: BadgeData) => {
    try {
      const { error } = await supabase
        .from("user_learning_badges")
        .insert({
          profile_id: profileId,
          badge_id: badge.id
        });

      if (!error) {
        toast.success(`🎉 Badge Unlocked: ${badge.name}!`, {
          description: badge.description
        });
        loadData(); // Refresh to show new badge
      }
    } catch (error) {
      console.error("Error awarding badge:", error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-orange-700';
      case 'silver': return 'bg-gray-400';
      case 'gold': return 'bg-yellow-500';
      case 'platinum': return 'bg-blue-400';
      case 'diamond': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const shareToLinkedIn = (badge: EarnedBadge) => {
    const text = `🎉 I just earned the "${badge.name}" badge! ${badge.description}`;
    const url = window.location.origin;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=600');
  };

  const shareToTwitter = (badge: EarnedBadge) => {
    const text = `🎉 I just earned the "${badge.name}" badge! ${badge.description} #LearningJourney #ProfessionalDevelopment`;
    const url = window.location.origin;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=600');
  };

  const shareStreak = () => {
    const text = `🔥 I'm on a ${streak?.current_streak}-day learning streak! My longest streak is ${streak?.longest_streak} days. #LearningJourney #ContinuousLearning`;
    const url = window.location.origin;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=600');
  };

  const getProgressToNextBadge = (category: string): { badge: BadgeData | null; progress: number } => {
    const categoryBadges = allBadges
      .filter(b => b.category === category)
      .filter(b => !earnedBadges.some(eb => eb.id === b.id))
      .sort((a, b) => a.requirement_value - b.requirement_value);

    if (categoryBadges.length === 0) {
      return { badge: null, progress: 100 };
    }

    const nextBadge = categoryBadges[0];
    let currentValue = 0;

    // Get current progress based on badge type
    if (streak) {
      switch (nextBadge.requirement_type) {
        case 'current_streak':
          currentValue = streak.current_streak;
          break;
        case 'longest_streak':
          currentValue = streak.longest_streak;
          break;
        case 'total_learning_days':
          currentValue = streak.total_learning_days;
          break;
      }
    }

    const progress = Math.min((currentValue / nextBadge.requirement_value) * 100, 100);
    return { badge: nextBadge, progress };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalPoints = earnedBadges.reduce((sum, b) => sum + b.points, 0);
  const streakNextBadge = getProgressToNextBadge('streak');

  return (
    <div className="space-y-6">
      {/* Streak Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <div className="flex items-center gap-2">
              {(streak?.current_streak || 0) >= 3 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={shareStreak}
                  title="Share streak"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500 flex items-center gap-2">
              {streak?.current_streak || 0}
              <span className="text-lg text-muted-foreground">days</span>
            </div>
            {streakNextBadge.badge && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Next: {streakNextBadge.badge.name}</span>
                  <span className="font-semibold">{Math.round(streakNextBadge.progress)}%</span>
                </div>
                <Progress value={streakNextBadge.progress} className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
            <Trophy className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary flex items-center gap-2">
              {streak?.longest_streak || 0}
              <span className="text-lg text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total learning days: {streak?.total_learning_days || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Award className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning flex items-center gap-2">
              {totalPoints}
              <span className="text-lg text-muted-foreground">pts</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {earnedBadges.length} badges earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Your Achievements
          </CardTitle>
          <CardDescription>
            Unlock badges by maintaining streaks and completing milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="earned" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="earned">
                Earned ({earnedBadges.length})
              </TabsTrigger>
              <TabsTrigger value="locked">
                Locked ({allBadges.length - earnedBadges.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="earned" className="space-y-4">
              {earnedBadges.length === 0 ? (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No badges earned yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start learning to unlock your first badge!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {earnedBadges.map((badge) => (
                    <Card key={badge.id} className="bg-muted/30 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="text-4xl">{badge.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{badge.name}</h4>
                              <Badge className={getTierColor(badge.tier)}>
                                {badge.tier}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {badge.description}
                            </p>
                            <div className="flex items-center justify-between text-xs mb-3">
                              <span className="text-warning font-semibold">
                                +{badge.points} pts
                              </span>
                              <span className="text-muted-foreground">
                                Earned {new Date(badge.earned_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => shareToLinkedIn(badge)}
                              >
                                <Share2 className="h-3 w-3 mr-1" />
                                LinkedIn
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => shareToTwitter(badge)}
                              >
                                <Share2 className="h-3 w-3 mr-1" />
                                Twitter
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="locked" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allBadges
                  .filter(badge => !earnedBadges.some(eb => eb.id === badge.id))
                  .map((badge) => (
                    <Card key={badge.id} className="opacity-50 hover:opacity-75 transition-opacity">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <div className="text-4xl grayscale">{badge.icon}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{badge.name}</h4>
                              <Badge variant="outline" className={getTierColor(badge.tier)}>
                                {badge.tier}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {badge.description}
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-warning font-semibold">
                                +{badge.points} pts
                              </span>
                              <span className="text-muted-foreground">
                                {badge.requirement_value} {badge.requirement_type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
