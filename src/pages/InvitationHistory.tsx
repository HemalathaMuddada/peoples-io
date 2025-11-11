import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { History, Search, User, Mail, Calendar, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  invitation_id: string;
  action: string;
  performed_by: string | null;
  created_at: string;
  metadata: any;
  invitation: {
    email: string;
    role: string;
    org_id: string;
  };
  performer: {
    full_name: string | null;
    email: string;
  } | null;
}

export default function InvitationHistory() {
  useAdminCheck();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: logsData, error: logsError } = await supabase
        .from("invitation_audit_log")
        .select(`
          id,
          invitation_id,
          action,
          performed_by,
          created_at,
          metadata,
          company_invitations!inner (
            email,
            role,
            org_id
          )
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (logsError) throw logsError;

      // Fetch performer details
      const performerIds = logsData
        ?.map(log => log.performed_by)
        .filter((id): id is string => id !== null) || [];

      const uniquePerformerIds = [...new Set(performerIds)];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniquePerformerIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.id, p]) || []
      );

      const enrichedLogs = logsData?.map(log => ({
        ...log,
        invitation: log.company_invitations,
        performer: log.performed_by ? profilesMap.get(log.performed_by) || null : null,
      })) || [];

      setLogs(enrichedLogs as any);
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      toast.error("Failed to load invitation history");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      created: { variant: "default", label: "Created" },
      resent: { variant: "secondary", label: "Resent" },
      revoked: { variant: "destructive", label: "Revoked" },
      accepted: { variant: "default", label: "Accepted" },
      expired: { variant: "outline", label: "Expired" },
      role_changed: { variant: "secondary", label: "Role Changed" },
    };

    const config = variants[action] || { variant: "outline", label: action };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Activity className="h-3 w-3" />
        {config.label}
      </Badge>
    );
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

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performer?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Invitation History
          </h1>
          <p className="text-muted-foreground">
            Complete audit trail of all invitation activity
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter & Search</CardTitle>
          <CardDescription>
            Search by email or filter by action type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="resent">Resent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="role_changed">Role Changed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} event{filteredLogs.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Invitation Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No activity found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{log.invitation.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRoleLabel(log.invitation.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      {log.performer ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {log.performer.full_name || "Unknown"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {log.performer.email}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div>{new Date(log.created_at).toLocaleDateString()}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
