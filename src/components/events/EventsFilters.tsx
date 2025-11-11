import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface EventsFiltersProps {
  calendarId: string;
  onCalendarIdChange: (id: string) => void;
  period: 'past' | 'future';
  onPeriodChange: (period: 'past' | 'future') => void;
}

export const EventsFilters = ({
  calendarId,
  onCalendarIdChange,
  period,
  onPeriodChange,
}: EventsFiltersProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter Events</CardTitle>
        <CardDescription>
          Enter your Luma calendar ID to view events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="calendar-id">Calendar ID</Label>
          <Input
            id="calendar-id"
            placeholder="cal-abc123xyz"
            value={calendarId}
            onChange={(e) => onCalendarIdChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Find your calendar ID in Luma Settings → Options → API Keys
          </p>
        </div>

        <div className="space-y-2">
          <Label>Time Period</Label>
          <RadioGroup value={period} onValueChange={(value) => onPeriodChange(value as 'past' | 'future')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="future" id="future" />
              <Label htmlFor="future" className="font-normal cursor-pointer">Upcoming Events</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="past" id="past" />
              <Label htmlFor="past" className="font-normal cursor-pointer">Past Events</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};
