import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Linkedin, MapPin, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CoachingRequestDialog } from "@/components/coaching/CoachingRequestDialog";

interface CoachProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  candidate_profile?: {
    headline: string | null;
    location: string | null;
    current_title: string | null;
    years_experience: number | null;
    linkedin_url: string | null;
    expertise_areas: string[] | null;
    mentor_bio: string | null;
    mentor_pricing: string | null;
    is_available_for_mentorship: boolean | null;
  };
}

export default function Coaches() {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterExpertise, setFilterExpertise] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    try {
      setLoading(true);
      
      // Get all users with mentor role
      const { data: mentorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'mentor');

      if (rolesError) throw rolesError;

      if (!mentorRoles || mentorRoles.length === 0) {
        setCoaches([]);
        return;
      }

      const mentorIds = mentorRoles.map(r => r.user_id);

      // Get profiles for these mentors
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          avatar_url
        `)
        .in('id', mentorIds);

      if (profilesError) throw profilesError;

      // Get candidate profiles for additional info
      const { data: candidateProfiles, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select(`
          user_id,
          headline,
          location,
          current_title,
          years_experience,
          linkedin_url,
          expertise_areas,
          mentor_bio,
          mentor_pricing,
          is_available_for_mentorship
        `)
        .in('user_id', mentorIds)
        .eq('is_available_for_mentorship', true);

      if (candidateError) throw candidateError;

      // Merge the data
      const coachesWithProfiles = profiles?.map(profile => ({
        ...profile,
        candidate_profile: candidateProfiles?.find(cp => cp.user_id === profile.id)
      })) || [];

      setCoaches(coachesWithProfiles);
    } catch (error: any) {
      console.error('Error fetching coaches:', error);
      toast({
        title: "Error",
        description: "Failed to load coaches. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCoaches = coaches.filter((coach) => {
    const matchesSearch = 
      coach.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.candidate_profile?.headline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.candidate_profile?.current_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesExpertise = !filterExpertise || 
      coach.candidate_profile?.expertise_areas?.some(area => 
        area.toLowerCase().includes(filterExpertise.toLowerCase())
      );
    
    return matchesSearch && matchesExpertise;
  });

  const allExpertiseAreas = Array.from(
    new Set(
      coaches.flatMap(m => m.candidate_profile?.expertise_areas || [])
    )
  ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Find a Coach</h1>
        <p className="text-muted-foreground">
          Connect with experienced professionals who can guide your career journey
        </p>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search coaches by name, title, or expertise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
          />
        </div>
        <div className="w-full md:w-64">
          <select
            value={filterExpertise}
            onChange={(e) => setFilterExpertise(e.target.value)}
            className="w-full px-4 py-2 border rounded-md"
          >
            <option value="">All Expertise Areas</option>
            {allExpertiseAreas.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredCoaches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              {coaches.length === 0 
                ? "No coaches available at the moment. Check back later!"
                : "No coaches match your search criteria. Try adjusting your filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map((coach) => (
            <Card key={coach.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={coach.avatar_url || undefined} />
                    <AvatarFallback>
                      {coach.full_name?.split(' ').map(n => n[0]).join('') || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl mb-1 truncate">
                      {coach.full_name || 'Anonymous Coach'}
                    </CardTitle>
                    {coach.candidate_profile?.current_title && (
                      <CardDescription className="flex items-center gap-1 mb-2">
                        <Briefcase className="h-3 w-3" />
                        {coach.candidate_profile.current_title}
                      </CardDescription>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      Coach
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {coach.candidate_profile?.mentor_bio && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {coach.candidate_profile.mentor_bio}
                  </p>
                )}

                {coach.candidate_profile?.expertise_areas && 
                 coach.candidate_profile.expertise_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {coach.candidate_profile.expertise_areas.slice(0, 3).map((area, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                    {coach.candidate_profile.expertise_areas.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{coach.candidate_profile.expertise_areas.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {coach.candidate_profile?.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {coach.candidate_profile.location}
                    </div>
                  )}
                  
                  {coach.candidate_profile?.years_experience !== null && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      {coach.candidate_profile.years_experience} years experience
                    </div>
                  )}

                  {coach.candidate_profile?.mentor_pricing && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={coach.candidate_profile.mentor_pricing === 'free' ? 'secondary' : 'default'}>
                        {coach.candidate_profile.mentor_pricing === 'free' ? 'Free' : coach.candidate_profile.mentor_pricing}
                      </Badge>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {coach.candidate_profile?.linkedin_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        asChild
                      >
                        <a
                          href={coach.candidate_profile.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Linkedin className="h-4 w-4 mr-1" />
                          LinkedIn
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <a href={`mailto:${coach.email}`}>
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </a>
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => setSelectedCoach({ 
                    id: coach.id, 
                    name: coach.full_name || 'Anonymous Coach' 
                  })}
                >
                  Submit Requisition
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedCoach && (
        <CoachingRequestDialog
          open={!!selectedCoach}
          onOpenChange={(open) => !open && setSelectedCoach(null)}
          coachId={selectedCoach.id}
          coachName={selectedCoach.name}
        />
      )}
    </div>
  );
}
