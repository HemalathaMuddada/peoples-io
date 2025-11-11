import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClientOrganization {
  id: string;
  employer_org: {
    id: string;
    company_name: string;
  };
}

interface AgencyJobPostingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AgencyJobPostingForm({ onSuccess, onCancel }: AgencyJobPostingFormProps) {
  const [clients, setClients] = useState<ClientOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employer_org_id: "",
    job_title: "",
    company: "",
    location: "",
    employment_type: "full_time" as const,
    salary_range_min: "",
    salary_range_max: "",
    description: "",
    requirements: "",
  });

  useEffect(() => {
    fetchActiveClients();
  }, []);

  const fetchActiveClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles" as any)
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (rolesError || !roles) {
        console.error("Error fetching user roles:", rolesError);
        return;
      }

      const typedRoles = roles as any as { org_id: string };
      setUserOrgId(typedRoles.org_id);

      // Fetch active client relationships
      const { data, error } = await supabase
        .from("agency_client_relationships" as any)
        .select(`
          id,
          employer_org:organizations!employer_org_id(id, company_name)
        `)
        .eq("agency_org_id", typedRoles.org_id)
        .eq("status", "active");

      if (error) throw error;
      setClients((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load client list");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployerChange = (employerId: string) => {
    const selectedClient = clients.find((c) => c.employer_org.id === employerId);
    setFormData({
      ...formData,
      employer_org_id: employerId,
      company: selectedClient?.employer_org.company_name || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userOrgId) return;

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const jobData = {
        org_id: formData.employer_org_id, // The actual employer
        posting_org_id: userOrgId, // The agency posting it
        employer_org_id: formData.employer_org_id,
        posted_by_agency: true,
        job_title: formData.job_title,
        company: formData.company,
        location: formData.location,
        employment_type: formData.employment_type,
        salary_range_min: formData.salary_range_min ? parseInt(formData.salary_range_min) : null,
        salary_range_max: formData.salary_range_max ? parseInt(formData.salary_range_max) : null,
        description: formData.description,
        requirements: formData.requirements,
        posted_by: user.id,
      };

      const { error } = await supabase
        .from("job_postings" as any)
        .insert([jobData]);

      if (error) throw error;

      toast.success("Job posted successfully for client!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error posting job:", error);
      toast.error(error.message || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div>Loading clients...</div>;
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Clients</CardTitle>
          <CardDescription>
            You need to establish active relationships with employer clients before posting jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Go to Client Relationships to request partnerships with employers, or wait for approval
              of pending requests.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post Job for Client</CardTitle>
        <CardDescription>
          Create a job posting on behalf of one of your employer clients
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div>
            <Label htmlFor="employer">Select Client *</Label>
            <Select
              value={formData.employer_org_id}
              onValueChange={handleEmployerChange}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose employer client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.employer_org.id} value={client.employer_org.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {client.employer_org.company_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.employer_org_id && (
              <Badge variant="outline" className="mt-2">
                Posting for: {formData.company}
              </Badge>
            )}
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="job_title">Job Title *</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                required
                disabled={!formData.employer_org_id}
              />
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                disabled={!formData.employer_org_id}
              />
            </div>

            <div>
              <Label htmlFor="employment_type">Employment Type *</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value: any) => setFormData({ ...formData, employment_type: value })}
                disabled={!formData.employer_org_id}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="salary_min">Salary Min</Label>
              <Input
                id="salary_min"
                type="number"
                value={formData.salary_range_min}
                onChange={(e) => setFormData({ ...formData, salary_range_min: e.target.value })}
                disabled={!formData.employer_org_id}
              />
            </div>

            <div>
              <Label htmlFor="salary_max">Salary Max</Label>
              <Input
                id="salary_max"
                type="number"
                value={formData.salary_range_max}
                onChange={(e) => setFormData({ ...formData, salary_range_max: e.target.value })}
                disabled={!formData.employer_org_id}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Job Description *</Label>
            <Textarea
              id="description"
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              disabled={!formData.employer_org_id}
            />
          </div>

          <div>
            <Label htmlFor="requirements">Requirements *</Label>
            <Textarea
              id="requirements"
              rows={4}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              required
              disabled={!formData.employer_org_id}
            />
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting || !formData.employer_org_id}
              className="flex-1"
            >
              {submitting ? "Posting..." : "Post Job for Client"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
