import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Building2, Mail, Phone, Globe, Briefcase } from "lucide-react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface SignupRequest {
  id: string;
  company_name: string;
  company_type: string;
  company_website: string;
  industry: string;
  company_size: string;
  company_description: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  requester_title: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export default function CompanySignupRequests() {
  useAdminCheck();
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SignupRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("company_signup_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data as any || []);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load signup requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("approve_company_signup_request" as any, {
        request_id: requestId,
        admin_user_id: user.id,
      });

      if (error) throw error;

      toast.success("Company approved and invitation sent!");
      fetchRequests();
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error(error.message || "Failed to approve request");
    } finally {
      setProcessingId(null);
      setActionType(null);
      setSelectedRequest(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("company_signup_requests" as any)
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request rejected");
      fetchRequests();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
      setActionType(null);
      setSelectedRequest(null);
    }
  };

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case "pending": return "outline";
      case "approved": return "default";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      employer: "Employer",
      agency: "Agency",
      recruiting_firm: "Recruiting Firm",
    };
    return labels[type] || type;
  };

  const RequestCard = ({ request }: { request: SignupRequest }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {request.company_name}
            </CardTitle>
            <CardDescription className="mt-2">
              <Badge variant="outline">{getTypeLabel(request.company_type)}</Badge>
              <Badge variant={getStatusColor(request.status)} className="ml-2">
                {request.status}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold mb-1">Company Details</div>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <a href={request.company_website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {request.company_website}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {request.industry} • {request.company_size} employees
              </div>
            </div>
          </div>
          <div>
            <div className="font-semibold mb-1">Requester</div>
            <div className="space-y-1 text-muted-foreground">
              <div>{request.requester_name}</div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {request.requester_email}
              </div>
              {request.requester_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {request.requester_phone}
                </div>
              )}
              <div className="text-xs">{request.requester_title}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="font-semibold mb-1 text-sm">Description</div>
          <p className="text-sm text-muted-foreground">{request.company_description}</p>
        </div>

        {request.status === "pending" && (
          <div className="flex gap-2 pt-4">
            <Button
              onClick={() => {
                setSelectedRequest(request);
                setActionType("approve");
              }}
              disabled={processingId !== null}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setSelectedRequest(request);
                setActionType("reject");
              }}
              disabled={processingId !== null}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        )}

        {request.reviewed_at && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Reviewed on {new Date(request.reviewed_at).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const filterRequests = (status: string) => {
    if (status === "all") return requests;
    return requests.filter((r) => r.status === status);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Company Signup Requests</h1>
        <p className="text-muted-foreground">Review and approve company registration requests</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({filterRequests("pending").length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved ({filterRequests("approved").length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({filterRequests("rejected").length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {filterRequests("pending").map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {filterRequests("approved").map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          {filterRequests("rejected").map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </TabsContent>
      </Tabs>

      <AlertDialog open={actionType !== null} onOpenChange={() => {
        setActionType(null);
        setSelectedRequest(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "Approve Request" : "Reject Request"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve" 
                ? `Are you sure you want to approve ${selectedRequest?.company_name}? This will create an organization and send an invitation email to ${selectedRequest?.requester_email}.`
                : `Are you sure you want to reject ${selectedRequest?.company_name}? This action can be undone later if needed.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedRequest) {
                  actionType === "approve" 
                    ? handleApprove(selectedRequest.id)
                    : handleReject(selectedRequest.id);
                }
              }}
            >
              {actionType === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
