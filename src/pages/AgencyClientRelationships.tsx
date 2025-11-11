import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Building2, 
  Plus, 
  Check, 
  X, 
  Clock, 
  FileText, 
  Calendar 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecruiterAssignment } from "@/components/agency/RecruiterAssignment";

interface Relationship {
  id: string;
  agency_org_id: string;
  employer_org_id: string;
  status: "pending" | "active" | "suspended" | "terminated";
  start_date: string;
  end_date: string | null;
  contract_terms: string | null;
  created_at: string;
  approved_at: string | null;
  notes: string | null;
  agency_org: { company_name: string };
  employer_org: { company_name: string };
}

interface Organization {
  id: string;
  company_name: string;
  type: string;
}

export default function AgencyClientRelationships() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAgency, setIsAgency] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employer_org_id: "",
    agency_org_id: "",
    contract_terms: "",
    notes: "",
    start_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchUserRole();
    fetchRelationships();
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles" as any)
      .select("org_id, role")
      .eq("user_id", user.id)
      .single();

    if (rolesError || !roles) {
      console.error("Error fetching user roles:", rolesError);
      return;
    }

    const typedRoles = roles as any as { org_id: string; role: string };
    setUserOrgId(typedRoles.org_id);
    setUserRole(typedRoles.role);
    
    const { data: org, error: orgError } = await supabase
      .from("organizations" as any)
      .select("type")
      .eq("id", typedRoles.org_id)
      .single();
    
    if (orgError || !org) {
      console.error("Error fetching organization:", orgError);
      return;
    }

    const typedOrg = org as any as { type: string };
    setIsAgency(typedOrg.type === "agency");
    
    if (typedRoles.role === "agency_admin" || typedRoles.role === "recruiter") {
      fetchEmployers();
    } else {
      fetchAgencies();
    }
  };

  const fetchEmployers = async () => {
    const { data, error } = await supabase
      .from("organizations" as any)
      .select("id, company_name, type")
      .eq("type", "employer");
    
    if (error) {
      console.error("Error fetching employers:", error);
      return;
    }
    setOrganizations((data as any) || []);
  };

  const fetchAgencies = async () => {
    const { data, error } = await supabase
      .from("organizations" as any)
      .select("id, company_name, type")
      .eq("type", "agency");
    
    if (error) {
      console.error("Error fetching agencies:", error);
      return;
    }
    setOrganizations((data as any) || []);
  };

  const fetchRelationships = async () => {
    try {
      const { data, error } = await supabase
        .from("agency_client_relationships" as any)
        .select(`
          *,
          agency_org:organizations!agency_org_id(company_name),
          employer_org:organizations!employer_org_id(company_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRelationships(data as any || []);
    } catch (error: any) {
      console.error("Error fetching relationships:", error);
      toast.error("Failed to load relationships");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !userOrgId) return;

    const insertData = isAgency
      ? {
          agency_org_id: userOrgId,
          employer_org_id: formData.employer_org_id,
          contract_terms: formData.contract_terms || null,
          notes: formData.notes || null,
          start_date: formData.start_date,
          created_by: user.id,
        }
      : {
          employer_org_id: userOrgId,
          agency_org_id: formData.agency_org_id,
          contract_terms: formData.contract_terms || null,
          notes: formData.notes || null,
          start_date: formData.start_date,
          created_by: user.id,
        };

    const { error } = await supabase
      .from("agency_client_relationships" as any)
      .insert([insertData]);

    if (error) {
      toast.error("Failed to create relationship");
      console.error(error);
      return;
    }

    toast.success("Relationship request created successfully!");
    setDialogOpen(false);
    setFormData({
      employer_org_id: "",
      agency_org_id: "",
      contract_terms: "",
      notes: "",
      start_date: new Date().toISOString().split("T")[0],
    });
    fetchRelationships();
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updateData: any = { status };
    if (status === "active") {
      updateData.approved_by = user.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("agency_client_relationships" as any)
      .update(updateData)
      .eq("id", id);

    if (error) {
      toast.error("Failed to update relationship");
      console.error(error);
      return;
    }

    toast.success(`Relationship ${status === "active" ? "approved" : "updated"} successfully!`);
    fetchRelationships();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "pending": return "outline";
      case "suspended": return "secondary";
      case "terminated": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Check className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "suspended": return <X className="h-4 w-4" />;
      case "terminated": return <X className="h-4 w-4" />;
      default: return null;
    }
  };

  const filterRelationships = (status?: string) => {
    if (!status) return relationships;
    return relationships.filter((r) => r.status === status);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isAgency ? "Client Relationships" : "Agency Partners"}
          </h1>
          <p className="text-muted-foreground">
            {isAgency 
              ? "Manage relationships with your employer clients"
              : "Manage partnerships with recruiting agencies"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add {isAgency ? "Client" : "Agency"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Relationship</DialogTitle>
              <DialogDescription>
                Request a new partnership {isAgency ? "with an employer" : "with an agency"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateRelationship} className="space-y-4">
              <div>
                <Label htmlFor="organization">
                  {isAgency ? "Employer" : "Agency"} *
                </Label>
                <Select
                  value={isAgency ? formData.employer_org_id : formData.agency_org_id}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      [isAgency ? "employer_org_id" : "agency_org_id"]: value,
                    })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${isAgency ? "employer" : "agency"}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="contract_terms">Contract Terms</Label>
                <Textarea
                  id="contract_terms"
                  rows={3}
                  value={formData.contract_terms}
                  onChange={(e) =>
                    setFormData({ ...formData, contract_terms: e.target.value })
                  }
                  placeholder="Describe the terms of the partnership..."
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Request</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All ({relationships.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({filterRelationships("pending").length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({filterRelationships("active").length})
          </TabsTrigger>
          <TabsTrigger value="suspended">
            Suspended ({filterRelationships("suspended").length})
          </TabsTrigger>
        </TabsList>

        {["all", "pending", "active", "suspended"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {filterRelationships(tab === "all" ? undefined : tab).map((relationship) => (
              <Card key={relationship.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {isAgency
                          ? relationship.employer_org.company_name
                          : relationship.agency_org.company_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        <Badge variant={getStatusColor(relationship.status)} className="mr-2">
                          <span className="mr-1">{getStatusIcon(relationship.status)}</span>
                          {relationship.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Since {new Date(relationship.start_date).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                    {relationship.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(relationship.id, "active")}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateStatus(relationship.id, "terminated")}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                    {relationship.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(relationship.id, "suspended")}
                      >
                        Suspend
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(relationship.contract_terms || relationship.notes || relationship.approved_at) && (
                    <div className="space-y-3">
                      {relationship.contract_terms && (
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                            <FileText className="h-4 w-4" />
                            Contract Terms
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {relationship.contract_terms}
                          </p>
                        </div>
                      )}
                      {relationship.notes && (
                        <div>
                          <div className="text-sm font-semibold mb-1">Notes</div>
                          <p className="text-sm text-muted-foreground">
                            {relationship.notes}
                          </p>
                        </div>
                      )}
                      {relationship.approved_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                          <Calendar className="h-3 w-3" />
                          Approved on {new Date(relationship.approved_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isAgency && relationship.status === "active" && (
                    <RecruiterAssignment
                      relationshipId={relationship.id}
                      employerName={relationship.employer_org.company_name}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
            {filterRelationships(tab === "all" ? undefined : tab).length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No {tab !== "all" && tab} relationships found
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
