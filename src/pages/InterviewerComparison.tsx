import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Users, Star, TrendingUp, Target, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface InterviewerMetrics {
  name: string;
  totalInterviews: number;
  avgRating: number;
  avgTechnical: number;
  avgCommunication: number;
  avgCultureFit: number;
  avgProblemSolving: number;
  hireRate: number;
  strongHireRate: number;
}

const InterviewerComparison = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [interviewers, setInterviewers] = useState<InterviewerMetrics[]>([]);
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);

  useEffect(() => {
    fetchInterviewers();
  }, []);

  const fetchInterviewers = async () => {
    try {
      const { data: interviews, error } = await supabase
        .from("interviews")
        .select(`
          interviewer_name,
          interview_feedback(
            rating_overall,
            rating_technical,
            rating_communication,
            rating_culture_fit,
            rating_problem_solving,
            recommendation
          )
        `);

      if (error) throw error;

      const interviewerMap = new Map<string, any>();

      interviews?.forEach((interview) => {
        if (!interview.interviewer_name) return;

        if (!interviewerMap.has(interview.interviewer_name)) {
          interviewerMap.set(interview.interviewer_name, {
            name: interview.interviewer_name,
            totalInterviews: 0,
            ratings: [],
            technical: [],
            communication: [],
            cultureFit: [],
            problemSolving: [],
            recommendations: [],
          });
        }

        const interviewer = interviewerMap.get(interview.interviewer_name);
        const feedback = interview.interview_feedback?.[0];

        if (feedback) {
          interviewer.totalInterviews++;
          if (feedback.rating_overall) interviewer.ratings.push(feedback.rating_overall);
          if (feedback.rating_technical) interviewer.technical.push(feedback.rating_technical);
          if (feedback.rating_communication) interviewer.communication.push(feedback.rating_communication);
          if (feedback.rating_culture_fit) interviewer.cultureFit.push(feedback.rating_culture_fit);
          if (feedback.rating_problem_solving) interviewer.problemSolving.push(feedback.rating_problem_solving);
          if (feedback.recommendation) interviewer.recommendations.push(feedback.recommendation);
        }
      });

      const metrics: InterviewerMetrics[] = Array.from(interviewerMap.values())
        .map((interviewer) => {
          const avgRating = interviewer.ratings.length
            ? interviewer.ratings.reduce((a: number, b: number) => a + b, 0) / interviewer.ratings.length
            : 0;
          const hires = interviewer.recommendations.filter((r: string) => r === "Hire" || r === "Strong Hire").length;
          const strongHires = interviewer.recommendations.filter((r: string) => r === "Strong Hire").length;

          return {
            name: interviewer.name,
            totalInterviews: interviewer.totalInterviews,
            avgRating,
            avgTechnical: interviewer.technical.length
              ? interviewer.technical.reduce((a: number, b: number) => a + b, 0) / interviewer.technical.length
              : 0,
            avgCommunication: interviewer.communication.length
              ? interviewer.communication.reduce((a: number, b: number) => a + b, 0) / interviewer.communication.length
              : 0,
            avgCultureFit: interviewer.cultureFit.length
              ? interviewer.cultureFit.reduce((a: number, b: number) => a + b, 0) / interviewer.cultureFit.length
              : 0,
            avgProblemSolving: interviewer.problemSolving.length
              ? interviewer.problemSolving.reduce((a: number, b: number) => a + b, 0) / interviewer.problemSolving.length
              : 0,
            hireRate: interviewer.recommendations.length
              ? (hires / interviewer.recommendations.length) * 100
              : 0,
            strongHireRate: interviewer.recommendations.length
              ? (strongHires / interviewer.recommendations.length) * 100
              : 0,
          };
        })
        .filter((m) => m.totalInterviews >= 3) // Only show interviewers with at least 3 interviews
        .sort((a, b) => b.avgRating - a.avgRating);

      setInterviewers(metrics);
    } catch (error) {
      console.error("Error fetching interviewers:", error);
      toast.error("Failed to load interviewer data");
    } finally {
      setLoading(false);
    }
  };

  const toggleInterviewer = (name: string) => {
    setSelectedInterviewers((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const selectedMetrics = interviewers.filter((i) => selectedInterviewers.includes(i.name));

  const comparisonData = [
    {
      metric: "Overall Rating",
      ...Object.fromEntries(selectedMetrics.map((i) => [i.name, i.avgRating.toFixed(2)])),
    },
    {
      metric: "Technical",
      ...Object.fromEntries(selectedMetrics.map((i) => [i.name, i.avgTechnical.toFixed(2)])),
    },
    {
      metric: "Communication",
      ...Object.fromEntries(selectedMetrics.map((i) => [i.name, i.avgCommunication.toFixed(2)])),
    },
    {
      metric: "Culture Fit",
      ...Object.fromEntries(selectedMetrics.map((i) => [i.name, i.avgCultureFit.toFixed(2)])),
    },
    {
      metric: "Problem Solving",
      ...Object.fromEntries(selectedMetrics.map((i) => [i.name, i.avgProblemSolving.toFixed(2)])),
    },
  ];

  const radarData = [
    {
      skill: "Technical",
      ...Object.fromEntries(selectedMetrics.map((i) => [i.name, i.avgTechnical])),
    },
    {
      skill: "Communication",
      ...Object.fromEntries(selectedMetrics.map((i) => [i.name, i.avgCommunication])),
    },
    {
      skill: "Culture Fit",
      ...Object.fromEntries(selectedMetrics.map((i) => [i.name, i.avgCultureFit])),
    },
    {
      skill: "Problem Solving",
      ...Object.fromEntries(selectedMetrics.map((i) => [i.name, i.avgProblemSolving])),
    },
  ];

  const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#ef4444"];

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Interviewer Comparison</h1>
          <p className="text-muted-foreground">Compare performance metrics across interviewers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interviewer Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Interviewers
            </CardTitle>
            <CardDescription>
              Choose 2-6 interviewers to compare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {interviewers.map((interviewer) => (
              <div
                key={interviewer.name}
                className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={interviewer.name}
                  checked={selectedInterviewers.includes(interviewer.name)}
                  onCheckedChange={() => toggleInterviewer(interviewer.name)}
                  disabled={
                    selectedInterviewers.length >= 6 &&
                    !selectedInterviewers.includes(interviewer.name)
                  }
                />
                <label
                  htmlFor={interviewer.name}
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-medium">{interviewer.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{interviewer.totalInterviews} interviews</span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {interviewer.avgRating.toFixed(1)}
                    </span>
                  </div>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Comparison View */}
        <div className="lg:col-span-2 space-y-6">
          {selectedInterviewers.length === 0 && (
            <Card className="p-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Select Interviewers to Compare</h3>
              <p className="text-muted-foreground">
                Choose 2-6 interviewers from the list to see their metrics side-by-side
              </p>
            </Card>
          )}

          {selectedInterviewers.length === 1 && (
            <Card className="p-12 text-center">
              <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Select More Interviewers</h3>
              <p className="text-muted-foreground">
                Choose at least one more interviewer to compare
              </p>
            </Card>
          )}

          {selectedInterviewers.length >= 2 && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedMetrics.map((interviewer, idx) => (
                  <Card key={interviewer.name}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span className="truncate">{interviewer.name}</span>
                        <Badge variant="outline" style={{ borderColor: COLORS[idx % COLORS.length] }}>
                          #{idx + 1}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Overall Rating</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-bold">{interviewer.avgRating.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Interviews</span>
                        <span className="font-semibold">{interviewer.totalInterviews}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Hire Rate</span>
                        <span className="font-semibold">{interviewer.hireRate.toFixed(0)}%</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => navigate(`/interviewer/${encodeURIComponent(interviewer.name)}`)}
                      >
                        View Details <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Rating Comparison Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Rating Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      {selectedMetrics.map((interviewer, idx) => (
                        <Bar
                          key={interviewer.name}
                          dataKey={interviewer.name}
                          fill={COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Skills Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <PolarRadiusAxis domain={[0, 5]} />
                      {selectedMetrics.map((interviewer, idx) => (
                        <Radar
                          key={interviewer.name}
                          name={interviewer.name}
                          dataKey={interviewer.name}
                          stroke={COLORS[idx % COLORS.length]}
                          fill={COLORS[idx % COLORS.length]}
                          fillOpacity={0.3}
                        />
                      ))}
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewerComparison;
