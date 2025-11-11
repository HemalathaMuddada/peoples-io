import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Calendar, Clock, Building2, Briefcase, Target, Sparkles } from "lucide-react";

interface Application {
  id: string;
  job_title: string;
  company: string;
  status: string;
  notes: string | null;
  applied_at: string | null;
  created_at: string;
  job_posting_id: string;
}

interface PredictiveAnalyticsProps {
  applications: Application[];
}

interface Prediction {
  application: Application;
  successProbability: number;
  factors: {
    companyHistory: number;
    titleHistory: number;
    timingScore: number;
    applicationMethod: number;
  };
  recommendations: string[];
  bestTiming: string;
}

export function PredictiveAnalytics({ applications }: PredictiveAnalyticsProps) {
  const calculatePredictions = (): Prediction[] => {
    const historicalApps = applications.filter(app => 
      app.status !== 'planned' && app.applied_at
    );
    const plannedApps = applications.filter(app => app.status === 'planned');

    if (historicalApps.length < 3) {
      return [];
    }

    return plannedApps.map(plannedApp => {
      // Company-based prediction
      const companyApps = historicalApps.filter(app => app.company === plannedApp.company);
      const companyOffers = companyApps.filter(app => app.status === 'offer').length;
      const companyScore = companyApps.length > 0 
        ? (companyOffers / companyApps.length) * 100 
        : 50;

      // Job title-based prediction
      const titleApps = historicalApps.filter(app => 
        app.job_title.toLowerCase().includes(plannedApp.job_title.toLowerCase()) ||
        plannedApp.job_title.toLowerCase().includes(app.job_title.toLowerCase())
      );
      const titleOffers = titleApps.filter(app => app.status === 'offer').length;
      const titleScore = titleApps.length > 0 
        ? (titleOffers / titleApps.length) * 100 
        : 50;

      // Timing analysis
      const timingData = historicalApps
        .filter(app => app.status === 'offer' || app.status === 'interview')
        .map(app => {
          const date = new Date(app.applied_at!);
          return {
            dayOfWeek: date.getDay(),
            hour: date.getHours(),
            month: date.getMonth()
          };
        });

      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      const currentMonth = now.getMonth();

      // Calculate timing score based on successful applications
      let timingScore = 50;
      if (timingData.length > 0) {
        const dayMatches = timingData.filter(t => t.dayOfWeek === currentDay).length;
        const hourMatches = timingData.filter(t => Math.abs(t.hour - currentHour) <= 2).length;
        const monthMatches = timingData.filter(t => t.month === currentMonth).length;
        
        timingScore = (
          (dayMatches / timingData.length) * 40 +
          (hourMatches / timingData.length) * 30 +
          (monthMatches / timingData.length) * 30
        ) * 100;
      }

      // Application method score
      const hasJobPosting = !!plannedApp.job_posting_id;
      const methodApps = historicalApps.filter(app => !!app.job_posting_id === hasJobPosting);
      const methodOffers = methodApps.filter(app => app.status === 'offer').length;
      const methodScore = methodApps.length > 0 
        ? (methodOffers / methodApps.length) * 100 
        : 50;

      // Calculate weighted probability
      const weights = {
        company: companyApps.length > 0 ? 0.3 : 0.1,
        title: titleApps.length > 0 ? 0.3 : 0.2,
        timing: 0.2,
        method: 0.3
      };

      const successProbability = Math.round(
        companyScore * weights.company +
        titleScore * weights.title +
        timingScore * weights.timing +
        methodScore * weights.method
      );

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (companyApps.length > 0 && companyScore > 60) {
        recommendations.push(`You have a ${Math.round(companyScore)}% success rate with ${plannedApp.company}`);
      } else if (companyApps.length > 0 && companyScore < 30) {
        recommendations.push(`Consider researching ${plannedApp.company} more - previous applications had lower success`);
      }

      if (titleScore > 60) {
        recommendations.push(`Strong track record with similar roles`);
      }

      if (timingData.length > 2) {
        const bestDays = timingData.reduce((acc, t) => {
          acc[t.dayOfWeek] = (acc[t.dayOfWeek] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);
        const topDay = Object.entries(bestDays).sort((a, b) => b[1] - a[1])[0];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        recommendations.push(`Best success on ${dayNames[parseInt(topDay[0])]}`);
      }

      if (hasJobPosting && methodScore > 50) {
        recommendations.push(`AI-matched applications have ${Math.round(methodScore)}% success rate`);
      }

      // Determine best timing
      const bestTiming = determineBestTiming(timingData);

      return {
        application: plannedApp,
        successProbability: Math.min(Math.max(successProbability, 10), 95),
        factors: {
          companyHistory: Math.round(companyScore),
          titleHistory: Math.round(titleScore),
          timingScore: Math.round(timingScore),
          applicationMethod: Math.round(methodScore)
        },
        recommendations: recommendations.length > 0 ? recommendations : ['Limited historical data - build your application history for better predictions'],
        bestTiming
      };
    });
  };

  const determineBestTiming = (timingData: { dayOfWeek: number; hour: number; month: number }[]): string => {
    if (timingData.length === 0) return 'Apply during business hours (9 AM - 5 PM) on weekdays';

    const dayFreq = timingData.reduce((acc, t) => {
      acc[t.dayOfWeek] = (acc[t.dayOfWeek] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const hourFreq = timingData.reduce((acc, t) => {
      acc[t.hour] = (acc[t.hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const topDay = Object.entries(dayFreq).sort((a, b) => b[1] - a[1])[0];
    const topHour = Object.entries(hourFreq).sort((a, b) => b[1] - a[1])[0];

    const timeOfDay = parseInt(topHour[0]) < 12 ? 'morning' : parseInt(topHour[0]) < 17 ? 'afternoon' : 'evening';
    
    return `Best results on ${dayNames[parseInt(topDay[0])]} ${timeOfDay} (around ${topHour[0]}:00)`;
  };

  const getSuccessRateColor = (rate: number): string => {
    if (rate >= 70) return 'text-success';
    if (rate >= 50) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getSuccessRateBadgeVariant = (rate: number): "default" | "secondary" | "destructive" | "outline" => {
    if (rate >= 70) return 'default';
    if (rate >= 50) return 'secondary';
    return 'outline';
  };

  const predictions = calculatePredictions();

  if (predictions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Predictive Analytics Unavailable</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {applications.length < 3 
              ? "Apply to at least 3 jobs to unlock predictive analytics"
              : "Save some planned applications to see success predictions"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall timing insights
  const historicalApps = applications.filter(app => 
    app.status !== 'planned' && app.applied_at
  );
  const successfulApps = historicalApps.filter(app => 
    app.status === 'offer' || app.status === 'interview'
  );

  const timingInsights = successfulApps.map(app => {
    const date = new Date(app.applied_at!);
    return {
      dayOfWeek: date.getDay(),
      hour: date.getHours()
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6" />
            AI-Powered Predictive Analytics
          </CardTitle>
          <CardDescription>
            Machine learning predictions based on your application history and success patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span>Analyzing {historicalApps.length} historical applications to predict success likelihood</span>
          </div>
        </CardContent>
      </Card>

      {/* Timing Insights */}
      {timingInsights.length > 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Optimal Application Timing
            </CardTitle>
            <CardDescription>Based on your successful applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Best Days</h4>
                <div className="space-y-1">
                  {(() => {
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const dayCounts = timingInsights.reduce((acc, t) => {
                      acc[t.dayOfWeek] = (acc[t.dayOfWeek] || 0) + 1;
                      return acc;
                    }, {} as Record<number, number>);
                    const total = timingInsights.length;
                    
                    return Object.entries(dayCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([day, count]) => (
                        <div key={day} className="flex items-center justify-between">
                          <span className="text-sm">{dayNames[parseInt(day)]}</span>
                          <div className="flex items-center gap-2 flex-1 ml-4">
                            <Progress value={(count / total) * 100} className="h-2" />
                            <span className="text-xs text-muted-foreground">{Math.round((count / total) * 100)}%</span>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Best Times</h4>
                <div className="space-y-1">
                  {(() => {
                    const hourCounts = timingInsights.reduce((acc, t) => {
                      const period = t.hour < 12 ? 'Morning' : t.hour < 17 ? 'Afternoon' : 'Evening';
                      acc[period] = (acc[period] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const total = timingInsights.length;
                    
                    return Object.entries(hourCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([period, count]) => (
                        <div key={period} className="flex items-center justify-between">
                          <span className="text-sm">{period}</span>
                          <div className="flex items-center gap-2 flex-1 ml-4">
                            <Progress value={(count / total) * 100} className="h-2" />
                            <span className="text-xs text-muted-foreground">{Math.round((count / total) * 100)}%</span>
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5" />
          Predictions for Planned Applications
        </h3>
        
        {predictions.map((prediction) => (
          <Card key={prediction.application.id} className="border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{prediction.application.job_title}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {prediction.application.company}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${getSuccessRateColor(prediction.successProbability)}`}>
                    {prediction.successProbability}%
                  </div>
                  <Badge variant={getSuccessRateBadgeVariant(prediction.successProbability)} className="mt-1">
                    {prediction.successProbability >= 70 ? 'High' : prediction.successProbability >= 50 ? 'Medium' : 'Lower'} Success Likelihood
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Factor Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Success Factors</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Company History
                      </span>
                      <span className="font-medium">{prediction.factors.companyHistory}%</span>
                    </div>
                    <Progress value={prediction.factors.companyHistory} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        Role Match
                      </span>
                      <span className="font-medium">{prediction.factors.titleHistory}%</span>
                    </div>
                    <Progress value={prediction.factors.titleHistory} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Timing Pattern
                      </span>
                      <span className="font-medium">{prediction.factors.timingScore}%</span>
                    </div>
                    <Progress value={prediction.factors.timingScore} className="h-1.5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Method Fit
                      </span>
                      <span className="font-medium">{prediction.factors.applicationMethod}%</span>
                    </div>
                    <Progress value={prediction.factors.applicationMethod} className="h-1.5" />
                  </div>
                </div>
              </div>

              {/* Best Timing */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-primary" />
                  <div>
                    <p className="text-xs font-semibold">Optimal Application Time</p>
                    <p className="text-xs text-muted-foreground">{prediction.bestTiming}</p>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  AI Recommendations
                </h4>
                <div className="space-y-1.5">
                  {prediction.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span className="text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
