import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, CreditCard } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Organizations() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOrgs: 0,
    paidOrgs: 0,
    totalSeats: 0,
  });

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchOrganizations();
      fetchStats();
    }
  }, [isAdmin]);

  const fetchOrganizations = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // Fetch member count for each org
      const orgsWithMembers = await Promise.all(
        data.map(async (org) => {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id);
          return { ...org, memberCount: count || 0 };
        })
      );
      setOrganizations(orgsWithMembers);
    }
  };

  const fetchStats = async () => {
    const { count: totalOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const { count: paidOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .neq('plan', 'free');

    const { data: orgs } = await supabase
      .from('organizations')
      .select('seats');

    const totalSeats = orgs?.reduce((sum, org) => sum + (org.seats || 0), 0) || 0;

    setStats({
      totalOrgs: totalOrgs || 0,
      paidOrgs: paidOrgs || 0,
      totalSeats,
    });
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
            <BreadcrumbPage>Organizations</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">Organization Management</h1>
        <p className="text-muted-foreground">Manage organizations and subscriptions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrgs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paid Organizations</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidOrgs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Seats</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSeats}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No organizations found
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      {org.company_name || org.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        org.type === 'EMPLOYER' ? 'default' : 
                        org.type === 'AGENCY' ? 'secondary' : 
                        org.type === 'RECRUITING' ? 'outline' : 'secondary'
                      }>
                        {org.type === 'EMPLOYER' ? 'Employer' : 
                         org.type === 'AGENCY' ? 'Agency' : 
                         org.type === 'RECRUITING' ? 'Recruiting' : 'Candidate'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={org.plan === 'free' ? 'secondary' : 'default'} className="capitalize">
                        {org.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.seats}</TableCell>
                    <TableCell>{org.memberCount || 0}</TableCell>
                    <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
