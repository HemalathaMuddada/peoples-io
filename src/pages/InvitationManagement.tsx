import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Clock, CheckCircle, XCircle, RefreshCw, Trash2, Copy, History } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkInvitationUpload } from "@/components/invitations/BulkInvitationUpload";
import { InvitationStatsWidget } from "@/components/invitations/InvitationStatsWidget";
import { useNavigate } from "react-router-dom";
import { useTeam } from "@/contexts/TeamContext";
import { TeamFilterBadge } from "@/components/teams/TeamFilterBadge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  invited_by: string | null;
}

export default function InvitationManagement() {
  useAdminCheck();
  const navigate = useNavigate();
  const { selectedTeam } = useTeam();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);
  const [actionType, setActionType] = useState<"resend" | "revoke" | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, [selectedTeam]);

  const fetchInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("company_invitations")
        .select("*");

      // Filter by team if selected
      if (selectedTeam) {
        query = query.eq("team_id", selectedTeam.id);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("resend_invitation", {
        invitation_id: invitationId,
        admin_user_id: user.id,
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);

      toast.success("Invitation resent successfully!");
      fetchInvitations();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error(error.message || "Failed to resend invitation");
    } finally {
      setProcessingId(null);
      setActionType(null);
      setSelectedInvitation(null);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      const { error } = await supabase
        .from("company_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation revoked successfully");
      fetchInvitations();
    } catch (error: any) {
      console.error("Error revoking invitation:", error);
      toast.error("Failed to revoke invitation");
    } finally {
      setProcessingId(null);
      setActionType(null);
      setSelectedInvitation(null);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accept-invitation?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invitation link copied to clipboard!");
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.accepted_at) {
      return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />Accepted</Badge>;
    }
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Expired</Badge>;
    }
    return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      org_admin: "Organization Admin",
      hiring_manager: "Hiring Manager",
      recruiter: "Recruiter",
      agency_admin: "Agency Admin",
    };
    return labels[role] || role;
  };

  const filterInvitations = (status: string) => {
    if (status === "all") return invitations;
    if (status === "accepted") return invitations.filter(i => i.accepted_at);
    if (status === "expired") return invitations.filter(i => !i.accepted_at && new Date(i.expires_at) < new Date());
    if (status === "pending") return invitations.filter(i => !i.accepted_at && new Date(i.expires_at) >= new Date());
    return invitations;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invitation Management</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Manage company invitations and resend or revoke as needed</p>
            <TeamFilterBadge />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/email-templates")}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Email Templates
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/invitation-history")}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            View History
          </Button>
        </div>
      </div>

      <InvitationStatsWidget />

      <BulkInvitationUpload onInvitationsSent={fetchInvitations} />

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({filterInvitations("pending").length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Accepted ({filterInvitations("accepted").length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Expired ({filterInvitations("expired").length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({invitations.length})
          </TabsTrigger>
        </TabsList>

        {["pending", "accepted", "expired", "all"].map((status) => (
          <TabsContent key={status} value={status}>
            <Card>
              <CardHeader>
                <CardTitle>{status.charAt(0).toUpperCase() + status.slice(1)} Invitations</CardTitle>
                <CardDescription>
                  {status === "pending" && "Invitations waiting to be accepted"}
                  {status === "accepted" && "Successfully accepted invitations"}
                  {status === "expired" && "Invitations that have expired"}
                  {status === "all" && "All invitations sent from your organization"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent Date</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterInvitations(status).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No {status !== "all" ? status : ""} invitations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterInvitations(status).map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {invitation.email}
                            </div>
                          </TableCell>
                          <TableCell>{getRoleLabel(invitation.role)}</TableCell>
                          <TableCell>{getStatusBadge(invitation)}</TableCell>
                          <TableCell>{new Date(invitation.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {invitation.accepted_at 
                              ? "Accepted" 
                              : new Date(invitation.expires_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!invitation.accepted_at && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyInviteLink(invitation.token)}
                                    disabled={processingId !== null}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInvitation(invitation);
                                      setActionType("resend");
                                    }}
                                    disabled={processingId !== null}
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedInvitation(invitation);
                                      setActionType("revoke");
                                    }}
                                    disabled={processingId !== null}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={actionType !== null} onOpenChange={() => {
        setActionType(null);
        setSelectedInvitation(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "resend" ? "Resend Invitation" : "Revoke Invitation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "resend" 
                ? `Are you sure you want to resend the invitation to ${selectedInvitation?.email}? A new invitation link will be generated and sent.`
                : `Are you sure you want to revoke the invitation to ${selectedInvitation?.email}? The invitation link will no longer work.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedInvitation) {
                  actionType === "resend" 
                    ? handleResend(selectedInvitation.id)
                    : handleRevoke(selectedInvitation.id);
                }
              }}
            >
              {actionType === "resend" ? "Resend" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
