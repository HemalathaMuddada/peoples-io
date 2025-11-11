import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Circle, Clock } from "lucide-react";
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

interface Milestone {
  id: string;
  milestone_title: string;
  milestone_description: string;
  status: string;
  target_date: string;
  completed_at: string;
}

interface MentorshipProgressProps {
  mentorshipRequestId: string;
}

export function MentorshipProgress({ mentorshipRequestId }: MentorshipProgressProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchMilestones();
  }, [mentorshipRequestId]);

  const fetchMilestones = async () => {
    const { data, error } = await supabase
      .from("mentorship_progress")
      .select("*")
      .eq("mentorship_request_id", mentorshipRequestId)
      .order("target_date");

    if (error) {
      toast({ title: "Error loading progress", variant: "destructive" });
    } else {
      setMilestones(data || []);
    }
    setLoading(false);
  };

  const handleAddMilestone = async () => {
    if (!title) {
      toast({ title: "Please enter a title", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("mentorship_progress").insert({
      mentorship_request_id: mentorshipRequestId,
      milestone_title: title,
      milestone_description: description,
      target_date: targetDate || null,
    });

    if (error) {
      toast({ title: "Error adding milestone", variant: "destructive" });
    } else {
      toast({ title: "Milestone added!" });
      setOpen(false);
      setTitle("");
      setDescription("");
      setTargetDate("");
      fetchMilestones();
    }
  };

  const handleToggleStatus = async (milestoneId: string, currentStatus: string) => {
    const newStatus =
      currentStatus === "completed"
        ? "in_progress"
        : currentStatus === "in_progress"
        ? "not_started"
        : "completed";

    const { error } = await supabase
      .from("mentorship_progress")
      .update({
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", milestoneId);

    if (error) {
      toast({ title: "Error updating status", variant: "destructive" });
    } else {
      fetchMilestones();
    }
  };

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const progressPercentage = milestones.length > 0
    ? (completedCount / milestones.length) * 100
    : 0;

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              Progress Tracker
            </div>
            <p className="text-sm text-muted-foreground font-normal mt-1">
              {completedCount} of {milestones.length} milestones completed
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Milestone</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Milestone title"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Target Date</Label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddMilestone} className="w-full">
                  Add Milestone
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <Progress value={progressPercentage} className="mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-start gap-3 border rounded-lg p-3 hover:bg-muted/50 transition-colors"
            >
              <button
                onClick={() => handleToggleStatus(milestone.id, milestone.status)}
                className="mt-1"
              >
                {milestone.status === "completed" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : milestone.status === "in_progress" ? (
                  <Clock className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1">
                <h4 className={`font-semibold ${
                  milestone.status === "completed" ? "line-through text-muted-foreground" : ""
                }`}>
                  {milestone.milestone_title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {milestone.milestone_description}
                </p>
                {milestone.target_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Target: {new Date(milestone.target_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
          {milestones.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No milestones yet. Add your first milestone to track progress!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
