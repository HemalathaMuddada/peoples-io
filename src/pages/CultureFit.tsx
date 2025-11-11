import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface CultureScore {
  work_life_balance: number;
  innovation: number;
  collaboration: number;
  diversity: number;
  career_growth: number;
  compensation: number;
}

interface CultureFitResult {
  company: {
    name: string;
    industry?: string;
    size?: string;
  };
  culture_data: {
    culture_scores: CultureScore;
    overall_sentiment: string;
    key_themes: string[];
    data_freshness: string;
  };
  fit_score: number;
  fit_breakdown: {
    matches: string[];
    mismatches: string[];
    insights: string[];
  };
}

const CultureFit = () => {
  const [companyName, setCompanyName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CultureFitResult | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("candidate_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        if (data) {
          setProfileId(data.id);
        }
      }
    };
    fetchProfile();
  }, []);

  const analyzeCultureFit = async () => {
    if (!companyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter a company name to analyze",
        variant: "destructive",
      });
      return;
    }

    if (!profileId) {
      toast({
        title: "Profile not found",
        description: "Please complete your profile first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-culture-fit", {
        body: { companyName, profileId },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Analysis complete",
        description: `Culture fit score: ${Math.round(data.fit_score)}%`,
      });
    } catch (error: any) {
      console.error("Culture fit analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze culture fit",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFitColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getFitLabel = (score: number) => {
    if (score >= 80) return "Excellent Fit";
    if (score >= 70) return "Good Fit";
    if (score >= 50) return "Moderate Fit";
    return "Poor Fit";
  };

  const getTrendIcon = (score: number) => {
    if (score >= 7) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (score >= 5) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Company Culture Fit Analyzer
          </h1>
          <p className="text-muted-foreground">
            Discover how well a company's culture aligns with your preferences and values
          </p>
        </div>

        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Analyze Company Culture
            </CardTitle>
            <CardDescription>
              Enter a company name to analyze their culture and see how it matches your preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="e.g., Google, Microsoft, Tesla"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyzeCultureFit()}
                disabled={isAnalyzing}
                className="flex-1"
              />
              <Button
                onClick={analyzeCultureFit}
                disabled={isAnalyzing || !companyName.trim()}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze Fit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{result.company.name}</CardTitle>
                    <div className="flex gap-2">
                      {result.company.industry && (
                        <Badge variant="secondary">{result.company.industry}</Badge>
                      )}
                      {result.company.size && (
                        <Badge variant="outline">{result.company.size}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${getFitColor(result.fit_score)}`}>
                      {Math.round(result.fit_score)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getFitLabel(result.fit_score)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Overall Culture Fit</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(result.fit_score)}%
                      </span>
                    </div>
                    <Progress value={result.fit_score} className="h-3" />
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        {result.culture_data.overall_sentiment}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Data from {result.culture_data.data_freshness}
                      </span>
                    </div>
                    
                    {result.culture_data.key_themes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {result.culture_data.key_themes.map((theme, i) => (
                          <Badge key={i} variant="secondary">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Culture Scores</CardTitle>
                  <CardDescription>
                    How the company scores on different cultural dimensions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(result.culture_data.culture_scores).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(value)}
                          <span className="text-sm font-medium capitalize">
                            {key.replace(/_/g, " ")}
                          </span>
                        </div>
                        <span className="text-sm font-semibold">{value}/10</span>
                      </div>
                      <Progress value={value * 10} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-6">
                {result.fit_breakdown.matches.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-green-600">Strong Matches</CardTitle>
                      <CardDescription>Areas where you align well</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.fit_breakdown.matches.map((match, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                            <span className="text-sm">{match}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {result.fit_breakdown.mismatches.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-red-600">Potential Gaps</CardTitle>
                      <CardDescription>Areas that may not align</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.fit_breakdown.mismatches.map((mismatch, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-2 flex-shrink-0" />
                            <span className="text-sm">{mismatch}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {result.fit_breakdown.insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Insights
                  </CardTitle>
                  <CardDescription>
                    Recommendations based on the culture analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.fit_breakdown.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-sm leading-relaxed">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CultureFit;
