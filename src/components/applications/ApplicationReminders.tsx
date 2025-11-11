import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Plus, Trash2, CheckCircle2, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Reminder = {
  id: string;
  reminder_type: string;
  reminder_date: string;
  notes: string | null;
  completed: boolean;
  application_id: string;
};

const REMINDER_TYPES = [
  "follow_up",
  "interview_prep",
  "send_thank_you",
  "check_status",
  "submit_documents",
  "other",
];

export function ApplicationReminders({ applicationId }: { applicationId: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
    reminder_type: "follow_up",
    notes: "",
  });

  useEffect(() => {
    loadReminders();
  }, [applicationId]);

  const loadReminders = async () => {
    try {
      const { data, error } = await supabase
        .from("application_reminders")
        .select("*")
        .eq("application_id", applicationId)
        .order("reminder_date", { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      console.error("Error loading reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!reminderDate) {
      toast.error("Please select a reminder date");
      return;
    }

    try {
      const { error } = await supabase
        .from("application_reminders")
        .insert({
          application_id: applicationId,
          reminder_type: formData.reminder_type,
          reminder_date: reminderDate.toISOString(),
          notes: formData.notes || null,
        });

      if (error) throw error;

      toast.success("Reminder created");
      setIsDialogOpen(false);
      setFormData({ reminder_type: "follow_up", notes: "" });
      setReminderDate(undefined);
      loadReminders();
    } catch (error: any) {
      console.error("Error creating reminder:", error);
      toast.error("Failed to create reminder");
    }
  };

  const handleToggleComplete = async (reminderId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from("application_reminders")
        .update({ completed })
        .eq("id", reminderId);

      if (error) throw error;

      setReminders(prev =>
        prev.map(r => (r.id === reminderId ? { ...r, completed } : r))
      );

      toast.success(completed ? "Reminder completed" : "Reminder marked as pending");
    } catch (error: any) {
      console.error("Error updating reminder:", error);
      toast.error("Failed to update reminder");
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (!confirm("Delete this reminder?")) return;

    try {
      const { error } = await supabase
        .from("application_reminders")
        .delete()
        .eq("id", reminderId);

      if (error) throw error;

      setReminders(prev => prev.filter(r => r.id !== reminderId));
      toast.success("Reminder deleted");
    } catch (error: any) {
      console.error("Error deleting reminder:", error);
      toast.error("Failed to delete reminder");
    }
  };

  const formatReminderType = (type: string) => {
    return type.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  if (loading) {
    return <div className="text-center py-4">Loading reminders...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Reminders & Follow-ups
            </CardTitle>
            <CardDescription>Stay on top of your application</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Reminder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="reminder_type">Reminder Type</Label>
                  <Select
                    value={formData.reminder_type}
                    onValueChange={(value) => setFormData({ ...formData, reminder_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {formatReminderType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reminder Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !reminderDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reminderDate ? format(reminderDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={reminderDate}
                        onSelect={setReminderDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add details about this reminder..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateReminder} className="w-full">
                  Create Reminder
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No reminders set. Add one to stay organized!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border",
                  reminder.completed ? "bg-muted/50" : "bg-card"
                )}
              >
                <Checkbox
                  checked={reminder.completed}
                  onCheckedChange={(checked) => 
                    handleToggleComplete(reminder.id, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={reminder.completed ? "secondary" : "default"}>
                      {formatReminderType(reminder.reminder_type)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(reminder.reminder_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  {reminder.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{reminder.notes}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteReminder(reminder.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
