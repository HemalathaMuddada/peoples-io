import { useEffect, useState } from "react";
import { useTeam } from "@/contexts/TeamContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Briefcase, FileText, Mail, Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Activity {
  id: string;
  type: "job" | "application" | "invitation";
  action: string;
  title: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  timestamp: string;
  metadata?: any;
}

interface TeamActivityTimelineProps {
  teamId?: string;
}

export function TeamActivityTimeline({ teamId: propTeamId }: TeamActivityTimelineProps) {
  const { selectedTeam } = useTeam();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeTeamId = propTeamId || selectedTeam?.id;
  const activeTeamName = propTeamId ? "Team" : selectedTeam?.name;

  useEffect(() => {
    if (activeTeamId) {
      fetchActivities();
    } else {
      setActivities([]);
      setFilteredActivities([]);
      setIsLoading(false);
    }
  }, [activeTeamId]);

  useEffect(() => {
    filterActivities();
  }, [activities, typeFilter, searchQuery]);

  const fetchActivities = async () => {
    if (!activeTeamId) return;

    setIsLoading(true);
    try {
      const allActivities: Activity[] = [];

      // Fetch job postings
      const { data: jobs } = await supabase
        .from("job_postings")
        .select(`
          id,
          title,
          company,
          created_at,
          created_by,
          profiles!job_postings_created_by_fkey(full_name, email)
        `)
        .eq("team_id", activeTeamId)
        .order("created_at", { ascending: false })
        .limit(50);

      jobs?.forEach((job: any) => {
        allActivities.push({
          id: job.id,
          type: "job",
          action: "posted a job",
          title: `${job.title} at ${job.company}`,
          user: {
            id: job.created_by,
            name: job.profiles?.full_name || "Unknown User",
            email: job.profiles?.email || "",
          },
          timestamp: job.created_at,
          metadata: { company: job.company },
        });
      });

      // Fetch applications
      const { data: applications } = await supabase
        .from("job_applications")
        .select(`
          id,
          job_title,
          company,
          status,
          created_at,
          profile_id,
          candidate_profiles!inner(user_id, profiles!candidate_profiles_user_id_fkey(full_name, email))
        `)
        .eq("team_id", activeTeamId)
        .order("created_at", { ascending: false })
        .limit(50);

      applications?.forEach((app: any) => {
        const profile = app.candidate_profiles?.profiles;
        allActivities.push({
          id: app.id,
          type: "application",
          action: "submitted an application",
          title: `${app.job_title} at ${app.company}`,
          user: {
            id: app.candidate_profiles?.user_id || "",
            name: profile?.full_name || "Unknown User",
            email: profile?.email || "",
          },
          timestamp: app.created_at,
          metadata: { status: app.status, company: app.company },
        });
      });

      // Fetch invitations
      const { data: invitations } = await supabase
        .from("company_invitations")
        .select(`
          id,
          email,
          role,
          created_at,
          accepted_at,
          invited_by,
          profiles!company_invitations_invited_by_fkey(full_name, email)
        `)
        .eq("team_id", activeTeamId)
        .order("created_at", { ascending: false })
        .limit(50);

      invitations?.forEach((invite: any) => {
        const action = invite.accepted_at ? "accepted invitation" : "sent invitation";
        allActivities.push({
          id: invite.id,
          type: "invitation",
          action,
          title: `${invite.email} as ${invite.role}`,
          user: {
            id: invite.invited_by || "",
            name: invite.profiles?.full_name || "Unknown User",
            email: invite.profiles?.email || "",
          },
          timestamp: invite.accepted_at || invite.created_at,
          metadata: { role: invite.role, invitedEmail: invite.email },
        });
      });

      // Sort all activities by timestamp
      allActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setActivities(allActivities);
    } catch (error) {
      console.error("Error fetching team activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterActivities = () => {
    let filtered = [...activities];

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(a => a.type === typeFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.user.name.toLowerCase().includes(query) ||
        a.user.email.toLowerCase().includes(query)
      );
    }

    setFilteredActivities(filtered);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "job":
        return <Briefcase className="h-4 w-4" />;
      case "application":
        return <FileText className="h-4 w-4" />;
      case "invitation":
        return <Mail className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "job":
        return "bg-green-500/10 text-green-600 border-green-200";
      case "application":
        return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "invitation":
        return "bg-purple-500/10 text-purple-600 border-purple-200";
      default:
        return "bg-muted";
    }
  };

  if (!activeTeamId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Select a team to view activity timeline</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {activeTeamName ? `${activeTeamName} Activity Timeline` : "Team Activity Timeline"}
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="application">Applications</SelectItem>
              <SelectItem value="invitation">Invitations</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== "all" 
                ? "No activities match your filters" 
                : "No recent activities in this team"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                <Avatar className={`h-10 w-10 border-2 ${getActivityColor(activity.type)}`}>
                  <AvatarFallback className={getActivityColor(activity.type)}>
                    {activity.user.name.split(" ").map(n => n[0]).join("").toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{activity.user.name}</span>{" "}
                        <span className="text-muted-foreground">{activity.action}</span>
                      </p>
                      <p className="text-sm font-medium mt-1">{activity.title}</p>
                    </div>
                    <Badge variant="outline" className={`gap-1 ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                      <span className="capitalize">{activity.type}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
