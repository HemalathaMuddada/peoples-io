import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface InvitationRow {
  email: string;
  role: string;
  status?: "pending" | "success" | "error";
  error?: string;
}

interface BulkInvitationUploadProps {
  onInvitationsSent: () => void;
}

const validRoles = ["org_admin", "hiring_manager", "recruiter", "agency_admin"];

const invitationSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  role: z.enum(["org_admin", "hiring_manager", "recruiter", "agency_admin"] as const, {
    errorMap: () => ({ message: "Invalid role. Must be one of: org_admin, hiring_manager, recruiter, agency_admin" })
  }),
});

export function BulkInvitationUpload({ onInvitationsSent }: BulkInvitationUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadTemplate = () => {
    const template = "email,role\nexample@company.com,org_admin\nuser@company.com,hiring_manager\n";
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitation_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    // Validate file size (max 1MB)
    if (selectedFile.size > 1024 * 1024) {
      toast.error("File size must be less than 1MB");
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: InvitationRow[] = [];
        const errors: string[] = [];

        results.data.forEach((row: any, index: number) => {
          // Validate required fields exist
          if (!row.email || !row.role) {
            errors.push(`Row ${index + 2}: Missing email or role`);
            return;
          }

          // Validate data
          const validation = invitationSchema.safeParse({
            email: row.email.trim(),
            role: row.role.trim().toLowerCase(),
          });

          if (!validation.success) {
            const errorMsg = validation.error.errors.map(e => e.message).join(", ");
            errors.push(`Row ${index + 2}: ${errorMsg}`);
          } else {
            parsed.push({
              email: validation.data.email,
              role: validation.data.role,
              status: "pending",
            });
          }
        });

        if (errors.length > 0) {
          toast.error(
            <div>
              <p className="font-semibold">CSV validation errors:</p>
              <ul className="list-disc pl-4 mt-2 text-xs">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more</li>}
              </ul>
            </div>,
            { duration: 10000 }
          );
          return;
        }

        if (parsed.length === 0) {
          toast.error("No valid invitations found in CSV");
          return;
        }

        if (parsed.length > 100) {
          toast.error("Maximum 100 invitations per batch");
          return;
        }

        setInvitations(parsed);
        setShowPreview(true);
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        toast.error("Failed to parse CSV file. Please check the format.");
      },
    });
  };

  const sendInvitations = async () => {
    setProcessing(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Get user's org
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("org_id")
        .eq("user_id", user.id)
        .in("role", ["org_admin", "platform_admin", "agency_admin"])
        .single();

      if (!userRoles) {
        toast.error("You must be an admin to send invitations");
        return;
      }

      const orgId = userRoles.org_id;
      const updatedInvitations = [...invitations];

      // Send invitations one by one
      for (let i = 0; i < updatedInvitations.length; i++) {
        try {
          const invitation = updatedInvitations[i];
          
          const { error } = await supabase
            .from("company_invitations")
            .insert({
              org_id: orgId,
              email: invitation.email,
              role: invitation.role as any,
              invited_by: user.id,
            });

          if (error) {
            updatedInvitations[i].status = "error";
            updatedInvitations[i].error = error.message;
          } else {
            updatedInvitations[i].status = "success";
          }
        } catch (error: any) {
          updatedInvitations[i].status = "error";
          updatedInvitations[i].error = error.message || "Unknown error";
        }

        setInvitations([...updatedInvitations]);
        setProgress(((i + 1) / updatedInvitations.length) * 100);
      }

      const successCount = updatedInvitations.filter(i => i.status === "success").length;
      const errorCount = updatedInvitations.filter(i => i.status === "error").length;

      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} invitation${successCount > 1 ? "s" : ""}`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to send ${errorCount} invitation${errorCount > 1 ? "s" : ""}`);
      }

      // Refresh parent list after a short delay
      setTimeout(() => {
        onInvitationsSent();
      }, 1000);
    } catch (error: any) {
      console.error("Error sending invitations:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      org_admin: "Organization Admin",
      hiring_manager: "Hiring Manager",
      recruiter: "Recruiter",
      agency_admin: "Agency Admin",
    };
    return labels[role] || role;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Invitation Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV file to send multiple invitations at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Template
            </Button>
            <p className="text-sm text-muted-foreground">
              Use the template to ensure proper formatting
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={processing}
            />
            <p className="text-xs text-muted-foreground">
              Maximum 100 invitations per file. File must be less than 1MB.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">CSV Format Requirements:</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>Headers: <code className="bg-background px-1 py-0.5 rounded">email</code>, <code className="bg-background px-1 py-0.5 rounded">role</code></li>
              <li>Valid roles: org_admin, hiring_manager, recruiter, agency_admin</li>
              <li>One invitation per line</li>
              <li>Email addresses must be valid</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Review Invitations</DialogTitle>
            <DialogDescription>
              Review {invitations.length} invitation{invitations.length > 1 ? "s" : ""} before sending
            </DialogDescription>
          </DialogHeader>

          {processing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Sending invitations...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">{invitation.email}</TableCell>
                    <TableCell>{getRoleLabel(invitation.role)}</TableCell>
                    <TableCell className="text-right">
                      {invitation.status === "success" && (
                        <Badge variant="default" className="flex items-center gap-1 w-fit ml-auto">
                          <CheckCircle className="h-3 w-3" />
                          Sent
                        </Badge>
                      )}
                      {invitation.status === "error" && (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit ml-auto">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                      {invitation.status === "pending" && (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit ml-auto">
                          <AlertCircle className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPreview(false);
                setFile(null);
                setInvitations([]);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={sendInvitations}
              disabled={processing || invitations.every(i => i.status !== "pending")}
            >
              {processing ? "Sending..." : `Send ${invitations.filter(i => i.status === "pending").length} Invitations`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
