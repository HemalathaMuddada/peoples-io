import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Search, MessageSquare, Calendar, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Mentor {
  id: string;
  full_name: string;
  avatar_url: string;
  headline: string;
  mentor_bio: string;
  expertise_areas: string[];
  years_experience: number;
  mentor_pricing: string;
  average_rating: number;
  total_sessions: number;
  total_badges: number;
}

export default function MentorDiscovery() {
  const [user, setUser] = useState<any>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expertiseFilter, setExpertiseFilter] = useState("all");
  const [pricingFilter, setPricingFilter] = useState("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    filterMentors();
  }, [mentors, searchTerm, expertiseFilter, pricingFilter]);

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate("/auth");
      return;
    }

    setUser(authUser);
    await fetchMentors();
    setLoading(false);
  };

  const fetchMentors = async () => {
    // Fetch available mentors
    const { data: profilesData } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("is_available_for_mentorship", true);

    if (!profilesData) return;

    // Fetch analytics for each mentor
    const mentorIds = profilesData.map(p => p.user_id);
    const { data: analyticsData } = await supabase
      .from("mentor_analytics")
      .select("*")
      .in("mentor_id", mentorIds);

    const { data: badgesData } = await supabase
      .from("mentor_badges")
      .select("mentor_id")
      .in("mentor_id", mentorIds);

    const analyticsMap = new Map(analyticsData?.map(a => [a.mentor_id, a]));
    const badgesMap = new Map<string, number>();
    badgesData?.forEach(b => {
      badgesMap.set(b.mentor_id, (badgesMap.get(b.mentor_id) || 0) + 1);
    });

    const mentorsWithStats: Mentor[] = profilesData.map(profile => {
      const analytics = analyticsMap.get(profile.user_id);
      return {
        id: profile.user_id,
        full_name: profile.headline || "Mentor",
        avatar_url: "",
        headline: profile.headline || "",
        mentor_bio: profile.mentor_bio || "",
        expertise_areas: profile.expertise_areas || [],
        years_experience: profile.years_experience || 0,
        mentor_pricing: profile.mentor_pricing || "free",
        average_rating: analytics?.average_rating || 0,
        total_sessions: analytics?.total_sessions || 0,
        total_badges: badgesMap.get(profile.user_id) || 0,
      };
    });

    setMentors(mentorsWithStats);
    setFilteredMentors(mentorsWithStats);
  };

  const filterMentors = () => {
    let filtered = mentors;

    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.mentor_bio.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (expertiseFilter !== "all") {
      filtered = filtered.filter(m =>
        m.expertise_areas.includes(expertiseFilter)
      );
    }

    if (pricingFilter !== "all") {
      filtered = filtered.filter(m => m.mentor_pricing === pricingFilter);
    }

    setFilteredMentors(filtered);
  };

  const requestMentorship = async (mentorId: string) => {
    const { error } = await supabase.from("mentorship_requests").insert({
      mentor_id: mentorId,
      mentee_id: user.id,
      status: "pending",
    });

    if (error) {
      toast({ title: "Error sending request", variant: "destructive" });
    } else {
      toast({ title: "Mentorship request sent!" });
    }
  };

  if (loading || !user) {
    return (
      <AppLayout user={null}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Find Your Mentor</h1>
          <p className="text-muted-foreground mt-2">
            Connect with experienced professionals to guide your career
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search mentors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by expertise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Expertise</SelectItem>
              <SelectItem value="software">Software Engineering</SelectItem>
              <SelectItem value="product">Product Management</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>

          <Select value={pricingFilter} onValueChange={setPricingFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by pricing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pricing</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMentors.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No mentors found matching your criteria
            </div>
          ) : (
            filteredMentors.map((mentor) => (
              <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={mentor.avatar_url} />
                      <AvatarFallback>{mentor.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{mentor.full_name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {mentor.headline}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center">
                          <Star className="w-4 h-4 fill-primary text-primary" />
                          <span className="text-sm ml-1">{mentor.average_rating.toFixed(1)}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {mentor.mentor_pricing}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm line-clamp-3">{mentor.mentor_bio}</p>

                  <div className="flex flex-wrap gap-1">
                    {mentor.expertise_areas.slice(0, 3).map((area, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {mentor.total_sessions} sessions
                    </div>
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {mentor.total_badges} badges
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => requestMentorship(mentor.id)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Request
                    </Button>
                    <Button variant="outline" size="icon">
                      <Star className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
