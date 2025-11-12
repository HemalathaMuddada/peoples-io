import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, Target, GraduationCap, Briefcase, DollarSign, Calendar } from "lucide-react";
import { GoogleCalendar } from "@/components/career/GoogleCalendar";

interface CareerData {
  profile: any;
  goals: any[];
  learningPaths: any[];
  interviews: any[];
  applications: any[];
}

export const CareerPlanner = () => {
  const [data, setData] = useState<CareerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCareerData();
  }, []);

  const loadCareerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const [goalsData, pathsData, interviewsData, applicationsData] = await Promise.all([
        supabase.from("career_goals").select("*").eq("profile_id", profile.id),
        supabase.from("learning_paths").select("*").eq("profile_id", profile.id),
        supabase.from("mock_interviews").select("*").eq("profile_id", profile.id),
        supabase.from("job_applications").select("*").eq("profile_id", profile.id),
      ]);

      setData({
        profile,
        goals: goalsData.data || [],
        learningPaths: pathsData.data || [],
        interviews: interviewsData.data || [],
        applications: applicationsData.data || [],
      });
    } catch (error) {
      console.error("Error loading career data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <GoogleCalendar />
      </div>
    );
  }

  const activeGoals = data.goals.filter(g => g.status === "in_progress");
  const completedGoals = data.goals.filter(g => g.status === "completed");
  const activePaths = data.learningPaths.filter(p => p.status === "active");
  const avgPathProgress = activePaths.length > 0
    ? activePaths.reduce((sum, p) => sum + (p.progress || 0), 0) / activePaths.length
    : 0;
  const avgInterviewScore = data.interviews.filter(i => i.score).length > 0
    ? data.interviews.filter(i => i.score).reduce((sum, i) => sum + i.score, 0) / data.interviews.filter(i => i.score).length
    : 0;

  const careerMilestones = [
    {
      title: "Build Your Profile",
      completed: !!data.profile.current_title && !!data.profile.headline,
      description: "Complete your professional profile"
    },
    {
      title: "Set Career Goals",
      completed: data.goals.length > 0,
      description: "Define at least one career goal"
    },
    {
      title: "Start Learning",
      completed: activePaths.length > 0,
      description: "Begin a learning path"
    },
    {
      title: "Practice Interviews",
      completed: data.interviews.length > 0,
      description: "Complete a mock interview"
    },
    {
      title: "Apply to Jobs",
      completed: data.applications.length > 0,
      description: "Submit your first application"
    },
  ];

  const completedMilestones = careerMilestones.filter(m => m.completed).length;
  const milestoneProgress = (completedMilestones / careerMilestones.length) * 100;

  return (
    <div className="space-y-6">
      <GoogleCalendar />

      {/* Career Progress Overview */}
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Your Career Journey
          </CardTitle>
          <CardDescription>
            Track your progress towards career success
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-bold text-primary">{Math.round(milestoneProgress)}%</span>
            </div>
            <Progress value={milestoneProgress} className="h-3" />
          </div>

          <div className="grid gap-3 mt-6">
            {careerMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  milestone.completed
                    ? "bg-green-500/10 border-green-500/20"
                    : "bg-muted/30 border-muted"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  milestone.completed ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {milestone.completed ? "✓" : idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{milestone.title}</p>
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="text-2xl font-bold">{activeGoals.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-2xl font-bold text-green-600">{completedGoals.length}</span>
              </div>
              {activeGoals.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Next Goal</p>
                  <p className="text-sm font-medium">{activeGoals[0].title}</p>
                  <Progress value={activeGoals[0].progress} className="mt-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Paths</span>
                <span className="text-2xl font-bold">{activePaths.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Progress</span>
                <span className="text-2xl font-bold text-primary">{Math.round(avgPathProgress)}%</span>
              </div>
              {activePaths.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Current Path</p>
                  <p className="text-sm font-medium">{activePaths[0].title}</p>
                  <Progress value={activePaths[0].progress} className="mt-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Applied</span>
                <span className="text-2xl font-bold">{data.applications.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 rounded bg-muted/30">
                  <p className="text-xs text-muted-foreground">Interview</p>
                  <p className="font-bold">{data.applications.filter(a => a.status === "interview").length}</p>
                </div>
                <div className="text-center p-2 rounded bg-muted/30">
                  <p className="text-xs text-muted-foreground">Offer</p>
                  <p className="font-bold text-green-600">{data.applications.filter(a => a.status === "offer").length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Interview Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mock Interviews</span>
                <span className="text-2xl font-bold">{data.interviews.length}</span>
              </div>
              {avgInterviewScore > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Score</span>
                    <span className="text-2xl font-bold text-primary">{Math.round(avgInterviewScore)}</span>
                  </div>
                  <Progress value={avgInterviewScore} className="h-2" />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recommended Next Steps</CardTitle>
          <CardDescription>
            Continue building your career momentum
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeGoals.length === 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Set a Career Goal</p>
                  <p className="text-sm text-muted-foreground">Define your next career milestone</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Get Started
              </Button>
            </div>
          )}
          {activePaths.length === 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Start Learning</p>
                  <p className="text-sm text-muted-foreground">Begin a learning path to close skill gaps</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Explore
              </Button>
            </div>
          )}
          {data.interviews.length === 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Practice Interview</p>
                  <p className="text-sm text-muted-foreground">Take a mock interview to prepare</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Start
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
