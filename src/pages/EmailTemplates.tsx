import { useAdminCheck } from "@/hooks/useAdminCheck";
import { EmailTemplatePreview } from "@/components/invitations/EmailTemplatePreview";
import { Mail } from "lucide-react";

export default function EmailTemplates() {
  useAdminCheck();

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Email Templates
        </h1>
        <p className="text-muted-foreground">
          Customize email templates for your organization
        </p>
      </div>

      <EmailTemplatePreview />
    </div>
  );
}
