import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pen, Plus, Trash2, Star, Eye, Linkedin, Twitter, Facebook, Globe, Mail, Phone } from "lucide-react";

interface EmailSignature {
  id: string;
  name: string;
  full_name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  logo_url: string;
  social_links: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    github?: string;
  };
  disclaimer: string;
  is_default: boolean;
  is_active: boolean;
}

export function SignatureBuilder() {
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailSignature | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    full_name: "",
    title: "",
    company: "",
    email: "",
    phone: "",
    website: "",
    logo_url: "",
    linkedin: "",
    twitter: "",
    facebook: "",
    github: "",
    disclaimer: "",
    is_default: false,
  });

  useEffect(() => {
    fetchSignatures();
  }, []);

  useEffect(() => {
    updatePreview();
  }, [formData]);

  const fetchSignatures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_signatures")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []).map(sig => ({
        ...sig,
        social_links: sig.social_links as { linkedin?: string; twitter?: string; facebook?: string; github?: string; }
      }));
      
      setSignatures(typedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreview = () => {
    const html = generateSignatureHtml(formData);
    setPreviewHtml(html);
  };

  const generateSignatureHtml = (data: typeof formData): string => {
    const hasLogo = data.logo_url && data.logo_url.trim() !== "";
    
    return `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; max-width: 600px; border-top: 2px solid #0066cc; padding-top: 15px; margin-top: 20px;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    <tr>
      ${hasLogo ? `
        <td valign="top" style="padding-right: 15px;">
          <img src="${data.logo_url}" alt="Logo" style="max-width: 80px; height: auto;" />
        </td>
      ` : ''}
      <td valign="top">
        <div style="font-size: 16px; font-weight: bold; color: #0066cc; margin-bottom: 5px;">
          ${data.full_name || '[Your Name]'}
        </div>
        ${data.title ? `<div style="color: #666; margin-bottom: 3px;">${data.title}</div>` : ''}
        ${data.company ? `<div style="font-weight: 600; margin-bottom: 10px;">${data.company}</div>` : ''}
        
        <div style="margin-bottom: 10px;">
          ${data.phone ? `
            <div style="margin-bottom: 3px;">
              <span style="color: #0066cc;">📞</span> 
              <a href="tel:${data.phone}" style="color: #333; text-decoration: none;">${data.phone}</a>
            </div>
          ` : ''}
          ${data.email ? `
            <div style="margin-bottom: 3px;">
              <span style="color: #0066cc;">✉️</span> 
              <a href="mailto:${data.email}" style="color: #0066cc; text-decoration: none;">${data.email}</a>
            </div>
          ` : ''}
          ${data.website ? `
            <div style="margin-bottom: 3px;">
              <span style="color: #0066cc;">🌐</span> 
              <a href="${data.website}" style="color: #0066cc; text-decoration: none;" target="_blank">${data.website}</a>
            </div>
          ` : ''}
        </div>

        ${(data.linkedin || data.twitter || data.facebook || data.github) ? `
          <div style="margin-top: 10px;">
            ${data.linkedin ? `<a href="${data.linkedin}" style="margin-right: 10px; text-decoration: none;" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" style="width: 20px; height: 20px;" /></a>` : ''}
            ${data.twitter ? `<a href="${data.twitter}" style="margin-right: 10px; text-decoration: none;" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" style="width: 20px; height: 20px;" /></a>` : ''}
            ${data.facebook ? `<a href="${data.facebook}" style="margin-right: 10px; text-decoration: none;" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" style="width: 20px; height: 20px;" /></a>` : ''}
            ${data.github ? `<a href="${data.github}" style="text-decoration: none;" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/733/733553.png" alt="GitHub" style="width: 20px; height: 20px;" /></a>` : ''}
          </div>
        ` : ''}
      </td>
    </tr>
  </table>
  
  ${data.disclaimer ? `
    <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #999; line-height: 1.4;">
      ${data.disclaimer}
    </div>
  ` : ''}
</div>`.trim();
  };

  const handleSave = async () => {
    if (!formData.name || !formData.full_name) {
      toast({
        title: "Error",
        description: "Please provide signature name and your full name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const signatureData = {
        user_id: user?.id,
        name: formData.name,
        full_name: formData.full_name,
        title: formData.title,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        logo_url: formData.logo_url,
        social_links: {
          linkedin: formData.linkedin,
          twitter: formData.twitter,
          facebook: formData.facebook,
          github: formData.github,
        },
        disclaimer: formData.disclaimer,
        is_default: formData.is_default,
      };

      if (editing) {
        const { error } = await supabase
          .from("email_signatures")
          .update(signatureData)
          .eq("id", editing.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Signature updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("email_signatures")
          .insert(signatureData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Signature created successfully",
        });
      }

      setShowDialog(false);
      setEditing(null);
      resetForm();
      fetchSignatures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (signature: EmailSignature) => {
    setEditing(signature);
    setFormData({
      name: signature.name,
      full_name: signature.full_name,
      title: signature.title || "",
      company: signature.company || "",
      email: signature.email || "",
      phone: signature.phone || "",
      website: signature.website || "",
      logo_url: signature.logo_url || "",
      linkedin: signature.social_links.linkedin || "",
      twitter: signature.social_links.twitter || "",
      facebook: signature.social_links.facebook || "",
      github: signature.social_links.github || "",
      disclaimer: signature.disclaimer || "",
      is_default: signature.is_default,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this signature?")) return;

    try {
      const { error } = await supabase
        .from("email_signatures")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Signature deleted successfully",
      });

      fetchSignatures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { error } = await supabase
        .from("email_signatures")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default signature updated",
      });

      fetchSignatures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      full_name: "",
      title: "",
      company: "",
      email: "",
      phone: "",
      website: "",
      logo_url: "",
      linkedin: "",
      twitter: "",
      facebook: "",
      github: "",
      disclaimer: "",
      is_default: false,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Email Signatures</h3>
          <p className="text-sm text-muted-foreground">
            Create professional email signatures that automatically append to your emails
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditing(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Signature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Signature" : "Create New Signature"}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh] pr-4">
              <Tabs defaultValue="details" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="social">Social Links</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sig-name">Signature Name *</Label>
                      <Input
                        id="sig-name"
                        placeholder="e.g., Professional, Casual"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full Name *</Label>
                      <Input
                        id="full-name"
                        placeholder="John Doe"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title</Label>
                      <Input
                        id="title"
                        placeholder="Senior Recruiter"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        placeholder="Acme Corp"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        placeholder="https://company.com"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logo">Logo URL</Label>
                      <Input
                        id="logo"
                        placeholder="https://company.com/logo.png"
                        value={formData.logo_url}
                        onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="disclaimer">Legal Disclaimer</Label>
                    <Textarea
                      id="disclaimer"
                      placeholder="This email and any attachments are confidential..."
                      value={formData.disclaimer}
                      onChange={(e) => setFormData({ ...formData, disclaimer: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                    />
                    <Label htmlFor="default">Set as default signature</Label>
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedin" className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </Label>
                      <Input
                        id="linkedin"
                        placeholder="https://linkedin.com/in/yourprofile"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        Twitter / X
                      </Label>
                      <Input
                        id="twitter"
                        placeholder="https://twitter.com/yourhandle"
                        value={formData.twitter}
                        onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook" className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </Label>
                      <Input
                        id="facebook"
                        placeholder="https://facebook.com/yourpage"
                        value={formData.facebook}
                        onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        GitHub
                      </Label>
                      <Input
                        id="github"
                        placeholder="https://github.com/yourusername"
                        value={formData.github}
                        onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="space-y-4">
                  <div className="border rounded-lg p-4 bg-white">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 justify-end mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editing ? "Update" : "Create"} Signature
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Loading signatures...</p>
        </Card>
      ) : signatures.length === 0 ? (
        <Card className="p-6">
          <div className="text-center space-y-2">
            <Pen className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No signatures created yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first email signature to automatically append it to all your emails
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {signatures.map((signature) => (
            <Card key={signature.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{signature.name}</h4>
                    {signature.is_default && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {signature.full_name}
                    {signature.title && ` • ${signature.title}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(signature)}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(signature.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border rounded p-3 bg-muted/50">
                <div
                  className="text-xs overflow-hidden"
                  dangerouslySetInnerHTML={{
                    __html: generateSignatureHtml({
                      name: signature.name,
                      full_name: signature.full_name,
                      title: signature.title || "",
                      company: signature.company || "",
                      email: signature.email || "",
                      phone: signature.phone || "",
                      website: signature.website || "",
                      logo_url: signature.logo_url || "",
                      linkedin: signature.social_links.linkedin || "",
                      twitter: signature.social_links.twitter || "",
                      facebook: signature.social_links.facebook || "",
                      github: signature.social_links.github || "",
                      disclaimer: signature.disclaimer || "",
                      is_default: signature.is_default,
                    }),
                  }}
                />
              </div>

              {!signature.is_default && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSetDefault(signature.id)}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Set as Default
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
