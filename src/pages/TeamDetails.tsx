import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, ArrowLeft, UserPlus, Mail, Trash2, Shield, Crown, User, BarChart } from "lucide-react";
import { TeamActivityFeed } from "@/components/teams/TeamActivityFeed";
import { TeamAnalytics } from "@/components/teams/TeamAnalytics";
import { TeamActivityTimeline } from "@/components/teams/TeamActivityTimeline";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    full_name: string | null;
    email: string;
  };
}

export default function TeamDetails() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("team_member");
  const [inviting, setInviting] = useState(false);
  const [removeMember, setRemoveMember] = useState<TeamMember | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    if (teamId) {
      fetchTeamDetails();
    }
  }, [teamId]);

  const fetchTeamDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get team details
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);

      // Get user's role in team
      const { data: userMember } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .single();

      setUserRole(userMember?.role || "");

      // Get team members
      const { data: membersData, error: membersError } = await supabase
        .from("team_members")
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles!inner (
            full_name,
            email
          )
        `)
        .eq("team_id", teamId)
        .order("joined_at");

      if (membersError) throw membersError;

      setMembers(membersData.map(m => ({
        ...m,
        profile: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      })) as any);
    } catch (error: any) {
      console.error("Error fetching team details:", error);
      toast.error("Failed to load team details");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("team_invitations")
        .insert([{
          team_id: teamId,
          email: inviteEmail,
          role: inviteRole as "team_owner" | "team_admin" | "team_member",
          invited_by: user.id,
        }]);

      if (error) throw error;

      toast.success("Invitation sent successfully!");
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("team_member");
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMember) return;

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", removeMember.id);

      if (error) throw error;

      toast.success("Member removed from team");
      setRemoveMember(null);
      fetchTeamDetails();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole as "team_owner" | "team_admin" | "team_member" })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Role updated successfully");
      fetchTeamDetails();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "team_owner": return <Crown className="h-4 w-4" />;
      case "team_admin": return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      team_owner: "default",
      team_admin: "secondary",
      team_member: "outline",
    };
    const labels: Record<string, string> = {
      team_owner: "Owner",
      team_admin: "Admin",
      team_member: "Member",
    };
    return (
      <Badge variant={variants[role]} className="flex items-center gap-1">
        {getRoleIcon(role)}
        {labels[role]}
      </Badge>
    );
  };

  const canManageMembers = userRole === "team_owner" || userRole === "team_admin";

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading team...</div>;
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h2 className="text-2xl font-bold mb-2">Team not found</h2>
        <Button onClick={() => navigate("/teams")}>Back to Teams</Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/teams")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              {team.name}
            </h1>
            <p className="text-muted-foreground">{team.description || "No description"}</p>
          </div>
        </div>
        {canManageMembers && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join this team
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_member">Member</SelectItem>
                      <SelectItem value="team_admin">Admin</SelectItem>
                      {userRole === "team_owner" && (
                        <SelectItem value="team_owner">Owner</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members ({members.length})</CardTitle>
              <CardDescription>
                Manage team member roles and permissions
              </CardDescription>
            </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {canManageMembers && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.profile.full_name || "No name"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {member.profile.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManageMembers && member.role !== "team_owner" ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleUpdateRole(member.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="team_member">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Member
                            </div>
                          </SelectItem>
                          <SelectItem value="team_admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Admin
                            </div>
                          </SelectItem>
                          {userRole === "team_owner" && (
                            <SelectItem value="team_owner">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                Owner
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      getRoleBadge(member.role)
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(member.joined_at).toLocaleDateString()}
                  </TableCell>
                  {canManageMembers && (
                    <TableCell className="text-right">
                      {member.role !== "team_owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemoveMember(member)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {teamId && <TeamActivityFeed teamId={teamId} />}
        </TabsContent>

        <TabsContent value="activity">
          {teamId && <TeamActivityTimeline teamId={teamId} />}
        </TabsContent>

        <TabsContent value="analytics">
          {teamId && <TeamAnalytics teamId={teamId} />}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removeMember?.profile.full_name || removeMember?.profile.email} from this team?
              They will lose access to all team resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
