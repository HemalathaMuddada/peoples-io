import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
  is_booked: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CoachAvailability() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const { toast } = useToast();

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("mentor_availability_slots")
      .select("*")
      .eq("mentor_id", user.id)
      .eq("is_recurring", true)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      toast({ title: "Error loading availability", variant: "destructive" });
    } else {
      setSlots(data || []);
    }
    setLoading(false);
  };

  const handleAddSlot = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("mentor_availability_slots").insert({
      mentor_id: user.id,
      day_of_week: parseInt(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    if (error) {
      toast({ title: "Error adding slot", variant: "destructive" });
    } else {
      toast({ title: "Availability slot added!" });
      setOpen(false);
      fetchSlots();
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("mentor_availability_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast({ title: "Error deleting slot", variant: "destructive" });
    } else {
      toast({ title: "Slot removed" });
      fetchSlots();
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Availability Calendar
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Slot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Availability Slot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddSlot} className="w-full">
                  Add Slot
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {DAYS.map((day, dayIndex) => {
            const daySlots = slots.filter((s) => s.day_of_week === dayIndex);
            if (daySlots.length === 0) return null;

            return (
              <div key={dayIndex} className="border-b pb-3">
                <h4 className="font-semibold mb-2">{day}</h4>
                <div className="space-y-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between bg-muted p-2 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {slot.start_time} - {slot.end_time}
                        </span>
                        {slot.is_booked && (
                          <span className="text-xs text-primary">Booked</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {slots.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No availability slots set. Add your available times above.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
