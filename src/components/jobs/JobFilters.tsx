import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Briefcase, X, Filter } from "lucide-react";

interface JobFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  location: string;
  salaryMin: number;
  salaryMax: number;
  seniority: string[];
  remote: boolean | null;
  skills: string[];
}

const SENIORITY_OPTIONS = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "principal", label: "Principal" },
];

export const JobFilters = ({ onFiltersChange, initialFilters }: JobFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters || {
    location: "",
    salaryMin: 0,
    salaryMax: 300000,
    seniority: [],
    remote: null,
    skills: [],
  });

  const [skillInput, setSkillInput] = useState("");

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleSeniority = (value: string) => {
    const newSeniority = filters.seniority.includes(value)
      ? filters.seniority.filter(s => s !== value)
      : [...filters.seniority, value];
    updateFilters({ seniority: newSeniority });
  };

  const addSkill = () => {
    if (skillInput.trim() && !filters.skills.includes(skillInput.trim())) {
      updateFilters({ skills: [...filters.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    updateFilters({ skills: filters.skills.filter(s => s !== skill) });
  };

  const clearFilters = () => {
    const clearedFilters: FilterState = {
      location: "",
      salaryMin: 0,
      salaryMax: 300000,
      seniority: [],
      remote: null,
      skills: [],
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = 
    filters.location || 
    filters.salaryMin > 0 || 
    filters.salaryMax < 300000 ||
    filters.seniority.length > 0 ||
    filters.remote !== null ||
    filters.skills.length > 0;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filters
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </Label>
          <Input
            placeholder="e.g., San Francisco, Remote"
            value={filters.location}
            onChange={(e) => updateFilters({ location: e.target.value })}
          />
        </div>

        {/* Salary Range */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Salary Range
          </Label>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>${(filters.salaryMin / 1000).toFixed(0)}k</span>
            <span>-</span>
            <span>${(filters.salaryMax / 1000).toFixed(0)}k</span>
          </div>
          <Slider
            min={0}
            max={300000}
            step={10000}
            value={[filters.salaryMin, filters.salaryMax]}
            onValueChange={([min, max]) => updateFilters({ salaryMin: min, salaryMax: max })}
            className="w-full"
          />
        </div>

        {/* Seniority */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Seniority Level
          </Label>
          <div className="space-y-2">
            {SENIORITY_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={option.value}
                  checked={filters.seniority.includes(option.value)}
                  onCheckedChange={() => toggleSeniority(option.value)}
                />
                <label
                  htmlFor={option.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Remote */}
        <div className="space-y-3">
          <Label>Work Type</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remote-only"
                checked={filters.remote === true}
                onCheckedChange={(checked) => updateFilters({ remote: checked ? true : null })}
              />
              <label
                htmlFor="remote-only"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Remote Only
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="on-site-only"
                checked={filters.remote === false}
                onCheckedChange={(checked) => updateFilters({ remote: checked ? false : null })}
              />
              <label
                htmlFor="on-site-only"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                On-site Only
              </label>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-3">
          <Label>Required Skills</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add skill (e.g., React)"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
            />
            <Button type="button" onClick={addSkill} size="sm">
              Add
            </Button>
          </div>
          {filters.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <X
                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeSkill(skill)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
