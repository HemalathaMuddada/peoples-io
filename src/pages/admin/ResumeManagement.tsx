import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Download, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function ResumeManagement() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useAdminCheck();
  const [resumes, setResumes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchResumes();
    }
  }, [isAdmin]);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      // Fetch resumes
      const { data: resumesData, error: resumesError } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false });

      if (resumesError) {
        console.error('Error fetching resumes:', resumesError);
        toast.error('Failed to load resumes');
        setLoading(false);
        return;
      }

      // Fetch profiles for each resume's user_id
      if (resumesData && resumesData.length > 0) {
        const userIds = [...new Set(resumesData.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        // Create a map of profiles
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        // Combine resumes with profile data
        const resumesWithProfiles = resumesData.map(resume => ({
          ...resume,
          profiles: profilesMap.get(resume.user_id) || null,
        }));

        setResumes(resumesWithProfiles);
      } else {
        setResumes([]);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete resume');
    } else {
      toast.success('Resume deleted successfully');
      fetchResumes();
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    } else {
      toast.error('No file URL available');
    }
  };

  const filteredResumes = resumes.filter(resume =>
    resume.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resume.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resume.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading || loading) return <div className="p-8">Loading...</div>;
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
            <BreadcrumbPage>Resume Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold mb-2">Resume Management</h1>
        <p className="text-muted-foreground">View and manage user resumes</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {filteredResumes.length} resumes
            </div>
          </div>
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
              {filteredResumes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No resumes found matching your search' : 'No resumes uploaded yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredResumes.map((resume) => (
                  <TableRow key={resume.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{resume.profiles?.full_name || 'N/A'}</div>
                        <div className="text-sm text-muted-foreground">{resume.profiles?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {resume.file_name || 'Untitled'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {resume.source || 'upload'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {resume.ats_score ? (
                        <Badge variant={resume.ats_score >= 70 ? 'default' : 'secondary'}>
                          {resume.ats_score}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{new Date(resume.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {resume.file_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(resume.file_url, resume.file_name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(resume.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
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
