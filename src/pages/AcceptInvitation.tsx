import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing invitation...');
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    const acceptInvite = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid invitation link');
        return;
      }

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to auth page with return URL
        toast.info('Please sign in to accept the invitation');
        navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }

      // Accept the invitation
      const { data, error } = await supabase.rpc('accept_company_invitation', {
        invitation_token: token
      });

      if (error || !data) {
        setStatus('error');
        setMessage(error?.message || 'Failed to accept invitation');
        toast.error('Failed to accept invitation');
        return;
      }

      const result = data as any;
      
      if (!result.success) {
        setStatus('error');
        setMessage(result.error || 'Failed to accept invitation');
        toast.error(result.error || 'Failed to accept invitation');
        return;
      }

      // Fetch organization name
      const { data: org } = await supabase
        .from('organizations')
        .select('name, company_name')
        .eq('id', result.org_id)
        .single();

      if (org) {
        setOrganizationName(org.company_name || org.name);
      }

      setStatus('success');
      setMessage('Invitation accepted successfully!');
      toast.success('Welcome to your new organization!');

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    };

    acceptInvite();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-destructive" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Processing Invitation'}
            {status === 'success' && 'Invitation Accepted!'}
            {status === 'error' && 'Invitation Error'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">{message}</p>
          
          {status === 'success' && organizationName && (
            <div className="p-4 bg-primary/10 rounded-lg flex items-center justify-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-medium">{organizationName}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="pt-4">
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
