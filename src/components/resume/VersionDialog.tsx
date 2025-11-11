import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagManager } from "./TagManager";

interface Resume {
  id: string;
  file_name: string;
}

interface VersionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  title: string;
  onTitleChange: (value: string) => void;
  tags: string[];
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onSubmit: () => void;
  commonTags: string[];
  resumes?: Resume[];
  selectedResumeId?: string;
  onResumeChange?: (resumeId: string) => void;
}

export function VersionDialog({
  isOpen,
  onOpenChange,
  mode,
  title,
  onTitleChange,
  tags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  onSubmit,
  commonTags,
  resumes,
  selectedResumeId,
  onResumeChange,
}: VersionDialogProps) {
  const dialogTitle = mode === "create" ? "Create Resume Version" : "Edit Version Title";
  const submitLabel = mode === "create" ? "Create Version" : "Update Version";
  const inputId = mode === "create" ? "version_title" : "edit_version_title";
  const tagInputId = mode === "create" ? "version_tags" : "edit_version_tags";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {mode === "create" && resumes && resumes.length > 0 && (
            <div>
              <Label htmlFor="resume_select">Select Resume</Label>
              <Select value={selectedResumeId} onValueChange={onResumeChange}>
                <SelectTrigger id="resume_select">
                  <SelectValue placeholder="Choose a resume" />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((resume) => (
                    <SelectItem key={resume.id} value={resume.id}>
                      {resume.file_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor={inputId}>Version Title</Label>
            <Input
              id={inputId}
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g., Senior Frontend Developer - Tech Companies"
            />
          </div>
          <TagManager
            tags={tags}
            tagInput={tagInput}
            commonTags={commonTags}
            onTagInputChange={onTagInputChange}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            inputId={tagInputId}
          />
          <Button onClick={onSubmit} className="w-full">
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
