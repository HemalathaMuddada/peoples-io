import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";

interface WorkPreferences {
  company_culture_preferences: string[];
  company_values: string[];
  work_environment_preference: string | null;
  team_size_preference: string | null;
  work_style_preferences: string[];
}

interface WorkPreferencesTabProps {
  preferences: WorkPreferences;
  onSave: (preferences: WorkPreferences) => Promise<void>;
}

export default function WorkPreferencesTab({ preferences, onSave }: WorkPreferencesTabProps) {
  const [formData, setFormData] = useState<WorkPreferences>(preferences);
  const [cultureInput, setCultureInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [styleInput, setStyleInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(preferences);
  }, [preferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      toast.success("Work preferences saved");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save work preferences");
    } finally {
      setSaving(false);
    }
  };

  const addCulture = () => {
    if (cultureInput.trim() && !formData.company_culture_preferences.includes(cultureInput.trim())) {
      setFormData({
        ...formData,
        company_culture_preferences: [...formData.company_culture_preferences, cultureInput.trim()],
      });
      setCultureInput("");
    }
  };

  const removeCulture = (culture: string) => {
    setFormData({
      ...formData,
      company_culture_preferences: formData.company_culture_preferences.filter((c) => c !== culture),
    });
  };

  const addValue = () => {
    if (valueInput.trim() && !formData.company_values.includes(valueInput.trim())) {
      setFormData({
        ...formData,
        company_values: [...formData.company_values, valueInput.trim()],
      });
      setValueInput("");
    }
  };

  const removeValue = (value: string) => {
    setFormData({
      ...formData,
      company_values: formData.company_values.filter((v) => v !== value),
    });
  };

  const addStyle = () => {
    if (styleInput.trim() && !formData.work_style_preferences.includes(styleInput.trim())) {
      setFormData({
        ...formData,
        work_style_preferences: [...formData.work_style_preferences, styleInput.trim()],
      });
      setStyleInput("");
    }
  };

  const removeStyle = (style: string) => {
    setFormData({
      ...formData,
      work_style_preferences: formData.work_style_preferences.filter((s) => s !== style),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Work Preferences</h2>
        <p className="text-muted-foreground mt-1">
          Define your ideal work environment and company culture fit
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Environment</CardTitle>
          <CardDescription>Preferred work setting and team size</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Work Environment Preference</Label>
            <Select
              value={formData.work_environment_preference || undefined}
              onValueChange={(value) =>
                setFormData({ ...formData, work_environment_preference: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Fully Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid (Remote + Office)</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Preferred Team/Company Size</Label>
            <Select
              value={formData.team_size_preference || undefined}
              onValueChange={(value) =>
                setFormData({ ...formData, team_size_preference: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startup">Startup (1-20 employees)</SelectItem>
                <SelectItem value="small">Small (21-100 employees)</SelectItem>
                <SelectItem value="medium">Medium (101-1000 employees)</SelectItem>
                <SelectItem value="large">Large (1001-10000 employees)</SelectItem>
                <SelectItem value="enterprise">Enterprise (10000+ employees)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Culture</CardTitle>
          <CardDescription>
            What type of company culture do you thrive in?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Culture Preferences</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={cultureInput}
                onChange={(e) => setCultureInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addCulture())}
                placeholder="e.g., Fast-paced, Collaborative, Innovation-driven..."
              />
              <Button type="button" onClick={addCulture}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.company_culture_preferences.map((culture) => (
                <Badge key={culture} variant="secondary" className="gap-1">
                  {culture}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeCulture(culture)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company Values</CardTitle>
          <CardDescription>
            What values are important to you in an employer?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Important Values</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addValue())}
                placeholder="e.g., Work-life balance, Diversity, Sustainability..."
              />
              <Button type="button" onClick={addValue}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.company_values.map((value) => (
                <Badge key={value} variant="secondary" className="gap-1">
                  {value}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeValue(value)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Style</CardTitle>
          <CardDescription>
            How do you prefer to work?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Work Style Preferences</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={styleInput}
                onChange={(e) => setStyleInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addStyle())}
                placeholder="e.g., Independent, Collaborative, Mentoring..."
              />
              <Button type="button" onClick={addStyle}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.work_style_preferences.map((style) => (
                <Badge key={style} variant="secondary" className="gap-1">
                  {style}
                  <X
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => removeStyle(style)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
