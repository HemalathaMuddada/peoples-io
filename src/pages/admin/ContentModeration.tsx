import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ContentModeration() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [resumes, setResumes] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchContent();
    }
  }, [isAdmin]);

  const fetchContent = async () => {
    const { data: resumeData } = await supabase
      .from('resumes')
      .select(`
        *,
        profiles:user_id(email, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: appData } = await supabase
      .from('job_applications')
      .select(`
        *,
        candidate_profiles(
          user_id,
          profiles:user_id(email, full_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    setResumes(resumeData || []);
    setApplications(appData || []);
  };

  const handleDeleteResume = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete resume');
    } else {
      toast.success('Resume deleted successfully');
      fetchContent();
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete application');
    } else {
      toast.success('Application deleted successfully');
      fetchContent();
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
            <BreadcrumbPage>Content Moderation</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">Content Moderation</h1>
        <p className="text-muted-foreground">Review and moderate platform content</p>
      </div>

      <Tabs defaultValue="resumes">
        <TabsList>
          <TabsTrigger value="resumes">Resumes</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="resumes">
          <Card>
            <CardHeader>
              <CardTitle>Recent Resumes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>ATS Score</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumes.map((resume) => (
                    <TableRow key={resume.id}>
                      <TableCell>{resume.profiles?.email || 'Unknown'}</TableCell>
                      <TableCell>{resume.file_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{resume.source}</Badge>
                      </TableCell>
                      <TableCell>
                        {resume.ats_score ? (
                          <Badge variant={resume.ats_score > 70 ? 'default' : 'secondary'}>
                            {resume.ats_score}%
                          </Badge>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>{new Date(resume.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteResume(resume.id)}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        {app.candidate_profiles?.profiles?.email || 'Unknown'}
                      </TableCell>
                      <TableCell>{app.job_title}</TableCell>
                      <TableCell>{app.company}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'Not applied'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteApplication(app.id)}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
