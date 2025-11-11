import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  content_url: string;
  tags: string[];
  is_public: boolean;
  download_count: number;
  created_at: string;
}

export function CoachResources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("guide");
  const [contentUrl, setContentUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("mentor_resources")
      .select("*")
      .eq("mentor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading resources", variant: "destructive" });
    } else {
      setResources(data || []);
    }
    setLoading(false);
  };

  const handleAddResource = async () => {
    if (!title || !contentUrl) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("mentor_resources").insert({
      mentor_id: user.id,
      title,
      description,
      resource_type: resourceType,
      content_url: contentUrl,
      is_public: isPublic,
    });

    if (error) {
      toast({ title: "Error adding resource", variant: "destructive" });
    } else {
      toast({ title: "Resource added successfully!" });
      setOpen(false);
      resetForm();
      fetchResources();
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    const { error } = await supabase
      .from("mentor_resources")
      .delete()
      .eq("id", resourceId);

    if (error) {
      toast({ title: "Error deleting resource", variant: "destructive" });
    } else {
      toast({ title: "Resource deleted" });
      fetchResources();
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setResourceType("guide");
    setContentUrl("");
    setIsPublic(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Resource Library
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Resource title"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={resourceType} onValueChange={setResourceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="guide">Guide</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="tool">Tool</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL *</Label>
                  <Input
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Make Public</Label>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>
                <Button onClick={handleAddResource} className="w-full">
                  Add Resource
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{resource.title}</h4>
                    <Badge variant="outline">{resource.resource_type}</Badge>
                    {resource.is_public && (
                      <Badge variant="secondary">Public</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {resource.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {resource.download_count} downloads
                    </span>
                    <span>
                      {new Date(resource.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={resource.content_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteResource(resource.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {resources.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No resources yet. Share your knowledge with clients!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
