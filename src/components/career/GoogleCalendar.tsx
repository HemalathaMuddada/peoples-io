// src/components/career/GoogleCalendar.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { getFreeBusy, createEvent, getEvents } from '@/utils/googleCalendar';
import { AvailabilityDisplay } from './AvailabilityDisplay';
import { EventsDisplay } from './EventsDisplay';

export const GoogleCalendar = () => {
  const { isSignedIn, signIn, signOut, accessToken, isLoading } = useGoogleAuth();
  const [availability, setAvailability] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [events, setEvents] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const handleCheckAvailability = async () => {
    if (!accessToken) return;

    setIsChecking(true);
    setSelectedSlot(null);
    setConfirmation(null);
    setEvents([]);
    try {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
      const data = await getFreeBusy(accessToken, timeMin, timeMax, interviewerEmail);
      setAvailability(data);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSlotSelect = (slot: { start: string; end: string }) => {
    setSelectedSlot(slot);
  };

  const handleScheduleInterview = async () => {
    if (!accessToken || !selectedSlot || !interviewerEmail) return;

    setIsScheduling(true);
    try {
      const event = {
        summary: 'Interview',
        start: { dateTime: selectedSlot.start },
        end: { dateTime: selectedSlot.end },
        attendees: [{ email: interviewerEmail }],
      };
      const data = await createEvent(accessToken, 'primary', event);
      setConfirmation(`Interview scheduled successfully! Event ID: ${data.id}`);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Error scheduling interview:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleViewCalendar = async () => {
    if (!accessToken) return;

    setIsFetchingEvents(true);
    setAvailability(null);
    setConfirmation(null);
    try {
      const data = await getEvents(accessToken);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsFetchingEvents(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Your Interview</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : !isSignedIn ? (
          <Button onClick={signIn}>
            Connect Google Calendar
          </Button>
        ) : (
          <div>
            <div className="flex space-x-4">
                <Input
                    type="email"
                    placeholder="Interviewer's Email"
                    value={interviewerEmail}
                    onChange={(e) => setInterviewerEmail(e.target.value)}
                    className="max-w-xs"
                />
              <Button onClick={handleCheckAvailability} disabled={isChecking || !interviewerEmail}>
                {isChecking ? 'Checking...' : 'Check Availability'}
              </Button>
              <Button onClick={handleViewCalendar} disabled={isFetchingEvents}>
                {isFetchingEvents ? 'Fetching...' : 'View My Calendar'}
              </Button>
              <Button onClick={signOut} variant="destructive">
                Sign Out
              </Button>
            </div>

            {confirmation && (
                <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg">
                    <p>{confirmation}</p>
                </div>
            )}

            {selectedSlot && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <h3 className="text-lg font-semibold">Selected Slot</h3>
                <p>{new Date(selectedSlot.start).toLocaleString()} - {new Date(selectedSlot.end).toLocaleTimeString()}</p>
                <Button onClick={handleScheduleInterview} disabled={isScheduling} className="mt-4">
                  {isScheduling ? 'Scheduling...' : 'Schedule Interview'}
                </Button>
              </div>
            )}

            {availability && !selectedSlot && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold">Available Slots</h3>
                <AvailabilityDisplay availability={availability} onSlotSelect={handleSlotSelect} />
              </div>
            )}

            {events.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold">Upcoming Interviews</h3>
                <EventsDisplay events={events} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
