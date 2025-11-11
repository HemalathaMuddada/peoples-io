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
import { MessageSquare, Heart, Eye, Pin, Lock, Plus, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  { value: "all", label: "All Posts" },
  { value: "job_search", label: "Job Search" },
  { value: "interviews", label: "Interviews" },
  { value: "networking", label: "Networking" },
  { value: "career_advice", label: "Career Advice" },
  { value: "tech_tips", label: "Tech & Tips" },
  { value: "general", label: "General" },
];

export default function Community() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "general", tags: "" });
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (userId) {
      loadPosts();
    }
  }, [selectedCategory, userId]);

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

  const loadPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("community_posts")
        .select(`
          *,
          profile:candidate_profiles(
            id,
            current_title,
            location
          ),
          user:profiles!community_posts_user_id_fkey(
            full_name
          )
        `)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim() || !profileId || !userId) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const tags = newPost.tags.split(",").map(t => t.trim()).filter(Boolean);
      
      const { error } = await supabase
        .from("community_posts")
        .insert({
          user_id: userId,
          profile_id: profileId,
          title: newPost.title,
          content: newPost.content,
          category: newPost.category,
          tags
        });

      if (error) throw error;

      toast.success("Post created successfully!");
      setShowNewPostDialog(false);
      setNewPost({ title: "", content: "", category: "general", tags: "" });
      loadPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    }
  };

  const toggleLike = async (postId: string, isLiked: boolean) => {
    if (!userId) return;

    try {
      if (isLiked) {
        await supabase
          .from("community_post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("community_post_likes")
          .insert({ post_id: postId, user_id: userId });
      }
      loadPosts();
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const filteredPosts = posts.filter(post =>
    searchQuery === "" ||
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Community Forum</h1>
          <p className="text-muted-foreground">Connect, share, and learn from fellow job seekers</p>
        </div>
        <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="What's on your mind?"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                >
                  {CATEGORIES.filter(c => c.value !== "all").map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="Share your thoughts, questions, or advice..."
                  rows={6}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={newPost.tags}
                  onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                  placeholder="resume, networking, tech"
                />
              </div>
              <Button onClick={createPost} className="w-full">Post to Community</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.value}
              variant={selectedCategory === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading posts...</div>
      ) : filteredPosts.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-muted-foreground mb-4">Be the first to start a discussion!</p>
          <Button onClick={() => setShowNewPostDialog(true)}>Create Post</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <Card key={post.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                    {post.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                    <Badge variant="secondary">{CATEGORIES.find(c => c.value === post.category)?.label}</Badge>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{post.title}</h3>
                  <p className="text-muted-foreground mb-4 line-clamp-2">{post.content}</p>
                  
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex gap-2 mb-4">
                      {post.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {post.view_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {post.comment_count}
                    </div>
                    <button 
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(post.id, false);
                      }}
                    >
                      <Heart className="h-4 w-4" />
                      {post.like_count}
                    </button>
                    <span>•</span>
                    <span>by {post.user?.full_name || "Anonymous"}</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
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