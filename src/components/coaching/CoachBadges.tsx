import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Trophy, Star, Target, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CoachBadge {
  id: string;
  badge_type: string;
  badge_name: string;
  description: string;
  earned_at: string;
}

const BADGE_ICONS: Record<string, any> = {
  first_session: Star,
  ten_sessions: Award,
  fifty_sessions: Trophy,
  five_star_rating: Target,
  hundred_sessions: Zap,
};

export function CoachBadges({ coachId }: { coachId?: string }) {
  const [badges, setBadges] = useState<CoachBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBadges();
  }, [coachId]);

  const fetchBadges = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const targetId = coachId || user?.id;
    if (!targetId) return;

    const { data } = await supabase
      .from("mentor_badges")
      .select("*")
      .eq("mentor_id", targetId)
      .order("earned_at", { ascending: false });

    setBadges(data || []);
    setLoading(false);
  };

  if (loading) return <div>Loading badges...</div>;
  if (badges.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Achievements & Badges
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map((badge) => {
            const Icon = BADGE_ICONS[badge.badge_type] || Award;
            return (
              <div
                key={badge.id}
                className="flex flex-col items-center text-center p-4 border rounded-lg bg-gradient-to-b from-primary/10 to-transparent"
              >
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-semibold text-sm">{badge.badge_name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {badge.description}
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {new Date(badge.earned_at).toLocaleDateString()}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
