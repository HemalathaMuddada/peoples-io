import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  AlertCircle,
  Calendar,
  Sparkles
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { FollowUpEmailGenerator } from "./FollowUpEmailGenerator";

interface FollowUpSuggestion {
  id: string;
  application_id: string;
  suggested_date: string;
  follow_up_type: string;
  priority: string;
  reason: string;
  status: string;
  job_applications: {
    company: string;
    job_title: string;
  };
}

export const FollowUpCenter = () => {
  const [suggestions, setSuggestions] = useState<FollowUpSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<FollowUpSuggestion | null>(null);
  const [showEmailGenerator, setShowEmailGenerator] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from("follow_up_suggestions")
        .select(`
          *,
          job_applications(company, job_title)
        `)
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('suggested_date', { ascending: true });

      setSuggestions(data || []);
    } catch (error) {
      console.error("Error loading suggestions:", error);
      toast.error("Failed to load follow-up suggestions");
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-follow-up-suggestions');

      if (error) throw error;

      toast.success(`Generated ${data.count} follow-up suggestions!`);
      loadSuggestions();
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast.error("Failed to generate suggestions");
    } finally {
      setGenerating(false);
    }
  };

  const updateSuggestionStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("follow_up_suggestions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      setSuggestions(prev => prev.filter(s => s.id !== id));
      toast.success(`Follow-up marked as ${status}`);
    } catch (error) {
      console.error("Error updating suggestion:", error);
      toast.error("Failed to update suggestion");
    }
  };

  const openEmailGenerator = (suggestion: FollowUpSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowEmailGenerator(true);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'high':
        return <Bell className="w-4 h-4 text-warning" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-primary" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-warning">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      post_application: "Application Follow-up",
      post_interview: "Interview Follow-up",
      post_rejection: "Networking Follow-up",
      check_in: "General Check-in"
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showEmailGenerator && selectedSuggestion) {
    return (
      <FollowUpEmailGenerator
        applicationId={selectedSuggestion.application_id}
        suggestionId={selectedSuggestion.id}
        onBack={() => {
          setShowEmailGenerator(false);
          setSelectedSuggestion(null);
          loadSuggestions();
        }}
        onComplete={() => {
          updateSuggestionStatus(selectedSuggestion.id, 'completed');
          setShowEmailGenerator(false);
          setSelectedSuggestion(null);
        }}
      />
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Follow-up Center
            </CardTitle>
            <CardDescription>
              Smart suggestions for when to follow up on your applications
            </CardDescription>
          </div>
          <Button
            onClick={generateSuggestions}
            disabled={generating}
            variant="outline"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No follow-ups needed right now</p>
            <p className="text-sm text-muted-foreground">
              Click "Generate Suggestions" to analyze your applications
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getPriorityIcon(suggestion.priority)}
                        <h4 className="font-semibold">
                          {suggestion.job_applications.job_title} at {suggestion.job_applications.company}
                        </h4>
                        {getPriorityBadge(suggestion.priority)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDistanceToNow(new Date(suggestion.suggested_date), { addSuffix: true })}
                        </span>
                        <Badge variant="outline">{getTypeLabel(suggestion.follow_up_type)}</Badge>
                      </div>
                      <p className="text-sm">{suggestion.reason}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openEmailGenerator(suggestion)}
                      className="gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Generate Email
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateSuggestionStatus(suggestion.id, 'completed')}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Done
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateSuggestionStatus(suggestion.id, 'dismissed')}
                      className="gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
