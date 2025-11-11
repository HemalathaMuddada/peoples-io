import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CoachingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId: string;
  coachName: string;
}

export function CoachingRequestDialog({
  open,
  onOpenChange,
  coachId,
  coachName,
}: CoachingRequestDialogProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit a coaching requisition",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("mentorship_requests").insert({
        mentor_id: coachId,
        mentee_id: user.id,
        message: message.trim(),
      });

      if (error) throw error;

      toast({
        title: "Requisition sent!",
        description: `Your coaching requisition to ${coachName} has been sent.`,
      });

      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send coaching requisition",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Coaching Requisition</DialogTitle>
          <DialogDescription>
            Send a coaching requisition to {coachName}. Include a brief message
            about why you'd like them as your coach.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Hi, I'm interested in your expertise in... I'm hoping to..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !message.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Requisition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
