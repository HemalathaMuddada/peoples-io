import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Search, 
  ThumbsUp, 
  Clock, 
  User, 
  CheckCircle,
  Loader2,
  Plus,
  TrendingUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { InsightSubmissionDialog } from "./InsightSubmissionDialog";

interface Insight {
  id: string;
  company_name: string;
  insight_type: string;
  title: string;
  content: string;
  source_type: string;
  verified: boolean;
  helpful_count: number;
  created_at: string;
  metadata: any;
}

export const CompanyInsights = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCompany, setSearchCompany] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [searchCompany, selectedType]);

  const loadInsights = async () => {
    try {
      let query = supabase
        .from("company_insights")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (searchCompany) {
        query = query.ilike("company_name", `%${searchCompany}%`);
      }

      if (selectedType !== "all") {
        query = query.eq("insight_type", selectedType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error("Error loading insights:", error);
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  };

  const voteHelpful = async (insightId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to vote");
        return;
      }

      const { error } = await supabase
        .from("company_insight_votes")
        .upsert({
          insight_id: insightId,
          user_id: user.id,
          helpful: true
        });

      if (error) throw error;

      // Update helpful count
      const insight = insights.find(i => i.id === insightId);
      if (insight) {
        await supabase
          .from("company_insights")
          .update({ helpful_count: insight.helpful_count + 1 })
          .eq("id", insightId);
        
        loadInsights();
      }

      toast.success("Thanks for your feedback!");
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to vote");
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      interview_process: "Interview Process",
      timeline: "Timeline",
      hiring_manager: "Hiring Manager",
      culture: "Culture",
      layoffs: "Layoffs",
      hiring_freeze: "Hiring Freeze"
    };
    return labels[type] || type;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      interview_process: "bg-blue-500/10 text-blue-700",
      timeline: "bg-green-500/10 text-green-700",
      hiring_manager: "bg-purple-500/10 text-purple-700",
      culture: "bg-orange-500/10 text-orange-700",
      layoffs: "bg-red-500/10 text-red-700",
      hiring_freeze: "bg-yellow-500/10 text-yellow-700"
    };
    return colors[type] || "bg-muted";
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
              <CardTitle>Company Inside Scoops</CardTitle>
              <CardDescription>
                Real insights from candidates and employees about interview processes, timelines, and more
              </CardDescription>
            </div>
            <Button onClick={() => setShowSubmitDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Share Insight
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by company name..."
                  value={searchCompany}
                  onChange={(e) => setSearchCompany(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="interview_process">Interview Process</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
                <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                <SelectItem value="culture">Culture</SelectItem>
                <SelectItem value="layoffs">Layoffs</SelectItem>
                <SelectItem value="hiring_freeze">Hiring Freeze</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {insights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No insights found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to share an insight!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id} className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{insight.company_name}</h4>
                      {insight.verified && (
                        <CheckCircle className="w-4 h-4 text-success" />
                      )}
                      <Badge className={getTypeBadge(insight.insight_type)}>
                        {getTypeLabel(insight.insight_type)}
                      </Badge>
                    </div>
                    <h5 className="font-medium mb-2">{insight.title}</h5>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {insight.content}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground mt-4 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {insight.source_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => voteHelpful(insight.id)}
                    className="gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Helpful ({insight.helpful_count})
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InsightSubmissionDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        onSubmitSuccess={loadInsights}
      />
    </div>
  );
};
