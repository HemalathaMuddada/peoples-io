import { FileText, Download, Edit, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ResumeVersion = {
  id: string;
  title: string;
  pdf_url: string | null;
  created_at: string;
  sections_json: any;
  tags: string[];
  resume_id: string;
  resume_name?: string;
};

interface VersionCardProps {
  version: ResumeVersion;
  onEdit: (version: ResumeVersion) => void;
  onDuplicate: (version: ResumeVersion) => void;
  onDelete: (versionId: string) => void;
}

export function VersionCard({ version, onEdit, onDuplicate, onDelete }: VersionCardProps) {
  return (
    <div
      key={version.id}
      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{version.title}</h4>
            {version.resume_name && (
              <Badge variant="outline" className="text-xs">
                {version.resume_name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-muted-foreground">
              Created {new Date(version.created_at).toLocaleDateString()}
            </p>
            {version.tags && version.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {version.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {version.pdf_url && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(version.pdf_url!, "_blank")}
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(version)}
          title="Edit version title"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDuplicate(version)}
          title="Duplicate this version"
        >
          <Copy className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(version.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
