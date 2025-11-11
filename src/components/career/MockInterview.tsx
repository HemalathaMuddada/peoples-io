import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Play, Loader2, CheckCircle2, TrendingUp, Award } from "lucide-react";
import { toast } from "sonner";

interface MockInterview {
  id: string;
  job_title: string;
  difficulty: string;
  questions: any;
  answers: any;
  feedback: any;
  score: number;
  status: string;
  created_at: string;
  completed_at: string;
}

export const MockInterview = () => {
  const [interviews, setInterviews] = useState<MockInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [activeInterview, setActiveInterview] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<any[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  
  const [formData, setFormData] = useState({
    jobTitle: "",
    difficulty: "medium",
    resumeId: ""
  });
  const [resumes, setResumes] = useState<any[]>([]);

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

      const { data: interviewData } = await supabase
        .from("mock_interviews")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      setInterviews(interviewData || []);

      const { data: resumeData } = await supabase
        .from("resumes")
        .select("id, file_name")
        .eq("user_id", user.id);

      setResumes(resumeData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    if (!formData.jobTitle) {
      toast.error("Please enter a job title");
      return;
    }

    try {
      setGenerating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-mock-interview`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate interview");
      }

      const result = await response.json();
      
      setActiveInterview({
        id: result.interviewId,
        questions: result.questions
      });
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setStartDialogOpen(false);
      toast.success("Interview started! Good luck!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to start interview");
    } finally {
      setGenerating(false);
    }
  };

  const saveAnswer = () => {
    if (!currentAnswer.trim()) {
      toast.error("Please provide an answer");
      return;
    }

    const newAnswers = [...answers, { 
      questionIndex: currentQuestionIndex, 
      answer: currentAnswer 
    }];
    setAnswers(newAnswers);
    setCurrentAnswer("");

    if (currentQuestionIndex < activeInterview.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      toast.success("Answer saved!");
    } else {
      submitInterview(newAnswers);
    }
  };

  const submitInterview = async (finalAnswers: any[]) => {
    try {
      setEvaluating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-mock-interview`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            interviewId: activeInterview.id,
            answers: finalAnswers
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to evaluate interview");
      }

      toast.success("Interview completed and evaluated!");
      setActiveInterview(null);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to evaluate interview");
    } finally {
      setEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Active Interview View
  if (activeInterview) {
    const questions = activeInterview.questions as any[];
    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mock Interview in Progress</CardTitle>
              <CardDescription>
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg">
              {currentQuestion.category}
            </Badge>
          </div>
          <Progress value={progress} className="mt-4" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              {currentQuestion.question}
            </h3>
            <div className="flex gap-2 mt-3">
              <Badge variant="outline">{currentQuestion.difficulty}</Badge>
              <Badge variant="outline">~{currentQuestion.expectedDuration} min</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Your Answer</Label>
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={10}
              disabled={evaluating}
            />
          </div>

          <div className="flex gap-3">
            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={saveAnswer} className="w-full" disabled={evaluating}>
                Save & Next Question
              </Button>
            ) : (
              <Button onClick={saveAnswer} className="w-full" disabled={evaluating}>
                {evaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit Interview
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Start New Interview */}
      <Card className="shadow-card border-primary/20">
        <CardHeader>
          <CardTitle>Practice Your Interview Skills</CardTitle>
          <CardDescription>
            Get AI-generated interview questions tailored to your target role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
            <Button onClick={() => setStartDialogOpen(true)} size="lg" className="w-full">
              <Play className="w-4 h-4 mr-2" />
              Start New Mock Interview
            </Button>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure Mock Interview</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Job Title</Label>
                  <Input
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Difficulty Level</Label>
                  <Select 
                    value={formData.difficulty} 
                    onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy - Entry Level</SelectItem>
                      <SelectItem value="medium">Medium - Intermediate</SelectItem>
                      <SelectItem value="hard">Hard - Senior Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {resumes.length > 0 && (
                  <div>
                    <Label>Resume (Optional)</Label>
                    <Select 
                      value={formData.resumeId} 
                      onValueChange={(value) => setFormData({ ...formData, resumeId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a resume" />
                      </SelectTrigger>
                      <SelectContent>
                        {resumes.map((resume) => (
                          <SelectItem key={resume.id} value={resume.id}>
                            {resume.file_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button 
                  onClick={startInterview} 
                  className="w-full" 
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    "Start Interview"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Past Interviews */}
      {interviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Interview History</h3>
          {interviews.map((interview) => (
            <Card key={interview.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{interview.job_title}</CardTitle>
                    <CardDescription>
                      {new Date(interview.created_at).toLocaleDateString()} • {interview.difficulty} difficulty
                    </CardDescription>
                  </div>
                  {interview.status === "completed" && interview.score && (
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        <span className={`text-2xl font-bold ${getScoreColor(interview.score)}`}>
                          {interview.score}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Overall Score</p>
                    </div>
                  )}
                </div>
              </CardHeader>
              {interview.status === "completed" && interview.feedback && (
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium mb-2">Summary</p>
                      <p className="text-sm text-muted-foreground">{interview.feedback.summary}</p>
                    </div>
                    {interview.feedback.recommendations && (
                      <div>
                        <p className="text-sm font-medium mb-2">Key Recommendations</p>
                        <ul className="space-y-1">
                          {interview.feedback.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                              <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
