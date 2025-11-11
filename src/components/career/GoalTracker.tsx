import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Target, TrendingUp, Calendar, CheckCircle2, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";

interface CareerGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  target_date: string;
  status: string;
  progress: number;
  milestones: any;
  created_at: string;
}

const CATEGORIES = [
  { value: "skill", label: "Skill Development", icon: "🎯" },
  { value: "role", label: "Role Transition", icon: "🚀" },
  { value: "salary", label: "Salary Target", icon: "💰" },
  { value: "education", label: "Education", icon: "🎓" },
  { value: "project", label: "Project", icon: "💡" },
];

export const GoalTracker = () => {
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "skill",
    target_date: "",
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
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

      const { data } = await supabase
        .from("career_goals")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      setGoals(data || []);
    } catch (error) {
      console.error("Error loading goals:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async () => {
    if (!profileId || !formData.title) return;

    try {
      const { error } = await supabase
        .from("career_goals")
        .insert({
          profile_id: profileId,
          ...formData,
        });

      if (error) throw error;

      toast.success("Goal created!");
      setDialogOpen(false);
      setFormData({ title: "", description: "", category: "skill", target_date: "" });
      loadGoals();
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Failed to create goal");
    }
  };

  const updateGoalProgress = async (goalId: string, progress: number) => {
    try {
      const updates: any = { progress };
      if (progress >= 100) {
        updates.status = "completed";
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("career_goals")
        .update(updates)
        .eq("id", goalId);

      if (error) throw error;

      toast.success("Progress updated!");
      loadGoals();
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    }
  };

  const getCategoryIcon = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.icon || "🎯";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20";
      case "in_progress": return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
      case "abandoned": return "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDaysUntilTarget = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeGoals = goals.filter(g => g.status === "in_progress");
  const completedGoals = goals.filter(g => g.status === "completed");

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Goals</p>
                <p className="text-3xl font-bold">{activeGoals.length}</p>
              </div>
              <Target className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold">{completedGoals.length}</p>
              </div>
              <Trophy className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-3xl font-bold">
                  {activeGoals.length > 0
                    ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Goal Button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add New Goal
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Career Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Goal Title</Label>
              <Input
                placeholder="e.g., Learn React Advanced Patterns"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your goal..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Date</Label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
              />
            </div>
            <Button onClick={createGoal} className="w-full" disabled={!formData.title}>
              Create Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Start tracking your career goals to stay motivated and organized
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => {
            const daysUntil = goal.target_date ? getDaysUntilTarget(goal.target_date) : null;
            return (
              <Card key={goal.id} className="shadow-card">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl">{getCategoryIcon(goal.category)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{goal.title}</CardTitle>
                          <Badge className={getStatusColor(goal.status)}>
                            {goal.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {goal.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {goal.description && (
                          <CardDescription>{goal.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    {goal.target_date && (
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(goal.target_date).toLocaleDateString()}
                        </div>
                        {daysUntil !== null && daysUntil >= 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {daysUntil} days left
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress</span>
                      <span className="text-sm font-bold text-primary">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} />
                  </div>
                  {goal.status === "in_progress" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateGoalProgress(goal.id, Math.min(100, goal.progress + 10))}
                      >
                        +10%
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateGoalProgress(goal.id, Math.min(100, goal.progress + 25))}
                      >
                        +25%
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateGoalProgress(goal.id, 100)}
                        className="ml-auto"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
