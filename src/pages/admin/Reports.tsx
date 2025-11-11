import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Users, Briefcase, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function Reports() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report downloaded successfully');
  };

  const exportUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at, status')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (data) {
      exportToCSV(data, 'users_report');
    }
  };

  const exportJobs = async () => {
    const { data } = await supabase
      .from('job_postings')
      .select('id, title, company, location, seniority, posted_date, created_at')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (data) {
      exportToCSV(data, 'jobs_report');
    }
  };

  const exportApplications = async () => {
    const { data } = await supabase
      .from('job_applications')
      .select('id, job_title, company, status, applied_at, created_at')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (data) {
      exportToCSV(data, 'applications_report');
    }
  };

  const exportConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('id, title, created_at')
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    if (data) {
      exportToCSV(data, 'conversations_report');
    }
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
            <BreadcrumbPage>Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">Reports & Exports</h1>
        <p className="text-muted-foreground">Download data exports and generate reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Data Export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export user profiles, registration dates, and status information
            </p>
            <Button onClick={exportUsers} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Users CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Jobs Data Export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export job postings with company, location, and posting dates
            </p>
            <Button onClick={exportJobs} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Jobs CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Applications Export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export application data including status and timeline
            </p>
            <Button onClick={exportApplications} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Applications CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversations Export
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export AI coach conversation data and timestamps
            </p>
            <Button onClick={exportConversations} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Conversations CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
