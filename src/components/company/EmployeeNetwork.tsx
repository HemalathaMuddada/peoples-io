import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Search, 
  User,
  MessageCircle,
  Loader2,
  Building2,
  Linkedin
} from "lucide-react";

interface EmployeeProfile {
  id: string;
  company_name: string;
  job_title: string;
  department: string;
  years_at_company: number;
  can_provide_referral: boolean;
  willing_to_chat: boolean;
  linkedin_url: string;
  bio: string;
  specialties: string[];
  contact_preference: string;
  availability_status: string;
  response_rate: number;
}

export const EmployeeNetwork = () => {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCompany, setSearchCompany] = useState("");

  useEffect(() => {
    loadEmployees();
  }, [searchCompany]);

  const loadEmployees = async () => {
    try {
      let query = supabase
        .from("employee_network")
        .select("*")
        .eq("willing_to_chat", true)
        .order("response_rate", { ascending: false })
        .limit(20);

      if (searchCompany) {
        query = query.ilike("company_name", `%${searchCompany}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employee network");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (company: string) => {
    return company.slice(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      open: { variant: "default", text: "Open to Connect" },
      busy: { variant: "secondary", text: "Busy" },
      unavailable: { variant: "outline", text: "Unavailable" }
    };
    return variants[status] || variants.open;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Employee Referral Network</CardTitle>
          <CardDescription>
            Connect with employees at your target companies for referrals and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by company name..."
              value={searchCompany}
              onChange={(e) => setSearchCompany(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No employees found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {employees.map((employee) => (
            <Card key={employee.id} className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(employee.company_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold">{employee.job_title}</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {employee.company_name}
                    </p>
                    {employee.department && (
                      <p className="text-xs text-muted-foreground">{employee.department}</p>
                    )}
                  </div>
                  <Badge {...getStatusBadge(employee.availability_status)}>
                    {getStatusBadge(employee.availability_status).text}
                  </Badge>
                </div>

                {employee.bio && (
                  <p className="text-sm text-muted-foreground mb-3">{employee.bio}</p>
                )}

                {employee.specialties && employee.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {employee.specialties.map((specialty, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>{employee.years_at_company} years at company</span>
                  {employee.response_rate > 0 && (
                    <span>{employee.response_rate}% response rate</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Request Chat
                  </Button>
                  {employee.can_provide_referral && (
                    <Badge variant="secondary" className="self-center">
                      Can Refer
                    </Badge>
                  )}
                  {employee.linkedin_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={employee.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
