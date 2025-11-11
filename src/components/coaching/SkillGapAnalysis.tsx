import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

interface SkillAssessment {
  id: string;
  skill_name: string;
  current_level: number;
  target_level: number;
  assessment_notes: string;
  improvement_plan: string;
  next_review_date: string;
}

export function SkillGapAnalysis() {
  const [assessments, setAssessments] = useState<SkillAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [currentLevel, setCurrentLevel] = useState([5]);
  const [targetLevel, setTargetLevel] = useState([8]);
  const [notes, setNotes] = useState("");
  const [plan, setPlan] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) return;

    const { data, error } = await supabase
      .from("skill_assessments")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading assessments", variant: "destructive" });
    } else {
      setAssessments(data || []);
    }
    setLoading(false);
  };

  const handleAddAssessment = async () => {
    if (!skillName) {
      toast({ title: "Please enter a skill name", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("candidate_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) return;

    const { error } = await supabase.from("skill_assessments").insert({
      profile_id: profile.id,
      skill_name: skillName,
      current_level: currentLevel[0],
      target_level: targetLevel[0],
      assessment_notes: notes,
      improvement_plan: plan,
    });

    if (error) {
      toast({ title: "Error adding assessment", variant: "destructive" });
    } else {
      toast({ title: "Assessment added!" });
      setOpen(false);
      setSkillName("");
      setCurrentLevel([5]);
      setTargetLevel([8]);
      setNotes("");
      setPlan("");
      fetchAssessments();
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Skill Gap Analysis
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Skill Assessment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Skill Name *</Label>
                  <Input
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="e.g., React, Leadership, Python"
                  />
                </div>
                <div>
                  <Label>Current Level: {currentLevel[0]}/10</Label>
                  <Slider
                    value={currentLevel}
                    onValueChange={setCurrentLevel}
                    max={10}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Target Level: {targetLevel[0]}/10</Label>
                  <Slider
                    value={targetLevel}
                    onValueChange={setTargetLevel}
                    max={10}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>Assessment Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Current strengths and weaknesses..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Improvement Plan</Label>
                  <Textarea
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="Steps to bridge the gap..."
                    rows={2}
                  />
                </div>
                <Button onClick={handleAddAssessment} className="w-full">
                  Add Assessment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assessments.map((assessment) => {
            const gapPercentage = ((assessment.target_level - assessment.current_level) / 10) * 100;
            const progressPercentage = (assessment.current_level / assessment.target_level) * 100;

            return (
              <div key={assessment.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{assessment.skill_name}</h4>
                  <span className="text-sm text-muted-foreground">
                    {assessment.current_level}/10 → {assessment.target_level}/10
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Assessment</p>
                    <p className="mt-1">{assessment.assessment_notes || "No notes"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Improvement Plan</p>
                    <p className="mt-1">{assessment.improvement_plan || "No plan set"}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {assessments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No skill assessments yet. Work with your mentor to identify gaps!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
