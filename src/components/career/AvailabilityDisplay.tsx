// src/components/career/AvailabilityDisplay.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AvailabilityDisplayProps {
  availability: any;
  onSlotSelect: (slot: { start: string; end: string }) => void;
}

export const AvailabilityDisplay: React.FC<AvailabilityDisplayProps> = ({ availability, onSlotSelect }) => {
  const calendars = availability.calendars || {};
  const primaryCalendar = calendars.primary || {};
  const busySlots = primaryCalendar.busy || [];

  const timeMin = new Date(availability.timeMin);
  const timeMax = new Date(availability.timeMax);

  const thirtyMinuteSlots = [];
  let current = new Date(timeMin);

  while (current < timeMax) {
    thirtyMinuteSlots.push(new Date(current));
    current.setMinutes(current.getMinutes() + 30);
  }

  const availableSlots = thirtyMinuteSlots.filter(slot => {
    const slotEnd = new Date(slot);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    return !busySlots.some((busy: any) => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return (slot < busyEnd && slotEnd > busyStart);
    });
  });

  if (availableSlots.length === 0) {
    return <p>No available slots found in the next 7 days.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
      {availableSlots.map(slot => {
        const slotEnd = new Date(slot);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);

        return (
          <Card
            key={slot.toISOString()}
            className="cursor-pointer hover:bg-gray-100"
            onClick={() => onSlotSelect({ start: slot.toISOString(), end: slotEnd.toISOString() })}
          >
            <CardContent className="p-4 text-center">
              <p className="font-semibold">{slot.toLocaleDateString()}</p>
              <p>{slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
