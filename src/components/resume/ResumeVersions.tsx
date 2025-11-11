import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { VersionCard } from "./VersionCard";
import { VersionDialog } from "./VersionDialog";
import { SearchAndFilters } from "./SearchAndFilters";

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

type Resume = {
  id: string;
  file_name: string;
};

export function ResumeVersions({ 
  initialResumeId, 
  resumes 
}: { 
  initialResumeId: string;
  resumes: Resume[];
}) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newVersionTitle, setNewVersionTitle] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState(initialResumeId);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<ResumeVersion | null>(null);
  const [editVersionTitle, setEditVersionTitle] = useState("");
  const [newVersionTags, setNewVersionTags] = useState<string[]>([]);
  const [editVersionTags, setEditVersionTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [editTagInput, setEditTagInput] = useState("");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterResumes, setFilterResumes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "title" | "tags">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const commonTags = ["Tech", "Finance", "Startup", "Healthcare", "Enterprise", "Remote", "Senior", "Entry-Level"];

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setLoading(true);
    try {
      // Load all versions from all resumes
      const resumeIds = resumes.map(r => r.id);
      const { data, error } = await supabase
        .from("resume_versions")
        .select("*")
        .in("resume_id", resumeIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Attach resume names to versions
      const versionsWithResumeNames = (data || []).map(version => ({
        ...version,
        resume_name: resumes.find(r => r.id === version.resume_id)?.file_name
      }));
      
      setVersions(versionsWithResumeNames);
    } catch (error: any) {
      console.error("Error loading versions:", error);
      toast.error("Failed to load resume versions");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!newVersionTitle.trim()) {
      toast.error("Please enter a version title");
      return;
    }

    try {
      const { data: resume } = await supabase
        .from("resumes")
        .select("parsed_json, text_content")
        .eq("id", selectedResumeId)
        .single();

      if (!resume) {
        toast.error("Resume not found");
        return;
      }

      const { error } = await supabase
        .from("resume_versions")
        .insert({
          resume_id: selectedResumeId,
          title: newVersionTitle,
          sections_json: resume.parsed_json || { text: resume.text_content },
          tags: newVersionTags,
        });

      if (error) throw error;

      toast.success("Resume version created");
      setNewVersionTitle("");
      setNewVersionTags([]);
      setIsDialogOpen(false);
      loadVersions();
    } catch (error: any) {
      console.error("Error creating version:", error);
      toast.error("Failed to create resume version");
    }
  };

  const handleEditVersion = (version: ResumeVersion) => {
    setEditingVersion(version);
    setEditVersionTitle(version.title);
    setEditVersionTags(version.tags || []);
    setIsEditDialogOpen(true);
  };

  const handleUpdateVersion = async () => {
    if (!editVersionTitle.trim() || !editingVersion) {
      toast.error("Please enter a version title");
      return;
    }

    try {
      const { error } = await supabase
        .from("resume_versions")
        .update({ 
          title: editVersionTitle,
          tags: editVersionTags,
        })
        .eq("id", editingVersion.id);

      if (error) throw error;

      toast.success("Version updated");
      setIsEditDialogOpen(false);
      setEditingVersion(null);
      setEditVersionTitle("");
      setEditVersionTags([]);
      loadVersions();
    } catch (error: any) {
      console.error("Error updating version:", error);
      toast.error("Failed to update version");
    }
  };

  const handleDuplicateVersion = async (version: ResumeVersion) => {
    try {
      const { error } = await supabase
        .from("resume_versions")
        .insert({
          resume_id: selectedResumeId,
          title: `Copy of ${version.title}`,
          sections_json: version.sections_json,
          tags: version.tags || [],
        });

      if (error) throw error;

      toast.success("Version duplicated");
      loadVersions();
    } catch (error: any) {
      console.error("Error duplicating version:", error);
      toast.error("Failed to duplicate version");
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm("Are you sure you want to delete this version?")) return;

    try {
      const { error } = await supabase
        .from("resume_versions")
        .delete()
        .eq("id", versionId);

      if (error) throw error;

      setVersions(prev => prev.filter(v => v.id !== versionId));
      toast.success("Version deleted");
    } catch (error: any) {
      console.error("Error deleting version:", error);
      toast.error("Failed to delete version");
    }
  };

  const addTag = (tag: string, isEdit: boolean = false) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;
    
    if (isEdit) {
      if (!editVersionTags.includes(trimmedTag)) {
        setEditVersionTags([...editVersionTags, trimmedTag]);
      }
      setEditTagInput("");
    } else {
      if (!newVersionTags.includes(trimmedTag)) {
        setNewVersionTags([...newVersionTags, trimmedTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditVersionTags(editVersionTags.filter(t => t !== tagToRemove));
    } else {
      setNewVersionTags(newVersionTags.filter(t => t !== tagToRemove));
    }
  };

  const toggleFilterTag = (tag: string) => {
    setFilterTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleFilterResume = (resumeId: string) => {
    setFilterResumes(prev => 
      prev.includes(resumeId) 
        ? prev.filter(id => id !== resumeId)
        : [...prev, resumeId]
    );
  };

  // Get all unique tags from versions
  const allTags = Array.from(new Set(versions.flatMap(v => v.tags || [])));

  // Filter versions based on selected tags, resumes, and search query
  const filteredVersions = versions.filter(version => {
    const matchesTags = filterTags.length === 0 || 
      filterTags.some(filterTag => version.tags?.includes(filterTag));
    
    const matchesResumes = filterResumes.length === 0 ||
      filterResumes.includes(version.resume_id);
    
    const matchesSearch = searchQuery.trim() === "" ||
      version.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTags && matchesResumes && matchesSearch;
  });

  // Sort filtered versions
  const sortedVersions = [...filteredVersions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "date":
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "tags":
        comparison = (a.tags?.length || 0) - (b.tags?.length || 0);
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (loading) {
    return <div className="text-center py-4">Loading versions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>Resume Versions</CardTitle>
            <CardDescription>
              Create tailored versions for different roles • Showing versions from all resumes
            </CardDescription>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            New Version
          </Button>
          
          <VersionDialog
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            mode="create"
            title={newVersionTitle}
            onTitleChange={setNewVersionTitle}
            tags={newVersionTags}
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            onAddTag={(tag) => addTag(tag, false)}
            onRemoveTag={(tag) => removeTag(tag, false)}
            onSubmit={handleCreateVersion}
            commonTags={commonTags}
            resumes={resumes}
            selectedResumeId={selectedResumeId}
            onResumeChange={setSelectedResumeId}
          />
        </div>
      </CardHeader>
      <CardContent>
        {versions.length > 0 && (
          <SearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            allTags={allTags}
            filterTags={filterTags}
            onToggleFilterTag={toggleFilterTag}
            onClearFilters={() => setFilterTags([])}
            resumes={resumes}
            filterResumes={filterResumes}
            onToggleFilterResume={toggleFilterResume}
            onClearResumeFilters={() => setFilterResumes([])}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderToggle={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
          />
        )}
        {filteredVersions.length === 0 && versions.length > 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No versions match the selected filters.</p>
            <div className="flex gap-2 justify-center mt-2">
              {searchQuery && (
                <Button
                  variant="link"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
              {(filterTags.length > 0 || filterResumes.length > 0) && (
                <Button
                  variant="link"
                  onClick={() => {
                    setFilterTags([]);
                    setFilterResumes([]);
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </div>
        ) : filteredVersions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No versions yet. Create one to tailor your resume for specific roles.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedVersions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                onEdit={handleEditVersion}
                onDuplicate={handleDuplicateVersion}
                onDelete={handleDeleteVersion}
              />
            ))}
          </div>
        )}
      </CardContent>

      <VersionDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        title={editVersionTitle}
        onTitleChange={setEditVersionTitle}
        tags={editVersionTags}
        tagInput={editTagInput}
        onTagInputChange={setEditTagInput}
        onAddTag={(tag) => addTag(tag, true)}
        onRemoveTag={(tag) => removeTag(tag, true)}
        onSubmit={handleUpdateVersion}
        commonTags={commonTags}
      />
    </Card>
  );
}
