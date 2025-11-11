import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, DollarSign, Briefcase, ArrowRight } from "lucide-react";

interface JobPosting {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  seniority: string;
  salary_min: number;
  salary_max: number;
  skills_extracted: string[];
  posted_date: string;
  url?: string;
}

interface SimilarJobsProps {
  currentJob: JobPosting;
  allJobs: JobPosting[];
  onJobClick: (job: JobPosting) => void;
}

export const SimilarJobs = ({ currentJob, allJobs, onJobClick }: SimilarJobsProps) => {
  // Calculate similarity based on title, skills, seniority, and location
  const calculateSimilarity = (job: JobPosting): number => {
    let score = 0;
    
    // Title similarity (40 points)
    const titleWords = currentJob.title.toLowerCase().split(' ');
    const jobTitleWords = job.title.toLowerCase().split(' ');
    const titleMatches = titleWords.filter(word => jobTitleWords.includes(word)).length;
    score += (titleMatches / titleWords.length) * 40;
    
    // Skills similarity (30 points)
    if (currentJob.skills_extracted?.length && job.skills_extracted?.length) {
      const commonSkills = currentJob.skills_extracted.filter(skill =>
        job.skills_extracted.includes(skill)
      ).length;
      score += (commonSkills / currentJob.skills_extracted.length) * 30;
    }
    
    // Seniority match (20 points)
    if (currentJob.seniority === job.seniority) score += 20;
    
    // Location similarity (10 points)
    if (currentJob.location === job.location) score += 10;
    
    return Math.round(score);
  };

  const similarJobs = allJobs
    .filter(job => job.id !== currentJob.id)
    .map(job => ({
      job,
      similarity: calculateSimilarity(job),
    }))
    .filter(item => item.similarity >= 30)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 4);

  const formatSalary = (min: number, max: number) => {
    const format = (num: number) => `$${(num / 1000).toFixed(0)}k`;
    return `${format(min)} - ${format(max)}`;
  };

  if (similarJobs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowRight className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Similar Opportunities</h3>
      </div>
      
      <div className="grid gap-4">
        {similarJobs.map(({ job, similarity }) => (
          <Card key={job.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => onJobClick(job)}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{job.title}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {similarity}% match
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 mt-1 text-sm">
                    <span className="font-medium">{job.company}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                    {job.remote && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">Remote</Badge>
                      </>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {formatSalary(job.salary_min, job.salary_max)}
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {job.seniority}
                </div>
              </div>
              {job.skills_extracted?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {job.skills_extracted.slice(0, 4).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {job.skills_extracted.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{job.skills_extracted.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
