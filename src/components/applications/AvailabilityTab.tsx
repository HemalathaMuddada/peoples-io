import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type AvailabilitySlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
  notes: string | null;
};

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export default function AvailabilityTab() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [profileId, setProfileId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    day_of_week: 1,
    start_time: "09:00",
    end_time: "17:00",
    timezone: "America/New_York",
    notes: "",
  });

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        const { data, error } = await supabase
          .from("candidate_availability")
          .select("*")
          .eq("profile_id", profile.id)
          .order("day_of_week", { ascending: true })
          .order("start_time", { ascending: true });

        if (error) throw error;
        setSlots(data || []);
      }
    } catch (error: any) {
      console.error("Error loading availability:", error);
      toast.error("Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = async () => {
    try {
      const { error } = await supabase
        .from("candidate_availability")
        .insert({
          profile_id: profileId,
          ...formData,
        });

      if (error) throw error;

      toast.success("Availability slot added");
      setIsDialogOpen(false);
      setFormData({
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
        timezone: "America/New_York",
        notes: "",
      });
      loadAvailability();
    } catch (error: any) {
      console.error("Error adding slot:", error);
      toast.error("Failed to add availability slot");
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Are you sure you want to delete this time slot?")) return;

    try {
      const { error } = await supabase
        .from("candidate_availability")
        .delete()
        .eq("id", slotId);

      if (error) throw error;

      setSlots(prev => prev.filter(slot => slot.id !== slotId));
      toast.success("Time slot deleted");
    } catch (error: any) {
      console.error("Error deleting slot:", error);
      toast.error("Failed to delete time slot");
    }
  };

  const getSlotsByDay = (day: number) => {
    return slots.filter(slot => slot.day_of_week === day);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12">Loading availability...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Interview Availability</h2>
          <p className="text-muted-foreground mt-1">Set your availability for interviews</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Time Slot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Availability Slot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={formData.day_of_week.toString()}
                  onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map(tz => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Prefer video calls"
                />
              </div>
              <Button onClick={handleAddSlot} className="w-full">
                Add Time Slot
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No availability set</h3>
            <p className="text-muted-foreground mb-4">
              Add your available time slots to help recruiters schedule interviews
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS_OF_WEEK.map(day => {
            const daySlots = getSlotsByDay(day.value);
            if (daySlots.length === 0) return null;

            return (
              <Card key={day.value}>
                <CardHeader>
                  <CardTitle className="text-lg">{day.label}</CardTitle>
                  <CardDescription>{daySlots.length} time slot(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {daySlots.map(slot => (
                    <div key={slot.id} className="flex items-start justify-between p-3 rounded-lg bg-muted">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {slot.timezone}
                        </Badge>
                        {slot.notes && (
                          <p className="text-xs text-muted-foreground mt-2">{slot.notes}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
