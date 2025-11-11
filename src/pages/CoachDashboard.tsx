import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Calendar, FileText, Award, Star, Users } from "lucide-react";
import { CoachAnalytics } from "@/components/coaching/CoachAnalytics";
import { CoachAvailability } from "@/components/coaching/CoachAvailability";
import { CoachResources } from "@/components/coaching/CoachResources";
import { CoachBadges } from "@/components/coaching/CoachBadges";
import { CoachReviews } from "@/components/coaching/CoachReviews";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function CoachDashboard() {
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkCoachStatus();
  }, []);

  const checkCoachStatus = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate("/auth");
      return;
    }

    setUser(authUser);
    setUserId(authUser.id);

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("role", "mentor")
      .single();

    setIsCoach(!!data);
    setLoading(false);

    if (!data) {
      navigate("/dashboard");
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

  if (!isCoach) {
    return null;
  }

  return (
    <AppLayout user={user}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Coach Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your coaching activities and track your impact
          </p>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="gap-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Availability</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Badges</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="w-4 h-4" />
              <span className="hidden sm:inline">Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="mentees" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Mentees</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <CoachAnalytics />
          </TabsContent>

          <TabsContent value="availability">
            <CoachAvailability />
          </TabsContent>

          <TabsContent value="resources">
            <CoachResources />
          </TabsContent>

          <TabsContent value="badges">
            <CoachBadges />
          </TabsContent>

          <TabsContent value="reviews">
            <CoachReviews coachId={userId} />
          </TabsContent>

          <TabsContent value="mentees">
            <div className="text-center py-12 text-muted-foreground">
              Client management coming soon...
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
