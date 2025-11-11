import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InterviewFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
  candidateName: string;
  jobTitle: string;
  onSuccess?: () => void;
}

const RatingField = ({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void;
}) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-6 w-6 ${
                rating <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export function InterviewFeedbackDialog({
  open,
  onOpenChange,
  interviewId,
  candidateName,
  jobTitle,
  onSuccess,
}: InterviewFeedbackDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    ratingTechnical: 0,
    ratingCommunication: 0,
    ratingCultureFit: 0,
    ratingProblemSolving: 0,
    ratingOverall: 0,
    strengths: '',
    areasForImprovement: '',
    additionalNotes: '',
    recommendation: 'maybe',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (feedback.ratingOverall === 0) {
      toast.error('Please provide an overall rating');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase as any)
        .from('interview_feedback')
        .insert({
          interview_id: interviewId,
          submitted_by: user.id,
          rating_technical: feedback.ratingTechnical || null,
          rating_communication: feedback.ratingCommunication || null,
          rating_culture_fit: feedback.ratingCultureFit || null,
          rating_problem_solving: feedback.ratingProblemSolving || null,
          rating_overall: feedback.ratingOverall,
          strengths: feedback.strengths || null,
          areas_for_improvement: feedback.areasForImprovement || null,
          additional_notes: feedback.additionalNotes || null,
          recommendation: feedback.recommendation,
        });

      if (error) throw error;

      // Update interview status to completed
      await (supabase as any)
        .from('interviews')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', interviewId);

      toast.success('Feedback submitted successfully');
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setFeedback({
        ratingTechnical: 0,
        ratingCommunication: 0,
        ratingCultureFit: 0,
        ratingProblemSolving: 0,
        ratingOverall: 0,
        strengths: '',
        areasForImprovement: '',
        additionalNotes: '',
        recommendation: 'maybe',
      });
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interview Feedback</DialogTitle>
          <DialogDescription>
            Provide feedback for {candidateName} - {jobTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ratings Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Performance Ratings</h3>
            
            <RatingField
              label="Overall Rating *"
              value={feedback.ratingOverall}
              onChange={(val) => setFeedback({ ...feedback, ratingOverall: val })}
            />

            <RatingField
              label="Technical Skills"
              value={feedback.ratingTechnical}
              onChange={(val) => setFeedback({ ...feedback, ratingTechnical: val })}
            />

            <RatingField
              label="Communication"
              value={feedback.ratingCommunication}
              onChange={(val) => setFeedback({ ...feedback, ratingCommunication: val })}
            />

            <RatingField
              label="Culture Fit"
              value={feedback.ratingCultureFit}
              onChange={(val) => setFeedback({ ...feedback, ratingCultureFit: val })}
            />

            <RatingField
              label="Problem Solving"
              value={feedback.ratingProblemSolving}
              onChange={(val) => setFeedback({ ...feedback, ratingProblemSolving: val })}
            />
          </div>

          {/* Recommendation */}
          <div className="space-y-2">
            <Label>Hiring Recommendation *</Label>
            <RadioGroup
              value={feedback.recommendation}
              onValueChange={(value) => setFeedback({ ...feedback, recommendation: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="strong_hire" id="strong_hire" />
                <Label htmlFor="strong_hire" className="font-normal cursor-pointer">
                  Strong Hire
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hire" id="hire" />
                <Label htmlFor="hire" className="font-normal cursor-pointer">
                  Hire
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="maybe" id="maybe" />
                <Label htmlFor="maybe" className="font-normal cursor-pointer">
                  Maybe
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no_hire" id="no_hire" />
                <Label htmlFor="no_hire" className="font-normal cursor-pointer">
                  No Hire
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Text Feedback */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="strengths">Key Strengths</Label>
              <Textarea
                id="strengths"
                placeholder="What were the candidate's main strengths?"
                value={feedback.strengths}
                onChange={(e) => setFeedback({ ...feedback, strengths: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="improvements">Areas for Improvement</Label>
              <Textarea
                id="improvements"
                placeholder="What areas could the candidate improve?"
                value={feedback.areasForImprovement}
                onChange={(e) => setFeedback({ ...feedback, areasForImprovement: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any other observations or comments?"
                value={feedback.additionalNotes}
                onChange={(e) => setFeedback({ ...feedback, additionalNotes: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Feedback
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}