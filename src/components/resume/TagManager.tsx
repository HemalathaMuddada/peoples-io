import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TagManagerProps {
  tags: string[];
  tagInput: string;
  commonTags: string[];
  onTagInputChange: (value: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  label?: string;
  inputId?: string;
}

export function TagManager({
  tags,
  tagInput,
  commonTags,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
  label = "Tags",
  inputId = "version_tags",
}: TagManagerProps) {
  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              onClick={() => onRemoveTag(tag)}
              className="ml-1 hover:text-destructive"
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2 mb-2">
        <Input
          id={inputId}
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddTag(tagInput);
            }
          }}
          placeholder="Type a tag and press Enter"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {commonTags.map(tag => (
          <Badge
            key={tag}
            variant="outline"
            className="cursor-pointer hover:bg-accent"
            onClick={() => onAddTag(tag)}
          >
            + {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
