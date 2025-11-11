import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Search, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users,
  Loader2,
  ExternalLink,
  RefreshCw,
  Shield
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";

interface CompanyStatus {
  id: string;
  company_name: string;
  status_type: string;
  severity: string;
  affected_departments: string[];
  employee_count_impact: number;
  start_date: string;
  end_date: string | null;
  source_url: string | null;
  description: string;
  verified: boolean;
  created_at: string;
  metadata?: {
    source_name?: string;
    source_reliability?: number;
    auto_verified?: boolean;
    sources?: Array<{
      name: string;
      url: string;
      reliability: number;
      added_at?: string;
    }>;
    source_count?: number;
    highest_reliability?: number;
    merged_at?: string;
  };
}

export const CompanyStatusTracker = () => {
  const [statuses, setStatuses] = useState<CompanyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCompany, setSearchCompany] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    loadStatuses();
  }, [searchCompany, filterType]);

  const loadStatuses = async () => {
    try {
      let query = supabase
        .from("company_status_tracker")
        .select("*")
        .order("start_date", { ascending: false })
        .limit(50);

      if (searchCompany) {
        query = query.ilike("company_name", `%${searchCompany}%`);
      }

      if (filterType !== "all") {
        query = query.eq("status_type", filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setStatuses(data || []);
    } catch (error) {
      console.error("Error loading statuses:", error);
      toast.error("Failed to load company statuses");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case "layoff":
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      case "hiring_freeze":
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case "mass_hiring":
        return <TrendingUp className="w-5 h-5 text-success" />;
      case "restructuring":
        return <Users className="w-5 h-5 text-primary" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (type: string) => {
    const badges: Record<string, { variant: any; text: string }> = {
      layoff: { variant: "destructive", text: "Layoffs" },
      hiring_freeze: { variant: "secondary", text: "Hiring Freeze" },
      mass_hiring: { variant: "default", text: "Mass Hiring" },
      restructuring: { variant: "outline", text: "Restructuring" }
    };
    return badges[type] || badges.layoff;
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      high: "bg-red-500",
      medium: "bg-yellow-500",
      low: "bg-blue-500"
    };
    return variants[severity] || variants.medium;
  };

  const getReliabilityBadge = (reliability?: number) => {
    if (!reliability) return null;
    
    if (reliability >= 90) {
      return { color: "bg-emerald-500", text: "Highly Reliable" };
    } else if (reliability >= 75) {
      return { color: "bg-blue-500", text: "Reliable" };
    } else {
      return { color: "bg-gray-500", text: "Standard" };
    }
  };

  const calculateConfidenceScore = (status: CompanyStatus): number => {
    let score = 0;
    
    // Base score from verification status
    if (status.verified) {
      score += 30;
    }
    
    // Score from source count and quality
    const sources = status.metadata?.sources || [];
    const sourceCount = sources.length || 1;
    const highestReliability = status.metadata?.highest_reliability || 
                               status.metadata?.source_reliability || 0;
    
    // Multiple sources boost confidence significantly
    if (sourceCount === 1) {
      score += 20;
    } else if (sourceCount === 2) {
      score += 40;
    } else if (sourceCount >= 3) {
      score += 50;
    }
    
    // Source reliability boost
    if (highestReliability >= 95) {
      score += 20;
    } else if (highestReliability >= 90) {
      score += 15;
    } else if (highestReliability >= 75) {
      score += 10;
    } else {
      score += 5;
    }
    
    // Bonus for multiple high-reliability sources
    const highReliabilitySources = sources.filter(s => s.reliability >= 90).length;
    if (highReliabilitySources >= 2) {
      score += 10;
    }
    
    // Cap at 100
    return Math.min(score, 100);
  };

  const getConfidenceLevel = (score: number): { color: string; text: string; bgColor: string } => {
    if (score >= 85) {
      return { 
        color: "text-emerald-600 dark:text-emerald-400", 
        text: "Very High Confidence",
        bgColor: "bg-emerald-500"
      };
    } else if (score >= 70) {
      return { 
        color: "text-blue-600 dark:text-blue-400", 
        text: "High Confidence",
        bgColor: "bg-blue-500"
      };
    } else if (score >= 50) {
      return { 
        color: "text-yellow-600 dark:text-yellow-400", 
        text: "Moderate Confidence",
        bgColor: "bg-yellow-500"
      };
    } else {
      return { 
        color: "text-orange-600 dark:text-orange-400", 
        text: "Low Confidence",
        bgColor: "bg-orange-500"
      };
    }
  };

  const handleAutoScrape = async () => {
    setScraping(true);
    toast.info("Starting automated scraping from tech news sources...");
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-company-news');
      
      if (error) throw error;
      
      if (data.success) {
        toast.success(data.message);
        // Reload the statuses to show new data
        await loadStatuses();
      } else {
        toast.error(data.error || "Failed to scrape company news");
      }
    } catch (error) {
      console.error("Error scraping company news:", error);
      toast.error("Failed to scrape company news");
    } finally {
      setScraping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Company Status Tracker</CardTitle>
              <CardDescription>
                Track layoffs, hiring freezes, and major company changes
              </CardDescription>
            </div>
            <Button 
              onClick={handleAutoScrape} 
              disabled={scraping}
              variant="outline"
              size="sm"
            >
              {scraping ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Auto-Scrape News
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by company name..."
                  value={searchCompany}
                  onChange={(e) => setSearchCompany(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="layoff">Layoffs</SelectItem>
                <SelectItem value="hiring_freeze">Hiring Freeze</SelectItem>
                <SelectItem value="mass_hiring">Mass Hiring</SelectItem>
                <SelectItem value="restructuring">Restructuring</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {statuses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No status updates found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {statuses.map((status) => (
            <Card key={status.id} className="shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(status.status_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold">{status.company_name}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge {...getStatusBadge(status.status_type)}>
                            {getStatusBadge(status.status_type).text}
                          </Badge>
                          {status.severity && (
                            <Badge className={getSeverityBadge(status.severity)}>
                              {status.severity} severity
                            </Badge>
                          )}
                          {status.verified && (
                            <Badge variant="outline">Verified</Badge>
                          )}
                          {status.metadata?.source_reliability && getReliabilityBadge(status.metadata.source_reliability) && (
                            <Badge className={getReliabilityBadge(status.metadata.source_reliability)?.color}>
                              {getReliabilityBadge(status.metadata.source_reliability)?.text}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Confidence Score Visualization */}
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              <span className={getConfidenceLevel(calculateConfidenceScore(status)).color}>
                                {getConfidenceLevel(calculateConfidenceScore(status)).text}
                              </span>
                            </div>
                            <span className="text-muted-foreground font-medium">
                              {calculateConfidenceScore(status)}%
                            </span>
                          </div>
                          <Progress 
                            value={calculateConfidenceScore(status)} 
                            className="h-2"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {status.metadata?.sources && status.metadata.sources.length > 1 ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              Confirmed by {status.metadata.sources.length} sources
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {status.metadata.sources.map(s => s.name).join(", ")}
                            </Badge>
                          </div>
                        ) : status.metadata?.source_name ? (
                          <span className="text-xs text-muted-foreground">
                            via {status.metadata.source_name}
                          </span>
                        ) : null}
                        {status.source_url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={status.source_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {status.description}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-medium">{format(new Date(status.start_date), "MMM d, yyyy")}</p>
                      </div>
                      {status.end_date && (
                        <div>
                          <p className="text-muted-foreground">End Date</p>
                          <p className="font-medium">{format(new Date(status.end_date), "MMM d, yyyy")}</p>
                        </div>
                      )}
                      {status.employee_count_impact && (
                        <div>
                          <p className="text-muted-foreground">Impact</p>
                          <p className="font-medium">{status.employee_count_impact} employees</p>
                        </div>
                      )}
                      {status.affected_departments && status.affected_departments.length > 0 && (
                        <div>
                          <p className="text-muted-foreground">Departments</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {status.affected_departments.map((dept, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {dept}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
