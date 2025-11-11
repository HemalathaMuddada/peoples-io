import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

interface CoachingRequisition {
  id: string;
  status: string;
  message: string | null;
  response_message: string | null;
  created_at: string;
  mentor_profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
  mentee_profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export default function CoachingRequisitions() {
  const [receivedRequests, setReceivedRequests] = useState<CoachingRequisition[]>([]);
  const [sentRequests, setSentRequests] = useState<CoachingRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch received requests (where I'm the mentor)
      const { data: received, error: receivedError } = await supabase
        .from("mentorship_requests")
        .select(`
          id,
          status,
          message,
          response_message,
          created_at,
          mentee_id
        `)
        .eq("mentor_id", user.id)
        .order("created_at", { ascending: false });

      if (receivedError) throw receivedError;

      // Fetch sent requests (where I'm the mentee)
      const { data: sent, error: sentError } = await supabase
        .from("mentorship_requests")
        .select(`
          id,
          status,
          message,
          response_message,
          created_at,
          mentor_id
        `)
        .eq("mentee_id", user.id)
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;

      // Fetch mentor profiles
      const mentorIds = [...(received?.map(r => r.mentee_id) || []), ...(sent?.map(r => r.mentor_id) || [])];
      const uniqueIds = Array.from(new Set(mentorIds));

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email")
        .in("id", uniqueIds);

      if (profilesError) throw profilesError;

      // Map profiles to requests
      const receivedWithProfiles = received?.map(r => ({
        ...r,
        mentor_profile: { id: "", full_name: "", avatar_url: "", email: "" },
        mentee_profile: profiles?.find(p => p.id === r.mentee_id) || { id: "", full_name: "", avatar_url: "", email: "" }
      })) || [];

      const sentWithProfiles = sent?.map(r => ({
        ...r,
        mentor_profile: profiles?.find(p => p.id === r.mentor_id) || { id: "", full_name: "", avatar_url: "", email: "" },
        mentee_profile: { id: "", full_name: "", avatar_url: "", email: "" }
      })) || [];

      setReceivedRequests(receivedWithProfiles);
      setSentRequests(sentWithProfiles);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load coaching requisitions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, status: "accepted" | "declined") => {
    try {
      const { error } = await supabase
        .from("mentorship_requests")
        .update({
          status,
          response_message: responseMessage[requestId] || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: `Requisition ${status}`,
        description: `You have ${status} the coaching requisition.`,
      });

      fetchRequests();
      setResponseMessage((prev) => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    } catch (error: any) {
      console.error("Error responding to request:", error);
      toast({
        title: "Error",
        description: "Failed to respond to request",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: { variant: any; icon: any; label: string } } = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      accepted: { variant: "default", icon: CheckCircle, label: "Accepted" },
      declined: { variant: "destructive", icon: XCircle, label: "Declined" },
      completed: { variant: "outline", icon: CheckCircle, label: "Completed" },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

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
        <h1 className="text-4xl font-bold mb-2">Coaching Requisitions</h1>
        <p className="text-muted-foreground">
          Manage your coaching connections
        </p>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="received">
            Received ({receivedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4 mt-6">
          {receivedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  No coaching requisitions received yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            receivedRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={request.mentee_profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {request.mentee_profile.full_name?.split(" ").map((n) => n[0]).join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {request.mentee_profile.full_name || "Anonymous User"}
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(request.created_at), "PPP")}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.message && (
                    <div>
                      <p className="text-sm font-medium mb-1">Message:</p>
                      <p className="text-sm text-muted-foreground">{request.message}</p>
                    </div>
                  )}

                  {request.status === "pending" && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Add a response message (optional)..."
                        value={responseMessage[request.id] || ""}
                        onChange={(e) =>
                          setResponseMessage((prev) => ({
                            ...prev,
                            [request.id]: e.target.value,
                          }))
                        }
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleResponse(request.id, "accepted")}
                          className="flex-1"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleResponse(request.id, "declined")}
                          className="flex-1"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  )}

                  {request.response_message && request.status !== "pending" && (
                    <div>
                      <p className="text-sm font-medium mb-1">Your response:</p>
                      <p className="text-sm text-muted-foreground">{request.response_message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-6">
          {sentRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center">
                  You haven't sent any coaching requisitions yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            sentRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={request.mentor_profile.avatar_url || undefined} />
                        <AvatarFallback>
                          {request.mentor_profile.full_name?.split(" ").map((n) => n[0]).join("") || "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {request.mentor_profile.full_name || "Anonymous Coach"}
                        </CardTitle>
                        <CardDescription>
                          {format(new Date(request.created_at), "PPP")}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.message && (
                    <div>
                      <p className="text-sm font-medium mb-1">Your message:</p>
                      <p className="text-sm text-muted-foreground">{request.message}</p>
                    </div>
                  )}

                  {request.response_message && (
                    <div>
                      <p className="text-sm font-medium mb-1">Coach's response:</p>
                      <p className="text-sm text-muted-foreground">{request.response_message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
