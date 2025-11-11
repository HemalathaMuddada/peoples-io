import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageCircle, CheckCircle, XCircle, Clock, Calendar, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function PeerMentorship() {
  const navigate = useNavigate();
  const [availableMentors, setAvailableMentors] = useState<any[]>([]);
  const [myConnections, setMyConnections] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [focusAreas, setFocusAreas] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profileId) {
      loadAvailableMentors();
      loadMyConnections();
      loadSessions();
    }
  }, [profileId]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadAvailableMentors = async () => {
    if (!profileId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("candidate_profiles")
        .select(`
          id,
          current_title,
          location,
          years_experience,
          expertise_areas,
          mentor_bio,
          user:profiles!candidate_profiles_user_id_fkey(
            full_name
          )
        `)
        .eq("is_available_for_mentorship", true)
        .neq("id", profileId);

      if (error) throw error;
      setAvailableMentors(data || []);
    } catch (error) {
      console.error("Error loading mentors:", error);
      toast.error("Failed to load available mentors");
    } finally {
      setLoading(false);
    }
  };

  const loadMyConnections = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from("peer_mentorship_connections")
        .select(`
          *,
          mentor:candidate_profiles!peer_mentorship_connections_mentor_id_fkey(
            current_title,
            location,
            user:profiles!candidate_profiles_user_id_fkey(
              full_name
            )
          ),
          mentee:candidate_profiles!peer_mentorship_connections_mentee_id_fkey(
            current_title,
            location,
            user:profiles!candidate_profiles_user_id_fkey(
              full_name
            )
          )
        `)
        .or(`mentor_id.eq.${profileId},mentee_id.eq.${profileId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyConnections(data || []);
    } catch (error) {
      console.error("Error loading connections:", error);
    }
  };

  const loadSessions = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from("peer_mentorship_sessions")
        .select(`
          *,
          connection:peer_mentorship_connections(
            mentor:candidate_profiles!peer_mentorship_connections_mentor_id_fkey(
              user:profiles!candidate_profiles_user_id_fkey(
                full_name
              )
            ),
            mentee:candidate_profiles!peer_mentorship_connections_mentee_id_fkey(
              user:profiles!candidate_profiles_user_id_fkey(
                full_name
              )
            )
          )
        `)
        .order("scheduled_at", { ascending: true })
        .limit(10);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  const sendMentorshipRequest = async () => {
    if (!selectedMentor || !requestMessage.trim() || !profileId) {
      toast.error("Please provide a message for your request");
      return;
    }

    try {
      const areas = focusAreas.split(",").map(a => a.trim()).filter(Boolean);

      const { error } = await supabase
        .from("peer_mentorship_connections")
        .insert({
          mentor_id: selectedMentor.id,
          mentee_id: profileId,
          request_message: requestMessage,
          focus_areas: areas,
        });

      if (error) throw error;

      toast.success("Mentorship request sent!");
      setShowRequestDialog(false);
      setSelectedMentor(null);
      setRequestMessage("");
      setFocusAreas("");
      loadMyConnections();
    } catch (error: any) {
      console.error("Error sending request:", error);
      if (error.code === "23505") {
        toast.error("You already have a connection request with this mentor");
      } else {
        toast.error("Failed to send mentorship request");
      }
    }
  };

  const updateConnectionStatus = async (connectionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("peer_mentorship_connections")
        .update({ status })
        .eq("id", connectionId);

      if (error) throw error;

      toast.success(`Connection ${status}`);
      loadMyConnections();
    } catch (error) {
      console.error("Error updating connection:", error);
      toast.error("Failed to update connection");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Peer Mentorship
          </h1>
          <p className="text-muted-foreground">Connect with peers for guidance and support</p>
        </div>
      </div>

      <Tabs defaultValue="find" className="space-y-6">
        <TabsList>
          <TabsTrigger value="find">Find Mentors</TabsTrigger>
          <TabsTrigger value="connections">
            My Connections
            {myConnections.filter(c => c.status === "pending" && c.mentor_id === profileId).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {myConnections.filter(c => c.status === "pending" && c.mentor_id === profileId).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="find">
          {loading ? (
            <div className="text-center py-12">Loading mentors...</div>
          ) : availableMentors.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No mentors available</h3>
              <p className="text-muted-foreground">Check back later for peer mentors!</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {availableMentors.map(mentor => (
                <Card key={mentor.id} className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{mentor.user?.full_name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {mentor.current_title} • {mentor.years_experience} years exp
                  </p>
                  
                  {mentor.expertise_areas && mentor.expertise_areas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {mentor.expertise_areas.map((area: string) => (
                        <Badge key={area} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  )}

                  {mentor.mentor_bio && (
                    <p className="text-sm text-muted-foreground mb-4">{mentor.mentor_bio}</p>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedMentor(mentor);
                      setShowRequestDialog(true);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Request Mentorship
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="connections">
          {myConnections.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
              <p className="text-muted-foreground">Start by requesting mentorship from available peers</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {myConnections.map(connection => {
                const isMentor = connection.mentor_id === profileId;
                const otherPerson = isMentor ? connection.mentee : connection.mentor;
                const role = isMentor ? "Mentee" : "Mentor";

                return (
                  <Card key={connection.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">
                          {otherPerson?.user?.full_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {otherPerson?.current_title} • {role}
                        </p>
                      </div>
                      <Badge
                        variant={
                          connection.status === "active" ? "default" :
                          connection.status === "pending" ? "secondary" :
                          connection.status === "completed" ? "outline" : "destructive"
                        }
                      >
                        {connection.status}
                      </Badge>
                    </div>

                    {connection.request_message && (
                      <div className="bg-muted p-3 rounded-lg mb-4">
                        <p className="text-sm">{connection.request_message}</p>
                      </div>
                    )}

                    {connection.focus_areas && connection.focus_areas.length > 0 && (
                      <div className="flex gap-2 mb-4">
                        {connection.focus_areas.map((area: string) => (
                          <Badge key={area} variant="outline">{area}</Badge>
                        ))}
                      </div>
                    )}

                    {connection.status === "pending" && isMentor && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateConnectionStatus(connection.id, "active")}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateConnectionStatus(connection.id, "declined")}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}

                    {connection.status === "active" && (
                      <div className="text-sm text-muted-foreground">
                        {connection.total_sessions} sessions completed
                        {connection.last_session_at && (
                          <span> • Last session {formatDistanceToNow(new Date(connection.last_session_at), { addSuffix: true })}</span>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions">
          {sessions.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No sessions scheduled</h3>
              <p className="text-muted-foreground">Schedule your first mentorship session</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessions.map(session => (
                <Card key={session.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Mentorship Session
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(session.scheduled_at).toLocaleString()}
                        <span>•</span>
                        <span>{session.duration_minutes} minutes</span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        session.status === "completed" ? "default" :
                        session.status === "scheduled" ? "secondary" : "outline"
                      }
                    >
                      {session.status}
                    </Badge>
                  </div>

                  {session.notes && (
                    <div className="bg-muted p-3 rounded-lg mt-4">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm text-muted-foreground">{session.notes}</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Mentorship</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{selectedMentor?.user?.full_name}</h4>
              <p className="text-sm text-muted-foreground">{selectedMentor?.current_title}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Introduce yourself and explain why you'd like their mentorship..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Focus Areas (comma-separated)</label>
              <Input
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="Resume building, Interview prep, Career advice"
              />
            </div>
            <Button onClick={sendMentorshipRequest} className="w-full">
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}