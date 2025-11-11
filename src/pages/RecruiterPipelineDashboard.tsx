import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Search, TrendingUp, TrendingDown, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Application {
  id: string;
  job_title: string;
  company: string;
  status: string;
  applied_at: string;
  profile_id: string;
  candidate_name?: string;
  candidate_email?: string;
  updated_at: string;
  job_posting_id?: string;
}

interface StageMetrics {
  count: number;
  avgDuration?: number;
  conversionRate?: number;
}

interface PipelineMetrics {
  [key: string]: StageMetrics;
}

const PIPELINE_STAGES = [
  { id: 'new', label: 'New', color: 'bg-blue-500' },
  { id: 'screening', label: 'Screening', color: 'bg-purple-500' },
  { id: 'phone_screen', label: 'Phone Screen', color: 'bg-cyan-500' },
  { id: 'technical_interview', label: 'Technical', color: 'bg-orange-500' },
  { id: 'final_interview', label: 'Final Round', color: 'bg-yellow-500' },
  { id: 'offer', label: 'Offer', color: 'bg-green-500' },
  { id: 'hired', label: 'Hired', color: 'bg-emerald-600' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500' },
];

function ApplicationCard({ application, stage }: { application: Application; stage: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: application.id, data: { application, currentStage: stage } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const timeInStage = Math.floor(
    (new Date().getTime() - new Date(application.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-card border rounded-lg p-3 mb-2 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm truncate flex-1">{application.candidate_name || 'Candidate'}</h4>
        <Badge variant="outline" className="text-xs ml-2">
          {timeInStage}d
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-1 truncate">{application.job_title}</p>
      <p className="text-xs text-muted-foreground truncate">{application.company}</p>
      {application.candidate_email && (
        <p className="text-xs text-muted-foreground mt-2 truncate">{application.candidate_email}</p>
      )}
    </div>
  );
}

export default function RecruiterPipelineDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [metrics, setMetrics] = useState<PipelineMetrics>({});
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [jobOptions, setJobOptions] = useState<{ id: string; title: string }[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    checkRecruiterAndFetch();
  }, []);

  const checkRecruiterAndFetch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["recruiter", "agency_admin", "hiring_manager"])
      .single();

    if (!roleData) {
      toast.error("Access denied. Recruiter role required.");
      navigate("/");
      return;
    }

    await Promise.all([fetchApplications(), fetchJobOptions()]);
  };

  const fetchJobOptions = async () => {
    try {
      const query: any = await supabase
        .from("job_postings")
        .select("id, title");
      
      if (query.data) {
        setJobOptions(query.data.filter((j: any) => j.title).map((job: any) => ({ 
          id: job.id, 
          title: job.title 
        })));
      }
    } catch (error) {
      console.error("Error fetching job options:", error);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query: any = supabase
        .from("job_applications")
        .select(`
          *,
          candidate_profiles!inner(
            user_id,
            headline
          )
        `)
        .is("deleted_at", null);

      if (selectedJob !== "all") {
        query = query.eq("job_posting_id", selectedJob);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user emails for candidates
      const userIds = data?.map((app: any) => app.candidate_profiles?.user_id).filter(Boolean) || [];
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const users = usersData?.users || [];
      
      const enrichedApplications: Application[] = (data || []).map((app: any) => {
        const userEmail = users.find((u: any) => u.id === app.candidate_profiles?.user_id)?.email || '';
        return {
          id: app.id,
          job_title: app.job_title,
          company: app.company,
          status: app.status,
          applied_at: app.applied_at || '',
          profile_id: app.profile_id,
          updated_at: app.updated_at || '',
          job_posting_id: app.job_posting_id || undefined,
          candidate_name: app.candidate_profiles?.headline || 'Unknown Candidate',
          candidate_email: userEmail,
        };
      });

      setApplications(enrichedApplications);
      calculateMetrics(enrichedApplications);
    } catch (error: any) {
      toast.error("Failed to fetch applications");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (apps: Application[]) => {
    const stageMetrics: PipelineMetrics = {};
    
    PIPELINE_STAGES.forEach(stage => {
      const stageApps = apps.filter(app => app.status === stage.id);
      stageMetrics[stage.id] = {
        count: stageApps.length,
      };
    });

    setMetrics(stageMetrics);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const applicationId = active.id as string;
    const newStage = over.id as string;
    const oldStage = (active.data.current as any)?.currentStage;

    if (oldStage === newStage) return;

    // Optimistic update
    setApplications(prev =>
      prev.map(app =>
        app.id === applicationId ? { ...app, status: newStage, updated_at: new Date().toISOString() } : app
      )
    );

    try {
      const updateQuery: any = supabase
        .from("job_applications")
        .update({ status: newStage as any, updated_at: new Date().toISOString() })
        .eq("id", applicationId);
        
      const { error } = await updateQuery;

      if (error) throw error;

      toast.success(`Moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`);
      await fetchApplications();
    } catch (error: any) {
      toast.error("Failed to update application status");
      await fetchApplications();
    }
  };

  const filteredApplications = applications.filter(app =>
    searchTerm === "" ||
    app.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeApplication = applications.find(app => app.id === activeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Pipeline Dashboard</h1>
        <p className="text-muted-foreground">
          Drag and drop candidates between stages to update their status
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates, jobs, companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedJob} onValueChange={(value) => { setSelectedJob(value); fetchApplications(); }}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="All Jobs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobs</SelectItem>
                {jobOptions.map(job => (
                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredApplications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredApplications.filter(a => !['rejected', 'hired'].includes(a.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Offers Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.offer?.count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.hired?.count || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages */}
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {PIPELINE_STAGES.map(stage => {
            const stageApplications = filteredApplications.filter(app => app.status === stage.id);
            
            return (
              <Card key={stage.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={`${stage.color} text-white`}>
                      {stage.label}
                    </Badge>
                    <span className="text-sm font-semibold">{stageApplications.length}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <SortableContext
                    items={stageApplications.map(app => app.id)}
                    strategy={verticalListSortingStrategy}
                    id={stage.id}
                  >
                    <div className="space-y-2 min-h-[200px]">
                      {stageApplications.length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm py-8">
                          No candidates
                        </div>
                      ) : (
                        stageApplications.map(app => (
                          <ApplicationCard key={app.id} application={app} stage={stage.id} />
                        ))
                      )}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DragOverlay>
          {activeApplication ? (
            <div className="bg-card border-2 border-primary rounded-lg p-3 shadow-lg rotate-3">
              <h4 className="font-medium text-sm">{activeApplication.candidate_name}</h4>
              <p className="text-xs text-muted-foreground">{activeApplication.job_title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
