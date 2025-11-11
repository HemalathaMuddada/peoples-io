import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Trash2, Eye, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ScheduledEmail {
  id: string;
  subject: string;
  body: string;
  scheduled_for: string;
  status: string;
  sent_count: number;
  failed_count: number;
  total_count: number;
  recipients: Array<{
    email: string;
    name: string;
  }>;
  created_at: string;
}

export function ScheduledEmailsList() {
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<ScheduledEmail | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchScheduledEmails();
  }, []);

  const fetchScheduledEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scheduled_emails")
        .select("*")
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      
      // Cast the recipients field from Json to the expected type
      const typedData = (data || []).map(email => ({
        ...email,
        recipients: email.recipients as unknown as Array<{ email: string; name: string; }>
      }));
      
      setScheduledEmails(typedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled email?")) return;

    try {
      const { error } = await supabase
        .from("scheduled_emails")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("status", "pending"); // Only allow cancelling pending emails

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scheduled email cancelled",
      });

      fetchScheduledEmails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: JSX.Element }> = {
      pending: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      processing: { variant: "default", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
      completed: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3 mr-1" /> },
      cancelled: { variant: "outline", icon: <XCircle className="h-3 w-3 mr-1" /> },
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Loading scheduled emails...</p>
      </Card>
    );
  }

  if (scheduledEmails.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-2">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No scheduled emails</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[600px]">
        <div className="space-y-3">
          {scheduledEmails.map((email) => (
            <Card key={email.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{email.subject}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      To {email.total_count} recipient{email.total_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  {getStatusBadge(email.status)}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(email.scheduled_for) > new Date() ? "Scheduled for" : "Was scheduled for"}{" "}
                    {format(new Date(email.scheduled_for), "PPp")}
                  </div>
                </div>

                {email.status === "completed" && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 dark:text-green-400">
                      ✓ {email.sent_count} sent
                    </span>
                    {email.failed_count > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        ✗ {email.failed_count} failed
                      </span>
                    )}
                  </div>
                )}

                {email.status === "failed" && (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Failed: {email.sent_count} sent, {email.failed_count} failed
                  </div>
                )}

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedEmail(email)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Scheduled Email Details</DialogTitle>
                      </DialogHeader>
                      {selectedEmail && (
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium">Subject:</Label>
                            <p className="text-sm mt-1">{selectedEmail.subject}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Body:</Label>
                            <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                              {selectedEmail.body}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Recipients ({selectedEmail.recipients.length}):</Label>
                            <ScrollArea className="h-[150px] mt-1">
                              <div className="space-y-1">
                                {selectedEmail.recipients.map((recipient, idx) => (
                                  <div key={idx} className="text-sm">
                                    {recipient.name} ({recipient.email})
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {email.status === "pending" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelScheduled(email.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
