import { PublicEventsList } from "@/components/events/PublicEventsList";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Events = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!user) {
    return null;
  }

  return (
    <AppLayout user={user}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-primary/10 backdrop-blur-sm">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Discover Events
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/events/analytics")}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Browse and explore public events from Luma communities worldwide
          </p>
        </div>

        <PublicEventsList />
      </div>
    </AppLayout>
  );
};

export default Events;
