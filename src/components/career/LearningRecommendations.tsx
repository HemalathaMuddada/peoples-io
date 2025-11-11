import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  TrendingUp, 
  Target,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  RefreshCw,
  Lightbulb
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CourseRecommendation {
  title: string;
  provider: string;
  estimated_hours: number;
}

interface LearningPathRecommendation {
  title: string;
  skill_focus: string;
  priority: "high" | "medium" | "low";
  rationale: string;
  builds_on: string[];
  estimated_hours: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  career_impact: string;
  key_outcomes: string[];
  suggested_courses: CourseRecommendation[];
}

export const LearningRecommendations = () => {
  const [recommendations, setRecommendations] = useState<LearningPathRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
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

      // Try to load cached recommendations (you could store these in a table)
      // For now, we'll generate them on demand
      setLoading(false);
    } catch (error) {
      console.error("Error loading recommendations:", error);
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    if (!profileId) return;

    setGenerating(true);
    const toastId = toast.loading("Analyzing your learning journey and generating personalized recommendations...");

    try {
      const { data, error } = await supabase.functions.invoke('generate-learning-recommendations', {
        body: { profileId }
      });

      if (error) throw error;

      if (data.recommendations) {
        setRecommendations(data.recommendations);
        toast.success("Recommendations generated!", { id: toastId });
      }
    } catch (error: any) {
      console.error("Error generating recommendations:", error);
      if (error.message?.includes("Rate limit")) {
        toast.error("Rate limit exceeded. Please try again later.", { id: toastId });
      } else if (error.message?.includes("Payment required")) {
        toast.error("AI usage limit reached. Please add credits.", { id: toastId });
      } else {
        toast.error("Failed to generate recommendations", { id: toastId });
      }
    } finally {
      setGenerating(false);
    }
  };

  const createLearningPath = async (recommendation: LearningPathRecommendation) => {
    if (!profileId) return;

    const toastId = toast.loading("Creating learning path...");

    try {
      // Find or create skill gap for this focus
      const { data: existingSkill } = await supabase
        .from('skills')
        .select('id')
        .eq('name', recommendation.skill_focus)
        .single();

      let skillGapId = null;
      if (existingSkill) {
        const { data: existingGap } = await supabase
          .from('skill_gaps')
          .select('id')
          .eq('profile_id', profileId)
          .eq('skill_id', existingSkill.id)
          .single();

        skillGapId = existingGap?.id;
      }

      // Create learning path
      const { data: newPath, error: pathError } = await supabase
        .from('learning_paths')
        .insert({
          profile_id: profileId,
          skill_gap_id: skillGapId,
          title: recommendation.title,
          description: recommendation.rationale,
          estimated_hours: recommendation.estimated_hours,
          status: 'active'
        })
        .select()
        .single();

      if (pathError) throw pathError;

      // Insert courses
      const coursesToInsert = recommendation.suggested_courses.map((course, index) => ({
        learning_path_id: newPath.id,
        title: course.title,
        provider: course.provider,
        estimated_hours: course.estimated_hours,
        difficulty: recommendation.difficulty,
        order_index: index,
        completed: false
      }));

      if (coursesToInsert.length > 0) {
        const { error: coursesError } = await supabase
          .from('learning_path_courses')
          .insert(coursesToInsert);

        if (coursesError) throw coursesError;
      }

      toast.success("Learning path created! Check the Learning tab.", { id: toastId });
      navigate('/career-development?tab=learning');
    } catch (error) {
      console.error("Error creating path:", error);
      toast.error("Failed to create learning path", { id: toastId });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'default';
      case 'intermediate': return 'secondary';
      case 'advanced': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lightbulb className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Get Personalized Learning Recommendations</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
            Our AI will analyze your completed courses, skill gaps, and career goals to recommend 
            the perfect next learning paths for you.
          </p>
          <Button 
            onClick={generateRecommendations} 
            disabled={generating}
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Recommendations
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI-Powered Learning Recommendations
              </CardTitle>
              <CardDescription className="mt-2">
                Personalized paths based on your progress, skills, and career goals
              </CardDescription>
            </div>
            <Button 
              onClick={generateRecommendations} 
              disabled={generating}
              variant="outline"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6">
        {recommendations.map((rec, index) => (
          <Card key={index} className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getPriorityColor(rec.priority) as any}>
                      {rec.priority} priority
                    </Badge>
                    <Badge variant={getDifficultyColor(rec.difficulty) as any}>
                      {rec.difficulty}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {rec.estimated_hours}h
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{rec.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Focus:</strong> {rec.skill_focus}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rationale */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Why Now?
                </h4>
                <p className="text-sm text-muted-foreground">{rec.rationale}</p>
              </div>

              {/* Builds On */}
              {rec.builds_on.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Builds On
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {rec.builds_on.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Career Impact */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="text-sm font-semibold mb-1 text-primary">Career Impact</h4>
                <p className="text-sm">{rec.career_impact}</p>
              </div>

              {/* Key Outcomes */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Key Outcomes</h4>
                <div className="space-y-2">
                  {rec.key_outcomes.map((outcome, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Courses */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Suggested Courses ({rec.suggested_courses.length})</h4>
                <div className="space-y-2">
                  {rec.suggested_courses.map((course, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{course.title}</p>
                        <p className="text-xs text-muted-foreground">{course.provider}</p>
                      </div>
                      <Badge variant="outline">
                        {course.estimated_hours}h
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => createLearningPath(rec)}
                  className="flex-1"
                >
                  Start This Path
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/career-development?tab=skills')}
                >
                  View Skills
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
