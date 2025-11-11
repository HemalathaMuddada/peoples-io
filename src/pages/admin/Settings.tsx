import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Flag, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Settings() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [newFlag, setNewFlag] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchFeatureFlags();
    }
  }, [isAdmin]);

  const fetchFeatureFlags = async () => {
    const { data } = await supabase
      .from('feature_flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setFeatureFlags(data);
    }
  };

  const toggleFeature = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: !currentState })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update feature flag');
    } else {
      toast.success('Feature flag updated');
      fetchFeatureFlags();
    }
  };

  const createFeatureFlag = async () => {
    if (!newFlag.name) {
      toast.error('Feature name is required');
      return;
    }

    const { error } = await supabase
      .from('feature_flags')
      .insert({
        flag_name: newFlag.name,
        description: newFlag.description,
        enabled: false,
      });

    if (error) {
      toast.error('Failed to create feature flag');
    } else {
      toast.success('Feature flag created');
      setNewFlag({ name: '', description: '' });
      fetchFeatureFlags();
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">System Settings</h1>
        <p className="text-muted-foreground">Configure feature flags and global settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Create New Feature Flag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="flag-name">Feature Name</Label>
              <Input
                id="flag-name"
                placeholder="e.g., enable_ai_coach"
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="flag-desc">Description</Label>
              <Input
                id="flag-desc"
                placeholder="Describe this feature"
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
              />
            </div>
            <Button onClick={createFeatureFlag}>
              <Save className="mr-2 h-4 w-4" />
              Create Feature Flag
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {featureFlags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feature flags yet</p>
            ) : (
              featureFlags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">{flag.flag_name}</h4>
                    <p className="text-sm text-muted-foreground">{flag.description}</p>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={() => toggleFeature(flag.id, flag.enabled)}
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
