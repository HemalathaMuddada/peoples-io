import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, ArrowRight, UserPlus, Calendar, MessageSquare, Clock, Search, Filter } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface TimelineActivity {
  activity_type: string;
  id: string;
  user_id?: string;
  application_id?: string;
  recipient_email?: string;
  metadata: any;
  created_at: string;
}

interface ActivityTimelineProps {
  applicationId?: string;
  candidateEmail?: string;
  limit?: number;
}

export function ActivityTimeline({ applicationId, candidateEmail, limit = 50 }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, [applicationId, candidateEmail]);

  useEffect(() => {
    filterActivities();
  }, [activities, searchTerm, filterType]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("recruiter_activity_timeline")
        .select("*")
        .order("created_at", { ascending: false });

      if (applicationId) {
        query = query.eq("application_id", applicationId);
      }

      if (candidateEmail) {
        query = query.eq("recipient_email", candidateEmail);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = activities;

    if (filterType !== "all") {
      filtered = filtered.filter((a) => a.activity_type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter((a) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          a.activity_type.toLowerCase().includes(searchLower) ||
          a.recipient_email?.toLowerCase().includes(searchLower) ||
          JSON.stringify(a.metadata).toLowerCase().includes(searchLower)
        );
      });
    }

    setFilteredActivities(filtered);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "communication":
        return <Mail className="h-4 w-4" />;
      case "stage_change":
        return <ArrowRight className="h-4 w-4" />;
      case "application_created":
        return <UserPlus className="h-4 w-4" />;
      case "interview_scheduled":
        return <Calendar className="h-4 w-4" />;
      case "interview_feedback":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "communication":
        return "bg-blue-500";
      case "stage_change":
        return "bg-purple-500";
      case "application_created":
        return "bg-green-500";
      case "interview_scheduled":
        return "bg-orange-500";
      case "interview_feedback":
        return "bg-pink-500";
      default:
        return "bg-gray-500";
    }
  };

  const getActivityTitle = (activity: TimelineActivity) => {
    switch (activity.activity_type) {
      case "communication":
        return activity.metadata.template_name || "Email Sent";
      case "stage_change":
        return `Moved from ${activity.metadata.from_stage} to ${activity.metadata.to_stage}`;
      case "application_created":
        return `Applied for ${activity.metadata.job_title}`;
      case "interview_scheduled":
        return `${activity.metadata.interview_type} Interview Scheduled`;
      case "interview_feedback":
        return `Interview Feedback Submitted`;
      default:
        return "Activity";
    }
  };

  const getActivityDescription = (activity: TimelineActivity) => {
    switch (activity.activity_type) {
      case "communication":
        return (
          <div className="space-y-1">
            <p className="text-sm">To: {activity.recipient_email}</p>
            <p className="text-sm text-muted-foreground">Subject: {activity.metadata.subject}</p>
          </div>
        );
      case "stage_change":
        const durationMinutes = activity.metadata.duration ? Math.floor(activity.metadata.duration / 60) : null;
        return (
          <div className="text-sm text-muted-foreground">
            {durationMinutes && (
              <span>Time in previous stage: {durationMinutes < 60 ? `${durationMinutes}min` : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`}</span>
            )}
          </div>
        );
      case "application_created":
        return (
          <div className="text-sm text-muted-foreground">
            <p>Company: {activity.metadata.company}</p>
            <p>Status: {activity.metadata.status}</p>
          </div>
        );
      case "interview_scheduled":
        return (
          <div className="space-y-1 text-sm">
            <p>Interviewer: {activity.metadata.interviewer_name}</p>
            <p>Time: {format(new Date(activity.metadata.scheduled_at), "PPp")}</p>
            <p>Location: {activity.metadata.location || "Not specified"}</p>
          </div>
        );
      case "interview_feedback":
        return (
          <div className="space-y-1 text-sm">
            <p>Overall Rating: {activity.metadata.rating_overall}/5</p>
            <p>Recommendation: {activity.metadata.recommendation}</p>
            {activity.metadata.strengths && (
              <p className="text-muted-foreground">Strengths: {activity.metadata.strengths}</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Loading activity timeline...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Activity Timeline</h2>
        <p className="text-muted-foreground">Complete audit trail of all interactions</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="communication">Communications</SelectItem>
            <SelectItem value="stage_change">Stage Changes</SelectItem>
            <SelectItem value="application_created">Applications</SelectItem>
            <SelectItem value="interview_scheduled">Interviews</SelectItem>
            <SelectItem value="interview_feedback">Feedback</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm || filterType !== "all" 
              ? "No activities match your filters"
              : "No activities yet"}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredActivities.map((activity, index) => (
              <div key={`${activity.activity_type}-${activity.id}`} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`rounded-full p-2 ${getActivityColor(activity.activity_type)} text-white`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  {index < filteredActivities.length - 1 && (
                    <div className="w-0.5 h-full bg-border mt-2" />
                  )}
                </div>

                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{getActivityTitle(activity)}</h3>
                      <Badge variant="outline" className="mt-1">
                        {activity.activity_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap ml-4">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  {getActivityDescription(activity)}
                  <div className="text-xs text-muted-foreground mt-2">
                    {format(new Date(activity.created_at), "PPp")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
