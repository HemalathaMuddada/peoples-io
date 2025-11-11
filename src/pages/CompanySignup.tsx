import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Mail, Phone, User } from "lucide-react";

export default function CompanySignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    company_type: "employer" as "employer" | "agency" | "recruiting_firm",
    company_website: "",
    industry: "",
    company_size: "",
    company_description: "",
    requester_name: "",
    requester_email: "",
    requester_phone: "",
    requester_title: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("company_signup_requests" as any)
        .insert([formData]);

      if (error) throw error;

      toast.success("Application submitted successfully! We'll review it and get back to you soon.");
      navigate("/");
    } catch (error: any) {
      console.error("Error submitting signup request:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Join Our Platform</h1>
          <p className="text-muted-foreground">
            Submit your company information to get started
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Company Registration</CardTitle>
            <CardDescription>
              Fill out the form below and our team will review your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </h3>
                
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="company_type">Company Type *</Label>
                    <Select
                      value={formData.company_type}
                      onValueChange={(value: any) => setFormData({ ...formData, company_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employer">Employer</SelectItem>
                        <SelectItem value="agency">Agency</SelectItem>
                        <SelectItem value="recruiting_firm">Recruiting Firm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="company_website">Company Website *</Label>
                    <Input
                      id="company_website"
                      type="url"
                      placeholder="https://"
                      value={formData.company_website}
                      onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="industry">Industry *</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_size">Company Size *</Label>
                      <Select
                        value={formData.company_size}
                        onValueChange={(value) => setFormData({ ...formData, company_size: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="11-50">11-50</SelectItem>
                          <SelectItem value="51-200">51-200</SelectItem>
                          <SelectItem value="201-500">201-500</SelectItem>
                          <SelectItem value="501-1000">501-1000</SelectItem>
                          <SelectItem value="1000+">1000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company_description">Company Description *</Label>
                    <Textarea
                      id="company_description"
                      rows={4}
                      value={formData.company_description}
                      onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Requester Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Information
                </h3>
                
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="requester_name">Full Name *</Label>
                    <Input
                      id="requester_name"
                      value={formData.requester_name}
                      onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="requester_email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="requester_email"
                        type="email"
                        className="pl-10"
                        value={formData.requester_email}
                        onChange={(e) => setFormData({ ...formData, requester_email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="requester_phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="requester_phone"
                        type="tel"
                        className="pl-10"
                        value={formData.requester_phone}
                        onChange={(e) => setFormData({ ...formData, requester_phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="requester_title">Job Title *</Label>
                    <Input
                      id="requester_title"
                      value={formData.requester_title}
                      onChange={(e) => setFormData({ ...formData, requester_title: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
