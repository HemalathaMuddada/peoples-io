import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Zap,
  BookOpen,
  Loader2,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SkillGap {
  id: string;
  skill_id: string;
  gap_score: number;
  rationale: string;
  skills: {
    name: string;
    category: string;
  };
  created_at: string;
}

interface JobPosting {
  id: string;
  title: string;
  company: string;
  description?: string;
  skills?: string[];
}

interface SkillCoverage {
  category: string;
  coverage: number;
  totalSkills: number;
  missingSkills: number;
}

export const SkillGapDashboard = () => {
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [targetJobs, setTargetJobs] = useState<JobPosting[]>([]);
  const [skillCoverage, setSkillCoverage] = useState<SkillCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id, target_titles")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      setProfileId(profile.id);

      // Load skill gaps
      const { data: gaps } = await supabase
        .from("skill_gaps")
        .select("*, skills(*)")
        .eq("profile_id", profile.id)
        .order("gap_score", { ascending: false });

      setSkillGaps(gaps || []);

      // Load target jobs based on target titles  
      if (profile.target_titles && profile.target_titles.length > 0) {
        const { data: jobs } = await supabase
          .from("job_postings")
          .select("id, title, company, description")
          .ilike("title", `%${profile.target_titles[0]}%`)
          .limit(5);

        setTargetJobs(jobs as JobPosting[] || []);
      }

      // Calculate skill coverage by category
      if (gaps) {
        const coverageByCategory = calculateSkillCoverage(gaps);
        setSkillCoverage(coverageByCategory);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load skill gap analysis");
    } finally {
      setLoading(false);
    }
  };

  const calculateSkillCoverage = (gaps: SkillGap[]): SkillCoverage[] => {
    const categoryMap = new Map<string, { total: number; missing: number }>();

    gaps.forEach((gap) => {
      const category = gap.skills.category;
      const current = categoryMap.get(category) || { total: 0, missing: 0 };
      
      current.total++;
      if (gap.gap_score > 0.3) {
        current.missing++;
      }
      
      categoryMap.set(category, current);
    });

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      coverage: Math.round(((stats.total - stats.missing) / stats.total) * 100),
      totalSkills: stats.total,
      missingSkills: stats.missing
    }));
  };

  const getGapSeverity = (score: number) => {
    if (score >= 0.7) return { level: "critical", color: "destructive", icon: AlertTriangle };
    if (score >= 0.4) return { level: "moderate", color: "warning", icon: TrendingUp };
    return { level: "minor", color: "default", icon: CheckCircle2 };
  };

  const getPriorityScore = (gap: SkillGap) => {
    // Priority = gap_score * (how recent the gap was identified)
    const daysSinceCreated = (Date.now() - new Date(gap.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0.5, 1 - (daysSinceCreated / 90));
    return Math.round(gap.gap_score * recencyFactor * 100);
  };

  const chartColors = {
    critical: "hsl(var(--destructive))",
    moderate: "hsl(var(--warning))",
    minor: "hsl(var(--primary))"
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const criticalGaps = skillGaps.filter(g => g.gap_score >= 0.7);
  const moderateGaps = skillGaps.filter(g => g.gap_score >= 0.4 && g.gap_score < 0.7);
  const minorGaps = skillGaps.filter(g => g.gap_score < 0.4);

  const gapDistributionData = [
    { severity: "Critical", count: criticalGaps.length, fill: chartColors.critical },
    { severity: "Moderate", count: moderateGaps.length, fill: chartColors.moderate },
    { severity: "Minor", count: minorGaps.length, fill: chartColors.minor }
  ];

  const radarData = skillCoverage.map(sc => ({
    category: sc.category,
    coverage: sc.coverage,
    fullMark: 100
  }));

  const prioritizedGaps = [...skillGaps]
    .sort((a, b) => getPriorityScore(b) - getPriorityScore(a))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Skill Gaps</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skillGaps.length}</div>
            <p className="text-xs text-muted-foreground">
              Identified areas for growth
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Gaps</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalGaps.length}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moderate Gaps</CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{moderateGaps.length}</div>
            <p className="text-xs text-muted-foreground">
              Should be addressed soon
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Paths</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {skillGaps.filter(g => g.gap_score >= 0.4).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Recommended to create
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="visualization" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visualization">Visualizations</TabsTrigger>
          <TabsTrigger value="priorities">Learning Priorities</TabsTrigger>
          <TabsTrigger value="comparison">Target Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="visualization" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gap Distribution Chart */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Skill Gap Distribution</CardTitle>
                <CardDescription>Breakdown by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gapDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="severity" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {gapDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Skill Coverage Radar */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Skill Coverage by Category</CardTitle>
                <CardDescription>Current proficiency across skill areas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Coverage"
                      dataKey="coverage"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.6}
                    />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Skill Gaps List */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>All Skill Gaps</CardTitle>
              <CardDescription>Complete list with severity indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {skillGaps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-primary" />
                  <p>No skill gaps identified yet</p>
                  <p className="text-sm">Complete your profile and apply to jobs to get personalized insights</p>
                </div>
              ) : (
                skillGaps.map((gap) => {
                  const severity = getGapSeverity(gap.gap_score);
                  const Icon = severity.icon;
                  
                  return (
                    <div key={gap.id} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${
                        severity.level === 'critical' ? 'text-destructive' :
                        severity.level === 'moderate' ? 'text-warning' :
                        'text-primary'
                      }`} />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{gap.skills.name}</h4>
                          <Badge variant={severity.color as any}>{severity.level}</Badge>
                          <Badge variant="outline">{gap.skills.category}</Badge>
                          <span className="text-sm text-muted-foreground ml-auto">
                            {Math.round(gap.gap_score * 100)}% gap
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{gap.rationale}</p>
                        <Progress value={(1 - gap.gap_score) * 100} className="h-2" />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="priorities" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-warning" />
                Top Learning Priorities
              </CardTitle>
              <CardDescription>
                Skills ranked by impact and urgency - start here for maximum career growth
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {prioritizedGaps.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No learning priorities identified</p>
              ) : (
                prioritizedGaps.map((gap, index) => {
                  const severity = getGapSeverity(gap.gap_score);
                  const priority = getPriorityScore(gap);
                  
                  return (
                    <Card key={gap.id} className="bg-muted/20">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-lg">{gap.skills.name}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{gap.rationale}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-2xl font-bold text-primary">{priority}</div>
                                <div className="text-xs text-muted-foreground">Priority Score</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{gap.skills.category}</Badge>
                              <Badge variant={severity.color as any}>{severity.level} gap</Badge>
                              <Badge variant="secondary">
                                {Math.round(gap.gap_score * 100)}% skill deficit
                              </Badge>
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => navigate('/career-development?tab=learning')}
                              >
                                <BookOpen className="w-4 h-4 mr-2" />
                                Start Learning Path
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => navigate('/jobs')}
                              >
                                Find Related Jobs
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Skills vs Target Jobs</CardTitle>
              <CardDescription>
                Compare your current skills against requirements for your target roles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {targetJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No target jobs found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set your target titles in your profile to see job comparisons
                  </p>
                  <Button className="mt-4" onClick={() => navigate('/profile')}>
                    Update Profile
                  </Button>
                </div>
              ) : (
                targetJobs.map((job) => {
                  // Extract skills from job description or use skill gaps as reference
                  const allRequiredSkills = skillGaps.map(g => g.skills.name);
                  
                  const skillsYouHave = allRequiredSkills.filter(
                    skill => {
                      const gap = skillGaps.find(g => g.skills.name === skill);
                      return gap && gap.gap_score < 0.4; // Low gap score means you have the skill
                    }
                  );
                  
                  const skillsYouNeed = allRequiredSkills.filter(
                    skill => {
                      const gap = skillGaps.find(g => g.skills.name === skill);
                      return gap && gap.gap_score >= 0.4; // High gap score means you need to develop it
                    }
                  );
                  
                  const matchPercentage = allRequiredSkills.length > 0 
                    ? Math.round((skillsYouHave.length / allRequiredSkills.length) * 100)
                    : 100;

                  return (
                    <Card key={job.id} className="bg-muted/20">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>{job.company}</CardDescription>
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${
                              matchPercentage >= 75 ? 'text-primary' :
                              matchPercentage >= 50 ? 'text-warning' :
                              'text-destructive'
                            }`}>
                              {matchPercentage}%
                            </div>
                            <div className="text-xs text-muted-foreground">Match</div>
                          </div>
                        </div>
                        <Progress value={matchPercentage} className="mt-4" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {skillsYouHave.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-primary" />
                              Skills You Have ({skillsYouHave.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {skillsYouHave.map((skill, idx) => (
                                <Badge key={idx} variant="default">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {skillsYouNeed.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                              Skills to Develop ({skillsYouNeed.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {skillsYouNeed.map((skill, idx) => (
                                <Badge key={idx} variant="outline">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
