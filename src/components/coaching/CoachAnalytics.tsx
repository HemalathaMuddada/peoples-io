import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, TrendingUp, Users, Award, BookOpen, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Analytics {
  total_sessions: number;
  total_mentees: number;
  average_rating: number;
  total_reviews: number;
  total_hours: number;
  total_referrals: number;
  successful_referrals: number;
  articles_published: number;
  resources_shared: number;
  badges_earned: number;
}

export function CoachAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("mentor_analytics")
      .select("*")
      .eq("mentor_id", user.id)
      .single();

    setAnalytics(data);
    setLoading(false);
  };

  if (loading) return <div>Loading analytics...</div>;
  if (!analytics) return null;

  const stats = [
    {
      title: "Total Sessions",
      value: analytics.total_sessions,
      icon: BarChart,
      color: "text-blue-500",
    },
    {
      title: "Total Mentees",
      value: analytics.total_mentees,
      icon: Users,
      color: "text-green-500",
    },
    {
      title: "Average Rating",
      value: analytics.average_rating.toFixed(1),
      icon: Star,
      color: "text-yellow-500",
      suffix: "/5.0",
    },
    {
      title: "Total Hours",
      value: analytics.total_hours.toFixed(1),
      icon: TrendingUp,
      color: "text-purple-500",
      suffix: "hrs",
    },
    {
      title: "Job Referrals",
      value: `${analytics.successful_referrals}/${analytics.total_referrals}`,
      icon: Award,
      color: "text-orange-500",
    },
    {
      title: "Articles Published",
      value: analytics.articles_published,
      icon: BookOpen,
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Coach Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">
                        {stat.value}
                        {stat.suffix && (
                          <span className="text-sm text-muted-foreground ml-1">
                            {stat.suffix}
                          </span>
                        )}
                      </p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-3">Achievements</h3>
            <div className="flex flex-wrap gap-2">
              {analytics.badges_earned > 0 ? (
                <Badge variant="secondary">
                  <Award className="w-4 h-4 mr-1" />
                  {analytics.badges_earned} Badges Earned
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No badges earned yet. Keep up the great work coaching!
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
