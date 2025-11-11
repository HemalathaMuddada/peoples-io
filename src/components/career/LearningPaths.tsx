import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Clock, CheckCircle2, Play, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SkillGap {
  id: string;
  skill_id: string;
  gap_score: number;
  rationale: string;
  skills: {
    name: string;
    category: string;
  };
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  progress: number;
  status: string;
  skill_gap: SkillGap;
  courses: Course[];
}

interface Course {
  id: string;
  title: string;
  provider: string;
  url: string;
  estimated_hours: number;
  completed: boolean;
  time_spent_minutes?: number;
}

export const LearningPaths = () => {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
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

      // Load skill gaps
      const { data: gaps } = await supabase
        .from("skill_gaps")
        .select("*, skills(*)")
        .eq("profile_id", profile.id)
        .order("gap_score", { ascending: false });

      setSkillGaps(gaps || []);

      // Load learning paths with courses
      const { data: learningPaths } = await supabase
        .from("learning_paths")
        .select(`
          *,
          skill_gaps(*, skills(*)),
          learning_path_courses(*)
        `)
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      const formattedPaths = learningPaths?.map((path: any) => ({
        ...path,
        skill_gap: path.skill_gaps,
        courses: path.learning_path_courses?.map((course: any) => ({
          id: course.id,
          title: course.title,
          provider: course.provider,
          url: course.url,
          estimated_hours: course.estimated_hours,
          completed: course.completed,
          time_spent_minutes: course.time_spent_minutes || 0
        })) || []
      })) || [];

      setPaths(formattedPaths);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load learning paths");
    } finally {
      setLoading(false);
    }
  };

  const createLearningPath = async (skillGap: SkillGap) => {
    if (!profileId) return;

    const toastId = toast.loading("Generating personalized learning path with AI...");

    try {
      const { data: profileData } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      const { data, error } = await supabase.functions.invoke('generate-learning-path', {
        body: {
          skillGap: {
            id: skillGap.id,
            skill_name: skillGap.skills.name,
            gap_score: Math.round((skillGap.gap_score || 0) * 100),
            rationale: skillGap.rationale
          },
          profileData: {
            id: profileId,
            current_title: profileData?.current_title,
            years_experience: profileData?.years_experience,
            seniority: profileData?.seniority,
            target_titles: profileData?.target_titles
          }
        }
      });

      if (error) throw error;

      toast.success("AI-powered learning path created!", { id: toastId });
      loadData();
    } catch (error: any) {
      console.error("Error creating path:", error);
      if (error.message?.includes("Rate limit")) {
        toast.error("Rate limit exceeded. Please try again later.", { id: toastId });
      } else if (error.message?.includes("Payment required")) {
        toast.error("AI usage limit reached. Please add credits.", { id: toastId });
      } else {
        toast.error("Failed to create learning path", { id: toastId });
      }
    }
  };

  const toggleCourseCompletion = async (pathId: string, courseId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("learning_path_courses")
        .update({ 
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq("learning_path_id", pathId)
        .eq("id", courseId);

      if (error) throw error;

      // Recalculate progress
      const path = paths.find(p => p.id === pathId);
      if (path) {
        const completedCount = path.courses.filter(c => 
          c.id === courseId ? !completed : c.completed
        ).length;
        const progress = Math.round((completedCount / path.courses.length) * 100);

        await supabase
          .from("learning_paths")
          .update({ progress })
          .eq("id", pathId);
      }

      toast.success("Progress updated!");
      loadData();
    } catch (error) {
      console.error("Error updating course:", error);
      toast.error("Failed to update progress");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Skill Gaps - Create Learning Paths */}
      {skillGaps.filter(gap => !paths.some(p => p.skill_gap?.id === gap.id)).length > 0 && (
        <Card className="shadow-card border-primary/20">
          <CardHeader>
            <CardTitle>Recommended Skill Development</CardTitle>
            <CardDescription>
              Build learning paths for your skill gaps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {skillGaps
              .filter(gap => !paths.some(p => p.skill_gap?.id === gap.id))
              .slice(0, 3)
              .map((gap) => (
                <Card key={gap.id} className="bg-muted/30">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{gap.skills.name}</h4>
                        <Badge variant="secondary">{gap.skills.category}</Badge>
                        <Badge variant="outline">Gap: {Math.round((gap.gap_score || 0) * 100)}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{gap.rationale}</p>
                    </div>
                    <Button onClick={() => createLearningPath(gap)} size="sm" className="shrink-0">
                      <Play className="w-4 h-4 mr-2" />
                      Start Learning
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Active Learning Paths */}
      {paths.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No learning paths yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Create learning paths from your skill gaps to start developing your skills
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {paths.map((path) => (
            <Card key={path.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{path.title}</CardTitle>
                      <Badge variant={path.status === "completed" ? "default" : "secondary"}>
                        {path.status}
                      </Badge>
                    </div>
                    <CardDescription>{path.description}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{path.progress}%</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {path.estimated_hours}h total
                    </div>
                  </div>
                </div>
                <Progress value={path.progress} className="mt-4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <h4 className="font-semibold text-sm mb-2">Course Roadmap</h4>
                {path.courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={course.completed}
                      onCheckedChange={() => toggleCourseCompletion(path.id, course.id, course.completed)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${course.completed ? "line-through text-muted-foreground" : ""}`}>
                          {course.title}
                        </p>
                        {course.completed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{course.provider}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {course.estimated_hours}h
                        </span>
                      </div>
                    </div>
                    {course.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(course.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
