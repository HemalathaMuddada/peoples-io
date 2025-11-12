// src/utils/googleCalendar.ts

const CLIENT_ID = '965516682930-6dk48fgomnnd9k9jvd0j0pu65mhe3uoj.apps.googleusercontent.com';
const REDIRECT_URI = 'http://localhost:3000';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

let tokenClient: any;

export const getGoogleAuthToken = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              resolve(tokenResponse);
            } else {
              reject(new Error('Failed to retrieve access token.'));
            }
          },
        });
        tokenClient.requestAccessToken();
      } catch (error) {
        reject(error);
      }
    });
  };

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
