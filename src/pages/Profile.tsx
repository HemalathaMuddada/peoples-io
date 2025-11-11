import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, X, Upload, TrendingUp, Linkedin, Camera, FileText, Eye, CheckCircle, XCircle, User, Briefcase, Award, Video, Heart, Users } from "lucide-react";
import { z } from "zod";
import { Link } from "react-router-dom";
import ProjectsTab from "@/components/profile/ProjectsTab";
import CertificationsTab from "@/components/profile/CertificationsTab";
import VideoIntroTab from "@/components/profile/VideoIntroTab";
import WorkPreferencesTab from "@/components/profile/WorkPreferencesTab";
import { LinkedInOptimizer } from "@/components/profile/LinkedInOptimizer";
import { CalendarSettings } from "@/components/settings/CalendarSettings";

// Validation schema for profile inputs
const profileSchema = z.object({
  headline: z.string().max(200, "Headline must be less than 200 characters").trim().optional(),
  location: z.string().max(100, "Location must be less than 100 characters").trim().optional(),
  currentTitle: z.string().max(100, "Current title must be less than 100 characters").trim().optional(),
  linkedinUrl: z
    .string()
    .url("Must be a valid URL")
    .max(255, "URL must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  targetTitles: z
    .array(z.string().max(100, "Each title must be less than 100 characters"))
    .max(10, "Maximum 10 target titles allowed"),
  salaryMin: z.number().min(0, "Salary must be positive").optional(),
  salaryMax: z.number().min(0, "Salary must be positive").optional(),
  yearsExperience: z.number().min(0, "Years must be positive").max(100, "Years must be realistic").optional(),
});

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isMentor, setIsMentor] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    headline: "",
    location: "",
    yearsExperience: 0,
    currentTitle: "",
    linkedinUrl: "",
    seniority: "",
    salaryRangeMin: "",
    salaryRangeMax: "",
  });
  const [targetTitles, setTargetTitles] = useState<string[]>([]);
  const [targetTitle, setTargetTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [targetLocations, setTargetLocations] = useState<string[]>([]);
  const [targetLocation, setTargetLocation] = useState("");
  const [workAuth, setWorkAuth] = useState<string[]>([]);
  const [workAuthItem, setWorkAuthItem] = useState("");
  const [resumes, setResumes] = useState<any[]>([]);
  
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Load user profile data
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .single();

      // Set avatar URL
      if (userProfile?.avatar_url) {
        // Check if it's a LinkedIn URL (external) or storage path
        if (userProfile.avatar_url.startsWith('http')) {
          setAvatarUrl(userProfile.avatar_url);
        } else {
          // Get public URL from storage
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(userProfile.avatar_url);
          setAvatarUrl(urlData.publicUrl);
        }
      }

      // Load candidate profile data
      const { data, error } = await supabase.from("candidate_profiles").select("*").eq("user_id", user.id).single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data);
        const fullName = userProfile?.full_name || "";
        const headlineVal = data.headline === fullName ? "" : (data.headline || "");
        const currentTitleVal = data.current_title === fullName ? "" : (data.current_title || "");
        setFormData({
          fullName: fullName,
          email: userProfile?.email || user.email || "",
          headline: headlineVal,
          location: data.location || "",
          yearsExperience: data.years_experience || 0,
          currentTitle: currentTitleVal,
          linkedinUrl: data.linkedin_url || "",
          seniority: data.seniority || "",
          salaryRangeMin: data.salary_range_min?.toString() || "",
          salaryRangeMax: data.salary_range_max?.toString() || "",
        });
        setTargetTitles(data.target_titles || []);
        setTargetLocations(data.target_locations || []);
        setWorkAuth(data.work_authorization || []);
        
        // Load resumes
        const { data: resumesData } = await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (resumesData) {
          setResumes(resumesData);
        }
      } else {
        // No candidate profile yet, just load user data
        setFormData(prev => ({
          ...prev,
          fullName: userProfile?.full_name || "",
          email: userProfile?.email || user.email || "",
        }));
      }

      // Check if user has mentor role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'mentor');

      setIsMentor(roles && roles.length > 0);
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    console.log("Starting profile save operation");
    try {
      // Validate inputs
      const validation = profileSchema.safeParse({
        headline: formData.headline,
        location: formData.location,
        currentTitle: formData.currentTitle,
        linkedinUrl: formData.linkedinUrl,
        targetTitles: targetTitles,
        salaryMin: formData.salaryRangeMin ? Number(formData.salaryRangeMin) : undefined,
        salaryMax: formData.salaryRangeMax ? Number(formData.salaryRangeMax) : undefined,
        yearsExperience: formData.yearsExperience ? Number(formData.yearsExperience) : undefined,
      });

      if (!validation.success) {
        const errors = validation.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");
        toast.error(errors);
        setSaving(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: org } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();

      // Update user profile (full_name, email)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          email: formData.email,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update candidate profile
      const profileData = {
        user_id: user.id,
        org_id: org?.org_id,
        headline: formData.headline,
        location: formData.location,
        years_experience: formData.yearsExperience,
        current_title: formData.currentTitle,
        linkedin_url: formData.linkedinUrl,
        seniority: (formData.seniority as any) || null,
        salary_range_min: formData.salaryRangeMin ? parseInt(formData.salaryRangeMin) : null,
        salary_range_max: formData.salaryRangeMax ? parseInt(formData.salaryRangeMax) : null,
        target_titles: targetTitles,
        target_locations: targetLocations,
        work_authorization: workAuth,
      };

      if (profile) {
        console.log("Updating existing profile with ID:", profile.id);
        const { error } = await supabase.from("candidate_profiles").update(profileData).eq("id", profile.id);
        console.log("Update result:", { error });
        if (error) throw error;
      } else {
        console.log("Inserting new profile");
        const { error } = await supabase.from("candidate_profiles").insert(profileData);
        console.log("Insert result:", { error });
        if (error) throw error;
      }

      toast.success("Profile saved successfully!");
      loadProfile();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(`Failed to save profile: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const addTargetTitle = () => {
    if (targetTitle.trim() && !targetTitles.includes(targetTitle.trim())) {
      setTargetTitles([...targetTitles, targetTitle.trim()]);
      setTargetTitle("");
    }
  };

  const removeTargetTitle = (title: string) => {
    setTargetTitles(targetTitles.filter((t) => t !== title));
  };

  const addTargetLocation = () => {
    if (targetLocation.trim() && !targetLocations.includes(targetLocation.trim())) {
      setTargetLocations([...targetLocations, targetLocation.trim()]);
      setTargetLocation("");
    }
  };

  const removeTargetLocation = (loc: string) => {
    setTargetLocations(targetLocations.filter((l) => l !== loc));
  };

  const addWorkAuth = () => {
    if (workAuthItem.trim() && !workAuth.includes(workAuthItem.trim())) {
      setWorkAuth([...workAuth, workAuthItem.trim()]);
      setWorkAuthItem("");
    }
  };

  const removeWorkAuth = (wa: string) => {
    setWorkAuth(workAuth.filter((w) => w !== wa));
  };

  const handleLinkedInConnect = async () => {
    try {
      // Get LinkedIn Client ID from environment
      const { data, error } = await supabase.functions.invoke("linkedin-oauth", {
        body: { action: "get_client_id" },
      });

      if (error || !data?.clientId) {
        toast.error("LinkedIn OAuth is not configured. Please contact support.");
        return;
      }

      const clientId = data.clientId;
      const redirectUri = `${window.location.origin}/profile`;
      const scope = "openid profile email";
      const state = Math.random().toString(36).substring(7);

      // Store state in sessionStorage for verification
      sessionStorage.setItem("linkedin_oauth_state", state);

      const authUrl =
        `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${state}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error("Error initiating LinkedIn OAuth:", error);
      toast.error("Failed to connect to LinkedIn");
    }
  };

  const handleLinkedInCallback = async (code: string) => {
    setSyncing(true);
    try {
      const redirectUri = `${window.location.origin}/profile`;

      const { data, error } = await supabase.functions.invoke("linkedin-oauth", {
        body: { code, redirectUri },
      });

      if (error) {
        console.error("LinkedIn OAuth error:", error);
        throw error;
      }

      if (data.success && data.profileData) {
        const syncedData = data.profileData;
        
        // Get current user and existing profile data
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) throw new Error("No user found");

        // Load existing profile to preserve data
        const { data: existingProfile } = await supabase
          .from("candidate_profiles")
          .select("*")
          .eq("user_id", userData.user.id)
          .single();

        // Update form with LinkedIn data, preserving existing values
        setFormData((prev) => ({
          ...prev,
          fullName: syncedData.fullName || prev.fullName,
          headline: syncedData.headline || prev.headline,
          location: syncedData.location || prev.location,
          currentTitle: syncedData.currentTitle || prev.currentTitle,
          linkedinUrl: syncedData.linkedinUrl || prev.linkedinUrl,
          // Explicitly preserve salary and experience data
          yearsExperience: prev.yearsExperience,
          seniority: prev.seniority,
          salaryRangeMin: prev.salaryRangeMin,
          salaryRangeMax: prev.salaryRangeMax,
        }));

        const { data: org } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", userData.user.id)
          .single();

        // Build payload preserving existing data; only include fields LinkedIn provides
        const profileData: any = {
          user_id: userData.user.id,
          org_id: org?.org_id,
          // Preserve arrays and other fields
          target_titles: existingProfile?.target_titles || [],
          target_locations: existingProfile?.target_locations || [],
          work_authorization: existingProfile?.work_authorization || [],
          years_experience: existingProfile?.years_experience ?? 0,
          seniority: existingProfile?.seniority ?? null,
          salary_range_min: existingProfile?.salary_range_min ?? null,
          salary_range_max: existingProfile?.salary_range_max ?? null,
        };

        if (syncedData.location) profileData.location = syncedData.location;
        if (syncedData.linkedinUrl) profileData.linkedin_url = syncedData.linkedinUrl;
        // Do NOT set headline/current_title from LinkedIn OpenID (not provided)


        // Use upsert to handle both insert and update cases
        const { error: upsertErr } = await supabase
          .from("candidate_profiles")
          .upsert(profileData, { 
            onConflict: 'user_id,org_id',
            ignoreDuplicates: false 
          });
        
        
        if (upsertErr) throw upsertErr;

        const profileUpdates: any = {};
        if (syncedData.fullName) profileUpdates.full_name = syncedData.fullName;
        if (syncedData.avatarUrl) profileUpdates.avatar_url = syncedData.avatarUrl;
        if (Object.keys(profileUpdates).length > 0) {
          const { error: profErr } = await supabase
            .from("profiles")
            .update(profileUpdates)
            .eq("id", userData.user.id);
          if (profErr) console.error("Failed to update user profile:", profErr);
        }

        // Show what was imported
        const importedFields = [] as string[];
        if (syncedData.fullName) importedFields.push("name");
        if (syncedData.location) importedFields.push("location");
        if (syncedData.linkedinUrl) importedFields.push("profile URL");
        if (syncedData.avatarUrl) importedFields.push("profile picture");
        
        toast.success(`LinkedIn connected and saved! Imported: ${importedFields.join(", ") || "profile data"}`);

        // Clean up URL and refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        await loadProfile();
      } else {
        const errorMsg = data.details || data.error || "Failed to connect LinkedIn";
        toast.error(errorMsg);
      }
    } catch (error: any) {
      console.error("Error connecting LinkedIn:", error);
      const errorMsg = error.message || "Failed to connect LinkedIn";
      toast.error(errorMsg);
    } finally {
      setSyncing(false);
      sessionStorage.removeItem("linkedin_oauth_state");
    }
  };

  useEffect(() => {
    // Check for LinkedIn OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");
    const errorParam = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");
    const storedState = sessionStorage.getItem("linkedin_oauth_state");

    if (errorParam) {
      const message = decodeURIComponent(errorDescription || errorParam);
      toast.error(`LinkedIn OAuth error: ${message}`);
      // Clean up URL and state
      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem("linkedin_oauth_state");
      return;
    }

    if (state && storedState && state !== storedState) {
      toast.error("LinkedIn OAuth state mismatch. Please try connecting again.");
      window.history.replaceState({}, document.title, window.location.pathname);
      sessionStorage.removeItem("linkedin_oauth_state");
      return;
    }

    if (code && state && state === storedState) {
      handleLinkedInCallback(code);
    }
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      // Delete old avatar if exists
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);
      
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('avatars')
          .remove(existingFiles.map(f => `${user.id}/${f.name}`));
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: fileName })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlData.publicUrl);
      toast.success("Profile picture updated!");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      // Upload to storage with user folder structure
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("resumes").upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: org } = await supabase.from("profiles").select("org_id").eq("id", user.id).single();

      // Create resume record - store the file path, not public URL
      const { error: dbError } = await supabase.from("resumes").insert({
        user_id: user.id,
        org_id: org?.org_id,
        profile_id: profile?.id,
        file_url: fileName,
        file_name: file.name,
      });

      if (dbError) throw dbError;

      toast.success("Resume uploaded successfully!");
      loadProfile();
    } catch (error: any) {
      console.error("Error uploading resume:", error);
      toast.error("Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground mt-2">Build a comprehensive profile to stand out</p>
        </div>
        <Link to="/profile-strength">
          <Button variant="outline" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            View Strength
          </Button>
        </Link>
      </div>

      {isMentor && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Mentor Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Complete your mentor profile to help others grow
                </p>
              </div>
            </div>
            <Link to="/mentor-settings">
              <Button>
                Manage Mentor Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="gap-2">
            <User className="w-4 h-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="credentials" className="gap-2">
            <Award className="w-4 h-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-2">
            <Video className="w-4 h-4" />
            Video Intro
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Heart className="w-4 h-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2">
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-6">

      {/* Profile Picture */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Upload your photo or sync from LinkedIn</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                  id="avatar-upload"
                />
                <Button
                  variant="outline"
                  disabled={uploadingAvatar}
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Photo
                </Button>
              </label>
              <p className="text-sm text-muted-foreground">
                or sync from LinkedIn when you connect your profile
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resume Upload */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <CardDescription>Upload your current resume for AI analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleResumeUpload}
              disabled={uploading}
              className="hidden"
              id="resume-upload"
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={() => document.getElementById('resume-upload')?.click()}
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
          </label>

          {/* Latest Resume */}
          {resumes.length > 0 && (
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Latest Resume</h3>
                {resumes.length > 1 && (
                  <Link to="/resumes">
                    <Button variant="ghost" size="sm">
                      View All ({resumes.length})
                    </Button>
                  </Link>
                )}
              </div>
              {(() => {
                const resume = resumes[0]; // Only show the latest
                return (
                  <div className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{resume.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(resume.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const { data } = supabase.storage
                            .from('resumes')
                            .getPublicUrl(resume.file_url);
                          window.open(data.publicUrl, '_blank');
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    </div>

                    {/* ATS Score */}
                    {resume.ats_score !== null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">ATS Score</span>
                            <span className="text-xs font-bold">{resume.ats_score}/100</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                resume.ats_score >= 80
                                  ? 'bg-green-500'
                                  : resume.ats_score >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${resume.ats_score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Missing Keywords */}
                    {resume.ats_feedback?.missing_keywords && resume.ats_feedback.missing_keywords.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Missing Keywords:</p>
                        <div className="flex flex-wrap gap-2">
                          {resume.ats_feedback.missing_keywords.slice(0, 5).map((keyword: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {resume.ats_feedback.missing_keywords.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{resume.ats_feedback.missing_keywords.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Feedback Summary */}
                    {resume.ats_feedback?.summary && (
                      <p className="text-xs text-muted-foreground">{resume.ats_feedback.summary}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Tell us about your current situation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currentTitle">Current Job Title</Label>
              <Input
                id="currentTitle"
                value={formData.currentTitle}
                onChange={(e) => setFormData({ ...formData, currentTitle: e.target.value })}
                placeholder="Senior Product Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsExperience">Years of Experience</Label>
              <Input
                id="yearsExperience"
                type="number"
                value={formData.yearsExperience}
                onChange={(e) => setFormData({ ...formData, yearsExperience: parseInt(e.target.value) || 0 })}
                placeholder="5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline</Label>
            <Input
              id="headline"
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              placeholder="Product leader with 10+ years building scalable platforms"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="San Francisco, CA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">Seniority Level</Label>
              <Select
                value={formData.seniority}
                onValueChange={(value) => setFormData({ ...formData, seniority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
            <div className="flex gap-2">
              <Input
                id="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              <Button
                type="button"
                onClick={handleLinkedInConnect}
                disabled={syncing}
                variant="outline"
                className="gap-2 whitespace-nowrap"
              >
                {syncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Linkedin className="w-4 h-4" />
                    Connect
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Click "Connect" to import your profile from LinkedIn</p>
          </div>
        </CardContent>
      </Card>

      {/* Target Roles */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Target Roles</CardTitle>
          <CardDescription>What positions are you targeting?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={targetTitle}
              onChange={(e) => setTargetTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTargetTitle()}
              placeholder="e.g., Product Manager, Director of Engineering"
            />
            <Button onClick={addTargetTitle} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {targetTitles.map((title) => (
              <Badge key={title} variant="secondary" className="gap-1 pr-1">
                {title}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeTargetTitle(title)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Target Locations */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Target Locations</CardTitle>
          <CardDescription>Where would you like to work?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTargetLocation()}
              placeholder="e.g., San Francisco, Remote, New York"
            />
            <Button onClick={addTargetLocation} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {targetLocations.map((loc) => (
              <Badge key={loc} variant="secondary" className="gap-1 pr-1">
                {loc}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeTargetLocation(loc)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Work Authorization */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Work Authorization</CardTitle>
          <CardDescription>Add your authorizations (e.g., US Citizen, H1B)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={workAuthItem}
              onChange={(e) => setWorkAuthItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addWorkAuth()}
              placeholder="e.g., US Citizen, Green Card, H1B"
            />
            <Button onClick={addWorkAuth} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {workAuth.map((wa) => (
              <Badge key={wa} variant="secondary" className="gap-1 pr-1">
                {wa}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeWorkAuth(wa)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Salary Expectations */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Salary Expectations</CardTitle>
          <CardDescription>Your desired salary range (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="salaryMin">Minimum ($)</Label>
              <Input
                id="salaryMin"
                type="number"
                value={formData.salaryRangeMin}
                onChange={(e) => setFormData({ ...formData, salaryRangeMin: e.target.value })}
                placeholder="100000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryMax">Maximum ($)</Label>
              <Input
                id="salaryMax"
                type="number"
                value={formData.salaryRangeMax}
                onChange={(e) => setFormData({ ...formData, salaryRangeMax: e.target.value })}
                placeholder="150000"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary px-8">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </div>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio">
          {profile && <ProjectsTab profileId={profile.id} />}
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials">
          {profile && <CertificationsTab profileId={profile.id} />}
        </TabsContent>

        {/* Video Intro Tab */}
        <TabsContent value="video">
          {profile && (
            <VideoIntroTab
              profileId={profile.id}
              videoUrl={profile.video_intro_url}
              videoDuration={profile.video_intro_duration}
              onSave={async (videoUrl, duration) => {
                const { error } = await supabase
                  .from("candidate_profiles")
                  .update({
                    video_intro_url: videoUrl || null,
                    video_intro_duration: duration || null,
                  })
                  .eq("id", profile.id);

                if (error) throw error;
                await loadProfile();
              }}
            />
          )}
        </TabsContent>

        {/* Work Preferences Tab */}
        <TabsContent value="preferences">
          {profile && (
            <WorkPreferencesTab
              preferences={{
                company_culture_preferences: profile.company_culture_preferences || [],
                company_values: profile.company_values || [],
                work_environment_preference: profile.work_environment_preference || null,
                team_size_preference: profile.team_size_preference || null,
                work_style_preferences: profile.work_style_preferences || [],
              }}
              onSave={async (preferences) => {
                const { error } = await supabase
                  .from("candidate_profiles")
                  .update(preferences)
                  .eq("id", profile.id);

                if (error) throw error;
                await loadProfile();
              }}
            />
          )}
        </TabsContent>

        {/* LinkedIn Optimizer Tab */}
          <TabsContent value="linkedin">
            <LinkedInOptimizer />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarSettings />
          </TabsContent>
        </Tabs>
    </div>
  );
}
