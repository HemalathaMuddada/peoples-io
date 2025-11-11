import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Search, ExternalLink, TrendingUp, Users, Briefcase, DollarSign, MapPin } from "lucide-react";
import { toast } from "sonner";

interface CompanyData {
  name: string;
  jobCount: number;
  avgSalaryMin: number;
  avgSalaryMax: number;
  locations: string[];
  seniorityLevels: string[];
  topSkills: string[];
}

interface CompanyResearchProps {
  allJobs: Array<{
    company: string;
    location: string;
    seniority: string;
    salary_min: number;
    salary_max: number;
    skills_extracted: string[];
  }>;
}

export const CompanyResearch = ({ allJobs }: CompanyResearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);

  // Aggregate company data
  const companyMap = new Map<string, CompanyData>();
  
  allJobs.forEach(job => {
    if (!companyMap.has(job.company)) {
      companyMap.set(job.company, {
        name: job.company,
        jobCount: 0,
        avgSalaryMin: 0,
        avgSalaryMax: 0,
        locations: [],
        seniorityLevels: [],
        topSkills: [],
      });
    }
    
    const company = companyMap.get(job.company)!;
    company.jobCount++;
    company.avgSalaryMin += job.salary_min;
    company.avgSalaryMax += job.salary_max;
    
    if (!company.locations.includes(job.location)) {
      company.locations.push(job.location);
    }
    
    if (!company.seniorityLevels.includes(job.seniority)) {
      company.seniorityLevels.push(job.seniority);
    }
    
    job.skills_extracted?.forEach(skill => {
      if (!company.topSkills.includes(skill)) {
        company.topSkills.push(skill);
      }
    });
  });

  // Calculate averages
  companyMap.forEach(company => {
    company.avgSalaryMin = Math.round(company.avgSalaryMin / company.jobCount);
    company.avgSalaryMax = Math.round(company.avgSalaryMax / company.jobCount);
    company.topSkills = company.topSkills.slice(0, 8);
  });

  const companies = Array.from(companyMap.values())
    .filter(company => 
      company.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.jobCount - a.jobCount);

  const handleCompanySearch = (company: CompanyData) => {
    setSelectedCompany(company);
  };

  const formatSalary = (num: number) => `$${(num / 1000).toFixed(0)}k`;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Company Research Hub
        </CardTitle>
        <CardDescription>
          Research companies hiring in your field
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="trending">Trending Employers</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="icon">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {selectedCompany ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{selectedCompany.name}</h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCompany(null)}>
                    Back to List
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-sm">Open Positions</span>
                      </div>
                      <p className="text-2xl font-bold">{selectedCompany.jobCount}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">Avg Salary Range</span>
                      </div>
                      <p className="text-xl font-bold">
                        {formatSalary(selectedCompany.avgSalaryMin)} - {formatSalary(selectedCompany.avgSalaryMax)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Locations
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCompany.locations.map(loc => (
                        <Badge key={loc} variant="secondary">{loc}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Seniority Levels
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCompany.seniorityLevels.map(level => (
                        <Badge key={level} variant="outline">{level}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Top Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCompany.topSkills.map(skill => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    window.open(`https://www.linkedin.com/company/${selectedCompany.name.toLowerCase().replace(/\s+/g, '-')}`, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on LinkedIn
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {companies.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No companies found</p>
                  </div>
                ) : (
                  companies.map(company => (
                    <Card 
                      key={company.name} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleCompanySearch(company)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{company.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {company.jobCount} {company.jobCount === 1 ? 'position' : 'positions'}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {formatSalary(company.avgSalaryMin)} - {formatSalary(company.avgSalaryMax)}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            <div className="space-y-2">
              {companies.slice(0, 10).map((company, idx) => (
                <Card 
                  key={company.name}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleCompanySearch(company)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.jobCount} open positions
                      </p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
