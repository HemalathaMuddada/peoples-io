import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Upload, FileText, Loader2, TrendingUp, CheckCircle2, AlertCircle, Trash2, Eye, Sparkles, Download } from "lucide-react";
import { ResumeVersions } from "@/components/resume/ResumeVersions";

interface Resume {
  id: string;
  file_name: string;
  file_url: string;
  ats_score: number | null;
  ats_feedback: any;
  created_at: string;
  text_content?: string | null;
}

export default function Resumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewResume, setPreviewResume] = useState<Resume | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState<string | null>(null);
  const [enhancedContent, setEnhancedContent] = useState<string | null>(null);
  const [enhancedDialogOpen, setEnhancedDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResumes(data || []);
    } catch (error: any) {
      console.error("Error loading resumes:", error);
      toast.error("Failed to load resumes");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation (user feedback only, not security)
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or Word document");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be less than 20MB");
      return;
    }

    setUploading(true);
    let uploadedFileName: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to storage first
      const fileExt = file.name.split(".").pop();
      uploadedFileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(uploadedFileName, file);

      if (uploadError) throw uploadError;

      // Server-side validation with file signature verification
      const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        "validate-resume-upload",
        {
          body: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            filePathInStorage: uploadedFileName,
          },
        }
      );

      if (validationError) {
        // Delete uploaded file if validation fails
        if (uploadedFileName) {
          await supabase.storage.from("resumes").remove([uploadedFileName]);
        }
        throw new Error(validationError.message || "Validation failed");
      }

      if (!validationResult?.valid) {
        // File was already removed by validation function if invalid
        throw new Error(validationResult?.error || "File validation failed");
      }

      // Get org_id from user's profile (not candidate_profiles)
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .single();

      // Get candidate profile if exists
      const { data: candidateProfile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Create resume record
      const { data: resume, error: dbError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          org_id: userProfile?.org_id,
          profile_id: candidateProfile?.id,
          file_url: uploadedFileName,
          file_name: file.name,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Trigger background text extraction for all supported formats
      if (resume) {
        // Call extraction function in background (fire and forget)
        supabase.functions
          .invoke("extract-resume-text", {
            body: { 
              resumeId: resume.id, 
              filePath: uploadedFileName 
            }
          })
          .then(({ error: extractError }) => {
            if (extractError) {
              console.error("Text extraction failed:", extractError);
              toast.error("Text extraction failed. Try re-uploading.");
            } else {
              console.log("Text extraction started successfully");
            }
          });
      }

      toast.success("Resume uploaded successfully! Text extraction in progress...");
      
      loadResumes();
    } catch (error: any) {
      console.error("Upload error:", error);
      
      // Clean up uploaded file on any error
      if (uploadedFileName) {
        try {
          await supabase.storage.from("resumes").remove([uploadedFileName]);
        } catch (cleanupError) {
          console.error("Failed to clean up file:", cleanupError);
        }
      }
      
      if (error.message?.includes("Rate limit") || error.message?.includes("Too many")) {
        toast.error(error.message);
      } else {
        toast.error(error.message || "Failed to upload resume");
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const analyzeResume = async (resumeId: string) => {
    setAnalyzing(resumeId);
    try {
      const target = resumes.find((r) => r.id === resumeId);

      // Check file extension
      const ext = (target?.file_name || target?.file_url || '').split('.').pop()?.toLowerCase();

      let textToAnalyze: string | null | undefined = target?.text_content;

      // If we don't have extracted text yet, try to extract first
      if (target && !target.text_content) {
        const { data: extractData, error: extractError } = await supabase.functions.invoke(
          "extract-resume-text",
          {
            body: {
              resumeId,
              filePath: target.file_url,
            },
          }
        );

        const hasText = !!extractData?.hasText || (extractData?.textLength ?? 0) > 0;
        if (extractError || !extractData?.success || !hasText) {
          const msg = extractData?.unsupported && extractData?.reason 
            ? extractData.reason 
            : 'We could not extract text automatically. Please try a clearer PDF/DOCX.';
          toast.error(msg);
          return;
        }

        // Fetch the freshly updated resume row directly to avoid state timing issues
        const { data: refreshed } = await supabase
          .from('resumes')
          .select('text_content')
          .eq('id', resumeId)
          .single();
        textToAnalyze = refreshed?.text_content;
      }

      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { resumeId, textContent: textToAnalyze || undefined },
      });

      if (error) throw error;

      toast.success(`ATS Score: ${data.atsScore}/100`);
      loadResumes();
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze resume");
    } finally {
      setAnalyzing(null);
    }
  };

  const deleteResume = async (resumeId: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from("resumes")
        .delete()
        .eq("id", resumeId);

      if (dbError) throw dbError;

      // Delete from storage (fileUrl is the full path)
      await supabase.storage
        .from("resumes")
        .remove([fileUrl]);

      toast.success("Resume deleted");
      loadResumes();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete resume");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return TrendingUp;
    return AlertCircle;
  };

  const isPdf = (name?: string | null) => {
    if (!name) return false;
    return name.toLowerCase().endsWith('.pdf');
  };

  const handlePreviewResume = async (resume: Resume) => {
    try {
      setPreviewResume(resume);
      setPreviewUrl(null);
      setDownloadUrl(null);

      // Always create a signed URL for download/open in new tab
      const { data: signed, error: signErr } = await supabase.storage
        .from("resumes")
        .createSignedUrl(resume.file_url, 3600);
      if (signErr) throw signErr;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // signed.signedUrl may be absolute or relative depending on environment
      const rawSigned = (signed as any).signedUrl ?? (signed as any).signedURL ?? "";
      const fullSignedUrl = rawSigned.startsWith("http") ? rawSigned : `${supabaseUrl}/storage/v1${rawSigned}`;
      setDownloadUrl(fullSignedUrl);

      if (isPdf(resume.file_name)) {
        // Fetch blob to avoid Content-Disposition download and X-Frame issues
        const { data: blob, error: dlErr } = await supabase.storage
          .from("resumes")
          .download(resume.file_url);
        if (!dlErr && blob) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      } else {
        // For non-PDFs, still create a blob URL so users can download without visiting external domain
        const { data: blob, error: dlErr } = await supabase.storage
          .from("resumes")
          .download(resume.file_url);
        if (!dlErr && blob) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      }

      setPreviewOpen(true);
    } catch (error) {
      console.error("Error preparing preview:", error);
      toast.error("Failed to generate preview");
    }
  };

  const enhanceResume = async (resumeId: string) => {
    setEnhancing(resumeId);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-resume", {
        body: { resumeId },
      });

      if (error) throw error;

      if (data.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit exceeded. Please try again later.");
        } else if (data.error.includes("credits")) {
          toast.error("AI credits depleted. Please add credits to continue.");
        } else {
          toast.error(data.error);
        }
        return;
      }

      setEnhancedContent(data.enhancedContent);
      setEnhancedDialogOpen(true);
      toast.success("Resume enhanced successfully!");
    } catch (error: any) {
      console.error("Enhancement error:", error);
      toast.error(error.message || "Failed to enhance resume");
    } finally {
      setEnhancing(null);
    }
  };

  const downloadEnhancedResume = () => {
    if (!enhancedContent) return;
    
    // Create a simple HTML document that can be opened in Word
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <style>
    body {
      font-family: Calibri, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      margin: 1in;
      color: #000;
    }
    h1 { font-size: 16pt; font-weight: bold; margin-top: 0; margin-bottom: 8pt; }
    h2 { font-size: 14pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; border-bottom: 1px solid #ccc; }
    h3 { font-size: 12pt; font-weight: bold; margin-top: 10pt; margin-bottom: 4pt; }
    p { margin: 0 0 8pt 0; }
    ul { margin: 4pt 0; padding-left: 20pt; }
    li { margin-bottom: 4pt; }
  </style>
</head>
<body>
  <div>${enhancedContent.split('\n').map(line => {
    if (!line.trim()) return '<p>&nbsp;</p>';
    return `<p>${line}</p>`;
  }).join('\n')}</div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enhanced-resume.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Resume downloaded as .doc file!");
  };

  // Cleanup preview URL when dialog closes
  useEffect(() => {
    if (!previewOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewOpen, previewUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resume Manager</h1>
          <p className="text-muted-foreground mt-2">Upload and optimize resumes for different roles</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-gradient-primary"
            aria-label="Upload Resume"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Resume
              </>
            )}
          </Button>
        </div>
      </div>

      {resumes.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No resumes yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
              Upload your resume to get instant ATS feedback and optimize it for your target roles
            </p>
            <Button className="bg-gradient-primary" onClick={() => fileInputRef.current?.click()} aria-label="Upload Your First Resume">
              <Upload className="w-4 h-4 mr-2" />
              Upload Your First Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {resumes.map((resume) => {
            const ScoreIcon = resume.ats_score ? getScoreIcon(resume.ats_score) : FileText;
            return (
              <Card key={resume.id} className="shadow-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{resume.file_name}</CardTitle>
                        <CardDescription>
                          Uploaded {new Date(resume.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteResume(resume.id, resume.file_url)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resume.ats_score !== null ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ScoreIcon className={`w-5 h-5 ${getScoreColor(resume.ats_score)}`} />
                          <span className="font-semibold">ATS Score</span>
                        </div>
                        <span className={`text-2xl font-bold ${getScoreColor(resume.ats_score)}`}>
                          {resume.ats_score}/100
                        </span>
                      </div>
                      <Progress value={resume.ats_score} className="h-2" />
                      
                      {resume.ats_feedback && (
                        <div className="space-y-2">
                          {resume.ats_feedback.keywordGaps?.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Missing Keywords:</p>
                              <div className="flex flex-wrap gap-2">
                                {resume.ats_feedback.keywordGaps.slice(0, 5).map((keyword: string) => (
                                  <Badge key={keyword} variant="outline">{keyword}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => analyzeResume(resume.id)}
                      disabled={analyzing === resume.id}
                      className="w-full"
                      title={!resume.text_content ? (resume.file_name?.toLowerCase().endsWith('.doc') ? 'Legacy .doc not supported. Please convert to PDF or DOCX.' : 'Click to extract and analyze') : undefined}
                    >
                      {analyzing === resume.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Analyze Resume
                        </>
                      )}
                    </Button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePreviewResume(resume)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => enhanceResume(resume.id)}
                      disabled={enhancing === resume.id || !resume.text_content}
                      className="w-full"
                      title={!resume.text_content ? "Extract text first before enhancing" : "Enhance with AI"}
                    >
                      {enhancing === resume.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enhancing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Enhance
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {resumes.length > 0 && (
        <div className="mt-8">
          <ResumeVersions 
            initialResumeId={resumes[0].id} 
            resumes={resumes.map(r => ({ id: r.id, file_name: r.file_name }))}
          />
        </div>
      )}

      {/* Resume Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewResume?.file_name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] mt-4">
            {previewResume ? (
              isPdf(previewResume.file_name) && previewUrl ? (
                <object data={`${previewUrl}#view=FitH`} type="application/pdf" className="w-full h-[800px] border rounded">
                  <p className="p-4 text-sm text-muted-foreground">
                    Inline PDF preview is not supported in your browser. You can
                    <a href={previewUrl || downloadUrl || undefined} target="_blank" rel="noopener noreferrer" className="ml-1 underline">open it in a new tab</a>.
                  </p>
                </object>
              ) : previewResume.text_content ? (
                <div className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {previewResume.text_content}
                  </pre>
                </div>
              ) : downloadUrl ? (
                <div className="text-center text-muted-foreground py-8 space-y-4">
                  <p>Inline preview not available for this file type.</p>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-md border hover:bg-accent"
                  >
                    Open in new tab
                  </a>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">No preview available</div>
              )
            ) : (
              <div className="text-center text-muted-foreground py-8">No preview available</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Enhanced Resume Dialog */}
      <Dialog open={enhancedDialogOpen} onOpenChange={setEnhancedDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Enhanced Resume
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] mt-4">
            <div className="prose prose-sm max-w-none p-6 bg-muted/30 rounded-lg">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {enhancedContent}
              </pre>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEnhancedDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={downloadEnhancedResume} className="bg-gradient-primary">
              <Download className="w-4 h-4 mr-2" />
              Download Enhanced Resume
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
