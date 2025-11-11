import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, UserPlus, UserMinus, RefreshCw, ArrowLeft, Clock, User as UserIcon, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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

interface RoleHistoryItem {
  id: string;
  action: string;
  created_at: string;
  user_id: string | null;
  org_id: string | null;
  meta_json: any;
  actor_email?: string;
  actor_name?: string;
  org_name?: string;
}

interface UserInfo {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface CurrentRole {
  role: string;
  org_id: string;
  org_name?: string;
}

const actionConfig = {
  role_assigned: {
    label: "Role Assigned",
    icon: UserPlus,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20"
  },
  role_updated: {
    label: "Role Updated",
    icon: RefreshCw,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20"
  },
  role_removed: {
    label: "Role Removed",
    icon: UserMinus,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20"
  }
};

export default function UserRoleHistory() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');

  const [history, setHistory] = useState<RoleHistoryItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [currentRoles, setCurrentRoles] = useState<CurrentRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rollbackItem, setRollbackItem] = useState<RoleHistoryItem | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserRoleHistory();
    }
  }, [userId]);

  const fetchUserRoleHistory = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      // Fetch user information
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      setUserInfo(userData);

      // Fetch current roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, org_id')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      // Fetch audit logs for this user
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .in('action', ['role_assigned', 'role_updated', 'role_removed'])
        .order('created_at', { ascending: false });

      if (auditError) throw auditError;

      // Filter logs where this user is the target
      const userLogs = auditData?.filter(log => {
        const metaData = log.meta_json as any;
        return metaData?.target_user_id === userId;
      }) || [];

      // Get unique user IDs and org IDs from logs
      const actorIds = new Set<string>();
      const orgIds = new Set<string>();

      userLogs.forEach(log => {
        if (log.user_id) actorIds.add(log.user_id);
        if (log.org_id) orgIds.add(log.org_id);
      });

      rolesData?.forEach(role => {
        if (role.org_id) orgIds.add(role.org_id);
      });

      // Fetch actor details
      const { data: actors } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', Array.from(actorIds));

      // Fetch org details
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', Array.from(orgIds));

      const actorMap = new Map(actors?.map(a => [a.id, a]) || []);
      const orgMap = new Map(orgs?.map(o => [o.id, o]) || []);

      // Enrich logs
      const enrichedLogs = userLogs.map(log => {
        const actor = actorMap.get(log.user_id || '');
        const org = orgMap.get(log.org_id || '');

        return {
          ...log,
          actor_email: actor?.email,
          actor_name: actor?.full_name,
          org_name: org?.name
        };
      });

      // Enrich current roles
      const enrichedRoles = rolesData?.map(role => ({
        ...role,
        org_name: orgMap.get(role.org_id)?.name
      })) || [];

      setHistory(enrichedLogs);
      setCurrentRoles(enrichedRoles);
    } catch (error: any) {
      console.error('Error fetching user role history:', error);
      toast.error('Failed to load user role history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackItem || !userId) return;

    try {
      setIsRollingBack(true);
      const metaData = rollbackItem.meta_json as any;

      // Determine what role to restore based on action type
      let roleToRestore: string;
      let orgIdToRestore: string;

      if (rollbackItem.action === 'role_removed') {
        // If role was removed, restore it
        roleToRestore = metaData?.role;
        orgIdToRestore = metaData?.org_id;
      } else if (rollbackItem.action === 'role_updated') {
        // If role was updated, restore the old role
        roleToRestore = metaData?.old_role;
        orgIdToRestore = metaData?.old_org_id || metaData?.org_id;
      } else if (rollbackItem.action === 'role_assigned') {
        // If role was assigned, remove it
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', metaData?.role)
          .eq('org_id', metaData?.org_id);

        if (deleteError) throw deleteError;

        toast.success('Role assignment rolled back successfully');
        setRollbackItem(null);
        fetchUserRoleHistory();
        return;
      } else {
        throw new Error('Unknown action type');
      }

      // For removed or updated roles, first delete current conflicting roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('org_id', orgIdToRestore);

      if (deleteError) throw deleteError;

      // Then insert the restored role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: userId,
          role: roleToRestore as any,
          org_id: orgIdToRestore
        }]);

      if (insertError) throw insertError;

      toast.success('Role configuration restored successfully');
      setRollbackItem(null);
      fetchUserRoleHistory();
    } catch (error: any) {
      console.error('Error rolling back role:', error);
      toast.error('Failed to rollback role change');
    } finally {
      setIsRollingBack(false);
    }
  };

  const getRollbackDescription = (item: RoleHistoryItem) => {
    const metaData = item.meta_json as any;
    
    if (item.action === 'role_removed') {
      return `Restore ${metaData?.role} role`;
    } else if (item.action === 'role_updated') {
      return `Restore ${metaData?.old_role} role (from ${metaData?.new_role})`;
    } else if (item.action === 'role_assigned') {
      return `Remove ${metaData?.role} role`;
    }
    return 'Rollback this change';
  };

  if (!userId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No user selected</p>
            <Button onClick={() => navigate('/admin/role-audit')} className="mt-4">
              Go to Audit Log
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = userInfo?.full_name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || userInfo?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/role-audit')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Role History Timeline</h1>
          <p className="text-muted-foreground">Complete role change history for this user</p>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-gradient-primary text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div>
                <div className="text-xl font-semibold">{userInfo?.full_name || 'Unknown'}</div>
                <div className="text-sm text-muted-foreground">{userInfo?.email}</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Account created: {userInfo?.created_at && format(new Date(userInfo.created_at), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Current Roles</CardTitle>
          <CardDescription>Active role assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {currentRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active roles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentRoles.map((role, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/50"
                >
                  <div className="space-y-1">
                    <Badge variant="outline" className="bg-primary/10">
                      {role.role}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {role.org_name || 'Unknown Organization'}
                    </div>
                  </div>
                  <Shield className="h-5 w-5 text-primary" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Role Change Timeline</CardTitle>
          <CardDescription>
            Showing {history.length} role change{history.length !== 1 ? 's' : ''} over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No role changes recorded yet</p>
            </div>
          ) : (
            <div className="relative space-y-6">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

              {history.map((item, index) => {
                const config = actionConfig[item.action as keyof typeof actionConfig];
                const Icon = config?.icon || Shield;
                const metaData = item.meta_json as any;

                return (
                  <div key={item.id} className="relative pl-16">
                    {/* Timeline dot */}
                    <div className={`absolute left-5 w-6 h-6 rounded-full border-2 ${config?.bgColor} ${config?.borderColor} flex items-center justify-center`}>
                      <Icon className={`h-3 w-3 ${config?.color}`} />
                    </div>

                    {/* Content */}
                    <div className={`p-4 rounded-lg border ${config?.bgColor} ${config?.borderColor}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`${config?.bgColor} ${config?.color} border-transparent`}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {config?.label}
                            </Badge>
                          </div>
                          <div className="text-sm font-medium">
                            {format(new Date(item.created_at), 'MMM dd, yyyy • HH:mm:ss')}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRollbackItem(item)}
                          className="gap-2"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Rollback
                        </Button>
                      </div>

                      {/* Role information */}
                      <div className="space-y-2 mb-3">
                        {item.action === 'role_updated' ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-muted">
                              {metaData?.old_role}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="outline" className="bg-primary/10">
                              {metaData?.new_role}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline">{metaData?.role}</Badge>
                        )}
                        {item.org_name && (
                          <div className="text-xs text-muted-foreground">
                            Organization: {item.org_name}
                          </div>
                        )}
                      </div>

                      <Separator className="my-3" />

                      {/* Actor information */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                        <span>
                          Changed by: <span className="font-medium text-foreground">
                            {item.actor_name || item.actor_email || 'System'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Connecting line to next item */}
                    {index < history.length - 1 && (
                      <div className="absolute left-8 top-6 w-0.5 h-full bg-border" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={!!rollbackItem} onOpenChange={(open) => !open && setRollbackItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Rollback</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Are you sure you want to rollback this role change? This action will:
              </p>
              <div className="p-3 rounded-lg bg-muted border">
                <p className="font-medium text-foreground">
                  {rollbackItem && getRollbackDescription(rollbackItem)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  for {userInfo?.full_name || userInfo?.email}
                </p>
              </div>
              <p className="text-sm">
                This will modify the user's current role configuration and be logged in the audit trail.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRollingBack}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRollback}
              disabled={isRollingBack}
              className="bg-primary"
            >
              {isRollingBack ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rolling back...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirm Rollback
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
