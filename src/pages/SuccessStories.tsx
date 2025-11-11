import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Heart, MessageSquare, Plus, TrendingUp, Calendar, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function SuccessStories() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewStoryDialog, setShowNewStoryDialog] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [newStory, setNewStory] = useState({
    title: "",
    story: "",
    company: "",
    job_title: "",
    salary_range: "",
    application_count: "",
    interview_count: "",
    timeline_weeks: "",
    tips: "",
    tags: "",
  });

  useEffect(() => {
    loadProfile();
    loadStories();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

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

  const loadStories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("success_stories")
        .select(`
          *,
          profile:candidate_profiles(
            current_title,
            location
          ),
          user:profiles!success_stories_user_id_fkey(
            full_name
          )
        `)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStories(data || []);
    } catch (error) {
      console.error("Error loading stories:", error);
      toast.error("Failed to load success stories");
    } finally {
      setLoading(false);
    }
  };

  const createStory = async () => {
    if (!newStory.title.trim() || !newStory.story.trim() || !newStory.company || !newStory.job_title || !profileId || !userId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const tips = newStory.tips.split("\n").filter(Boolean);
      const tags = newStory.tags.split(",").map(t => t.trim()).filter(Boolean);

      const { error } = await supabase
        .from("success_stories")
        .insert({
          user_id: userId,
          profile_id: profileId,
          title: newStory.title,
          story: newStory.story,
          company: newStory.company,
          job_title: newStory.job_title,
          salary_range: newStory.salary_range || null,
          application_count: newStory.application_count ? parseInt(newStory.application_count) : null,
          interview_count: newStory.interview_count ? parseInt(newStory.interview_count) : null,
          timeline_weeks: newStory.timeline_weeks ? parseInt(newStory.timeline_weeks) : null,
          tips,
          tags,
        });

      if (error) throw error;

      toast.success("Success story shared! 🎉");
      setShowNewStoryDialog(false);
      setNewStory({
        title: "",
        story: "",
        company: "",
        job_title: "",
        salary_range: "",
        application_count: "",
        interview_count: "",
        timeline_weeks: "",
        tips: "",
        tags: "",
      });
      loadStories();
    } catch (error) {
      console.error("Error creating story:", error);
      toast.error("Failed to share success story");
    }
  };

  const toggleLike = async (storyId: string, isLiked: boolean) => {
    if (!userId) return;

    try {
      if (isLiked) {
        await supabase
          .from("success_story_likes")
          .delete()
          .eq("story_id", storyId)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("success_story_likes")
          .insert({ story_id: storyId, user_id: userId });
      }
      loadStories();
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Success Stories
          </h1>
          <p className="text-muted-foreground">Celebrate wins and get inspired by peers who landed their dream jobs</p>
        </div>
        <Dialog open={showNewStoryDialog} onOpenChange={setShowNewStoryDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Share Your Win
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Share Your Success Story</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newStory.title}
                  onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                  placeholder="e.g., Landed my dream role at Google!"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company *</label>
                  <Input
                    value={newStory.company}
                    onChange={(e) => setNewStory({ ...newStory, company: e.target.value })}
                    placeholder="Google"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Job Title *</label>
                  <Input
                    value={newStory.job_title}
                    onChange={(e) => setNewStory({ ...newStory, job_title: e.target.value })}
                    placeholder="Senior Software Engineer"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Your Story *</label>
                <Textarea
                  value={newStory.story}
                  onChange={(e) => setNewStory({ ...newStory, story: e.target.value })}
                  placeholder="Share your journey, challenges overcome, and how you succeeded..."
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Salary Range (Optional)</label>
                  <Input
                    value={newStory.salary_range}
                    onChange={(e) => setNewStory({ ...newStory, salary_range: e.target.value })}
                    placeholder="$120k - $150k"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Timeline (weeks)</label>
                  <Input
                    type="number"
                    value={newStory.timeline_weeks}
                    onChange={(e) => setNewStory({ ...newStory, timeline_weeks: e.target.value })}
                    placeholder="8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Applications Sent</label>
                  <Input
                    type="number"
                    value={newStory.application_count}
                    onChange={(e) => setNewStory({ ...newStory, application_count: e.target.value })}
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Interviews Completed</label>
                  <Input
                    type="number"
                    value={newStory.interview_count}
                    onChange={(e) => setNewStory({ ...newStory, interview_count: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Tips for Others (one per line)</label>
                <Textarea
                  value={newStory.tips}
                  onChange={(e) => setNewStory({ ...newStory, tips: e.target.value })}
                  placeholder="Network actively on LinkedIn&#10;Practice system design daily&#10;Follow up after interviews"
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={newStory.tags}
                  onChange={(e) => setNewStory({ ...newStory, tags: e.target.value })}
                  placeholder="tech, remote, senior"
                />
              </div>
              <Button onClick={createStory} className="w-full">Share Success Story</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading success stories...</div>
      ) : stories.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No success stories yet</h3>
          <p className="text-muted-foreground mb-4">Be the first to share your job search win!</p>
          <Button onClick={() => setShowNewStoryDialog(true)}>Share Your Story</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {stories.map(story => (
            <Card key={story.id} className={`p-6 ${story.is_featured ? "border-yellow-500 border-2" : ""}`}>
              {story.is_featured && (
                <Badge className="mb-4 bg-yellow-500">Featured Story</Badge>
              )}
              
              <div className="flex items-start gap-4">
                <Trophy className="h-12 w-12 text-yellow-500 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{story.title}</h2>
                  
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{story.job_title}</span>
                      <span className="text-muted-foreground">at</span>
                      <span className="font-semibold">{story.company}</span>
                    </div>
                    {story.salary_range && (
                      <Badge variant="secondary">{story.salary_range}</Badge>
                    )}
                  </div>

                  <p className="text-muted-foreground mb-4 whitespace-pre-line">{story.story}</p>

                  {story.tips && story.tips.length > 0 && (
                    <div className="bg-muted p-4 rounded-lg mb-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Tips from {story.user?.full_name || "the author"}:
                      </h4>
                      <ul className="list-disc list-inside space-y-1">
                        {story.tips.map((tip: string, i: number) => (
                          <li key={i} className="text-sm">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                    {story.application_count && (
                      <span>{story.application_count} applications</span>
                    )}
                    {story.interview_count && (
                      <span>{story.interview_count} interviews</span>
                    )}
                    {story.timeline_weeks && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {story.timeline_weeks} weeks
                      </span>
                    )}
                  </div>

                  {story.tags && story.tags.length > 0 && (
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {story.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm pt-4 border-t">
                    <button
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={() => toggleLike(story.id, false)}
                    >
                      <Heart className="h-4 w-4" />
                      {story.like_count} likes
                    </button>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {story.comment_count} comments
                    </div>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}