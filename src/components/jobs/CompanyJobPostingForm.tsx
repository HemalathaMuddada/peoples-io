import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface CompanyJobPostingFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CompanyJobPostingForm({ onSuccess, onCancel }: CompanyJobPostingFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [companyName, setCompanyName] = useState<string>("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    employment_type: "full_time" as const,
    salary_min: "",
    salary_max: "",
    description: "",
    requirements: "",
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's organization
      const { data: roles } = await supabase
        .from("user_roles")
        .select("org_id, organizations(company_name)")
        .eq("user_id", user.id)
        .single();

      if (roles && roles.org_id) {
        setOrgId(roles.org_id);
        setCompanyName((roles as any).organizations?.company_name || "Your Company");
      }
    } catch (error) {
      console.error("Error fetching company info:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("Company information not found");
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const jobData = {
        org_id: orgId,
        title: formData.title,
        company: companyName,
        location: formData.location,
        employment_type: formData.employment_type,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : null,
        description: formData.description,
        requirements: formData.requirements,
        posted_by: user.id,
        status: "active",
      };

      const { error } = await supabase
        .from("job_postings")
        .insert([jobData]);

      if (error) throw error;

      toast.success("Job posted successfully!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error posting job:", error);
      toast.error(error.message || "Failed to post job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post New Job</CardTitle>
        <CardDescription>
          Create a job posting for {companyName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g. Senior Software Engineer"
              />
            </div>

            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                placeholder="e.g. San Francisco, CA or Remote"
              />
            </div>

            <div>
              <Label htmlFor="employment_type">Employment Type *</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value: any) => setFormData({ ...formData, employment_type: value })}
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
              <Label htmlFor="salary_min">Salary Min ($)</Label>
              <Input
                id="salary_min"
                type="number"
                value={formData.salary_min}
                onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                placeholder="e.g. 100000"
              />
            </div>

            <div>
              <Label htmlFor="salary_max">Salary Max ($)</Label>
              <Input
                id="salary_max"
                type="number"
                value={formData.salary_max}
                onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                placeholder="e.g. 150000"
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
              placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
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
              placeholder="List the required skills, experience, and qualifications..."
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
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? "Posting..." : "Post Job"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
