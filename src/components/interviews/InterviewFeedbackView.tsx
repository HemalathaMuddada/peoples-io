import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, MessageSquare, Brain, Users } from "lucide-react";
import { format } from "date-fns";

interface InterviewFeedback {
  id: string;
  rating_technical: number | null;
  rating_communication: number | null;
  rating_culture_fit: number | null;
  rating_problem_solving: number | null;
  rating_overall: number;
  strengths: string | null;
  areas_for_improvement: string | null;
  additional_notes: string | null;
  recommendation: string;
  created_at: string;
}

interface InterviewFeedbackViewProps {
  feedback: InterviewFeedback;
}

const RatingDisplay = ({
  label,
  rating,
  icon: Icon,
}: {
  label: string;
  rating: number | null;
  icon: React.ElementType;
}) => {
  if (!rating) return null;

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{label}:</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const getRecommendationBadge = (recommendation: string) => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    strong_hire: { variant: "default", label: "Strong Hire" },
    hire: { variant: "secondary", label: "Hire" },
    maybe: { variant: "outline", label: "Maybe" },
    no_hire: { variant: "destructive", label: "No Hire" },
  };

  const config = variants[recommendation] || variants.maybe;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export function InterviewFeedbackView({ feedback }: InterviewFeedbackViewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Interview Feedback
              {getRecommendationBadge(feedback.recommendation)}
            </CardTitle>
            <CardDescription>
              Submitted on {format(new Date(feedback.created_at), "PPP 'at' p")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Rating */}
        <div className="space-y-2">
          <h4 className="font-semibold">Overall Rating</h4>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-6 w-6 ${
                  star <= feedback.rating_overall
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Individual Ratings */}
        {(feedback.rating_technical ||
          feedback.rating_communication ||
          feedback.rating_culture_fit ||
          feedback.rating_problem_solving) && (
          <div className="space-y-3">
            <h4 className="font-semibold">Detailed Ratings</h4>
            <div className="space-y-2">
              <RatingDisplay
                label="Technical Skills"
                rating={feedback.rating_technical}
                icon={TrendingUp}
              />
              <RatingDisplay
                label="Communication"
                rating={feedback.rating_communication}
                icon={MessageSquare}
              />
              <RatingDisplay
                label="Culture Fit"
                rating={feedback.rating_culture_fit}
                icon={Users}
              />
              <RatingDisplay
                label="Problem Solving"
                rating={feedback.rating_problem_solving}
                icon={Brain}
              />
            </div>
          </div>
        )}

        {/* Text Feedback */}
        {feedback.strengths && (
          <div className="space-y-2">
            <h4 className="font-semibold text-green-600">Key Strengths</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {feedback.strengths}
            </p>
          </div>
        )}

        {feedback.areas_for_improvement && (
          <div className="space-y-2">
            <h4 className="font-semibold text-orange-600">Areas for Improvement</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {feedback.areas_for_improvement}
            </p>
          </div>
        )}

        {feedback.additional_notes && (
          <div className="space-y-2">
            <h4 className="font-semibold">Additional Notes</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {feedback.additional_notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}