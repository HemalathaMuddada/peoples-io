import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Mail,
  Loader2,
  Copy,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  RotateCcw
} from "lucide-react";

interface FollowUpEmailGeneratorProps {
  applicationId: string;
  suggestionId?: string;
  onBack: () => void;
  onComplete: () => void;
}

export const FollowUpEmailGenerator = ({ 
  applicationId, 
  suggestionId,
  onBack,
  onComplete 
}: FollowUpEmailGeneratorProps) => {
  const [generating, setGenerating] = useState(false);
  const [emailData, setEmailData] = useState<{
    subject: string;
    body: string;
    key_points: string[];
    email_id?: string;
  } | null>(null);
  const [tone, setTone] = useState("professional");
  const [copied, setCopied] = useState(false);
  const [editedBody, setEditedBody] = useState("");

  const generateEmail = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-follow-up-email', {
        body: { 
          application_id: applicationId,
          tone,
          suggestion_id: suggestionId
        }
      });

      if (error) throw error;

      setEmailData(data);
      setEditedBody(data.body);
      toast.success("Follow-up email generated!");
    } catch (error) {
      console.error("Error generating email:", error);
      toast.error("Failed to generate email");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!emailData) return;

    const fullEmail = `Subject: ${emailData.subject}\n\n${editedBody}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const markAsSent = async () => {
    try {
      if (emailData?.email_id) {
        await supabase
          .from("follow_up_emails")
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
            body: editedBody 
          })
          .eq("id", emailData.email_id);
      }

      toast.success("Follow-up marked as sent!");
      onComplete();
    } catch (error) {
      console.error("Error marking as sent:", error);
      toast.error("Failed to update status");
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Follow-up Email Generator
            </CardTitle>
            <CardDescription>
              Generate a personalized follow-up email with AI
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!emailData ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Email Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the tone that best fits the company culture
              </p>
            </div>

            <Button
              onClick={generateEmail}
              disabled={generating}
              size="lg"
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Email...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Follow-up Email
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Subject Line */}
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{emailData.subject}</p>
              </div>
            </div>

            {/* Email Body */}
            <div className="space-y-2">
              <Label htmlFor="email-body">Email Body</Label>
              <Textarea
                id="email-body"
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Feel free to edit the email before sending
              </p>
            </div>

            {/* Key Points */}
            {emailData.key_points && emailData.key_points.length > 0 && (
              <div className="space-y-2">
                <Label>Key Points Covered</Label>
                <ul className="space-y-1">
                  {emailData.key_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex-1"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button
                onClick={markAsSent}
                className="flex-1"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark as Sent
              </Button>
            </div>

            <Button
              onClick={() => {
                setEmailData(null);
                setEditedBody("");
              }}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Generate New Email
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
