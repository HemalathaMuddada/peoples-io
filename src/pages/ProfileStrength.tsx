import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Award, TrendingUp, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface ProfileBreakdown {
  category: string;
  current: number;
  max: number;
  items: {
    name: string;
    completed: boolean;
    points: number;
    action?: string;
    href?: string;
  }[];
}

interface Achievement {
  achievement_type: string;
  achievement_name: string;
  earned_at: string;
}

export default function ProfileStrength() {
  const [loading, setLoading] = useState(true);
  const [profileScore, setProfileScore] = useState(0);
  const [breakdown, setBreakdown] = useState<ProfileBreakdown[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    loadProfileStrength();
  }, []);

  const loadProfileStrength = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Get resume count
      const { count: resumeCount } = await supabase
        .from("resumes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Get achievements
      const { data: achievementsData } = await supabase
        .from("profile_achievements")
        .select("*")
        .eq("profile_id", profile?.id || "")
        .order("earned_at", { ascending: false });

      setAchievements(achievementsData || []);

      if (profile) {
        setProfileScore(profile.profile_score || 0);

        // Build breakdown
        const breakdownData: ProfileBreakdown[] = [
          {
            category: "Basic Information",
            current: 0,
            max: 40,
            items: [
              {
                name: "Professional Headline",
                completed: !!profile.headline,
                points: 10,
                action: "Add headline",
                href: "/profile",
              },
              {
                name: "Current Title",
                completed: !!profile.current_title,
                points: 10,
                action: "Add title",
                href: "/profile",
              },
              {
                name: "Years of Experience",
                completed: profile.years_experience > 0,
                points: 5,
                action: "Add experience",
                href: "/profile",
              },
              {
                name: "Location",
                completed: !!profile.location,
                points: 5,
                action: "Add location",
                href: "/profile",
              },
              {
                name: "Seniority Level",
                completed: !!profile.seniority,
                points: 5,
                action: "Set seniority",
                href: "/profile",
              },
              {
                name: "LinkedIn Profile",
                completed: !!profile.linkedin_url,
                points: 5,
                action: "Add LinkedIn",
                href: "/profile",
              },
            ],
          },
          {
            category: "Resume",
            current: 0,
            max: 30,
            items: [
              {
                name: "Resume Uploaded",
                completed: (resumeCount || 0) > 0,
                points: 30,
                action: "Upload resume",
                href: "/resumes",
              },
            ],
          },
          {
            category: "Target Roles",
            current: 0,
            max: 20,
            items: [
              {
                name: "Target Job Titles",
                completed: profile.target_titles && profile.target_titles.length > 0,
                points: 20,
                action: "Add target roles",
                href: "/profile",
              },
            ],
          },
          {
            category: "Salary Expectations",
            current: 0,
            max: 10,
            items: [
              {
                name: "Salary Range",
                completed: profile.salary_range_min !== null && profile.salary_range_max !== null,
                points: 10,
                action: "Set salary range",
                href: "/profile",
              },
            ],
          },
        ];

        // Calculate current points
        breakdownData.forEach((category) => {
          category.current = category.items
            .filter((item) => item.completed)
            .reduce((sum, item) => sum + item.points, 0);
        });

        setBreakdown(breakdownData);
      }
    } catch (error) {
      console.error("Error loading profile strength:", error);
    } finally {
      setLoading(false);
    }
  };

  const achievementIcons: Record<string, string> = {
    profile_created: "🎯",
    quarter_complete: "⭐",
    half_complete: "🌟",
    three_quarter_complete: "💫",
    fully_complete: "🏆",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Profile Strength</h1>
        <p className="text-muted-foreground">
          Complete your profile to maximize your job search success
        </p>
      </div>

      {/* Overall Score */}
      <Card className="shadow-card border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">Your Profile Score</CardTitle>
              <CardDescription>
                {profileScore === 100
                  ? "Perfect! Your profile is complete"
                  : `${100 - profileScore} points away from completion`}
              </CardDescription>
            </div>
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary">
              <span className="text-2xl font-bold text-white">{profileScore}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={profileScore} className="h-3" />
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {breakdown.map((category) => (
          <Card key={category.category} className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{category.category}</CardTitle>
                <Badge variant={category.current === category.max ? "default" : "secondary"}>
                  {category.current}/{category.max} pts
                </Badge>
              </div>
              <Progress value={(category.current / category.max) * 100} className="h-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={item.completed ? "text-sm" : "text-sm text-muted-foreground"}>
                          {item.name}
                        </p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {item.points} pts
                        </span>
                      </div>
                      {!item.completed && item.href && (
                        <Link to={item.href}>
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                            {item.action}
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievements */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <CardTitle>Achievements</CardTitle>
          </div>
          <CardDescription>
            Unlock badges as you complete your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {["profile_created", "quarter_complete", "half_complete", "three_quarter_complete", "fully_complete"].map(
              (type) => {
                const achievement = achievements.find((a) => a.achievement_type === type);
                const earned = !!achievement;
                const names: Record<string, string> = {
                  profile_created: "Profile Creator",
                  quarter_complete: "Getting Started",
                  half_complete: "Halfway There",
                  three_quarter_complete: "Almost Done",
                  fully_complete: "Profile Master",
                };

                return (
                  <div
                    key={type}
                    className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all ${
                      earned
                        ? "border-primary bg-primary/5"
                        : "border-dashed border-muted-foreground/30 opacity-50"
                    }`}
                  >
                    <div className="text-4xl mb-2">{achievementIcons[type]}</div>
                    <p className="text-sm font-medium text-center">{names[type]}</p>
                    {earned && achievement && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(achievement.earned_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {profileScore < 100 && (
        <Card className="shadow-card border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle>Quick Wins</CardTitle>
            </div>
            <CardDescription>Complete these to boost your score fast</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {breakdown
                .flatMap((category) =>
                  category.items
                    .filter((item) => !item.completed)
                    .map((item) => ({ ...item, category: category.category }))
                )
                .slice(0, 3)
                .map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">+{item.points} pts</Badge>
                      {item.href && (
                        <Link to={item.href}>
                          <Button size="sm">Complete</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
