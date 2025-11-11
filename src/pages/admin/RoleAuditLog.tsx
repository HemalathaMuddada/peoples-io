import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, UserPlus, UserMinus, RefreshCw, Search, Calendar, User, Building } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  user_id: string | null;
  org_id: string | null;
  target_id: string | null;
  target_type: string | null;
  meta_json: any;
  actor_email?: string;
  actor_name?: string;
  target_user_email?: string;
  target_user_name?: string;
  org_name?: string;
}

const actionConfig = {
  role_assigned: {
    label: "Role Assigned",
    icon: UserPlus,
    color: "text-green-600",
    bgColor: "bg-green-500/10"
  },
  role_updated: {
    label: "Role Updated",
    icon: RefreshCw,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10"
  },
  role_removed: {
    label: "Role Removed",
    icon: UserMinus,
    color: "text-red-600",
    bgColor: "bg-red-500/10"
  }
};

export default function RoleAuditLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);

      // Fetch audit logs for role changes
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .in('action', ['role_assigned', 'role_updated', 'role_removed'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) throw auditError;

      // Get unique user IDs and org IDs
      const userIds = new Set<string>();
      const orgIds = new Set<string>();

      auditData?.forEach(log => {
        if (log.user_id) userIds.add(log.user_id);
        if (log.org_id) orgIds.add(log.org_id);
        if (log.meta_json && typeof log.meta_json === 'object' && 'target_user_id' in log.meta_json) {
          userIds.add(log.meta_json.target_user_id as string);
        }
      });

      // Fetch user details
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', Array.from(userIds));

      // Fetch org details
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', Array.from(orgIds));

      // Map profiles and orgs for quick lookup
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const orgMap = new Map(orgs?.map(o => [o.id, o]) || []);

      // Enrich audit logs with user and org details
      const enrichedLogs = auditData?.map(log => {
        const metaData = log.meta_json as any;
        const actor = profileMap.get(log.user_id || '');
        const targetUser = profileMap.get(metaData?.target_user_id);
        const org = orgMap.get(log.org_id || '');

        return {
          ...log,
          actor_email: actor?.email,
          actor_name: actor?.full_name,
          target_user_email: targetUser?.email,
          target_user_name: targetUser?.full_name,
          org_name: org?.name
        };
      }) || [];

      setLogs(enrichedLogs);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    // Filter by action
    if (filterAction !== 'all' && log.action !== filterAction) {
      return false;
    }

    // Filter by role
    if (filterRole !== 'all') {
      const metaData = log.meta_json as any;
      const role = log.action === 'role_updated' 
        ? metaData?.new_role 
        : metaData?.role;
      if (role !== filterRole) {
        return false;
      }
    }

    // Filter by search term (actor or target user)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const actorMatch = log.actor_email?.toLowerCase().includes(searchLower) ||
                        log.actor_name?.toLowerCase().includes(searchLower);
      const targetMatch = log.target_user_email?.toLowerCase().includes(searchLower) ||
                         log.target_user_name?.toLowerCase().includes(searchLower);
      
      if (!actorMatch && !targetMatch) {
        return false;
      }
    }

    return true;
  });

  const getRoleDisplay = (log: AuditLog) => {
    const metaData = log.meta_json as any;
    if (log.action === 'role_updated') {
      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-muted">
            {metaData?.old_role}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="outline" className="bg-primary/10">
            {metaData?.new_role}
          </Badge>
        </div>
      );
    }
    return <Badge variant="outline">{metaData?.role}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Role Change Audit Log
        </h1>
        <p className="text-muted-foreground">
          Track all role assignments, updates, and removals
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter audit logs by action, role, or user</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">
                <Search className="h-4 w-4 inline mr-2" />
                Search Users
              </Label>
              <Input
                id="search"
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action Type</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger id="action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="role_assigned">Role Assigned</SelectItem>
                  <SelectItem value="role_updated">Role Updated</SelectItem>
                  <SelectItem value="role_removed">Role Removed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role Type</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                  <SelectItem value="org_admin">Org Admin</SelectItem>
                  <SelectItem value="agency_admin">Agency Admin</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                  <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="candidate">Candidate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} total entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No audit logs found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Date & Time
                    </TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>
                      <User className="h-4 w-4 inline mr-2" />
                      Changed By
                    </TableHead>
                    <TableHead>
                      <User className="h-4 w-4 inline mr-2" />
                      Target User
                    </TableHead>
                    <TableHead>Role(s)</TableHead>
                    <TableHead>
                      <Building className="h-4 w-4 inline mr-2" />
                      Organization
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const config = actionConfig[log.action as keyof typeof actionConfig];
                    const Icon = config?.icon || Shield;

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${config?.bgColor} ${config?.color} border-transparent`}
                          >
                            <Icon className="h-3 w-3 mr-1" />
                            {config?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {log.actor_name || 'System'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.actor_email || 'Automated'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <button
                              onClick={() => navigate(`/admin/user-role-history?userId=${log.meta_json && typeof log.meta_json === 'object' && 'target_user_id' in log.meta_json ? log.meta_json.target_user_id : ''}`)}
                              className="font-medium hover:underline text-left"
                            >
                              {log.target_user_name || 'Unknown'}
                            </button>
                            <div className="text-xs text-muted-foreground">
                              {log.target_user_email || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleDisplay(log)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {log.org_name || 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
