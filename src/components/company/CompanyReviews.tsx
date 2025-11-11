import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Search, 
  Star,
  ThumbsUp,
  Plus,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

interface Review {
  id: string;
  company_name: string;
  job_title: string;
  employment_status: string;
  rating_overall: number;
  rating_culture: number;
  rating_compensation: number;
  rating_work_life: number;
  rating_management: number;
  rating_career_growth: number;
  pros: string;
  cons: string;
  advice_to_management: string;
  would_recommend: boolean;
  helpful_count: number;
  anonymous: boolean;
  created_at: string;
}

export const CompanyReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCompany, setSearchCompany] = useState("");

  useEffect(() => {
    loadReviews();
  }, [searchCompany]);

  const loadReviews = async () => {
    try {
      let query = supabase
        .from("company_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (searchCompany) {
        query = query.ilike("company_name", `%${searchCompany}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-warning text-warning"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Company Reviews</CardTitle>
              <CardDescription>
                Read honest reviews from current and former employees
              </CardDescription>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Write Review
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by company name..."
              value={searchCompany}
              onChange={(e) => setSearchCompany(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Star className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No reviews found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{review.company_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {review.job_title} • {review.employment_status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(review.rating_overall)}
                    <span className="font-semibold">{review.rating_overall.toFixed(1)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Culture</p>
                    <div className="flex items-center gap-1">
                      {renderStars(review.rating_culture)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Compensation</p>
                    <div className="flex items-center gap-1">
                      {renderStars(review.rating_compensation)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Work-Life Balance</p>
                    <div className="flex items-center gap-1">
                      {renderStars(review.rating_work_life)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Management</p>
                    <div className="flex items-center gap-1">
                      {renderStars(review.rating_management)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Career Growth</p>
                    <div className="flex items-center gap-1">
                      {renderStars(review.rating_career_growth)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Recommend</p>
                    <Badge variant={review.would_recommend ? "default" : "secondary"}>
                      {review.would_recommend ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>

                {review.pros && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Pros</p>
                    <p className="text-sm text-muted-foreground">{review.pros}</p>
                  </div>
                )}

                {review.cons && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Cons</p>
                    <p className="text-sm text-muted-foreground">{review.cons}</p>
                  </div>
                )}

                {review.advice_to_management && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Advice to Management</p>
                    <p className="text-sm text-muted-foreground">{review.advice_to_management}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground mt-4 pt-4 border-t">
                  <span>
                    {format(new Date(review.created_at), "MMM d, yyyy")}
                    {review.anonymous && " • Anonymous"}
                  </span>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Helpful ({review.helpful_count})
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
