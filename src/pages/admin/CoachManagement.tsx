import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, UserMinus, Search } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  has_mentor_role: boolean;
}

export default function MentorManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Get all mentor roles
      const { data: mentorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'mentor');

      if (rolesError) throw rolesError;

      const mentorIds = new Set(mentorRoles?.map(r => r.user_id) || []);

      const usersWithRoles = profiles?.map(profile => ({
        ...profile,
        has_mentor_role: mentorIds.has(profile.id),
      })) || [];

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMentorRole = async (userId: string, currentlyHasRole: boolean) => {
    try {
      if (currentlyHasRole) {
        // Remove mentor role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'mentor');

        if (error) throw error;

        toast({
          title: "Success",
          description: "Mentor role removed successfully",
        });
      } else {
        // Add mentor role - need to get user's org_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', userId)
          .single();

        if (!profile) {
          throw new Error("User profile not found");
        }

        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'mentor',
            org_id: profile.org_id,
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Mentor role assigned successfully",
        });
      }

      // Refresh the list
      fetchUsers();
    } catch (error: any) {
      console.error('Error toggling mentor role:', error);
      toast({
        title: "Error",
        description: "Failed to update mentor role",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Mentor Management</h1>
        <p className="text-muted-foreground">
          Assign or remove mentor roles from users
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>
                    {user.full_name?.split(" ").map((n) => n[0]).join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.full_name || "Anonymous User"}</p>
                    {user.has_mentor_role && (
                      <Badge variant="secondary">Mentor</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <Button
                variant={user.has_mentor_role ? "destructive" : "default"}
                size="sm"
                onClick={() => toggleMentorRole(user.id, user.has_mentor_role)}
              >
                {user.has_mentor_role ? (
                  <>
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remove Mentor Role
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign Mentor Role
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                No users found matching your search.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
