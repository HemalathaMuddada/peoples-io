import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, FileText } from "lucide-react";

type Resume = {
  id: string;
  file_name: string;
};

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  allTags: string[];
  filterTags: string[];
  onToggleFilterTag: (tag: string) => void;
  onClearFilters: () => void;
  resumes: Resume[];
  filterResumes: string[];
  onToggleFilterResume: (resumeId: string) => void;
  onClearResumeFilters: () => void;
  sortBy: "date" | "title" | "tags";
  onSortByChange: (value: "date" | "title" | "tags") => void;
  sortOrder: "asc" | "desc";
  onSortOrderToggle: () => void;
}

export function SearchAndFilters({
  searchQuery,
  onSearchChange,
  allTags,
  filterTags,
  onToggleFilterTag,
  onClearFilters,
  resumes,
  filterResumes,
  onToggleFilterResume,
  onClearResumeFilters,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
}: SearchAndFiltersProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search versions by title..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Filter by tags
              {filterTags.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filterTags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-popover z-50" align="start">
            <div className="space-y-2">
              <h4 className="font-medium text-sm mb-3">Filter by tags</h4>
              {allTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags available</p>
              ) : (
                <div className="space-y-2">
                  {allTags.map(tag => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filter-${tag}`}
                        checked={filterTags.includes(tag)}
                        onCheckedChange={() => onToggleFilterTag(tag)}
                      />
                      <label
                        htmlFor={`filter-${tag}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {tag}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {filterTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="w-full mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="w-4 h-4" />
              Filter by resume
              {filterResumes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filterResumes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-popover z-50" align="start">
            <div className="space-y-2">
              <h4 className="font-medium text-sm mb-3">Filter by resume</h4>
              {resumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resumes available</p>
              ) : (
                <div className="space-y-2">
                  {resumes.map(resume => (
                    <div key={resume.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filter-resume-${resume.id}`}
                        checked={filterResumes.includes(resume.id)}
                        onCheckedChange={() => onToggleFilterResume(resume.id)}
                      />
                      <label
                        htmlFor={`filter-resume-${resume.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {resume.file_name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {filterResumes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearResumeFilters}
                  className="w-full mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="date">Sort by Date</SelectItem>
            <SelectItem value="title">Sort by Title</SelectItem>
            <SelectItem value="tags">Sort by Tags</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={onSortOrderToggle}
          className="gap-2"
        >
          {sortOrder === "asc" ? "↑" : "↓"}
          {sortOrder === "asc" ? "Ascending" : "Descending"}
        </Button>

        {(filterTags.length > 0 || filterResumes.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {filterTags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                Tag: {tag}
                <button
                  onClick={() => onToggleFilterTag(tag)}
                  className="ml-1 hover:text-destructive"
                >
                  ×
                </button>
              </Badge>
            ))}
            {filterResumes.map(resumeId => {
              const resume = resumes.find(r => r.id === resumeId);
              return resume ? (
                <Badge key={resumeId} variant="secondary" className="gap-1">
                  Resume: {resume.file_name}
                  <button
                    onClick={() => onToggleFilterResume(resumeId)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
