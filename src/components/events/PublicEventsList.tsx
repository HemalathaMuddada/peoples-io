import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Search, Calendar, MapPin, Sparkles, Clock, Users, Bookmark, BookmarkCheck, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ParsedEvent {
  title: string;
  date?: string;
  location?: string;
  description?: string;
  url?: string;
  categories?: string[];
}
const cleanMarkdownText = (text: string): string => {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\\([*_{}[\]()#+\-.!])/g, '$1')
    .replace(/\\\\/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-*+]\s+/gm, '')
    .trim();
};

const extractCategories = (title: string, description: string): string[] => {
  const categories: string[] = [];
  const text = `${title} ${description}`.toLowerCase();
  
  // Define category keywords
  const categoryKeywords: Record<string, string[]> = {
    'Networking': ['networking', 'network', 'meetup', 'social', 'mixer', 'connect'],
    'Technology': ['tech', 'technology', 'ai', 'software', 'coding', 'developer', 'programming', 'startup'],
    'Business': ['business', 'entrepreneur', 'startup', 'founder', 'pitch', 'investor'],
    'Workshop': ['workshop', 'training', 'course', 'learn', 'tutorial', 'hands-on'],
    'Conference': ['conference', 'summit', 'convention', 'symposium'],
    'Panel': ['panel', 'discussion', 'talk', 'speaker', 'fireside'],
    'Career': ['career', 'job', 'hiring', 'recruiting', 'interview'],
    'Design': ['design', 'ui', 'ux', 'creative', 'product design'],
    'Marketing': ['marketing', 'growth', 'sales', 'branding'],
    'Community': ['community', 'local', 'neighborhood', 'meetup'],
    'Virtual': ['virtual', 'online', 'remote', 'zoom', 'webinar'],
    'Food & Drink': ['food', 'drink', 'dinner', 'lunch', 'brunch', 'happy hour', 'coffee'],
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      categories.push(category);
    }
  }
  
  return categories.length > 0 ? categories : ['General'];
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Networking': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'Technology': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    'Business': 'bg-green-500/10 text-green-600 border-green-500/20',
    'Workshop': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'Conference': 'bg-red-500/10 text-red-600 border-red-500/20',
    'Panel': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    'Career': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    'Design': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
    'Marketing': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    'Community': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    'Virtual': 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    'Food & Drink': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    'General': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };
  
  return colors[category] || colors['General'];
};

const parseEventsFromMarkdown = (markdown: string): ParsedEvent[] => {
  const events: ParsedEvent[] = [];
  
  // Split by major sections (looking for event titles)
  const lines = markdown.split('\n');
  let currentEvent: ParsedEvent | null = null;
  let seenTitles = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Detect event title (markdown header or bold text that looks like a title)
    const isTitleLine = line.match(/^#{2,3}\s+(.+)/) || 
                       (line.match(/^\*\*([^*]+)\*\*$/) && line.length > 20);
    
    if (isTitleLine) {
      // Save previous event if it exists and has meaningful content
      if (currentEvent && currentEvent.title && !seenTitles.has(currentEvent.title)) {
        seenTitles.add(currentEvent.title);
        events.push(currentEvent);
      }
      
      // Start new event
      const titleText = cleanMarkdownText(line);
      currentEvent = {
        title: titleText,
        date: '',
        location: '',
        description: '',
        url: '',
        categories: []
      };
      continue;
    }
    
    if (!currentEvent) continue;
    
    // Extract URL
    const urlMatch = line.match(/(https?:\/\/[^\s)]+)/);
    if (urlMatch && !currentEvent.url) {
      currentEvent.url = urlMatch[1];
      continue;
    }
    
    // Extract date
    if (!currentEvent.date && (
      line.match(/\d{1,2}:\d{2}\s*(am|pm|AM|PM)/i) ||
      line.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*,?\s+\w+\s+\d{1,2}/i) ||
      line.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)
    )) {
      currentEvent.date = cleanMarkdownText(line);
      continue;
    }
    
    // Extract location
    if (!currentEvent.location && (
      line.match(/📍|🌍/) ||
      line.toLowerCase().includes('location:') ||
      line.toLowerCase().includes('venue:')
    )) {
      currentEvent.location = cleanMarkdownText(
        line.replace(/📍|🌍/g, '').replace(/location:|venue:/gi, '')
      );
      continue;
    }
    
    // Add to description if meaningful
    if (line.length > 20 && !line.match(/^https?:\/\//)) {
      const cleanDesc = cleanMarkdownText(line);
      if (currentEvent.description) {
        currentEvent.description += ' ' + cleanDesc;
      } else {
        currentEvent.description = cleanDesc;
      }
    }
  }
  
  // Add the last event
  if (currentEvent && currentEvent.title && !seenTitles.has(currentEvent.title)) {
    events.push(currentEvent);
  }
  
  // Clean up descriptions and extract categories
  return events
    .filter(e => e.title.length > 10)
    .map(e => ({
      ...e,
      description: e.description.substring(0, 160) + (e.description.length > 160 ? '...' : ''),
      categories: extractCategories(e.title, e.description)
    }))
    .slice(0, 15);
};

export const PublicEventsList = () => {
  const [searchUrl, setSearchUrl] = useState("https://lu.ma/discover");
  const [activeUrl, setActiveUrl] = useState("https://lu.ma/discover");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-luma-events", activeUrl],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("scrape-luma-events", {
        body: { url: activeUrl },
      });

      if (error) {
        console.error('Error fetching events:', error);
        throw new Error(error.message || 'Failed to fetch events. Please try again.');
      }

      if (data?.error) {
        console.error('API returned error:', data.error);
        throw new Error(data.error);
      }

      if (!data?.success && !data?.data?.markdown) {
        console.error('No markdown content in response');
        throw new Error('No content received from the events page');
      }

      return data;
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Simulate progress during loading
  useEffect(() => {
    if (isLoading) {
      setLoadingProgress(0);
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 95) return 95; // Cap at 95% until actual completion
          return prev + 5;
        });
      }, 1500); // Update every 1.5 seconds to reach ~95% in 30 seconds

      return () => clearInterval(interval);
    } else {
      setLoadingProgress(100);
    }
  }, [isLoading]);

  const handleSearch = () => {
    if (!searchUrl) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }
    setActiveUrl(searchUrl);
  };

  const parsedEvents = data?.success && data?.data?.markdown 
    ? parseEventsFromMarkdown(data.data.markdown)
    : [];

  // Get all unique categories
  const allCategories = Array.from(
    new Set(parsedEvents.flatMap(event => event.categories || []))
  ).sort();

  // Filter events by selected category
  const filteredEvents = selectedCategory === "All"
    ? parsedEvents
    : parsedEvents.filter(event => 
        event.categories?.includes(selectedCategory)
      );

  // Fetch user's favorite events
  const { data: favorites = [] } = useQuery({
    queryKey: ["favorite-events", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("favorite_events")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Add to favorites mutation
  const addToFavorites = useMutation({
    mutationFn: async (event: ParsedEvent) => {
      if (!userId) throw new Error("Must be logged in");

      const { error } = await supabase.from("favorite_events").insert({
        user_id: userId,
        event_title: event.title,
        event_url: event.url || activeUrl,
        event_date: event.date,
        event_location: event.location,
        event_description: event.description,
        source_url: activeUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-events", userId] });
      toast({
        title: "Saved!",
        description: "Event added to your favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save event",
        variant: "destructive",
      });
    },
  });

  // Remove from favorites mutation
  const removeFromFavorites = useMutation({
    mutationFn: async (eventUrl: string) => {
      if (!userId) throw new Error("Must be logged in");

      const { error } = await supabase
        .from("favorite_events")
        .delete()
        .eq("user_id", userId)
        .eq("event_url", eventUrl);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite-events", userId] });
      toast({
        title: "Removed",
        description: "Event removed from favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove event",
        variant: "destructive",
      });
    },
  });

  const isFavorite = (eventUrl: string) => {
    return favorites.some((fav) => fav.event_url === eventUrl);
  };

  const handleToggleFavorite = (event: ParsedEvent) => {
    if (!userId) {
      toast({
        title: "Login required",
        description: "Please log in to save favorite events",
        variant: "destructive",
      });
      return;
    }

    const eventUrl = event.url || activeUrl;
    if (isFavorite(eventUrl)) {
      removeFromFavorites.mutate(eventUrl);
    } else {
      addToFavorites.mutate(event);
      
      // Track analytics
      trackAnalytics(event, 'favorite');
    }
  };

  const trackAnalytics = async (event: ParsedEvent, interactionType: 'view' | 'favorite' | 'click') => {
    if (!userId) return;

    try {
      await supabase.from("event_analytics").insert({
        event_url: event.url || activeUrl,
        event_title: event.title,
        event_category: event.categories?.[0] || 'General',
        interaction_type: interactionType,
        user_id: userId,
        source_url: activeUrl,
      });
    } catch (error) {
      console.error('Failed to track analytics:', error);
    }
  };

  const handleEventClick = (event: ParsedEvent) => {
    trackAnalytics(event, 'click');
  };

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

  return (
    <div className="space-y-8">
      <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-2xl">Discover Events</CardTitle>
          </div>
          <CardDescription>
            Browse public events from Luma by entering a discovery page URL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Section */}
          <div className="space-y-3">
            <Label htmlFor="luma-url" className="text-base font-semibold">
              Luma Page URL
            </Label>
            <div className="flex gap-3">
              <Input
                id="luma-url"
                placeholder="https://lu.ma/discover"
                value={searchUrl}
                onChange={(e) => setSearchUrl(e.target.value)}
                className="h-12 text-base"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isLoading}
                size="lg"
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <p className="text-sm text-muted-foreground w-full mb-1">Quick links:</p>
              {["lu.ma/discover", "lu.ma/sf", "lu.ma/nyc", "lu.ma/london"].map((url) => (
                <Button
                  key={url}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchUrl(`https://${url}`);
                    setActiveUrl(`https://${url}`);
                  }}
                  className="text-xs"
                >
                  {url.split("/")[1]}
                </Button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          {!isLoading && parsedEvents.length > 0 && (
            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Label htmlFor="category-filter" className="text-sm font-medium">
                    Filter by Category:
                  </Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger id="category-filter" className="w-[200px] h-9">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {allCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 text-sm sm:ml-auto">
                  <span className="font-medium text-foreground">
                    {filteredEvents.length}
                  </span>
                  <span className="text-muted-foreground">
                    {filteredEvents.length === 1 ? 'event' : 'events'}
                    {selectedCategory !== "All" && ` in ${selectedCategory}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="py-8 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <h3 className="text-lg font-semibold">Fetching events...</h3>
              </div>
              <p className="text-center text-muted-foreground text-sm">
                This may take up to 30 seconds
              </p>
              <div className="space-y-2 max-w-md mx-auto">
                <Progress value={loadingProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  {loadingProgress < 95 ? 'Scraping event data...' : 'Almost there...'}
                </p>
              </div>
            </CardContent>
          </Card>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.success && data?.data && filteredEvents.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Events Found</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} 
                {selectedCategory !== "All" && ` in ${selectedCategory}`}
              </p>
            </div>
            <Button asChild variant="outline">
              <a href={activeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Luma
              </a>
            </Button>
          </div>

          <div className="grid gap-6">
            {filteredEvents.map((event, index) => {
              const eventUrl = event.url || activeUrl;
              const isEventFavorite = isFavorite(eventUrl);
              
              return (
                <Card 
                  key={`${event.title}-${index}`}
                  className="group hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden bg-gradient-to-br from-card to-card/50"
                >
                  <div className="p-8">
                    <div className="space-y-5">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 flex-1">
                            {event.title}
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFavorite(event)}
                            className="shrink-0"
                            disabled={addToFavorites.isPending || removeFromFavorites.isPending}
                          >
                            {isEventFavorite ? (
                              <BookmarkCheck className="h-5 w-5 text-primary fill-primary" />
                            ) : (
                              <Bookmark className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                        
                        {event.categories && event.categories.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {event.categories.map((category, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`${getCategoryColor(category)} border`}
                              >
                                {category}
                              </Badge>
                            ))}
                          </div>
                        )}
                      
                        {(event.date || event.location) && (
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                          {event.date && (
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Clock className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-foreground">{event.date}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <MapPin className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-foreground">{event.location}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {event.description && (
                        <p className="text-base text-muted-foreground leading-relaxed">
                          {event.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        asChild 
                        className="w-full sm:w-auto group/btn"
                        onClick={() => handleEventClick(event)}
                      >
                        <a 
                          href={event.url || activeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="gap-2"
                        >
                          View Event Details
                          <ExternalLink className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
              );
            })}
          </div>
        </div>
      ) : data?.success && data?.data && parsedEvents.length > 0 && filteredEvents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Filter className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No Events in This Category</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  No events found for "{selectedCategory}". Try selecting a different category.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedCategory("All")}
              >
                View All Events
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : data?.success && data?.data ? (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No Events Detected</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Could not parse events from this page. Try a different Luma URL.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No Events Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Enter a Luma URL above and click Search to discover exciting events
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
