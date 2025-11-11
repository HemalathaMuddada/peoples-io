import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface InsightSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitSuccess: () => void;
}

export const InsightSubmissionDialog = ({ open, onOpenChange, onSubmitSuccess }: InsightSubmissionDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    insight_type: "interview_process",
    title: "",
    content: "",
    source_type: "candidate"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to submit insights");
        return;
      }

      const { error } = await supabase
        .from("company_insights")
        .insert({
          ...formData,
          submitted_by: user.id
        });

      if (error) throw error;

      toast.success("Insight submitted successfully!");
      setFormData({
        company_name: "",
        insight_type: "interview_process",
        title: "",
        content: "",
        source_type: "candidate"
      });
      onOpenChange(false);
      onSubmitSuccess();
    } catch (error) {
      console.error("Error submitting insight:", error);
      toast.error("Failed to submit insight");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Company Insight</DialogTitle>
          <DialogDescription>
            Help others by sharing your knowledge about companies
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="e.g., Google"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insight_type">Insight Type *</Label>
            <Select
              value={formData.insight_type}
              onValueChange={(value) => setFormData({ ...formData, insight_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interview_process">Interview Process</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
                <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                <SelectItem value="culture">Culture</SelectItem>
                <SelectItem value="layoffs">Layoffs</SelectItem>
                <SelectItem value="hiring_freeze">Hiring Freeze</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief summary of your insight"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Details *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share detailed information..."
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_type">Your Perspective</Label>
            <Select
              value={formData.source_type}
              onValueChange={(value) => setFormData({ ...formData, source_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="candidate">Candidate</SelectItem>
                <SelectItem value="employee">Current/Former Employee</SelectItem>
                <SelectItem value="public">Public Information</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Insight"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
