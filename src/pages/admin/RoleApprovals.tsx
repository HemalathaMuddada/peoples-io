import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, CheckCircle, XCircle, Clock, AlertCircle, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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

interface RoleChangeRequest {
  id: string;
  target_user_id: string;
  requested_by: string;
  request_type: string;
  previous_role: string | null;
  new_role: string;
  org_id: string | null;
  status: string;
  reason: string | null;
  justification: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  expires_at: string | null;
  target_user_email?: string;
  target_user_name?: string;
  requester_email?: string;
  requester_name?: string;
  reviewer_email?: string;
  reviewer_name?: string;
  org_name?: string;
}

export default function RoleApprovals() {
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState<RoleChangeRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);

      const { data: requestsData, error } = await supabase
        .from('role_change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs
      const userIds = new Set<string>();
      const orgIds = new Set<string>();

      requestsData?.forEach(req => {
        if (req.target_user_id) userIds.add(req.target_user_id);
        if (req.requested_by) userIds.add(req.requested_by);
        if (req.reviewed_by) userIds.add(req.reviewed_by);
        if (req.org_id) orgIds.add(req.org_id);
      });

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', Array.from(userIds));

      // Fetch orgs
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', Array.from(orgIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const orgMap = new Map(orgs?.map(o => [o.id, o]) || []);

      // Enrich requests
      const enrichedRequests = requestsData?.map(req => {
        const targetUser = profileMap.get(req.target_user_id);
        const requester = profileMap.get(req.requested_by);
        const reviewer = profileMap.get(req.reviewed_by || '');
        const org = orgMap.get(req.org_id || '');

        return {
          ...req,
          target_user_email: targetUser?.email,
          target_user_name: targetUser?.full_name,
          requester_email: requester?.email,
          requester_name: requester?.full_name,
          reviewer_email: reviewer?.email,
          reviewer_name: reviewer?.full_name,
          org_name: org?.name
        };
      }) || [];

      setRequests(enrichedRequests);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load role change requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setIsProcessing(true);

      // Update request status
      const { error: updateError } = await supabase
        .from('role_change_requests')
        .update({
          status: 'approved',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Execute the role change using the database function
      const { data: result, error: executeError } = await supabase
        .rpc('execute_role_change_request', { request_id: selectedRequest.id });

      if (executeError) throw executeError;

      const resultData = result as any;
      if (!resultData?.success) {
        throw new Error(resultData?.error || 'Failed to execute role change');
      }

      toast.success('Role change request approved and executed');
      setSelectedRequest(null);
      setActionType(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsProcessing(true);

      const { error } = await supabase
        .from('role_change_requests')
        .update({
          status: 'rejected',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Role change request rejected');
      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason('');
      fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'assign': return 'Assign Role';
      case 'update': return 'Update Role';
      case 'remove': return 'Remove Role';
      default: return type;
    }
  };

  const getRequestDescription = (req: RoleChangeRequest) => {
    if (req.request_type === 'assign') {
      return `Assign ${req.new_role} role`;
    } else if (req.request_type === 'update') {
      return `Update from ${req.previous_role} to ${req.new_role}`;
    } else if (req.request_type === 'remove') {
      return `Remove ${req.previous_role} role`;
    }
    return 'Unknown action';
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'all') return true;
    return req.status === activeTab;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
          Role Change Approvals
        </h1>
        <p className="text-muted-foreground">
          Review and approve role change requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Role Change Requests</CardTitle>
          <CardDescription>Manage role assignment requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {activeTab} requests found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Target User</TableHead>
                        <TableHead>Request Type</TableHead>
                        <TableHead>Role Change</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{req.target_user_name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{req.target_user_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getRequestTypeLabel(req.request_type)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{getRequestDescription(req)}</div>
                            {req.org_name && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Org: {req.org_name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{req.requester_name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{req.requester_email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(req.created_at), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell>
                            {req.status === 'pending' && (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {req.status === 'approved' && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {req.status === 'rejected' && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600">
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {req.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-green-500/10 hover:bg-green-500/20 border-green-500/20"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setActionType('approve');
                                  }}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-red-500/10 hover:bg-red-500/20 border-red-500/20"
                                  onClick={() => {
                                    setSelectedRequest(req);
                                    setActionType('reject');
                                  }}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                            {req.status !== 'pending' && (
                              <div className="text-xs text-muted-foreground">
                                {req.reviewer_name || 'System'}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approval/Rejection Dialog */}
      <AlertDialog open={!!selectedRequest} onOpenChange={(open) => {
        if (!open) {
          setSelectedRequest(null);
          setActionType(null);
          setRejectionReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Role Change Request
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {selectedRequest && (
                <>
                  <div className="p-4 rounded-lg bg-muted border">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{selectedRequest.target_user_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getRequestDescription(selectedRequest)}
                      </div>
                      {selectedRequest.reason && (
                        <div className="text-sm">
                          <span className="font-medium">Reason:</span> {selectedRequest.reason}
                        </div>
                      )}
                      {selectedRequest.justification && (
                        <div className="text-sm">
                          <span className="font-medium">Justification:</span> {selectedRequest.justification}
                        </div>
                      )}
                    </div>
                  </div>

                  {actionType === 'reject' && (
                    <div className="space-y-2">
                      <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                      <Textarea
                        id="rejection-reason"
                        placeholder="Explain why this request is being rejected..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}

                  {actionType === 'approve' && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-orange-800 dark:text-orange-300">
                        This action will immediately apply the role change and cannot be undone without creating a new request.
                      </div>
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={actionType === 'approve' ? handleApprove : handleReject}
              disabled={isProcessing || (actionType === 'reject' && !rejectionReason.trim())}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isProcessing ? (
                'Processing...'
              ) : (
                <>
                  {actionType === 'approve' ? (
                    <><CheckCircle className="h-4 w-4 mr-2" />Approve</>
                  ) : (
                    <><XCircle className="h-4 w-4 mr-2" />Reject</>
                  )}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
