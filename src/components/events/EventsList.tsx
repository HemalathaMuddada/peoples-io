import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface EventsListProps {
  calendarId: string;
  period: 'past' | 'future';
}

export const EventsList = ({ calendarId, period }: EventsListProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["luma-events", calendarId, period],
    queryFn: async () => {
      if (!calendarId) {
        throw new Error("Calendar ID is required");
      }

      const { data, error } = await supabase.functions.invoke("fetch-luma-events", {
        body: { calendar_api_id: calendarId, period },
      });

      if (error) throw error;
      return data;
    },
    enabled: !!calendarId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-destructive">
            Error loading events: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  const events = data?.entries || [];

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No events found. Try adjusting your filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event: any) => (
        <Card key={event.api_id} className="flex flex-col">
          {event.cover_url && (
            <div className="aspect-video w-full overflow-hidden rounded-t-lg">
              <img
                src={event.cover_url}
                alt={event.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="line-clamp-2">{event.name}</CardTitle>
              {event.event_type && (
                <Badge variant="secondary">{event.event_type}</Badge>
              )}
            </div>
            {event.description && (
              <CardDescription className="line-clamp-3">
                {event.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="space-y-2 text-sm">
              {event.start_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(event.start_at), "PPP p")}</span>
                </div>
              )}
              
              {event.geo_address_info?.city && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {event.geo_address_info.city}
                    {event.geo_address_info.region && `, ${event.geo_address_info.region}`}
                  </span>
                </div>
              )}

              {event.guest_count !== undefined && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{event.guest_count} guests</span>
                </div>
              )}
            </div>

            <Button asChild className="w-full">
              <a href={event.url} target="_blank" rel="noopener noreferrer">
                View Event <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
