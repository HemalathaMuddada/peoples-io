// src/components/career/EventsDisplay.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface EventsDisplayProps {
  events: any[];
}

export const EventsDisplay: React.FC<EventsDisplayProps> = ({ events }) => {
  if (events.length === 0) {
    return <p>No upcoming interviews found.</p>;
  }

  return (
    <div className="space-y-4 mt-4">
      {events.map(event => (
        <Card key={event.id}>
          <CardContent className="p-4">
            <h4 className="font-semibold">{event.summary}</h4>
            <p className="text-sm text-gray-600">
              {new Date(event.start.dateTime).toLocaleString()} - {new Date(event.end.dateTime).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
