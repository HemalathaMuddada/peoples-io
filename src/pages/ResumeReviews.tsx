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
import { FileText, MessageSquare, Star, ThumbsUp, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ResumeReviews() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [newRequest, setNewRequest] = useState({
    resume_id: "",
    title: "",
    description: "",
    target_role: "",
  });
  const [newFeedback, setNewFeedback] = useState({
    rating: 5,
    feedback: "",
    strengths: "",
    improvements: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profileId) {
      loadRequests();
      loadMyRequests();
      loadResumes();
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

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("resume_review_requests")
        .select(`
          *,
          requester:candidate_profiles!resume_review_requests_requester_id_fkey(
            current_title,
            location
          ),
          user:candidate_profiles!resume_review_requests_requester_id_fkey(
            user_id
          )
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error loading requests:", error);
      toast.error("Failed to load review requests");
    } finally {
      setLoading(false);
    }
  };

  const loadMyRequests = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from("resume_review_requests")
        .select(`
          *,
          feedback:resume_review_feedback(
            *,
            reviewer:candidate_profiles(
              current_title,
              location
            )
          )
        `)
        .eq("requester_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyRequests(data || []);
    } catch (error) {
      console.error("Error loading my requests:", error);
    }
  };

  const loadResumes = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, title, created_at")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch (error) {
      console.error("Error loading resumes:", error);
    }
  };

  const createRequest = async () => {
    if (!newRequest.resume_id || !newRequest.title.trim() || !profileId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("resume_review_requests")
        .insert({
          requester_id: profileId,
          resume_id: newRequest.resume_id,
          title: newRequest.title,
          description: newRequest.description,
          target_role: newRequest.target_role,
        });

      if (error) throw error;

      toast.success("Review request created successfully!");
      setShowNewRequestDialog(false);
      setNewRequest({ resume_id: "", title: "", description: "", target_role: "" });
      loadRequests();
      loadMyRequests();
    } catch (error) {
      console.error("Error creating request:", error);
      toast.error("Failed to create review request");
    }
  };

  const submitFeedback = async () => {
    if (!selectedRequest || !newFeedback.feedback.trim() || !profileId) {
      toast.error("Please provide feedback");
      return;
    }

    try {
      const strengths = newFeedback.strengths.split("\n").filter(Boolean);
      const improvements = newFeedback.improvements.split("\n").filter(Boolean);

      const { error } = await supabase
        .from("resume_review_feedback")
        .insert({
          review_request_id: selectedRequest.id,
          reviewer_id: profileId,
          rating: newFeedback.rating,
          feedback: newFeedback.feedback,
          strengths,
          improvements,
        });

      if (error) throw error;

      await supabase
        .from("resume_review_requests")
        .update({ 
          review_count: (selectedRequest.review_count || 0) + 1,
          status: "in_review"
        })
        .eq("id", selectedRequest.id);

      toast.success("Feedback submitted successfully!");
      setShowFeedbackDialog(false);
      setSelectedRequest(null);
      setNewFeedback({ rating: 5, feedback: "", strengths: "", improvements: "" });
      loadRequests();
      loadMyRequests();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Peer Resume Reviews</h1>
          <p className="text-muted-foreground">Get feedback from fellow job seekers and help others improve</p>
        </div>
        <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Request Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Resume Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Resume</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newRequest.resume_id}
                  onChange={(e) => setNewRequest({ ...newRequest, resume_id: e.target.value })}
                >
                  <option value="">Choose a resume...</option>
                  {resumes.map(resume => (
                    <option key={resume.id} value={resume.id}>{resume.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newRequest.title}
                  onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                  placeholder="e.g., Looking for feedback on my Software Engineer resume"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target Role (Optional)</label>
                <Input
                  value={newRequest.target_role}
                  onChange={(e) => setNewRequest({ ...newRequest, target_role: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  placeholder="What specific areas would you like feedback on?"
                  rows={4}
                />
              </div>
              <Button onClick={createRequest} className="w-full">Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse">Browse Requests</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          {loading ? (
            <div className="text-center py-12">Loading requests...</div>
          ) : requests.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No review requests available</h3>
              <p className="text-muted-foreground">Check back later or submit your own resume for review!</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {requests.map(request => (
                <Card key={request.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{request.title}</h3>
                      {request.target_role && (
                        <Badge variant="secondary" className="mb-2">Target: {request.target_role}</Badge>
                      )}
                      {request.description && (
                        <p className="text-muted-foreground">{request.description}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowFeedbackDialog(true);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Provide Feedback
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{request.requester?.current_title || "Job Seeker"}</span>
                    <span>•</span>
                    <span>{request.review_count} reviews</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-requests">
          {myRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No review requests yet</h3>
              <p className="text-muted-foreground mb-4">Submit your resume to get valuable feedback from peers</p>
              <Button onClick={() => setShowNewRequestDialog(true)}>Request Review</Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {myRequests.map(request => (
                <Card key={request.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{request.title}</h3>
                      <div className="flex gap-2 mb-2">
                        <Badge variant={request.status === "open" ? "secondary" : "default"}>
                          {request.status}
                        </Badge>
                        <Badge variant="outline">{request.review_count} reviews</Badge>
                      </div>
                    </div>
                  </div>

                  {request.feedback && request.feedback.length > 0 && (
                    <div className="space-y-4 mt-4">
                      <h4 className="font-semibold">Feedback Received:</h4>
                      {request.feedback.map((fb: any) => (
                        <Card key={fb.id} className="p-4 bg-muted/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < fb.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              by {fb.reviewer?.current_title || "Peer Reviewer"}
                            </span>
                          </div>
                          <p className="text-sm mb-3">{fb.feedback}</p>
                          {fb.strengths && fb.strengths.length > 0 && (
                            <div className="mb-2">
                              <p className="text-sm font-medium text-green-600">Strengths:</p>
                              <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {fb.strengths.map((s: string, i: number) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {fb.improvements && fb.improvements.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-amber-600">Areas for Improvement:</p>
                              <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {fb.improvements.map((s: string, i: number) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rating</label>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setNewFeedback({ ...newFeedback, rating: i + 1 })}
                  >
                    <Star
                      className={`h-6 w-6 ${i < newFeedback.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Overall Feedback</label>
              <Textarea
                value={newFeedback.feedback}
                onChange={(e) => setNewFeedback({ ...newFeedback, feedback: e.target.value })}
                placeholder="Provide constructive feedback on the resume..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Strengths (one per line)</label>
              <Textarea
                value={newFeedback.strengths}
                onChange={(e) => setNewFeedback({ ...newFeedback, strengths: e.target.value })}
                placeholder="What works well in this resume?"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Areas for Improvement (one per line)</label>
              <Textarea
                value={newFeedback.improvements}
                onChange={(e) => setNewFeedback({ ...newFeedback, improvements: e.target.value })}
                placeholder="What could be improved?"
                rows={3}
              />
            </div>
            <Button onClick={submitFeedback} className="w-full">Submit Feedback</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}