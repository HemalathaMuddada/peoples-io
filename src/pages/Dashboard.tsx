import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Briefcase, 
  FileText, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  GraduationCap,
  MessageSquare,
  Award,
  Calendar,
  Bell,
  BarChart3,
  Sparkles,
  DollarSign,
  Zap,
  Star,
  TrendingDown,
  Users,
  Flame,
  Share2,
  BookOpen,
  UserPlus,
  MessageCircle,
  Trophy,
  Heart
} from "lucide-react";
import emptyCoaches from "@/assets/empty-coaches.png";
import emptyJobs from "@/assets/empty-jobs.png";
import emptyAchievements from "@/assets/empty-achievements.png";
import emptyStories from "@/assets/empty-stories.png";
import emptyCommunity from "@/assets/empty-community.png";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ConnectionReferrals } from "@/components/dashboard/ConnectionReferrals";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy } from "lucide-react";
import ResumePerformanceAlerts from "@/components/resume/ResumePerformanceAlerts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamStatsWidget } from "@/components/teams/TeamStatsWidget";
import { TeamActivityTimeline } from "@/components/teams/TeamActivityTimeline";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  profileScore: number;
  resumeCount: number;
  jobMatches: number;
  applications: number;
  upcomingInterviews: number;
  activeGoals: number;
  completedGoals: number;
  learningProgress: number;
  activeLearningPaths: number;
  mockInterviewsCompleted: number;
  avgInterviewScore: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  icon: any;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: string;
}

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  matchScore: number;
  salary?: string;
}

interface WeeklyProgress {
  thisWeek: {
    applications: number;
    responses: number;
    learningHours: number;
  };
  lastWeek: {
    applications: number;
    responses: number;
    learningHours: number;
  };
}

interface Achievement {
  id: string;
  name: string;
  type: string;
  earnedAt: string;
  icon: any;
}

interface PipelineStage {
  name: string;
  count: number;
  color: string;
}

interface ReferralStats {
  code: string;
  referralsCount: number;
  rewardsEarned: number;
}

interface SuccessStory {
  id: string;
  userName: string;
  userAvatar?: string;
  title: string;
  company: string;
  story: string;
  date: string;
  likes: number;
}

interface MentorMatch {
  id: string;
  name: string;
  avatar?: string;
  title: string;
  company: string;
  expertise: string[];
  matchScore: number;
}

interface ForumPost {
  id: string;
  title: string;
  author: string;
  category: string;
  replies: number;
  views: number;
  timestamp: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    profileScore: 0,
    resumeCount: 0,
    jobMatches: 0,
    applications: 0,
    upcomingInterviews: 0,
    activeGoals: 0,
    completedGoals: 0,
    learningProgress: 0,
    activeLearningPaths: 0,
    mockInterviewsCompleted: 0,
    avgInterviewScore: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [topJobMatches, setTopJobMatches] = useState<JobMatch[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [trendingSkills, setTrendingSkills] = useState<string[]>([]);
  const [salaryInsight, setSalaryInsight] = useState<{ min: number; max: number; avg: number } | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [learningStreak, setLearningStreak] = useState(0);
  const [conversionRates, setConversionRates] = useState<{ applications: number; responses: number; interviews: number }>({ applications: 100, responses: 0, interviews: 0 });
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [successStories, setSuccessStories] = useState<SuccessStory[]>([]);
  const [mentorMatches, setMentorMatches] = useState<MentorMatch[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Coach filters
  const [coachExpertiseFilter, setCoachExpertiseFilter] = useState<string>("all");
  const [coachLocationFilter, setCoachLocationFilter] = useState<string>("all");
  const [coachAvailabilityFilter, setCoachAvailabilityFilter] = useState<string>("all");
  const [allCoaches, setAllCoaches] = useState<MentorMatch[]>([]);

  useEffect(() => {
    checkUserRoleAndRedirect();

    // Set up realtime subscription for coach updates
    const channel = supabase
      .channel('coach-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_profiles',
          filter: 'is_available_for_mentorship=eq.true'
        },
        () => {
          // Reload dashboard data when a coach profile is updated
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUserRoleAndRedirect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check user roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasRecruiterRole = roles?.some(r => r.role === 'recruiter');
      const hasPlatformAdminRole = roles?.some(r => r.role === 'platform_admin');

      // Redirect based on role
      if (hasRecruiterRole) {
        navigate("/recruiter-dashboard");
        return;
      }

      if (hasPlatformAdminRole && roles?.length === 1) {
        navigate("/admin");
        return;
      }

      // Load candidate dashboard
      loadDashboardData();
    } catch (error) {
      console.error("Error checking user role:", error);
      loadDashboardData();
    }
  };

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id, profile_score, salary_range_min, salary_range_max, expertise_areas")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Get resume count
      const { count: resumeCount } = await supabase
        .from("resumes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Get job matches count
      const { count: matchesCount } = await supabase
        .from("job_matches")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", profile.id);

      // Get applications
      const { data: applications, count: appsCount } = await supabase
        .from("job_applications")
        .select("*", { count: "exact" })
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Get career goals
      const { data: goals } = await supabase
        .from("career_goals")
        .select("*")
        .eq("profile_id", profile.id);

      const activeGoals = goals?.filter(g => g.status === "in_progress").length || 0;
      // Calculate metrics
      const totalApps = applications?.length || 0;
      const respondedApps = applications?.filter(a => 
        a.status !== "planned" && a.status !== "applied"
      ).length || 0;
      const interviewApps = applications?.filter(a => 
        a.status === "interview" || a.status === "offer"
      ).length || 0;

      const completedGoals = goals?.filter(g => g.status === "completed").length || 0;

      // Get learning paths
      const { data: learningPaths } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("profile_id", profile.id);

      const activeLearningPaths = learningPaths?.filter(lp => lp.status === "active").length || 0;
      const avgLearningProgress = learningPaths?.reduce((acc, lp) => acc + (lp.progress || 0), 0) / (learningPaths?.length || 1) || 0;

      // Get mock interviews
      const { data: mockInterviews } = await supabase
        .from("mock_interviews")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("status", "completed");

      const avgInterviewScore = mockInterviews?.reduce((acc, i) => acc + (i.score || 0), 0) / (mockInterviews?.length || 1) || 0;

      // Get reminders
      const { data: reminders } = await supabase
        .from("application_reminders")
        .select("*, job_applications!inner(job_title, company)")
        .gte("reminder_date", new Date().toISOString())
        .eq("completed", false)
        .order("reminder_date", { ascending: true })
        .limit(5);

      // Build recent activity
      const activity: RecentActivity[] = [];
      
      applications?.slice(0, 3).forEach(app => {
        activity.push({
          id: app.id,
          type: "application",
          title: `Applied to ${app.job_title} at ${app.company}`,
          timestamp: app.created_at,
          icon: Briefcase,
        });
      });

      goals?.slice(0, 2).forEach(goal => {
        if (goal.status === "completed" && goal.completed_at) {
          activity.push({
            id: goal.id,
            type: "goal",
            title: `Completed goal: ${goal.title}`,
            timestamp: goal.completed_at,
            icon: Target,
          });
        }
      });

      mockInterviews?.slice(0, 2).forEach(interview => {
        if (interview.completed_at) {
          activity.push({
            id: interview.id,
            type: "interview",
            title: `Completed mock interview for ${interview.job_title}`,
            timestamp: interview.completed_at,
            icon: MessageSquare,
          });
        }
      });

      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Build upcoming events
      const events: UpcomingEvent[] = [];
      
      reminders?.forEach(reminder => {
        events.push({
          id: reminder.id,
          title: `${reminder.reminder_type}: ${(reminder.job_applications as any)?.job_title}`,
          date: reminder.reminder_date,
          type: reminder.reminder_type,
        });
      });

      setStats({
        profileScore: profile.profile_score || 0,
        resumeCount: resumeCount || 0,
        jobMatches: matchesCount || 0,
        applications: appsCount || 0,
        upcomingInterviews: events.filter(e => e.type === "interview").length,
        activeGoals,
        completedGoals,
        learningProgress: Math.round(avgLearningProgress),
        activeLearningPaths,
        mockInterviewsCompleted: mockInterviews?.length || 0,
        avgInterviewScore: Math.round(avgInterviewScore),
      });

      setRecentActivity(activity.slice(0, 5));
      setUpcomingEvents(events.slice(0, 5));

      // Load top job matches
      const { data: matches } = await supabase
        .from("job_matches")
        .select("*, job_postings!inner(*)")
        .eq("profile_id", profile.id)
        .order("match_score", { ascending: false })
        .limit(5);

      const jobMatches: JobMatch[] = matches?.map(m => ({
        id: m.id,
        title: (m.job_postings as any).title,
        company: (m.job_postings as any).company,
        location: (m.job_postings as any).location || "Remote",
        matchScore: m.match_score || 0,
        salary: (m.job_postings as any).salary_min && (m.job_postings as any).salary_max
          ? `$${(m.job_postings as any).salary_min}k - $${(m.job_postings as any).salary_max}k`
          : undefined,
      })) || [];
      setTopJobMatches(jobMatches);

      // Calculate weekly progress
      const thisWeekStart = startOfWeek(new Date());
      const thisWeekEnd = endOfWeek(new Date());
      const lastWeekStart = startOfWeek(subDays(new Date(), 7));
      const lastWeekEnd = endOfWeek(subDays(new Date(), 7));

      const thisWeekApps = applications?.filter(a => 
        isWithinInterval(new Date(a.created_at || ""), { start: thisWeekStart, end: thisWeekEnd })
      ).length || 0;
      
      const thisWeekResponses = applications?.filter(a => 
        a.status !== "planned" && a.status !== "applied" &&
        isWithinInterval(new Date(a.updated_at || ""), { start: thisWeekStart, end: thisWeekEnd })
      ).length || 0;

      const lastWeekApps = applications?.filter(a => 
        isWithinInterval(new Date(a.created_at || ""), { start: lastWeekStart, end: lastWeekEnd })
      ).length || 0;

      const lastWeekResponses = applications?.filter(a => 
        a.status !== "planned" && a.status !== "applied" &&
        isWithinInterval(new Date(a.updated_at || ""), { start: lastWeekStart, end: lastWeekEnd })
      ).length || 0;

      setWeeklyProgress({
        thisWeek: { applications: thisWeekApps, responses: thisWeekResponses, learningHours: 0 },
        lastWeek: { applications: lastWeekApps, responses: lastWeekResponses, learningHours: 0 },
      });

      // Load achievements
      const { data: profileAchievements } = await supabase
        .from("profile_achievements")
        .select("*")
        .eq("profile_id", profile.id)
        .order("earned_at", { ascending: false })
        .limit(6);

      const achievementIcons: any = {
        profile_created: Award,
        quarter_complete: Star,
        half_complete: Star,
        three_quarter_complete: Star,
        fully_complete: Award,
      };

      setAchievements(profileAchievements?.map(a => ({
        id: a.id,
        name: a.achievement_name,
        type: a.achievement_type,
        earnedAt: a.earned_at,
        icon: achievementIcons[a.achievement_type] || Award,
      })) || []);

      // Trending skills (mock data - would come from job market analysis)
      setTrendingSkills(["React", "TypeScript", "Python", "AWS", "Leadership"]);

      // Salary insights
      if (profile.salary_range_min && profile.salary_range_max) {
        const avg = Math.round((profile.salary_range_min + profile.salary_range_max) / 2);
        setSalaryInsight({
          min: profile.salary_range_min,
          max: profile.salary_range_max,
          avg,
        });
      }

      // Pipeline stages
      const stages: PipelineStage[] = [
        { name: "Planned", count: applications?.filter(a => a.status === "planned").length || 0, color: "bg-gray-500" },
        { name: "Applied", count: applications?.filter(a => a.status === "applied").length || 0, color: "bg-blue-500" },
        { name: "Interview", count: applications?.filter(a => a.status === "interview").length || 0, color: "bg-purple-500" },
        { name: "Offer", count: applications?.filter(a => a.status === "offer").length || 0, color: "bg-green-500" },
        { name: "Rejected", count: applications?.filter(a => a.status === "rejected").length || 0, color: "bg-red-500" },
      ];
      setPipelineStages(stages);

      // Calculate learning streak (mock - would track consecutive days)
      setLearningStreak(learningPaths?.length ? 7 : 0);

      // Conversion rates
      if (totalApps > 0) {
        const responseRate = Math.round((respondedApps / totalApps) * 100);
        const interviewRate = Math.round((interviewApps / totalApps) * 100);
        setConversionRates({
          applications: 100,
          responses: responseRate,
          interviews: interviewRate,
        });
      }

      // Mock Community & Engagement data (can be replaced with real data later)
      setReferralStats({
        code: "CAREER" + user.id.slice(0, 6).toUpperCase(),
        referralsCount: 3,
        rewardsEarned: 150,
      });

      setSuccessStories([
        {
          id: "1",
          userName: "Sarah Johnson",
          title: "Senior Product Manager",
          company: "Google",
          story: "After 3 months of using this platform, I landed my dream role! The mock interviews and resume feedback were game-changers.",
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          likes: 127,
        },
        {
          id: "2",
          userName: "Michael Chen",
          title: "Software Engineer",
          company: "Amazon",
          story: "The AI career coach helped me identify my strengths and pivot to a tech role. Forever grateful!",
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          likes: 89,
        },
      ]);

      // Load available coaches/mentors with their profile names
      const { data: coaches, error: coachError } = await supabase
        .from("candidate_profiles")
        .select(`
          id,
          current_title,
          expertise_areas,
          mentor_bio,
          mentor_pricing,
          location,
          years_experience,
          user_id,
          profiles(full_name)
        `)
        .eq("is_available_for_mentorship", true)
        .order("years_experience", { ascending: false });

      if (coachError) {
        console.error("Error loading coaches:", coachError);
      }

      if (coaches && coaches.length > 0) {
        const coachMatches: MentorMatch[] = coaches.map(coach => {
          // Get name from joined profiles table with fallback
          const coachProfile = (coach as any).profiles;
          const userName = coachProfile?.full_name || 'Professional Coach';
          
          // Calculate a simple match score based on expertise overlap
          const userExpertise = (profile.expertise_areas as string[]) || [];
          const coachExpertise = (coach.expertise_areas as string[]) || [];
          const commonSkills = userExpertise.filter(skill => 
            coachExpertise.some(cs => cs.toLowerCase().includes(skill.toLowerCase()))
          );
          const matchScore = Math.min(95, 70 + (commonSkills.length * 5));

          return {
            id: coach.id,
            name: userName,
            title: coach.current_title || 'Professional Coach',
            company: coach.location || 'Remote',
            expertise: coachExpertise.slice(0, 3).length > 0 ? coachExpertise.slice(0, 3) : ['Career Coaching'],
            matchScore,
          };
        });

        setAllCoaches(coachMatches);
        applyCoachFilters(coachMatches);
      }

      setForumPosts([
        {
          id: "1",
          title: "How to negotiate salary in tech?",
          author: "Alex Kumar",
          category: "Career Advice",
          replies: 24,
          views: 312,
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "2",
          title: "Best resources for system design interviews",
          author: "Jessica Lee",
          category: "Interview Prep",
          replies: 18,
          views: 256,
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "3",
          title: "Transitioning from PM to Product Designer?",
          author: "Ryan Thompson",
          category: "Career Transition",
          replies: 12,
          views: 189,
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
      ]);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply coach filters
  const applyCoachFilters = (coaches: MentorMatch[]) => {
    let filtered = [...coaches];

    // Filter by expertise
    if (coachExpertiseFilter !== "all") {
      filtered = filtered.filter(coach => 
        coach.expertise.some(exp => 
          exp.toLowerCase().includes(coachExpertiseFilter.toLowerCase())
        )
      );
    }

    // Filter by location
    if (coachLocationFilter !== "all") {
      filtered = filtered.filter(coach => 
        coach.company.toLowerCase().includes(coachLocationFilter.toLowerCase())
      );
    }

    // Filter by availability (using match score as a proxy)
    if (coachAvailabilityFilter === "high") {
      filtered = filtered.filter(coach => coach.matchScore >= 80);
    } else if (coachAvailabilityFilter === "medium") {
      filtered = filtered.filter(coach => coach.matchScore >= 60 && coach.matchScore < 80);
    }

    // Sort by match score
    filtered.sort((a, b) => b.matchScore - a.matchScore);

    // Take top 3
    setMentorMatches(filtered.slice(0, 3));
  };

  // Re-apply filters when filter state changes
  useEffect(() => {
    if (allCoaches.length > 0) {
      applyCoachFilters(allCoaches);
    }
  }, [coachExpertiseFilter, coachLocationFilter, coachAvailabilityFilter]);

  // Get unique expertise areas and locations
  const uniqueExpertise = Array.from(
    new Set(allCoaches.flatMap(c => c.expertise))
  ).sort();
  
  const uniqueLocations = Array.from(
    new Set(allCoaches.map(c => c.company))
  ).sort();

  const statCards = [
    {
      title: "Profile Strength",
      value: `${stats.profileScore}%`,
      icon: TrendingUp,
      description: "Complete your profile",
      color: "text-primary",
      trend: stats.profileScore >= 80 ? "up" : "neutral",
      action: { label: "Improve", href: "/profile-strength" },
    },
    {
      title: "Applications",
      value: stats.applications,
      icon: Briefcase,
      description: `${stats.upcomingInterviews} interviews`,
      color: "text-blue-600",
      trend: "up",
      action: { label: "View All", href: "/applications" },
    },
    {
      title: "Career Goals",
      value: stats.activeGoals,
      icon: Target,
      description: `${stats.completedGoals} completed`,
      color: "text-green-600",
      trend: stats.completedGoals > 0 ? "up" : "neutral",
      action: { label: "Manage", href: "/career?tab=goals" },
    },
    {
      title: "Learning",
      value: `${stats.learningProgress}%`,
      icon: GraduationCap,
      description: `${stats.activeLearningPaths} active paths`,
      color: "text-purple-600",
      trend: stats.learningProgress > 0 ? "up" : "neutral",
      action: { label: "Continue", href: "/career?tab=learning" },
    },
  ];

  const quickActions = [
    {
      title: "Intelligence Center",
      description: "All insights in one place",
      icon: Zap,
      href: "/intelligence",
      color: "bg-gradient-primary text-white",
    },
    {
      title: "AI Career Coach",
      description: "Get personalized guidance",
      icon: Sparkles,
      href: "/career?tab=coach",
      color: "bg-yellow-500/10 text-yellow-600",
    },
    {
      title: "View Analytics",
      description: "Track your progress",
      icon: BarChart3,
      href: "/career?tab=analytics",
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Find Jobs",
      description: "AI-matched opportunities",
      icon: Briefcase,
      href: "/jobs",
      color: "bg-green-500/10 text-green-600",
    },
    {
      title: "Practice Interview",
      description: "Mock interview practice",
      icon: MessageSquare,
      href: "/career?tab=interview",
      color: "bg-purple-500/10 text-purple-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-32 bg-muted" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome Back!</h1>
        <p className="text-muted-foreground">
          Track your progress and take the next step in your career journey
        </p>
      </div>

      {/* Performance Alerts */}
      <ResumePerformanceAlerts />

      {/* Team Stats Widget */}
      <TeamStatsWidget />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-card hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                  {stat.title === "Profile Strength" && (
                    <Progress value={stats.profileScore} className="h-2" />
                  )}
                  {stat.title === "Learning" && stats.learningProgress > 0 && (
                    <Progress value={stats.learningProgress} className="h-2" />
                  )}
                  <Link to={stat.action.href}>
                    <Button variant="ghost" size="sm" className="w-full gap-2 -mx-2">
                      {stat.action.label}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} to={action.href}>
                <Card className="shadow-card hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
                  <CardHeader>
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${action.color} mb-4`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>Your latest actions and achievements</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => {
                  const ActivityIcon = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <ActivityIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.timestamp), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity. Start by exploring jobs or setting a goal!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardDescription>Reminders and scheduled activities</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10">
                      <Bell className="w-4 h-4 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.date), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No upcoming events. Set reminders for your applications!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Job Matches */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Top Job Matches
              </CardTitle>
              <CardDescription>AI-matched opportunities for you</CardDescription>
            </div>
            <Link to="/jobs">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {topJobMatches.length > 0 ? (
            <div className="space-y-3">
              {topJobMatches.slice(0, 3).map((job) => (
                <div key={job.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{job.location}</Badge>
                        {job.salary && (
                          <span className="text-xs text-muted-foreground">{job.salary}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold">{job.matchScore}%</span>
                      </div>
                      <span className="text-xs text-muted-foreground">match</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <img 
                src={emptyJobs} 
                alt="No job matches" 
                className="w-32 h-32 mx-auto opacity-90"
              />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">No job matches yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Complete your profile and add your skills to get personalized job recommendations powered by AI.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/profile-strength">
                  <Button variant="default" size="sm" className="gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Profile
                  </Button>
                </Link>
                <Link to="/jobs">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Briefcase className="w-4 h-4" />
                    Browse Jobs
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Progress Summary */}
      {weeklyProgress && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Weekly Progress
            </CardTitle>
            <CardDescription>This week vs last week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyProgress.thisWeek.applications}</p>
                <p className="text-xs text-muted-foreground mb-2">Applications</p>
                <div className="flex items-center justify-center gap-1 text-xs">
                  {weeklyProgress.thisWeek.applications >= weeklyProgress.lastWeek.applications ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">
                        +{weeklyProgress.thisWeek.applications - weeklyProgress.lastWeek.applications}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">
                        {weeklyProgress.thisWeek.applications - weeklyProgress.lastWeek.applications}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{weeklyProgress.thisWeek.responses}</p>
                <p className="text-xs text-muted-foreground mb-2">Responses</p>
                <div className="flex items-center justify-center gap-1 text-xs">
                  {weeklyProgress.thisWeek.responses >= weeklyProgress.lastWeek.responses ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">
                        +{weeklyProgress.thisWeek.responses - weeklyProgress.lastWeek.responses}
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">
                        {weeklyProgress.thisWeek.responses - weeklyProgress.lastWeek.responses}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <p className="text-2xl font-bold">{learningStreak}</p>
                </div>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Achievement Badges */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Achievements
            </CardTitle>
            <CardDescription>Your career milestones</CardDescription>
          </CardHeader>
          <CardContent>
            {achievements.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {achievements.map((achievement) => {
                  const AchievementIcon = achievement.icon;
                  return (
                    <div key={achievement.id} className="flex flex-col items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-2">
                        <AchievementIcon className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-medium text-center">{achievement.name}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <img 
                  src={emptyAchievements} 
                  alt="No achievements yet" 
                  className="w-24 h-24 mx-auto opacity-90"
                />
                <div className="space-y-1">
                  <h3 className="font-semibold">Start your journey</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete your profile and apply to jobs to unlock achievements
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trending Skills */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Trending Skills
            </CardTitle>
            <CardDescription>Hot skills in your industry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {trendingSkills.map((skill, index) => (
                <Badge key={skill} variant="secondary" className="gap-2">
                  <Zap className="h-3 w-3 text-yellow-600" />
                  {skill}
                </Badge>
              ))}
            </div>
            <Link to="/career?tab=learning">
              <Button variant="outline" size="sm" className="w-full mt-4">
                Start Learning
                <ArrowRight className="h-3 w-3 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Salary Insights */}
      {salaryInsight && (
        <Card className="shadow-card border-green-500/20 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle>Salary Insights</CardTitle>
                <CardDescription className="mt-2">
                  Based on your profile and target roles
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Min Range</p>
                <p className="text-2xl font-bold text-green-600">${salaryInsight.min}k</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Average</p>
                <p className="text-2xl font-bold text-green-600">${salaryInsight.avg}k</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Max Range</p>
                <p className="text-2xl font-bold text-green-600">${salaryInsight.max}k</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Pipeline */}
      {pipelineStages.some(s => s.count > 0) && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Application Pipeline
            </CardTitle>
            <CardDescription>Applications at each stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineStages.filter(s => s.count > 0).map((stage) => (
                <div key={stage.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{stage.name}</span>
                    <span className="text-sm font-bold">{stage.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stage.color}`}
                      style={{ width: `${(stage.count / stats.applications) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Metrics / Conversion Rates */}
      {stats.applications > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              Success Metrics
            </CardTitle>
            <CardDescription>Your application conversion funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Applications Sent</span>
                  <span className="text-sm font-bold">{conversionRates.applications}%</span>
                </div>
                <Progress value={conversionRates.applications} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Response Rate</span>
                  <span className="text-sm font-bold">{conversionRates.responses}%</span>
                </div>
                <Progress value={conversionRates.responses} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Interview Rate</span>
                  <span className="text-sm font-bold">{conversionRates.interviews}%</span>
                </div>
                <Progress value={conversionRates.interviews} className="h-2" />
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 Industry average response rate is ~30%. {conversionRates.responses >= 30 ? "You're doing great!" : "Keep optimizing your applications!"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommended Actions */}
      <Card className="shadow-card border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle>Recommended Next Actions</CardTitle>
              <CardDescription className="mt-2">
                AI-powered suggestions based on your activity
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.profileScore < 80 && (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Complete your profile</p>
                  <p className="text-sm text-muted-foreground">Boost visibility by {100 - stats.profileScore}%</p>
                </div>
                <Link to="/profile-strength">
                  <Button size="sm" variant="outline">Go</Button>
                </Link>
              </div>
            )}
            {topJobMatches.length > 0 && (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Briefcase className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Apply to top {topJobMatches.length} matches</p>
                  <p className="text-sm text-muted-foreground">High compatibility jobs waiting</p>
                </div>
                <Link to="/jobs">
                  <Button size="sm" variant="outline">View</Button>
                </Link>
              </div>
            )}
            {stats.mockInterviewsCompleted < 3 && (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Practice mock interviews</p>
                  <p className="text-sm text-muted-foreground">Improve interview confidence</p>
                </div>
                <Link to="/career?tab=interview">
                  <Button size="sm" variant="outline">Start</Button>
                </Link>
              </div>
            )}
            {stats.activeGoals === 0 && (
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Set your career goals</p>
                  <p className="text-sm text-muted-foreground">Track progress towards success</p>
                </div>
                <Link to="/career?tab=goals">
                  <Button size="sm" variant="outline">Create</Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {stats.mockInterviewsCompleted > 0 && (
        <Card className="shadow-card border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle>Interview Performance</CardTitle>
                <CardDescription className="mt-2">
                  You've completed {stats.mockInterviewsCompleted} mock interviews with an average score of {stats.avgInterviewScore}%
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={stats.avgInterviewScore} className="h-2 flex-1" />
              <Link to="/career?tab=interview">
                <Button size="sm" variant="outline">
                  Practice More
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Completion CTA */}
      {stats.profileScore < 80 && (
        <Card className="shadow-card border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle>Complete Your Profile</CardTitle>
                <CardDescription className="mt-2">
                  A complete profile increases your chances of finding the right opportunity by 3x
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={stats.profileScore} className="h-2" />
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="w-3 h-3" />
                  5 min to complete
                </Badge>
                <Link to="/profile-strength">
                  <Button size="sm" className="bg-gradient-primary">
                    Improve Profile
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LinkedIn Referral Network */}
      <ConnectionReferrals />

      {/* Referral System */}
      {referralStats && (
        <Card className="shadow-card border-pink-500/20 bg-gradient-to-r from-pink-500/5 to-rose-500/5">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle>Invite Friends, Earn Rewards</CardTitle>
                <CardDescription className="mt-2">
                  Share your referral code and get premium features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-2 border-dashed">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your Referral Code</p>
                  <p className="text-2xl font-bold font-mono">{referralStats.code}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2"
                    onClick={async () => {
                      const code = referralStats?.code;
                      if (!code) return;
                      const url = `${window.location.origin}/?ref=${encodeURIComponent(code)}`;

                      try {
                        if (window.isSecureContext && window.navigator?.clipboard?.writeText) {
                          await window.navigator.clipboard.writeText(url);
                          toast.success('Referral link copied to clipboard');
                          return;
                        }
                      } catch (_) {
                        // fall through to legacy copy
                      }

                      try {
                        const el = document.createElement('textarea');
                        el.value = url;
                        el.setAttribute('readonly', '');
                        el.style.position = 'absolute';
                        el.style.left = '-9999px';
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand('copy');
                        document.body.removeChild(el);
                        toast.success('Referral link copied to clipboard');
                      } catch (_) {
                        toast.error('Unable to copy. Please try manually.');
                      }
                    }}
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-pink-600">{referralStats.referralsCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">Referrals</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-pink-600">${referralStats.rewardsEarned}</p>
                  <p className="text-xs text-muted-foreground mt-1">Rewards Earned</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Activity Timeline */}
      <TeamActivityTimeline />

      {/* Success Stories */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <CardTitle>Success Stories</CardTitle>
            </div>
            <Link to="/success-stories">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <CardDescription>Get inspired by community wins</CardDescription>
        </CardHeader>
        <CardContent>
          {successStories.length > 0 ? (
            <div className="space-y-4">
              {successStories.map((story) => (
                <div key={story.id} className="p-4 border rounded-lg space-y-3 hover:border-primary/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">
                      {story.userName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{story.userName}</p>
                      <p className="text-sm text-muted-foreground">{story.title} at {story.company}</p>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Heart className="w-3 h-3" />
                      {story.likes}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{story.story}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(story.date), "MMM d, yyyy")}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <img 
                src={emptyStories} 
                alt="No success stories yet" 
                className="w-24 h-24 mx-auto opacity-90"
              />
              <div className="space-y-1">
                <h3 className="font-semibold">No success stories yet</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first to share your career success story with the community
                </p>
              </div>
              <Link to="/success-stories">
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Share Your Story
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matched Coaches */}
      <Card className="shadow-card border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle>Matched Coaches</CardTitle>
              <CardDescription className="mt-2">
                Connect with experienced professionals in your field
              </CardDescription>
            </div>
          </div>
          
          {/* Filter Controls */}
          {allCoaches.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-4">
              <Select value={coachExpertiseFilter} onValueChange={setCoachExpertiseFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by expertise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Expertise</SelectItem>
                  {uniqueExpertise.map(exp => (
                    <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={coachLocationFilter} onValueChange={setCoachLocationFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={coachAvailabilityFilter} onValueChange={setCoachAvailabilityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Availability</SelectItem>
                  <SelectItem value="high">High Match (80%+)</SelectItem>
                  <SelectItem value="medium">Medium Match (60-79%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {mentorMatches.length > 0 ? (
            <div className="space-y-3">
              {mentorMatches.map((mentor) => (
                <div key={mentor.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {mentor.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{mentor.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          {mentor.matchScore}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{mentor.title} {mentor.company && `• ${mentor.company}`}</p>
                      <div className="flex flex-wrap gap-1">
                        {mentor.expertise.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Link to="/coaches">
                      <Button size="sm" variant="outline">Connect</Button>
                    </Link>
                  </div>
                </div>
              ))}
              <Link to="/coaches">
                <Button variant="ghost" className="w-full gap-2" size="sm">
                  View All Coaches
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <img 
                src={emptyCoaches} 
                alt="No coaches available yet" 
                className="w-32 h-32 mx-auto opacity-90"
              />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">No coaches available yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  We're working on matching you with experienced professionals. Check back soon or update your profile expertise areas to improve your matches.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/profile-strength">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Target className="w-4 h-4" />
                    Update Profile
                  </Button>
                </Link>
                <Link to="/coaches">
                  <Button variant="default" size="sm" className="gap-2">
                    <Users className="w-4 h-4" />
                    Explore All Coaches
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forum / Discussions */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <CardTitle>Community Forum</CardTitle>
            </div>
            <Link to="/community">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <CardDescription>Join the conversation</CardDescription>
        </CardHeader>
        <CardContent>
          {forumPosts.length > 0 ? (
            <div className="space-y-3">
              {forumPosts.map((post) => (
                <div key={post.id} className="p-3 border rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">{post.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{post.author}</span>
                        <Badge variant="outline" className="text-xs">{post.category}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {post.replies}
                    </span>
                    <span>{post.views} views</span>
                    <span>{format(new Date(post.timestamp), "h:mm a")}</span>
                  </div>
                </div>
              ))}
              <Link to="/community">
                <Button variant="default" className="w-full gap-2" size="sm">
                  <MessageCircle className="w-4 h-4" />
                  Start a Discussion
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <img 
                src={emptyCommunity} 
                alt="No discussions yet" 
                className="w-24 h-24 mx-auto opacity-90"
              />
              <div className="space-y-1">
                <h3 className="font-semibold">No discussions yet</h3>
                <p className="text-sm text-muted-foreground">
                  Join the community to ask questions and share insights
                </p>
              </div>
              <Link to="/community">
                <Button variant="default" size="sm" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Explore Community
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Your Referral Link</DialogTitle>
            <DialogDescription>
              Share this link with friends to earn rewards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/?ref=${referralStats?.code || ''}`}
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border"
              />
              <Button
                size="sm"
                onClick={async () => {
                  const url = `${window.location.origin}/?ref=${referralStats?.code || ''}`;
                  try {
                    if (window.isSecureContext && window.navigator?.clipboard?.writeText) {
                      await window.navigator.clipboard.writeText(url);
                      toast.success('Link copied!');
                      return;
                    }
                  } catch (_) {}
                  
                  try {
                    const el = document.createElement('textarea');
                    el.value = url;
                    el.setAttribute('readonly', '');
                    el.style.position = 'absolute';
                    el.style.left = '-9999px';
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                    toast.success('Link copied!');
                  } catch (_) {
                    toast.error('Unable to copy');
                  }
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
