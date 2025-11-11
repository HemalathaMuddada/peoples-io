import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  review_text: string;
  helpful_count: number;
  created_at: string;
  mentee: {
    full_name: string;
    avatar_url: string;
  };
}

interface CoachReviewsProps {
  coachId: string;
  canReview?: boolean;
  sessionId?: string;
}

export function CoachReviews({ coachId, canReview, sessionId }: CoachReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, [coachId]);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from("mentor_reviews")
      .select(`
        id,
        rating,
        review_text,
        helpful_count,
        created_at,
        mentee_id
      `)
      .eq("mentor_id", coachId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading reviews", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch mentee profiles separately
    const menteeIds = data?.map(r => r.mentee_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", menteeIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]));
    
    const reviewsWithProfiles = data?.map(review => ({
      ...review,
      mentee: profileMap.get(review.mentee_id) || { full_name: "Unknown", avatar_url: "" }
    })) || [];

    setReviews(reviewsWithProfiles);
    setLoading(false);
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("mentor_reviews").insert({
      mentor_id: coachId,
      mentee_id: user?.id,
      session_id: sessionId,
      rating,
      review_text: reviewText,
    });

    if (error) {
      toast({ title: "Error submitting review", variant: "destructive" });
    } else {
      toast({ title: "Review submitted successfully!" });
      setRating(0);
      setReviewText("");
      fetchReviews();
    }
    setSubmitting(false);
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  if (loading) return <div>Loading reviews...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Reviews & Ratings</span>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-primary text-primary" />
              <span className="text-2xl font-bold">{averageRating}</span>
              <span className="text-muted-foreground">({reviews.length})</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canReview && (
            <div className="border-b pb-4 space-y-4">
              <h3 className="font-semibold">Leave a Review</h3>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 cursor-pointer ${
                      star <= rating ? "fill-primary text-primary" : "text-muted-foreground"
                    }`}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
              <Textarea
                placeholder="Share your experience..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
              />
              <Button onClick={handleSubmitReview} disabled={submitting}>
                Submit Review
              </Button>
            </div>
          )}

          {reviews.map((review) => (
            <div key={review.id} className="border-b pb-4 last:border-0">
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src={review.mentee.avatar_url} />
                  <AvatarFallback>{review.mentee.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{review.mentee.full_name}</h4>
                    <div className="flex">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-2">{review.review_text}</p>
                  <Button variant="ghost" size="sm" className="mt-2">
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    Helpful ({review.helpful_count})
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
