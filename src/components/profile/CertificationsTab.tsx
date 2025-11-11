import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ExternalLink, Award, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Certification {
  id: string;
  certification_name: string;
  issuing_organization: string;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  description: string | null;
}

interface Endorsement {
  id: string;
  skill_name: string;
  endorsed_by: string | null;
  endorsement_date: string;
  endorsement_note: string | null;
}

export default function CertificationsTab({ profileId }: { profileId: string }) {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [endorseDialogOpen, setEndorseDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);

  const [certForm, setCertForm] = useState({
    certification_name: "",
    issuing_organization: "",
    issue_date: "",
    expiry_date: "",
    credential_id: "",
    credential_url: "",
    description: "",
  });

  const [endorseForm, setEndorseForm] = useState({
    skill_name: "",
    endorsed_by: "",
    endorsement_note: "",
  });

  useEffect(() => {
    loadData();
  }, [profileId]);

  const loadData = async () => {
    try {
      const [certsResult, endorseResult] = await Promise.all([
        supabase
          .from("candidate_certifications")
          .select("*")
          .eq("profile_id", profileId)
          .order("issue_date", { ascending: false }),
        supabase
          .from("skill_endorsements")
          .select("*")
          .eq("profile_id", profileId)
          .order("endorsement_date", { ascending: false }),
      ]);

      if (certsResult.error) throw certsResult.error;
      if (endorseResult.error) throw endorseResult.error;

      setCertifications(certsResult.data || []);
      setEndorsements(endorseResult.data || []);
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load certifications");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCert = async () => {
    try {
      const certData = {
        profile_id: profileId,
        ...certForm,
      };

      if (editingCert) {
        const { error } = await supabase
          .from("candidate_certifications")
          .update(certData)
          .eq("id", editingCert.id);

        if (error) throw error;
        toast.success("Certification updated");
      } else {
        const { error } = await supabase
          .from("candidate_certifications")
          .insert(certData);

        if (error) throw error;
        toast.success("Certification added");
      }

      resetCertForm();
      loadData();
      setCertDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving certification:", error);
      toast.error("Failed to save certification");
    }
  };

  const handleDeleteCert = async (id: string) => {
    if (!confirm("Delete this certification?")) return;

    try {
      const { error } = await supabase
        .from("candidate_certifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Certification deleted");
      loadData();
    } catch (error: any) {
      console.error("Error deleting certification:", error);
      toast.error("Failed to delete certification");
    }
  };

  const handleSaveEndorsement = async () => {
    try {
      const { error } = await supabase
        .from("skill_endorsements")
        .insert({
          profile_id: profileId,
          ...endorseForm,
        });

      if (error) throw error;
      toast.success("Endorsement added");
      resetEndorseForm();
      loadData();
      setEndorseDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving endorsement:", error);
      toast.error("Failed to save endorsement");
    }
  };

  const handleDeleteEndorsement = async (id: string) => {
    if (!confirm("Delete this endorsement?")) return;

    try {
      const { error } = await supabase
        .from("skill_endorsements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Endorsement deleted");
      loadData();
    } catch (error: any) {
      console.error("Error deleting endorsement:", error);
      toast.error("Failed to delete endorsement");
    }
  };

  const handleEditCert = (cert: Certification) => {
    setEditingCert(cert);
    setCertForm({
      certification_name: cert.certification_name,
      issuing_organization: cert.issuing_organization,
      issue_date: cert.issue_date || "",
      expiry_date: cert.expiry_date || "",
      credential_id: cert.credential_id || "",
      credential_url: cert.credential_url || "",
      description: cert.description || "",
    });
    setCertDialogOpen(true);
  };

  const resetCertForm = () => {
    setCertForm({
      certification_name: "",
      issuing_organization: "",
      issue_date: "",
      expiry_date: "",
      credential_id: "",
      credential_url: "",
      description: "",
    });
    setEditingCert(null);
  };

  const resetEndorseForm = () => {
    setEndorseForm({
      skill_name: "",
      endorsed_by: "",
      endorsement_note: "",
    });
  };

  if (loading) {
    return <div className="py-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Certifications Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Certifications</h2>
            <p className="text-muted-foreground mt-1">
              Add your professional certifications and credentials
            </p>
          </div>
          <Dialog open={certDialogOpen} onOpenChange={(open) => {
            setCertDialogOpen(open);
            if (!open) resetCertForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Certification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCert ? "Edit" : "Add"} Certification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Certification Name *</Label>
                  <Input
                    value={certForm.certification_name}
                    onChange={(e) => setCertForm({ ...certForm, certification_name: e.target.value })}
                    placeholder="AWS Certified Solutions Architect"
                  />
                </div>
                <div>
                  <Label>Issuing Organization *</Label>
                  <Input
                    value={certForm.issuing_organization}
                    onChange={(e) => setCertForm({ ...certForm, issuing_organization: e.target.value })}
                    placeholder="Amazon Web Services"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      value={certForm.issue_date}
                      onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={certForm.expiry_date}
                      onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Credential ID</Label>
                  <Input
                    value={certForm.credential_id}
                    onChange={(e) => setCertForm({ ...certForm, credential_id: e.target.value })}
                    placeholder="ABC123XYZ"
                  />
                </div>
                <div>
                  <Label>Credential URL</Label>
                  <Input
                    type="url"
                    value={certForm.credential_url}
                    onChange={(e) => setCertForm({ ...certForm, credential_url: e.target.value })}
                    placeholder="https://verify.example.com"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={certForm.description}
                    onChange={(e) => setCertForm({ ...certForm, description: e.target.value })}
                    placeholder="Brief description of the certification..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setCertDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveCert}
                    disabled={!certForm.certification_name || !certForm.issuing_organization}
                  >
                    {editingCert ? "Update" : "Add"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {certifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No certifications added yet
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {certifications.map((cert) => (
              <Card key={cert.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <Award className="w-12 h-12 text-primary" />
                      <div className="flex-1">
                        <CardTitle>{cert.certification_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {cert.issuing_organization}
                        </CardDescription>
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          {cert.issue_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Issued: {new Date(cert.issue_date).toLocaleDateString()}
                            </span>
                          )}
                          {cert.expiry_date && (
                            <span>
                              Expires: {new Date(cert.expiry_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {cert.credential_id && (
                          <Badge variant="outline" className="mt-2">
                            ID: {cert.credential_id}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {cert.credential_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={cert.credential_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleEditCert(cert)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCert(cert.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {cert.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{cert.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Endorsements Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Skill Endorsements</h2>
            <p className="text-muted-foreground mt-1">
              Track endorsements from colleagues and clients
            </p>
          </div>
          <Dialog open={endorseDialogOpen} onOpenChange={(open) => {
            setEndorseDialogOpen(open);
            if (!open) resetEndorseForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Endorsement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Skill Endorsement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Skill *</Label>
                  <Input
                    value={endorseForm.skill_name}
                    onChange={(e) => setEndorseForm({ ...endorseForm, skill_name: e.target.value })}
                    placeholder="React, Project Management, etc."
                  />
                </div>
                <div>
                  <Label>Endorsed By</Label>
                  <Input
                    value={endorseForm.endorsed_by}
                    onChange={(e) => setEndorseForm({ ...endorseForm, endorsed_by: e.target.value })}
                    placeholder="John Doe, Senior Developer"
                  />
                </div>
                <div>
                  <Label>Note</Label>
                  <Textarea
                    value={endorseForm.endorsement_note}
                    onChange={(e) => setEndorseForm({ ...endorseForm, endorsement_note: e.target.value })}
                    placeholder="Optional note about the endorsement..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setEndorseDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEndorsement} disabled={!endorseForm.skill_name}>
                    Add
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {endorsements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No endorsements yet
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {endorsements.map((endorsement) => (
              <Card key={endorsement.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge>{endorsement.skill_name}</Badge>
                        {endorsement.endorsed_by && (
                          <span className="text-sm text-muted-foreground">
                            by {endorsement.endorsed_by}
                          </span>
                        )}
                      </div>
                      {endorsement.endorsement_note && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {endorsement.endorsement_note}
                        </p>
                      )}
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {new Date(endorsement.endorsement_date).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteEndorsement(endorsement.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
