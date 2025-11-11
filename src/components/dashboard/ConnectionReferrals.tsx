import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, ExternalLink, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ConnectionMatch {
  id: string;
  match_strength: number;
  match_type: string;
  outreach_status: string;
  notes: string;
  linkedin_connections: {
    id: string;
    full_name: string;
    headline: string;
    current_company: string;
    current_title: string;
    profile_url: string;
    avatar_url: string;
    connection_degree: number;
  };
  job_postings: {
    id: string;
    title: string;
    company: string;
    location: string;
  };
}

export function ConnectionReferrals() {
  const [matches, setMatches] = useState<ConnectionMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadConnectionMatches();
    handleLinkedInCallback();
  }, []);

  const handleLinkedInCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    // Check if this is a popup callback (opened by parent window)
    if (code && state && window.opener && !window.opener.closed) {
      // This is the popup - send data to parent and close
      window.opener.postMessage({
        type: 'linkedin-oauth-callback',
        code,
        state
      }, window.location.origin);
      window.close();
      return;
    }

    // This is the parent window - listen for popup messages
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type !== 'linkedin-oauth-callback') return;

      const { code, state } = event.data;
      const storedState = sessionStorage.getItem('linkedin_oauth_state');

      if (!code || !state || state !== storedState) {
        toast.error('Invalid OAuth state', { id: 'linkedin-sync' });
        return;
      }

      setSyncing(true);
      sessionStorage.removeItem('linkedin_oauth_state');
      sessionStorage.removeItem('linkedin_sync_pending');

      try {
        toast.loading('Exchanging OAuth code...', { id: 'linkedin-sync' });

        const redirectUri = `${window.location.origin}/dashboard`;
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke('linkedin-oauth', {
          body: { code, redirectUri }
        });

        if (tokenError || !tokenData?.success || !tokenData?.accessToken) {
          throw new Error('Failed to authenticate with LinkedIn');
        }

        toast.loading('Syncing LinkedIn connections...', { id: 'linkedin-sync' });

        // Call sync-linkedin-connections edge function with the access token
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-linkedin-connections', {
          body: { accessToken: tokenData.accessToken }
        });

        if (syncError) {
          throw new Error(syncError.message || 'Failed to sync connections');
        }

        await loadConnectionMatches();
        toast.success(`Synced ${syncData?.connectionsCount || 0} connections and found ${syncData?.matchesCount || 0} referral matches!`, { id: 'linkedin-sync' });

      } catch (error) {
        console.error('LinkedIn callback error:', error);
        toast.error(error instanceof Error ? error.message : 'Sync failed', { id: 'linkedin-sync' });
      } finally {
        setSyncing(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  };

  const loadConnectionMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data, error } = await supabase
        .from('connection_job_matches')
        .select(`
          *,
          linkedin_connections(*),
          job_postings(*)
        `)
        .eq('profile_id', profile.id)
        .order('match_strength', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error loading connection matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncConnections = async () => {
    setSyncing(true);
    try {
      // Get LinkedIn client ID
      const { data: clientData, error: clientError } = await supabase.functions.invoke('linkedin-oauth', {
        body: { action: 'get_client_id' }
      });

      if (clientError || !clientData?.clientId) {
        throw new Error('LinkedIn OAuth not configured');
      }

      // Use the same redirect URI that's configured in LinkedIn app settings
      const redirectUri = `${window.location.origin}/dashboard`;
      const state = Math.random().toString(36).substring(7);
      
      // Store state for verification
      sessionStorage.setItem('linkedin_oauth_state', state);

      // LinkedIn OAuth URL
      const scope = encodeURIComponent('openid profile email');
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientData.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;

      // Open OAuth in popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        authUrl,
        'LinkedIn OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        sessionStorage.removeItem('linkedin_oauth_state');
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          // Check if OAuth was successful (state will be removed by callback handler)
          const stateStillExists = sessionStorage.getItem('linkedin_oauth_state');
          if (stateStillExists) {
            sessionStorage.removeItem('linkedin_oauth_state');
            toast.error('OAuth flow cancelled');
            setSyncing(false);
          }
        }
      }, 500);

    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to sync connections");
      setSyncing(false);
    }
  };

  const handleContactConnection = async (matchId: string, profileUrl: string) => {
    try {
      await supabase
        .from('connection_job_matches')
        .update({ 
          outreach_status: 'contacted',
          contacted_at: new Date().toISOString()
        })
        .eq('id', matchId);

      window.open(profileUrl, '_blank');
      toast.success("Opening LinkedIn profile");
      loadConnectionMatches();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getMatchBadgeColor = (strength: number) => {
    if (strength >= 80) return "bg-green-500/10 text-green-600 border-green-500/20";
    if (strength >= 60) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            LinkedIn Referral Network
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              LinkedIn Referral Network
            </CardTitle>
            <CardDescription>
              Connections who can help you land your target jobs
            </CardDescription>
          </div>
          <Button 
            onClick={handleSyncConnections}
            disabled={syncing}
            size="sm"
            variant="outline"
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Users className="h-4 w-4 mr-2" />
                Sync Connections
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No connection matches yet</p>
            <p className="text-xs mt-2">Sync your LinkedIn connections to find referral opportunities</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={match.linkedin_connections.avatar_url} />
                  <AvatarFallback>
                    {match.linkedin_connections.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">
                        {match.linkedin_connections.full_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {match.linkedin_connections.current_title} at {match.linkedin_connections.current_company}
                      </p>
                    </div>
                    <Badge className={getMatchBadgeColor(match.match_strength)}>
                      {match.match_strength}% Match
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{match.job_postings.title}</span>
                    <span>at {match.job_postings.company}</span>
                  </div>

                  {match.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      {match.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleContactConnection(match.id, match.linkedin_connections.profile_url)}
                      disabled={match.outreach_status === 'contacted'}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {match.outreach_status === 'contacted' ? 'Contacted' : 'Request Referral'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(match.linkedin_connections.profile_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}