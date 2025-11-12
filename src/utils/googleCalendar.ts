// src/utils/googleCalendar.ts

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
const SCOPES = 'https://www.googleapis.com/auth/calendar';


export const getFreeBusy = async (accessToken: string, timeMin: string, timeMax: string, calendarId: string = 'primary') => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/freeBusy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    }),
  });
  const data = await response.json();
  return data;
};

export const getEvents = async (accessToken: string, calendarId: string = 'primary') => {
  const timeMin = new Date().toISOString();
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&singleEvents=true&orderBy=startTime`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  return data.items;
};

export const createEvent = async (accessToken: string, calendarId: string = 'primary', event: any) => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  const data = await response.json();
  return data;
};
