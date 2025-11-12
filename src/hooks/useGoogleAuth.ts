// src/hooks/useGoogleAuth.ts
import { useState, useEffect } from 'react';

const CLIENT_ID = '965516682930-6dk48fgomnnd9k9jvd0j0pu65mhe3uoj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';

declare const google: any;

export const useGoogleAuth = () => {
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts) {
        clearInterval(intervalId);
        const client = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse.access_token) {
              setAccessToken(tokenResponse.access_token);
              setIsSignedIn(true);
              localStorage.setItem('google_access_token', tokenResponse.access_token);
            }
          },
        });
        setTokenClient(client);

        const storedToken = localStorage.getItem('google_access_token');
        if (storedToken) {
          fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${storedToken}` },
          }).then(response => {
            if (response.ok) {
              setAccessToken(storedToken);
              setIsSignedIn(true);
            } else {
              localStorage.removeItem('google_access_token');
            }
          }).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, []);

  const signIn = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  };

  const signOut = () => {
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setIsSignedIn(false);
        localStorage.removeItem('google_access_token');
      });
    }
  };

  return { isSignedIn, signIn, signOut, accessToken, isLoading };
};
