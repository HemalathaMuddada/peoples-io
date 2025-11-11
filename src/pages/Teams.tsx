import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Plus, Settings, Trash2, UserPlus, BarChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Team {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count: number;
  user_role: string;
}

export default function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teams where user is a member
      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select(`
          team_id,
          role,
          teams (
            id,
            name,
            description,
            created_at
          )
        `)
        .eq("user_id", user.id);

      if (membersError) throw membersError;

      // Get member counts for each team
      const teamIds = teamMembers?.map(tm => tm.team_id) || [];
      
      if (teamIds.length === 0) {
        setTeams([]);
        return;
      }

      const { data: memberCounts, error: countsError } = await supabase
        .from("team_members")
        .select("team_id")
        .in("team_id", teamIds);

      if (countsError) throw countsError;

      const countMap = memberCounts?.reduce((acc, m) => {
        acc[m.team_id] = (acc[m.team_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const teamsData = teamMembers?.map(tm => ({
        id: tm.teams.id,
        name: tm.teams.name,
        description: tm.teams.description,
        created_at: tm.teams.created_at,
        member_count: countMap[tm.team_id] || 0,
        user_role: tm.role,
      })) || [];

      setTeams(teamsData as any);
    } catch (error: any) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      if (!profile?.org_id) throw new Error("No organization found");

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert([{
          name: newTeam.name,
          description: newTeam.description || null,
          org_id: profile.org_id,
          created_by: user.id,
        }])
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as team owner
      const { error: memberError } = await supabase
        .from("team_members")
        .insert([{
          team_id: team.id,
          user_id: user.id,
          role: "team_owner",
        }]);

      if (memberError) throw memberError;

      toast.success("Team created successfully!");
      setCreateDialogOpen(false);
      setNewTeam({ name: "", description: "" });
      fetchTeams();
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(error.message || "Failed to create team");
    } finally {
      setCreating(false);
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
    return <Badge variant={variants[role]}>{labels[role]}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading teams...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Teams
          </h1>
          <p className="text-muted-foreground">
            Collaborate with your team members
          </p>
        </div>
        <div className="flex items-center gap-2">
          {teams.length > 1 && (
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => navigate("/teams/comparison")}
            >
              <BarChart className="h-4 w-4" />
              Compare Teams
            </Button>
          )}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a team to collaborate with your colleagues
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    placeholder="Engineering Team"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What does this team do?"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTeam} disabled={creating}>
                  {creating ? "Creating..." : "Create Team"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              Create your first team to start collaborating
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Teams</CardTitle>
            <CardDescription>
              Teams you're a member of ({teams.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Your Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.description || "No description"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {team.member_count}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(team.user_role)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/teams/${team.id}`)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
