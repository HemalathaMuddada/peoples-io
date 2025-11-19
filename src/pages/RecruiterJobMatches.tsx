import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Briefcase, MapPin, DollarSign, Users, TrendingUp, Search, Eye, Mail } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// New component for the job search UI
function JobSearchUI() {
  const [query, setQuery] = useState("software developer");
  const [company, setCompany] = useState("");
  const [region, setRegion] = useState("india");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const regions = ["india", "usa", "uk", "canada", "australia", "uae", "singapore"];

  async function findJobs() {
    setLoading(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${supabaseUrl}/functions/v1/job-search?q=${encodeURIComponent(
      query
    )}&company=${encodeURIComponent(company)}&region=${region}`;

    const res = await fetch(url);
    const json = await res.json();
    setJobs(json.results || []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Job title..."
          className="flex-1"
        />
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company..."
          className="flex-1"
        />
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={findJobs}>Find Jobs</Button>
      </div>

      {loading && <p>Loading...</p>}

      <div className="space-y-4">
        {jobs.map((job, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle>{job.title}</CardTitle>
              <CardDescription>
                <strong>Company:</strong> {job.company} | <strong>Location:</strong> {job.location}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <strong>Source:</strong> {job.source_from.join(", ")}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{job.description}</p>
              {job.apply_url && (
                <Button asChild className="mt-4">
                  <a href={job.apply_url} target="_blank" rel="noreferrer">
                    Apply →
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
}

interface CandidateMatch {
  id: string;
  match_score: number;
  reasons: string[];
  profile_id: string;
  candidate_profiles: {
    id: string;
    headline: string;
    current_title: string;
    location: string;
    years_experience: number;
    user_id: string;
  };
}

export default function RecruiterJobMatches() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    checkRecruiterAndLoadJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      loadMatchesForJob(selectedJobId);
    }
  }, [selectedJobId]);

  const checkRecruiterAndLoadJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has recruiter role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role, org_id')
        .eq('user_id', user.id);

      const hasRecruiterRole = roles?.some(r => r.role === 'recruiter');
      
      if (!hasRecruiterRole) {
        navigate("/dashboard");
        return;
      }

      // Get the company org_id
      const companyOrgId = roles?.find(r => r.role === 'recruiter')?.org_id;
      if (!companyOrgId) {
        toast.error("No company organization found");
        return;
      }

      // Load jobs for this company
      await loadJobs(companyOrgId);
    } catch (error) {
      console.error("Error checking role:", error);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async (companyOrgId: string) => {
    try {
      // Load jobs for this company
      const { data: jobsData, error } = await supabase
        .from("job_postings")
        .select("id, title, company, location, salary_min, salary_max, description")
        .eq("org_id", companyOrgId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setJobs(jobsData || []);
      
      // Auto-select first job if available
      if (jobsData && jobsData.length > 0) {
        setSelectedJobId(jobsData[0].id);
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Failed to load jobs");
    }
  };

  const loadMatchesForJob = async (jobId: string) => {
    try {
      setLoadingMatches(true);

      const { data, error } = await (supabase as any)
        .from("job_matches")
        .select(`
          id,
          match_score,
          reasons,
          profile_id,
          candidate_profiles!inner(
            id,
            headline,
            current_title,
            location,
            years_experience,
            user_id
          )
        `)
        .eq("job_id", jobId)
        .order("match_score", { ascending: false });

      if (error) throw error;

      setMatches(data || []);
    } catch (error) {
      console.error("Error loading matches:", error);
      toast.error("Failed to load candidate matches");
    } finally {
      setLoadingMatches(false);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-muted-foreground";
  };

  const getMatchBadgeVariant = (score: number): "default" | "secondary" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return "Not specified";
    const format = (num: number) => `$${(num / 1000).toFixed(0)}k`;
    if (min && max) return `${format(min)} - ${format(max)}`;
    if (min) return `From ${format(min)}`;
    if (max) return `Up to ${format(max)}`;
    return "Not specified";
  };

  const filteredMatches = matches.filter(match => {
    const matchesSearch = 
      match.candidate_profiles.headline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.candidate_profiles.current_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.candidate_profiles.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScore = match.match_score >= minScore;

    return matchesSearch && matchesScore;
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        Loading...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Jobs Available</CardTitle>
            <CardDescription>
              You need active client relationships with job postings to view candidate matches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/recruiter/post-job")}>
              <Briefcase className="h-4 w-4 mr-2" />
              Post Your First Job
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <Tabs defaultValue="matched">
        <TabsList>
          <TabsTrigger value="matched">Matched</TabsTrigger>
          <TabsTrigger value="unified-job-search">Unified Job Search</TabsTrigger>
        </TabsList>
        <TabsContent value="matched">
          <div>
            <h1 className="text-3xl font-bold">Candidate Matches</h1>
            <p className="text-muted-foreground mt-2">
              View candidates matched to your company's job postings
            </p>
          </div>

          {/* Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Job</CardTitle>
              <CardDescription>Choose a job to see matched candidates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span>{job.title} at {job.company}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedJob && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedJob.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {selectedJob.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedJob.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatSalary(selectedJob.salary_min, selectedJob.salary_max)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters & Results */}
          {selectedJobId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Matched Candidates</CardTitle>
                    <CardDescription>
                      {filteredMatches.length} candidate{filteredMatches.length !== 1 ? 's' : ''} match this position
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1" />
                    {matches.length} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, title, or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={minScore.toString()} onValueChange={(v) => setMinScore(parseInt(v))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Min match score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Scores</SelectItem>
                      <SelectItem value="60">60%+ Match</SelectItem>
                      <SelectItem value="70">70%+ Match</SelectItem>
                      <SelectItem value="80">80%+ Match</SelectItem>
                      <SelectItem value="90">90%+ Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Candidate List */}
                {loadingMatches ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading matches...
                  </div>
                ) : filteredMatches.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No candidates match your criteria
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredMatches.map((match) => (
                      <Card key={match.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Badge variant={getMatchBadgeVariant(match.match_score)}>
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  {match.match_score}% Match
                                </Badge>
                                <h4 className="font-semibold">
                                  {match.candidate_profiles.current_title || "Candidate"}
                                </h4>
                              </div>

                              {match.candidate_profiles.headline && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {match.candidate_profiles.headline}
                                </p>
                              )}

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {match.candidate_profiles.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {match.candidate_profiles.location}
                                  </span>
                                )}
                                {match.candidate_profiles.years_experience > 0 && (
                                  <span>
                                    {match.candidate_profiles.years_experience} years experience
                                  </span>
                                )}
                              </div>

                              {match.reasons && match.reasons.length > 0 && (
                                <div className="mt-3 space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">Match Reasons:</p>
                                  <ul className="text-xs text-muted-foreground space-y-1">
                                    {match.reasons.slice(0, 3).map((reason, idx) => (
                                      <li key={idx} className="flex items-start gap-1">
                                        <span className="text-primary">•</span>
                                        <span>{reason}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/profile/${match.candidate_profiles.user_id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Profile
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  toast.info("Contact feature coming soon");
                                }}
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Contact
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="unified-job-search">
          <JobSearchUI />
        </TabsContent>
      </Tabs>
    </div>
  );
}
