import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X } from "lucide-react";
import { z } from "zod";

const mentorProfileSchema = z.object({
  expertise_areas: z.array(z.string()).max(10, "Maximum 10 expertise areas allowed"),
  mentor_bio: z.string().max(500, "Bio must be less than 500 characters"),
  mentor_pricing: z.string().max(100, "Pricing must be less than 100 characters"),
  mentorship_capacity: z.number().min(1).max(50, "Capacity must be between 1 and 50"),
});

export default function MentorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [newExpertise, setNewExpertise] = useState("");
  const [mentorBio, setMentorBio] = useState("");
  const [mentorPricing, setMentorPricing] = useState("free");
  const [isAvailable, setIsAvailable] = useState(false);
  const [capacity, setCapacity] = useState(5);
  const { toast } = useToast();

  useEffect(() => {
    fetchMentorProfile();
  }, []);

  const fetchMentorProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has mentor role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'mentor')
        .maybeSingle();

      setIsMentor(!!roles);

      // Get candidate profile
      const { data: profile, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (profile) {
        setProfileId(profile.id);
        setExpertiseAreas(profile.expertise_areas || []);
        setMentorBio(profile.mentor_bio || "");
        setMentorPricing(profile.mentor_pricing || "free");
        setIsAvailable(profile.is_available_for_mentorship || false);
        setCapacity(profile.mentorship_capacity || 5);
      } else {
        // Create candidate profile if it doesn't exist
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .single();

        if (userProfile) {
          const { data: newProfile, error: createError } = await supabase
            .from('candidate_profiles')
            .insert({
              user_id: user.id,
              org_id: userProfile.org_id,
            })
            .select()
            .single();

          if (createError) throw createError;
          
          if (newProfile) {
            setProfileId(newProfile.id);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching mentor profile:', error);
      toast({
        title: "Error",
        description: "Failed to load mentor profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addExpertise = () => {
    const trimmed = newExpertise.trim();
    if (trimmed && !expertiseAreas.includes(trimmed) && expertiseAreas.length < 10) {
      setExpertiseAreas([...expertiseAreas, trimmed]);
      setNewExpertise("");
    }
  };

  const removeExpertise = (area: string) => {
    setExpertiseAreas(expertiseAreas.filter(e => e !== area));
  };

  const handleSave = async () => {
    try {
      // Validate inputs
      const validation = mentorProfileSchema.safeParse({
        expertise_areas: expertiseAreas,
        mentor_bio: mentorBio,
        mentor_pricing: mentorPricing,
        mentorship_capacity: capacity,
      });

      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      setSaving(true);

      if (!profileId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data: userProfile } = await supabase
          .from('profiles')
          .select('org_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!userProfile?.org_id) {
          throw new Error('Could not determine organization for user');
        }

        const { data: newProfile, error: createError } = await supabase
          .from('candidate_profiles')
          .insert({ 
            user_id: user.id, 
            org_id: userProfile.org_id,
            expertise_areas: expertiseAreas,
            mentor_bio: mentorBio,
            mentor_pricing: mentorPricing,
            is_available_for_mentorship: isAvailable,
            mentorship_capacity: capacity,
          })
          .select()
          .single();

        if (createError) throw createError;
        
        setProfileId(newProfile.id);
        
        toast({
          title: "Success",
          description: "Mentor profile created successfully!",
        });
        return;
      }

      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          expertise_areas: expertiseAreas,
          mentor_bio: mentorBio,
          mentor_pricing: mentorPricing,
          is_available_for_mentorship: isAvailable,
          mentorship_capacity: capacity,
        })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mentor profile updated successfully!",
      });
    } catch (error: any) {
      console.error('Error saving mentor profile:', error);
      toast({
        title: "Error",
        description: "Failed to save mentor profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isMentor) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center mb-4">
              You need to have the mentor role to access this page.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Contact an administrator to become a mentor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Mentor Profile Settings</h1>
        <p className="text-muted-foreground">
          Complete your mentor profile to start helping others
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Availability Status</CardTitle>
              <CardDescription>
                Toggle your availability to appear in the mentor directory
              </CardDescription>
            </div>
            <Switch
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
            />
          </div>
        </CardHeader>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Areas of Expertise</CardTitle>
          <CardDescription>
            Add up to 10 areas where you can provide mentorship
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., React, Product Management, Data Science"
              value={newExpertise}
              onChange={(e) => setNewExpertise(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExpertise()}
              maxLength={50}
            />
            <Button onClick={addExpertise} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {expertiseAreas.map((area, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1">
                {area}
                <button
                  onClick={() => removeExpertise(area)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {expertiseAreas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No expertise areas added yet. Add at least one to appear in searches.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mentor Bio</CardTitle>
          <CardDescription>
            Tell mentees about your experience and what you can help with (max 500 characters)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="I'm a senior software engineer with 10+ years of experience in full-stack development. I specialize in React, Node.js, and helping developers transition into senior roles..."
            value={mentorBio}
            onChange={(e) => setMentorBio(e.target.value)}
            rows={6}
            maxLength={500}
          />
          <p className="text-sm text-muted-foreground mt-2">
            {mentorBio.length}/500 characters
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
          <CardDescription>
            Specify if you offer free or paid mentorship
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pricing">Pricing Information</Label>
            <Input
              id="pricing"
              placeholder="e.g., Free, $50/hour, Free for first session"
              value={mentorPricing}
              onChange={(e) => setMentorPricing(e.target.value)}
              maxLength={100}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mentorship Capacity</CardTitle>
          <CardDescription>
            Maximum number of mentees you can handle at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            min="1"
            max="50"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Mentor Profile
        </Button>
      </div>
    </div>
  );
}
