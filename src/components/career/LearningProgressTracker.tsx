import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AreaChart, 
  Area,
  BarChart, 
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { 
  Clock, 
  TrendingUp, 
  Award,
  Target,
  Calendar,
  CheckCircle2,
  Play,
  Pause,
  Loader2,
  Timer,
  Flame
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

interface LearningPath {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  progress: number;
  status: string;
  total_time_spent_minutes: number;
  completion_percentage: number;
  skill_mastery_score: number;
  started_at: string;
  completed_at: string;
  courses: Course[];
}

interface Course {
  id: string;
  title: string;
  provider: string;
  estimated_hours: number;
  time_spent_minutes: number;
  completed: boolean;
  completed_at: string;
  last_accessed_at: string;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  duration_minutes: number;
  created_at: string;
  learning_path_id: string;
}

export const LearningProgressTracker = () => {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [activeTimer, setActiveTimer] = useState<{ pathId: string; courseId: string } | null>(null);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerMinutes(prev => prev + 1);
      }, 60000); // Update every minute
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

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
        .select("current_streak")
        .eq("profile_id", profile.id)
        .single();

      if (streakData) {
        setCurrentStreak(streakData.current_streak);
      }

      // Load learning paths with courses
      const { data: learningPaths } = await supabase
        .from("learning_paths")
        .select(`
          *,
          learning_path_courses(*)
        `)
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      const formattedPaths = learningPaths?.map((path: any) => ({
        ...path,
        courses: path.learning_path_courses || []
      })) || [];

      setPaths(formattedPaths);

      // Load activity logs for the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: activityLogs } = await supabase
        .from("learning_activity_log")
        .select("*")
        .eq("profile_id", profile.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      setActivities(activityLogs || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load learning progress");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async (pathId: string, courseId: string) => {
    if (!profileId) return;

    try {
      await supabase
        .from("learning_activity_log")
        .insert({
          profile_id: profileId,
          learning_path_id: pathId,
          course_id: courseId,
          activity_type: "started",
          duration_minutes: 0
        });

      await supabase
        .from("learning_path_courses")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", courseId);

      setActiveTimer({ pathId, courseId });
      setTimerMinutes(0);
      toast.success("Timer started!");
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("Failed to start timer");
    }
  };

  const stopTimer = async () => {
    if (!activeTimer || !profileId) return;

    try {
      // Log the activity
      await supabase
        .from("learning_activity_log")
        .insert({
          profile_id: profileId,
          learning_path_id: activeTimer.pathId,
          course_id: activeTimer.courseId,
          activity_type: "paused",
          duration_minutes: timerMinutes
        });

      // Update course time spent
      const { data: course } = await supabase
        .from("learning_path_courses")
        .select("time_spent_minutes")
        .eq("id", activeTimer.courseId)
        .single();

      if (course) {
        await supabase
          .from("learning_path_courses")
          .update({ 
            time_spent_minutes: (course.time_spent_minutes || 0) + timerMinutes 
          })
          .eq("id", activeTimer.courseId);
      }

      setActiveTimer(null);
      setTimerMinutes(0);
      toast.success(`Logged ${timerMinutes} minutes of learning!`);
      loadData(); // Refresh data
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast.error("Failed to stop timer");
    }
  };

  const logManualTime = async (courseId: string, pathId: string, minutes: number) => {
    if (!profileId || !minutes || minutes <= 0) return;

    try {
      // Log the activity
      await supabase
        .from("learning_activity_log")
        .insert({
          profile_id: profileId,
          learning_path_id: pathId,
          course_id: courseId,
          activity_type: "resumed",
          duration_minutes: minutes
        });

      // Update course time spent
      const { data: course } = await supabase
        .from("learning_path_courses")
        .select("time_spent_minutes")
        .eq("id", courseId)
        .single();

      if (course) {
        await supabase
          .from("learning_path_courses")
          .update({ 
            time_spent_minutes: (course.time_spent_minutes || 0) + minutes,
            last_accessed_at: new Date().toISOString()
          })
          .eq("id", courseId);
      }

      toast.success(`Logged ${minutes} minutes!`);
      loadData();
    } catch (error) {
      console.error("Error logging time:", error);
      toast.error("Failed to log time");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate metrics
  const totalTimeSpent = paths.reduce((sum, p) => sum + (p.total_time_spent_minutes || 0), 0);
  const totalCoursesCompleted = paths.reduce((sum, p) => 
    sum + p.courses.filter(c => c.completed).length, 0
  );
  const totalCourses = paths.reduce((sum, p) => sum + p.courses.length, 0);
  const avgCompletionRate = paths.length > 0 
    ? Math.round(paths.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / paths.length)
    : 0;

  // Time spent breakdown by path
  const timeBreakdownData = paths
    .filter(p => p.total_time_spent_minutes > 0)
    .map(p => ({
      name: p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title,
      hours: Math.round(p.total_time_spent_minutes / 60 * 10) / 10,
      fill: `hsl(${Math.random() * 360}, 70%, 50%)`
    }));

  // Daily activity for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayActivities = activities.filter(a => 
      format(new Date(a.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    const totalMinutes = dayActivities.reduce((sum, a) => sum + (a.duration_minutes || 0), 0);
    
    return {
      date: format(date, 'EEE'),
      hours: Math.round(totalMinutes / 60 * 10) / 10,
      activities: dayActivities.length
    };
  });

  // Completion progress over time
  const completionOverTime = paths.map(p => ({
    path: p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
    completion: p.completion_percentage || 0,
    mastery: p.skill_mastery_score || 0
  }));

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {currentStreak > 0 && (
          <Card className="shadow-card border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{currentStreak} days</div>
              <p className="text-xs text-muted-foreground">
                Keep it going! 🔥
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Learning Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(totalTimeSpent / 60)}h</div>
            <p className="text-xs text-muted-foreground">
              {totalTimeSpent % 60}m across all paths
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoursesCompleted}</div>
            <p className="text-xs text-muted-foreground">
              out of {totalCourses} total courses
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Across active paths
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(last7Days.reduce((sum, d) => sum + d.hours, 0) * 10) / 10}h
            </div>
            <p className="text-xs text-muted-foreground">
              Learning activity
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress">Progress Charts</TabsTrigger>
          <TabsTrigger value="courses">Course Details</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Time Spent Breakdown */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Time Spent by Learning Path</CardTitle>
                <CardDescription>Hours invested in each learning path</CardDescription>
              </CardHeader>
              <CardContent>
                {timeBreakdownData.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No time logged yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={timeBreakdownData}
                        dataKey="hours"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {timeBreakdownData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Daily Learning Activity */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Daily Learning Activity</CardTitle>
                <CardDescription>Last 7 days of learning time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" name="Hours" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Completion & Mastery Progress */}
            <Card className="shadow-card md:col-span-2">
              <CardHeader>
                <CardTitle>Completion & Skill Mastery by Path</CardTitle>
                <CardDescription>Track your progress and skill development</CardDescription>
              </CardHeader>
              <CardContent>
                {completionOverTime.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No learning paths yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={completionOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="path" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completion" fill="hsl(var(--primary))" name="Completion %" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="mastery" fill="hsl(var(--secondary))" name="Mastery Score" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          {paths.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No learning paths yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  Start a learning path to track your progress
                </p>
              </CardContent>
            </Card>
          ) : (
            paths.map((path) => (
              <Card key={path.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {path.title}
                        <Badge variant={path.status === "completed" ? "default" : "secondary"}>
                          {path.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">{path.description}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {path.completion_percentage || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round((path.total_time_spent_minutes || 0) / 60)}h logged
                      </div>
                    </div>
                  </div>
                  <Progress value={path.completion_percentage || 0} className="mt-4" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {path.courses.map((course) => (
                    <Card key={course.id} className="bg-muted/20">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className={`font-medium ${course.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {course.title}
                              </h4>
                              {course.completed && <CheckCircle2 className="w-4 h-4 text-primary" />}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{course.provider}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round((course.time_spent_minutes || 0) / 60 * 10) / 10}h logged
                              </span>
                              <span>•</span>
                              <span>{course.estimated_hours}h estimated</span>
                            </div>
                            {course.last_accessed_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Last accessed: {format(new Date(course.last_accessed_at), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {activeTimer?.courseId === course.id ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="animate-pulse">
                                  <Timer className="w-3 h-3 mr-1" />
                                  {timerMinutes}m
                                </Badge>
                                <Button size="sm" variant="destructive" onClick={stopTimer}>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Stop
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startTimer(path.id, course.id)}
                                disabled={!!activeTimer}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Start Timer
                              </Button>
                            )}
                            <ManualTimeLogger
                              onLog={(minutes) => logManualTime(course.id, path.id, minutes)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Recent Learning Activity</CardTitle>
              <CardDescription>Your learning sessions and milestones</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No activity logged yet</p>
              ) : (
                <div className="space-y-3">
                  {activities.slice(0, 20).map((activity) => {
                    const path = paths.find(p => p.id === activity.learning_path_id);
                    
                    return (
                      <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.activity_type === 'completed' ? 'bg-primary' :
                          activity.activity_type === 'milestone_reached' ? 'bg-warning' :
                          'bg-secondary'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {activity.activity_type.replace('_', ' ').toUpperCase()}
                            {path && ` - ${path.title}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                            {activity.duration_minutes > 0 && ` • ${activity.duration_minutes}m`}
                          </p>
                        </div>
                        {activity.duration_minutes > 0 && (
                          <Badge variant="outline">
                            {activity.duration_minutes} min
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper component for manual time logging
const ManualTimeLogger = ({ onLog }: { onLog: (minutes: number) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [minutes, setMinutes] = useState("");

  const handleSubmit = () => {
    const mins = parseInt(minutes);
    if (mins > 0) {
      onLog(mins);
      setMinutes("");
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setIsOpen(true)}>
        <Clock className="w-4 h-4 mr-2" />
        Log Time
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        placeholder="Minutes"
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
        className="w-20 h-8"
      />
      <Button size="sm" onClick={handleSubmit}>Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>×</Button>
    </div>
  );
};
