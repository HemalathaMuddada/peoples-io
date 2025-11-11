import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VideoIntroTabProps {
  profileId: string;
  videoUrl: string | null;
  videoDuration: number | null;
  onSave: (videoUrl: string, duration: number) => Promise<void>;
}

export default function VideoIntroTab({
  profileId,
  videoUrl,
  videoDuration,
  onSave,
}: VideoIntroTabProps) {
  const [videoUrlInput, setVideoUrlInput] = useState(videoUrl || "");
  const [duration, setDuration] = useState(videoDuration?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!videoUrlInput) {
      toast.error("Please provide a video URL");
      return;
    }

    setSaving(true);
    try {
      await onSave(videoUrlInput, duration ? parseInt(duration) : 0);
      toast.success("Video introduction saved");
    } catch (error: any) {
      console.error("Error saving video:", error);
      toast.error("Failed to save video introduction");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove video introduction?")) return;

    setSaving(true);
    try {
      await onSave("", 0);
      setVideoUrlInput("");
      setDuration("");
      toast.success("Video introduction removed");
    } catch (error: any) {
      console.error("Error removing video:", error);
      toast.error("Failed to remove video introduction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Video Introduction</h2>
        <p className="text-muted-foreground mt-1">
          Record a short video elevator pitch or introduction (30-90 seconds recommended)
        </p>
      </div>

      <Alert>
        <Video className="w-4 h-4" />
        <AlertDescription>
          Upload your video to YouTube, Vimeo, or Loom and paste the embed URL here. Make sure the
          video is set to public or unlisted.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Video Details</CardTitle>
          <CardDescription>
            Add a link to your video introduction. Supported platforms: YouTube, Vimeo, Loom
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Video URL *</Label>
            <Input
              type="url"
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              placeholder="https://www.youtube.com/embed/..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use the embed URL, not the regular video URL
            </p>
          </div>

          <div>
            <Label>Duration (seconds)</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
              min="0"
              max="300"
            />
          </div>

          {videoUrlInput && (
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
              <iframe
                src={videoUrlInput}
                title="Video Introduction"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || !videoUrlInput}>
              {saving ? "Saving..." : "Save Video"}
            </Button>
            {videoUrl && (
              <Button variant="destructive" onClick={handleRemove} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Remove Video
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips for a Great Video Introduction</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Keep it concise: 30-90 seconds is ideal</li>
            <li>• Speak clearly and confidently</li>
            <li>• Introduce yourself and your current role</li>
            <li>• Highlight your key skills and experience</li>
            <li>• Explain what type of opportunities you're looking for</li>
            <li>• Show enthusiasm and personality</li>
            <li>• Use good lighting and a professional background</li>
            <li>• Test your audio quality before recording</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
