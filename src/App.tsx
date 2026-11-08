/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  FrameSettings,
  PhotoItem,
  GoogleAlbum,
  CalendarEvent,
  GoogleCalendarMeta,
  WeatherData,
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
import { fetchCurrentWeather } from './services/weather';
import { TVFrame } from './components/TVDisplay/TVFrame';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { AdminLoginScreen } from './components/Auth/AdminLoginScreen';

export default function App() {
  // App mode: 'tv' (fullscreen digital frame) or 'admin'
  const [currentMode, setCurrentMode] = useState<'tv' | 'admin'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'tv' ? 'tv' : 'tv'; // default to TV view so opening the app displays the photo frame immediately
  });

  // Settings
  const [settings, setSettings] = useState<FrameSettings>(getStoredSettings);
  const [saveNotice, setSaveNotice] = useState(false);

  // Authentication
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    const cached = getCachedPhotos();
    return cached.length > 0 ? cached : getSampleOrCuratedPhotos();
  });
  const [albums, setAlbums] = useState<GoogleAlbum[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);

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

  // Synchronize URL query parameter when mode changes
  const switchMode = (mode: 'tv' | 'admin') => {
    setCurrentMode(mode);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    window.history.pushState({}, '', url.toString());
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'admin') setCurrentMode('admin');
      else setCurrentMode('tv');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
      alert(`Inloggen mislukt: ${err.message || 'Onbekende fout'}`);
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
    } catch (e) {
      console.warn('Could not fetch albums on login:', e);
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
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') {
        handleLogin();
      } else {
        alert('Fout bij ophalen Google Photos albums: ' + e.message);
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

  // Weather fetcher
  useEffect(() => {
    const loadWeather = async () => {
      if (!settings.showWeather) return;
      const res = await fetchCurrentWeather(
        settings.weatherLat,
        settings.weatherLon,
        settings.weatherCity
      );
      setWeather(res);
    };

    loadWeather();
    const weatherTimer = setInterval(loadWeather, 30 * 60 * 1000); // every 30 mins
    return () => clearInterval(weatherTimer);
  }, [settings.showWeather, settings.weatherCity, settings.weatherLat, settings.weatherLon]);

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
