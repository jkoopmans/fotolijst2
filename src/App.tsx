/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FrameSettings,
  PhotoItem,
  GoogleAlbum,
  CalendarEvent,
  GoogleCalendarMeta,
  WeatherData,
  AuthUserProfile,
} from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setAccessToken,
} from './services/auth';
import {
  getStoredSettings,
  saveStoredSettings,
  getCachedPhotos,
  setCachedPhotos,
  getCachedEvents,
  setCachedEvents,
  DEFAULT_SETTINGS,
} from './services/storage';
import {
  fetchGoogleAlbums,
  fetchAlbumPhotos,
  fetchAllSelectedPhotos,
  getSampleOrCuratedPhotos,
} from './services/googlePhotos';
import {
  fetchUserCalendars,
  fetchUpcomingEvents,
  SAMPLE_CALENDAR_EVENTS,
} from './services/googleCalendar';
import { TVFrame } from './components/TVDisplay/TVFrame';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminLoginScreen } from './components/Auth/AdminLoginScreen';

const checkIsAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const params = new URLSearchParams(window.location.search);

  return (
    path.endsWith('/admin') ||
    path.endsWith('/admin/') ||
    path.includes('/admin') ||
    hash === '#admin' ||
    hash.startsWith('#/admin') ||
    params.get('mode') === 'admin'
  );
};

export default function App() {
  // App mode: 'tv' (fullscreen digital frame) or 'admin' (dedicated /admin url)
  const [currentMode, setCurrentMode] = useState<'tv' | 'admin'>(() => {
    return checkIsAdminRoute() ? 'admin' : 'tv';
  });

  // Settings
  const [settings, setSettings] = useState<FrameSettings>(getStoredSettings);
  const [saveNotice, setSaveNotice] = useState(false);

  // Authentication
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    const cached = getCachedPhotos();
    return cached.length > 0 ? cached : getSampleOrCuratedPhotos();
  });
  const [albums, setAlbums] = useState<GoogleAlbum[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);

  // Calendars & Events
  const [calendars, setCalendars] = useState<GoogleCalendarMeta[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const cached = getCachedEvents();
    return cached.length > 0 ? cached : SAMPLE_CALENDAR_EVENTS;
  });
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Weather
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Switch between TV mode and dedicated /admin URL
  const switchMode = (mode: 'tv' | 'admin') => {
    setCurrentMode(mode);
    const url = new URL(window.location.href);

    if (mode === 'admin') {
      if (!url.pathname.includes('/admin')) {
        const basePath = url.pathname.replace(/\/$/, '');
        url.pathname = `${basePath}/admin`;
      }
      url.searchParams.delete('mode');
    } else {
      url.pathname = url.pathname.replace(/\/admin\/?$/, '') || '/';
      url.searchParams.delete('mode');
    }

    window.history.pushState({}, '', url.toString());
  };

  // Handle browser back/forward buttons and hash navigation
  useEffect(() => {
    const handleUrlChange = () => {
      setCurrentMode(checkIsAdminRoute() ? 'admin' : 'tv');
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Update & persist settings helper
  const updateSettings = useCallback((updater: (prev: FrameSettings) => FrameSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      saveStoredSettings(next);
      return next;
    });
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 2500);
  }, []);

  // Listen to cross-tab settings updates
  useEffect(() => {
    const handleStorageUpdate = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };
    window.addEventListener('tv-frame-settings-updated', handleStorageUpdate);
    return () => window.removeEventListener('tv-frame-settings-updated', handleStorageUpdate);
  }, []);

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setAuthChecked(true);
      },
      () => {
        setUser(null);
        setToken(null);
        setAuthChecked(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Google Login Handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setAccessToken(result.accessToken);

        // Load initial data from Google APIs
        loadGoogleData(result.accessToken);
      }
    } catch (err: any) {
      console.error('Login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setAccessToken(null);
  };

  // Load Google Albums and Calendar list
  const loadGoogleData = useCallback(async (accessToken: string) => {
    // 1. Load Albums
    setIsLoadingAlbums(true);
    try {
      const fetchedAlbums = await fetchGoogleAlbums(accessToken);
      setAlbums(fetchedAlbums);
      setPhotosError(null);
    } catch (e: any) {
      console.info('Could not fetch albums:', e);
      setPhotosError(null);
    } finally {
      setIsLoadingAlbums(false);
    }

    // 2. Load Calendars
    setIsLoadingCalendars(true);
    try {
      const fetchedCals = await fetchUserCalendars(accessToken);
      setCalendars(fetchedCals);
    } catch (e) {
      console.warn('Could not fetch calendars on login:', e);
    } finally {
      setIsLoadingCalendars(false);
    }
  }, []);

  // Fetch albums manually
  const handleRefreshAlbums = async () => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      handleLogin();
      return;
    }
    setIsLoadingAlbums(true);
    try {
      const fetchedAlbums = await fetchGoogleAlbums(currentToken);
      setAlbums(fetchedAlbums);
      setPhotosError(null);
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') {
        handleLogin();
      } else {
        console.info('Album fetch notice:', e);
        setPhotosError(null);
      }
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  // Fetch calendars & events manually or periodically
  const handleRefreshCalendar = useCallback(async () => {
    const currentToken = token || (await getAccessToken());
    if (!currentToken) {
      return;
    }

    setIsSyncingCalendar(true);
    try {
      // 1. Calendars list
      const fetchedCals = await fetchUserCalendars(currentToken);
      setCalendars(fetchedCals);

      // 2. Events from selected calendars
      const calIds = settings.selectedCalendarIds.length > 0 ? settings.selectedCalendarIds : ['primary'];
      const fetchedEvents = await fetchUpcomingEvents(currentToken, calIds, 14);
      setEvents(fetchedEvents);
      setCachedEvents(fetchedEvents);
    } catch (e: any) {
      console.warn('Calendar sync warning:', e);
      if (e.message === 'UNAUTHORIZED') {
        // Need re-auth for token
      }
    } finally {
      setIsSyncingCalendar(false);
    }
  }, [token, settings.selectedCalendarIds]);

  // Periodic Calendar sync timer based on refreshIntervalMinutes
  useEffect(() => {
    handleRefreshCalendar();
    const intervalMs = (settings.refreshIntervalMinutes || 5) * 60 * 1000;
    const interval = setInterval(() => {
      handleRefreshCalendar();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [handleRefreshCalendar, settings.refreshIntervalMinutes]);



  // Re-compose active photo list when selected albums, custom photos, or curated setting change
  useEffect(() => {
    let isMounted = true;

    const composePhotos = async () => {
      const list: PhotoItem[] = [];

      // 1. Custom Photos
      if (settings.customPhotos && settings.customPhotos.length > 0) {
        list.push(...settings.customPhotos);
      }

      // 2. Curated Photos
      if (settings.curatedAlbumEnabled) {
        list.push(...getSampleOrCuratedPhotos());
      }

      // 3. Selected Google Photos Albums
      if (settings.selectedAlbumIds.length > 0 && token) {
        try {
          const googlePhotos = await fetchAllSelectedPhotos(token, settings.selectedAlbumIds, albums);
          if (googlePhotos.length > 0) {
            list.unshift(...googlePhotos);
          }
        } catch (e) {
          console.warn('Error loading photos from selected albums:', e);
        }
      }

      if (isMounted) {
        const finalList = list.length > 0 ? list : getSampleOrCuratedPhotos();
        setPhotos(finalList);
        setCachedPhotos(finalList);
      }
    };

    composePhotos();

    return () => {
      isMounted = false;
    };
  }, [settings.selectedAlbumIds, settings.customPhotos, settings.curatedAlbumEnabled, token, albums]);

  // Album selection toggle
  const handleToggleAlbum = (albumId: string) => {
    updateSettings((prev) => {
      const exists = prev.selectedAlbumIds.includes(albumId);
      const nextAlbumIds = exists
        ? prev.selectedAlbumIds.filter((id) => id !== albumId)
        : [...prev.selectedAlbumIds, albumId];
      return {
        ...prev,
        selectedAlbumIds: nextAlbumIds,
      };
    });
  };

  // Calendar selection toggle
  const handleToggleCalendar = (calId: string) => {
    updateSettings((prev) => {
      const exists = prev.selectedCalendarIds.includes(calId);
      const nextIds = exists
        ? prev.selectedCalendarIds.filter((id) => id !== calId)
        : [...prev.selectedCalendarIds, calId];
      return {
        ...prev,
        selectedCalendarIds: nextIds.length > 0 ? nextIds : ['primary'],
      };
    });
  };

  // Check if current user is authorized for admin
  const isAuthorizedAdmin = !!(
    user &&
    user.email &&
    settings.authorizedEmails.map((e) => e.toLowerCase()).includes(user.email.toLowerCase())
  );

  // If in Admin mode:
  if (currentMode === 'admin') {
    // If not signed in or not authorized:
    if (!user || !isAuthorizedAdmin) {
      return (
        <AdminLoginScreen
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
          isLoggingIn={isLoggingIn}
          isUnauthorized={!!user && !isAuthorizedAdmin}
          onGoToTV={() => switchMode('tv')}
        />
      );
    }

    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
        settings={settings}
        onUpdateSettings={updateSettings}
        photos={photos}
        albums={albums}
        selectedAlbumIds={settings.selectedAlbumIds}
        onToggleAlbum={handleToggleAlbum}
        onRefreshAlbums={handleRefreshAlbums}
        isLoadingAlbums={isLoadingAlbums}
        calendars={calendars}
        selectedCalendarIds={settings.selectedCalendarIds}
        onToggleCalendar={handleToggleCalendar}
        onRefreshCalendars={handleRefreshCalendar}
        isLoadingCalendars={isLoadingCalendars}
        events={events}
        weather={weather}
        onLaunchTV={() => switchMode('tv')}
        hasGoogleToken={!!token}
        onConnectGoogle={handleLogin}
        saveNoticeVisible={saveNotice}
        photosError={photosError}
        accessToken={token}
      />
    );
  }

  // TV Display Mode:
  return (
    <TVFrame
      photos={photos}
      events={events}
      weather={weather}
      settings={settings}
      onOpenAdmin={() => switchMode('admin')}
      isSyncingCalendar={isSyncingCalendar}
      onRefreshCalendar={handleRefreshCalendar}
    />
  );
}
