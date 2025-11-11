import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Users, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CompanyDialog } from '@/components/admin/CompanyDialog';

interface Company {
  id: string;
  name: string;
  type: 'CANDIDATE_ORG' | 'EMPLOYER' | 'AGENCY' | 'RECRUITING';
  company_name: string | null;
  company_website: string | null;
  company_size: string | null;
  industry: string | null;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  member_count?: number;
}

export default function CompanyManagement() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchCompanies();
    }
  }, [isAdmin]);

  const fetchCompanies = async () => {
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch companies');
      return;
    }

    // Count members for each org
    const companiesWithCounts = await Promise.all(
      (orgs || []).map(async (org) => {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id);
        
        return { ...org, member_count: count || 0 };
      })
    );

    setCompanies(companiesWithCounts);
  };

  const handleCreateCompany = () => {
    setSelectedCompany(null);
    setDialogOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedCompany(null);
    fetchCompanies();
  };

  const getTypeColor = (type: Company['type']) => {
    switch (type) {
      case 'EMPLOYER':
        return 'bg-blue-500';
      case 'AGENCY':
        return 'bg-purple-500';
      case 'RECRUITING':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type: Company['type']) => {
    switch (type) {
      case 'EMPLOYER':
        return 'Employer';
      case 'AGENCY':
        return 'Agency';
      case 'RECRUITING':
        return 'Recruiting Firm';
      case 'CANDIDATE_ORG':
        return 'Candidate';
      default:
        return type;
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  const employerCount = companies.filter(c => c.type === 'EMPLOYER').length;
  const agencyCount = companies.filter(c => c.type === 'AGENCY').length;
  const recruitingCount = companies.filter(c => c.type === 'RECRUITING').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Company Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Company Management</h1>
          <p className="text-muted-foreground">Manage organizations, agencies, and recruiting firms</p>
        </div>
        <Button onClick={handleCreateCompany}>
          <Plus className="h-4 w-4 mr-2" />
          Create Company
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employers</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employerCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agencies</CardTitle>
            <Building2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencyCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recruiting Firms</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recruitingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {company.company_name || company.name}
                      </div>
                      {company.company_website && (
                        <a 
                          href={company.company_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          {company.company_website}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(company.type)}>
                      {getTypeLabel(company.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{company.industry || 'N/A'}</TableCell>
                  <TableCell>{company.company_size || 'N/A'}</TableCell>
                  <TableCell>{company.member_count}</TableCell>
                  <TableCell>
                    {new Date(company.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCompany(company)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CompanyDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        company={selectedCompany}
      />
    </div>
  );
}
