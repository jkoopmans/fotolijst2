import { FrameSettings, PhotoItem } from '../types';

const STORAGE_KEY = 'ambient_tv_frame_settings_v1';
const CACHED_PHOTOS_KEY = 'ambient_tv_frame_cached_photos_v1';
const CACHED_EVENTS_KEY = 'ambient_tv_frame_cached_events_v1';

export const DEFAULT_SETTINGS: FrameSettings = {
  slideInterval: 12,
  transitionStyle: 'kenburns',
  fitMode: 'blur-backdrop',
  showCalendarOverlay: true,
  overlayPosition: 'right',
  overlayWidth: 'normal',
  overlayOpacity: 80,
  showClock: true,
  clockFormat: '24h',
  showWeather: false,
  weatherCity: 'Amsterdam',
  weatherLat: 52.3676,
  weatherLon: 4.9041,
  showPhotoInfo: false,
  selectedAlbumIds: [],
  selectedCalendarIds: ['primary'],
  customPhotos: [],
  curatedAlbumEnabled: true,
  authorizedEmails: ['jasper@23g.nl', 'fietsventieltje@gmail.com'],
  refreshIntervalMinutes: 5,
};

export const getStoredSettings = (): FrameSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const combinedEmails = Array.from(
      new Set([...DEFAULT_SETTINGS.authorizedEmails, ...(parsed.authorizedEmails || [])])
    );
    return { ...DEFAULT_SETTINGS, ...parsed, authorizedEmails: combinedEmails };
  } catch (e) {
    console.error('Error loading stored settings:', e);
    return DEFAULT_SETTINGS;
  }
};

export const saveStoredSettings = (settings: FrameSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Trigger custom event so other components or iframe instances can re-render immediately
    window.dispatchEvent(new CustomEvent('tv-frame-settings-updated', { detail: settings }));
  } catch (e) {
    console.error('Error saving settings to localStorage:', e);
  }
};

export const getCachedPhotos = (): PhotoItem[] => {
  try {
    const raw = localStorage.getItem(CACHED_PHOTOS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const setCachedPhotos = (photos: PhotoItem[]): void => {
  try {
    // Only cache reasonable number to avoid exceeding localStorage quota
    const subset = photos.slice(0, 100);
    localStorage.setItem(CACHED_PHOTOS_KEY, JSON.stringify(subset));
  } catch (e) {
    console.warn('Could not cache photos to localStorage:', e);
  }
};

export const getCachedEvents = (): any[] => {
  try {
    const raw = localStorage.getItem(CACHED_EVENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

export const setCachedEvents = (events: any[]): void => {
  try {
    localStorage.setItem(CACHED_EVENTS_KEY, JSON.stringify(events.slice(0, 50)));
  } catch (e) {
    console.warn('Could not cache events to localStorage:', e);
  }
};
