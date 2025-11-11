import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Target } from "lucide-react";

interface SalaryInsightsProps {
  jobs: Array<{
    title: string;
    company: string;
    seniority: string;
    salary_min: number;
    salary_max: number;
    location: string;
  }>;
  userTargetMin?: number;
  userTargetMax?: number;
}

export const SalaryInsights = ({ jobs, userTargetMin, userTargetMax }: SalaryInsightsProps) => {
  if (jobs.length === 0) {
    return null;
  }

  // Calculate statistics
  const salaries = jobs.flatMap(job => [job.salary_min, job.salary_max]);
  const avgSalary = Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length);
  const minSalary = Math.min(...salaries);
  const maxSalary = Math.max(...salaries);
  const medianSalary = Math.round(salaries.sort((a, b) => a - b)[Math.floor(salaries.length / 2)]);

  // Salary by seniority
  const seniorityStats = new Map<string, { count: number; avgMin: number; avgMax: number }>();
  jobs.forEach(job => {
    if (!seniorityStats.has(job.seniority)) {
      seniorityStats.set(job.seniority, { count: 0, avgMin: 0, avgMax: 0 });
    }
    const stats = seniorityStats.get(job.seniority)!;
    stats.count++;
    stats.avgMin += job.salary_min;
    stats.avgMax += job.salary_max;
  });

  seniorityStats.forEach((stats, key) => {
    stats.avgMin = Math.round(stats.avgMin / stats.count);
    stats.avgMax = Math.round(stats.avgMax / stats.count);
  });

  const seniorityArray = Array.from(seniorityStats.entries())
    .sort((a, b) => b[1].avgMax - a[1].avgMax);

  // Top paying companies
  const companyStats = new Map<string, { count: number; avgSalary: number }>();
  jobs.forEach(job => {
    if (!companyStats.has(job.company)) {
      companyStats.set(job.company, { count: 0, avgSalary: 0 });
    }
    const stats = companyStats.get(job.company)!;
    stats.count++;
    stats.avgSalary += (job.salary_min + job.salary_max) / 2;
  });

  companyStats.forEach((stats, key) => {
    stats.avgSalary = Math.round(stats.avgSalary / stats.count);
  });

  const topCompanies = Array.from(companyStats.entries())
    .sort((a, b) => b[1].avgSalary - a[1].avgSalary)
    .slice(0, 5);

  const formatSalary = (num: number) => `$${(num / 1000).toFixed(0)}k`;

  // Calculate if user target is competitive
  const userTargetMid = userTargetMin && userTargetMax 
    ? (userTargetMin + userTargetMax) / 2 
    : null;
  
  const isCompetitive = userTargetMid ? userTargetMid >= medianSalary : null;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Salary Insights
        </CardTitle>
        <CardDescription>
          Market data based on {jobs.length} matching positions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-xl font-bold text-primary">{formatSalary(avgSalary)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Median</p>
            <p className="text-xl font-bold">{formatSalary(medianSalary)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Range Low</p>
            <p className="text-xl font-bold">{formatSalary(minSalary)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Range High</p>
            <p className="text-xl font-bold">{formatSalary(maxSalary)}</p>
          </div>
        </div>

        {/* User Target Comparison */}
        {userTargetMin && userTargetMax && (
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <p className="font-medium">Your Target Range</p>
                </div>
                <Badge variant={isCompetitive ? "default" : "secondary"}>
                  {isCompetitive ? (
                    <><TrendingUp className="w-3 h-3 mr-1" /> Competitive</>
                  ) : (
                    <><TrendingDown className="w-3 h-3 mr-1" /> Below Market</>
                  )}
                </Badge>
              </div>
              <p className="text-2xl font-bold mb-2">
                {formatSalary(userTargetMin)} - {formatSalary(userTargetMax)}
              </p>
              <p className="text-sm text-muted-foreground">
                {isCompetitive 
                  ? "Your target is above the market median"
                  : "Consider adjusting your target range based on market data"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Salary by Seniority */}
        <div className="space-y-3">
          <h4 className="font-medium">Salary by Seniority Level</h4>
          {seniorityArray.map(([seniority, stats]) => (
            <div key={seniority} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize font-medium">{seniority}</span>
                <span className="text-muted-foreground">
                  {formatSalary(stats.avgMin)} - {formatSalary(stats.avgMax)}
                </span>
              </div>
              <Progress 
                value={(stats.avgMax / maxSalary) * 100} 
                className="h-2"
              />
            </div>
          ))}
        </div>

        {/* Top Paying Companies */}
        <div className="space-y-3">
          <h4 className="font-medium">Top Paying Companies</h4>
          <div className="space-y-2">
            {topCompanies.map(([company, stats], idx) => (
              <div key={company} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                    {idx + 1}
                  </div>
                  <span className="font-medium">{company}</span>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {formatSalary(stats.avgSalary)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Distribution Info */}
        <div className="p-4 rounded-lg bg-muted/30 border-l-4 border-primary">
          <div className="flex items-start gap-2">
            <DollarSign className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium mb-1">Market Insights</p>
              <p className="text-sm text-muted-foreground">
                The salary range varies significantly across different seniority levels and companies. 
                Consider your experience level and negotiate based on market data.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
