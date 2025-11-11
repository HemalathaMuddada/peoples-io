import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

type JobAlert = {
  id: string;
  alert_name: string;
  filters: any;
  frequency: string;
  enabled: boolean;
  last_sent_at: string | null;
  created_at: string;
};

export function JobAlertsTab({ profileId }: { profileId: string }) {
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null);

  const [formData, setFormData] = useState({
    alert_name: "",
    keywords: "",
    location: "",
    remote: false,
    min_salary: "",
    seniority: "",
    frequency: "daily",
  });

  useEffect(() => {
    if (profileId) {
      loadAlerts();
    }
  }, [profileId]);

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("job_alerts")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      console.error("Error loading alerts:", error);
      toast.error("Failed to load job alerts");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAlert = async () => {
    if (!formData.alert_name) {
      toast.error("Please enter an alert name");
      return;
    }

    try {
      const filters = {
        keywords: formData.keywords,
        location: formData.location,
        remote: formData.remote,
        min_salary: formData.min_salary ? parseInt(formData.min_salary) : null,
        seniority: formData.seniority || null,
      };

      if (editingAlert) {
        const { error } = await supabase
          .from("job_alerts")
          .update({
            alert_name: formData.alert_name,
            filters,
            frequency: formData.frequency,
          })
          .eq("id", editingAlert.id);

        if (error) throw error;
        toast.success("Alert updated successfully");
      } else {
        const { error } = await supabase
          .from("job_alerts")
          .insert({
            profile_id: profileId,
            alert_name: formData.alert_name,
            filters,
            frequency: formData.frequency,
          });

        if (error) throw error;
        toast.success("Alert created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      loadAlerts();
    } catch (error: any) {
      console.error("Error saving alert:", error);
      toast.error("Failed to save alert");
    }
  };

  const handleToggleAlert = async (alertId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("job_alerts")
        .update({ enabled })
        .eq("id", alertId);

      if (error) throw error;
      
      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId ? { ...alert, enabled } : alert
        )
      );
      
      toast.success(enabled ? "Alert enabled" : "Alert paused");
    } catch (error: any) {
      console.error("Error toggling alert:", error);
      toast.error("Failed to update alert");
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm("Are you sure you want to delete this alert?")) return;

    try {
      const { error } = await supabase
        .from("job_alerts")
        .delete()
        .eq("id", alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      toast.success("Alert deleted");
    } catch (error: any) {
      console.error("Error deleting alert:", error);
      toast.error("Failed to delete alert");
    }
  };

  const handleEditAlert = (alert: JobAlert) => {
    setEditingAlert(alert);
    setFormData({
      alert_name: alert.alert_name,
      keywords: alert.filters.keywords || "",
      location: alert.filters.location || "",
      remote: alert.filters.remote || false,
      min_salary: alert.filters.min_salary?.toString() || "",
      seniority: alert.filters.seniority || "",
      frequency: alert.frequency,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      alert_name: "",
      keywords: "",
      location: "",
      remote: false,
      min_salary: "",
      seniority: "",
      frequency: "daily",
    });
    setEditingAlert(null);
  };

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Job Alerts
          </h2>
          <p className="text-muted-foreground mt-1">Get notified about matching job opportunities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAlert ? "Edit Alert" : "Create New Alert"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="alert_name">Alert Name *</Label>
                <Input
                  id="alert_name"
                  value={formData.alert_name}
                  onChange={(e) => setFormData({ ...formData, alert_name: e.target.value })}
                  placeholder="Senior React Developer in NYC"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="keywords">Keywords</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="React, TypeScript"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="New York, NY"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_salary">Minimum Salary</Label>
                  <Input
                    id="min_salary"
                    type="number"
                    value={formData.min_salary}
                    onChange={(e) => setFormData({ ...formData, min_salary: e.target.value })}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label htmlFor="seniority">Seniority</Label>
                  <Select value={formData.seniority || undefined} onValueChange={(value) => setFormData({ ...formData, seniority: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="remote">Remote Only</Label>
                <Switch
                  id="remote"
                  checked={formData.remote}
                  onCheckedChange={(checked) => setFormData({ ...formData, remote: checked })}
                />
              </div>
              <div>
                <Label htmlFor="frequency">Notification Frequency</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveAlert} className="w-full">
                {editingAlert ? "Update Alert" : "Create Alert"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No job alerts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first alert to get notified about matching opportunities
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <Card key={alert.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle>{alert.alert_name}</CardTitle>
                      <Badge variant={alert.enabled ? "default" : "secondary"}>
                        {alert.enabled ? "Active" : "Paused"}
                      </Badge>
                      <Badge variant="outline">{alert.frequency}</Badge>
                    </div>
                    <CardDescription>
                      {alert.filters.keywords && <span>Keywords: {alert.filters.keywords} • </span>}
                      {alert.filters.location && <span>Location: {alert.filters.location} • </span>}
                      {alert.filters.remote && <span>Remote • </span>}
                      {alert.filters.min_salary && <span>Min Salary: ${alert.filters.min_salary.toLocaleString()}</span>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={(checked) => handleToggleAlert(alert.id, checked)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditAlert(alert)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAlert(alert.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
