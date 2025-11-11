import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, X, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface Recruiter {
  id: string;
  full_name: string;
  email: string;
}

interface Assignment {
  id: string;
  recruiter_id: string;
  assigned_at: string;
  recruiter: Recruiter;
}

interface RecruiterAssignmentProps {
  relationshipId: string;
  employerName: string;
}

export function RecruiterAssignment({ relationshipId, employerName }: RecruiterAssignmentProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableRecruiters, setAvailableRecruiters] = useState<Recruiter[]>([]);
  const [selectedRecruiter, setSelectedRecruiter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agencyOrgId, setAgencyOrgId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgencyOrg();
  }, []);

  useEffect(() => {
    if (agencyOrgId) {
      fetchAssignments();
      fetchAvailableRecruiters();
    }
  }, [agencyOrgId, relationshipId]);

  const fetchAgencyOrg = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("org_id")
      .eq("user_id", user.id)
      .single();

    if (roles) {
      setAgencyOrgId(roles.org_id);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("client_recruiter_assignments")
        .select(`
          id,
          recruiter_id,
          assigned_at,
          profiles!client_recruiter_assignments_recruiter_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("relationship_id", relationshipId);

      if (error) throw error;

      const typedAssignments = (data || []).map((a: any) => ({
        id: a.id,
        recruiter_id: a.recruiter_id,
        assigned_at: a.assigned_at,
        recruiter: {
          id: a.profiles?.id || "",
          full_name: a.profiles?.full_name || "Unknown",
          email: a.profiles?.email || "",
        },
      }));

      setAssignments(typedAssignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRecruiters = async () => {
    if (!agencyOrgId) return;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!user_roles_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq("org_id", agencyOrgId)
        .in("role", ["agency_admin", "recruiter"]);

      if (error) throw error;

      const recruiters = (data || [])
        .filter((r: any) => r.profiles)
        .map((r: any) => ({
          id: r.profiles.id,
          full_name: r.profiles.full_name || "Unknown",
          email: r.profiles.email || "",
        }));

      setAvailableRecruiters(recruiters);
    } catch (error) {
      console.error("Error fetching recruiters:", error);
    }
  };

  const handleAssign = async () => {
    if (!selectedRecruiter) {
      toast.error("Please select a recruiter");
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("client_recruiter_assignments")
        .insert([{
          relationship_id: relationshipId,
          recruiter_id: selectedRecruiter,
        }]);

      if (error) throw error;

      toast.success("Recruiter assigned successfully");
      setDialogOpen(false);
      setSelectedRecruiter("");
      fetchAssignments();
    } catch (error: any) {
      console.error("Error assigning recruiter:", error);
      toast.error(error.message || "Failed to assign recruiter");
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("client_recruiter_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      toast.success("Recruiter removed successfully");
      fetchAssignments();
    } catch (error: any) {
      console.error("Error removing recruiter:", error);
      toast.error("Failed to remove recruiter");
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Assigned Recruiters
            </CardTitle>
            <CardDescription>Manage recruiters for {employerName}</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Recruiter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Recruiter to Client</DialogTitle>
                <DialogDescription>
                  Select a recruiter to assign to {employerName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Select value={selectedRecruiter} onValueChange={setSelectedRecruiter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recruiter" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRecruiters
                        .filter(r => !assignments.some(a => a.recruiter_id === r.id))
                        .map((recruiter) => (
                          <SelectItem key={recruiter.id} value={recruiter.id}>
                            {recruiter.full_name} ({recruiter.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssign}>Assign</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">Loading...</p>
        ) : assignments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No recruiters assigned yet
          </p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(assignment.recruiter.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{assignment.recruiter.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.recruiter.email}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(assignment.id)}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
