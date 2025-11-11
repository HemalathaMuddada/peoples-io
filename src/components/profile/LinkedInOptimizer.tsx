import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Sparkles, 
  Loader2, 
  TrendingUp, 
  CheckCircle2, 
  Lightbulb,
  Target,
  Award
} from "lucide-react";

interface Suggestions {
  overall_score: number;
  headline_suggestions: {
    current_issues: string[];
    improvements: string[];
    examples: string[];
  };
  skills_suggestions: {
    missing_key_skills: string[];
    trending_skills: string[];
    skill_prioritization: string[];
  };
  summary_suggestions: {
    structure_tips: string[];
    keyword_recommendations: string[];
    tone_guidance: string;
  };
  visibility_tips: string[];
  quick_wins: string[];
}

export const LinkedInOptimizer = () => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-linkedin-profile');

      if (error) throw error;

      setSuggestions(data);
      toast.success("LinkedIn profile analysis complete!");
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error("Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              LinkedIn Profile Optimizer
            </CardTitle>
            <CardDescription>
              Get AI-powered suggestions to improve your LinkedIn profile
            </CardDescription>
          </div>
          <Button
            onClick={generateSuggestions}
            disabled={loading}
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Profile
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {suggestions && (
        <CardContent className="space-y-6">
          {/* Overall Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <span className="font-semibold">Overall Profile Score</span>
              </div>
              <span className={`text-2xl font-bold ${getScoreColor(suggestions.overall_score)}`}>
                {suggestions.overall_score}/100
              </span>
            </div>
            <Progress value={suggestions.overall_score} className="h-2" />
          </div>

          <Tabs defaultValue="quick-wins" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="quick-wins">Quick Wins</TabsTrigger>
              <TabsTrigger value="headline">Headline</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="visibility">Visibility</TabsTrigger>
            </TabsList>

            {/* Quick Wins */}
            <TabsContent value="quick-wins" className="space-y-4">
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  These are high-impact changes you can make right now
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                {suggestions.quick_wins.map((win, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                    <p className="text-sm">{win}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Headline Suggestions */}
            <TabsContent value="headline" className="space-y-4">
              {suggestions.headline_suggestions.current_issues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Current Issues
                  </h4>
                  {suggestions.headline_suggestions.current_issues.map((issue, index) => (
                    <div key={index} className="p-3 rounded-lg bg-destructive/10 text-sm">
                      {issue}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Improvements
                </h4>
                {suggestions.headline_suggestions.improvements.map((improvement, index) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/50 text-sm">
                    {improvement}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Examples</h4>
                {suggestions.headline_suggestions.examples.map((example, index) => (
                  <div key={index} className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm font-medium">
                    {example}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Skills Suggestions */}
            <TabsContent value="skills" className="space-y-4">
              {suggestions.skills_suggestions.missing_key_skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Missing Key Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.skills_suggestions.missing_key_skills.map((skill, index) => (
                      <Badge key={index} variant="destructive">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {suggestions.skills_suggestions.trending_skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Trending Skills in Your Field</h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.skills_suggestions.trending_skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-semibold">Skill Prioritization</h4>
                {suggestions.skills_suggestions.skill_prioritization.map((priority, index) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/50 text-sm">
                    {priority}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Visibility Tips */}
            <TabsContent value="visibility" className="space-y-4">
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Increase your profile visibility to recruiters and potential connections
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                {suggestions.visibility_tips.map((tip, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">{tip}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
};
