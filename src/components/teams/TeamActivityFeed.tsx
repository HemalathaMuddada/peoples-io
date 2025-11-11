import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  UserPlus,
  UserMinus,
  Shield,
  Mail,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  team_id: string;
  user_id: string;
  action_type: string;
  target_user_id: string | null;
  metadata: any;
  created_at: string;
  actor: {
    full_name: string;
    email: string;
  };
  target?: {
    full_name: string;
    email: string;
  };
}

interface TeamActivityFeedProps {
  teamId: string;
}

const actionIcons = {
  member_added: UserPlus,
  member_removed: UserMinus,
  role_changed: Shield,
  invitation_sent: Mail,
};

const actionColors = {
  member_added: "bg-green-500/10 text-green-500",
  member_removed: "bg-red-500/10 text-red-500",
  role_changed: "bg-blue-500/10 text-blue-500",
  invitation_sent: "bg-purple-500/10 text-purple-500",
};

export function TeamActivityFeed({ teamId }: TeamActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`team-activity-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_activity_log",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      // Fetch activity logs
      const { data: logs, error: logsError } = await supabase
        .from("team_activity_log")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      // Get unique user IDs
      const userIds = new Set<string>();
      logs?.forEach((log) => {
        userIds.add(log.user_id);
        if (log.target_user_id) userIds.add(log.target_user_id);
      });

      // Fetch profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", Array.from(userIds));

      if (profilesError) throw profilesError;

      // Map profiles to logs
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      
      const enrichedLogs = logs?.map((log) => ({
        ...log,
        actor: profileMap.get(log.user_id) || { full_name: "", email: "" },
        target: log.target_user_id
          ? profileMap.get(log.target_user_id)
          : undefined,
      })) || [];

      setActivities(enrichedLogs as ActivityLog[]);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityMessage = (activity: ActivityLog) => {
    const actorName = activity.actor?.full_name || activity.actor?.email || "Someone";
    const targetName = activity.target?.full_name || activity.target?.email;

    switch (activity.action_type) {
      case "member_added":
        return (
          <>
            <span className="font-medium">{actorName}</span> added{" "}
            <span className="font-medium">{targetName}</span> as{" "}
            <Badge variant="outline" className="mx-1">
              {activity.metadata?.role}
            </Badge>
          </>
        );
      case "member_removed":
        return (
          <>
            <span className="font-medium">{actorName}</span> removed{" "}
            <span className="font-medium">{targetName}</span>
          </>
        );
      case "role_changed":
        return (
          <>
            <span className="font-medium">{actorName}</span> changed{" "}
            <span className="font-medium">{targetName}</span>'s role from{" "}
            <Badge variant="outline" className="mx-1">
              {activity.metadata?.old_role}
            </Badge>{" "}
            to{" "}
            <Badge variant="outline" className="mx-1">
              {activity.metadata?.new_role}
            </Badge>
          </>
        );
      case "invitation_sent":
        return (
          <>
            <span className="font-medium">{actorName}</span> invited{" "}
            <span className="font-medium">{activity.metadata?.email}</span> as{" "}
            <Badge variant="outline" className="mx-1">
              {activity.metadata?.role}
            </Badge>
          </>
        );
      default:
        return (
          <>
            <span className="font-medium">{actorName}</span> performed an action
          </>
        );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading activities...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">No activity yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => {
                const Icon = actionIcons[activity.action_type as keyof typeof actionIcons] || Clock;
                const colorClass = actionColors[activity.action_type as keyof typeof actionColors] || "";

                return (
                  <div key={activity.id} className="flex gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm leading-relaxed">
                        {getActivityMessage(activity)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
