import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse app instance if already initialized
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/photoslibrary.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const OAUTH_CLIENT_ID =
  firebaseConfig.oAuthClientId || '114756915443-t31akie1bsdp3i6tfmnjfdd8qq5g742e.apps.googleusercontent.com';

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'select_account',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentUserProfile: any = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: any, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  // Check cached session in memory or localStorage for user convenience
  const storedUser = localStorage.getItem('ambient_tv_user_profile');
  const storedToken = sessionStorage.getItem('ambient_tv_oauth_token');
  if (storedUser && storedToken) {
    try {
      currentUserProfile = JSON.parse(storedUser);
      cachedAccessToken = storedToken;
      if (onAuthSuccess) onAuthSuccess(currentUserProfile, cachedAccessToken);
    } catch {
      // Continue to Firebase listener
    }
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      currentUserProfile = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      }
    } else if (!currentUserProfile) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google (supports Google Identity Services with custom client ID & Firebase Auth)
export const googleSignIn = async (): Promise<{ user: any; accessToken: string }> => {
  if (isSigningIn) {
    throw new Error('Inloggen is al bezig...');
  }
  isSigningIn = true;

  try {
    // 1. If Google Identity Services (GIS) is available and client ID is provided, use GIS Token Client
    // This allows custom Google Cloud OAuth client IDs to work seamlessly on GitHub Pages and custom domains
    const gisAvailable = typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2;

    if (gisAvailable && OAUTH_CLIENT_ID) {
      try {
        const tokenResult = await new Promise<{ user: any; accessToken: string }>((resolve, reject) => {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: OAUTH_CLIENT_ID,
            scope: SCOPES.join(' '),
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error) {
                reject(new Error(tokenResponse.error_description || tokenResponse.error));
                return;
              }

              const accessToken = tokenResponse.access_token;
              cachedAccessToken = accessToken;
              sessionStorage.setItem('ambient_tv_oauth_token', accessToken);

              try {
                // Fetch user info using the access token
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                const userInfo = await userInfoRes.json();

                const userObj = {
                  uid: userInfo.sub,
                  email: userInfo.email,
                  displayName: userInfo.name,
                  photoURL: userInfo.picture,
                };

                currentUserProfile = userObj;
                localStorage.setItem('ambient_tv_user_profile', JSON.stringify(userObj));
                resolve({ user: userObj, accessToken });
              } catch (profileErr) {
                // Fallback user object
                const fallbackUser = {
                  uid: 'google-user',
                  email: 'jasper@23g.nl',
                  displayName: 'Jasper',
                  photoURL: null,
                };
                currentUserProfile = fallbackUser;
                resolve({ user: fallbackUser, accessToken });
              }
            },
            error_callback: (err: any) => {
              reject(new Error(err.message || 'Google OAuth pop-up geannuleerd'));
            },
          });

          client.requestAccessToken({ prompt: 'select_account' });
        });

        return tokenResult;
      } catch (gisError: any) {
        console.warn('GIS Token client issue, falling back to Firebase popup:', gisError);
        // Fallback to Firebase popup if GIS fails
      }
    }

    // 2. Fallback: Firebase Auth with GoogleAuthProvider
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Geen OAuth toegangstoken ontvangen van Google.');
    }

    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('ambient_tv_oauth_token', cachedAccessToken);
    currentUserProfile = result.user;
    localStorage.setItem(
      'ambient_tv_user_profile',
      JSON.stringify({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      })
    );

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  return sessionStorage.getItem('ambient_tv_oauth_token');
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    sessionStorage.setItem('ambient_tv_oauth_token', token);
  } else {
    sessionStorage.removeItem('ambient_tv_oauth_token');
  }
};

export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {}
  cachedAccessToken = null;
  currentUserProfile = null;
  sessionStorage.removeItem('ambient_tv_oauth_token');
  localStorage.removeItem('ambient_tv_user_profile');
};
