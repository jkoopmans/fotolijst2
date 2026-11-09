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
  curatedAlbumEnabled: false,
  authorizedEmails: ['jasper@23g.nl', 'fietsventieltje@gmail.com'],
  refreshIntervalMinutes: 5,
  googleApiKey: 'AIzaSyBx2yj4QSfS2U75ylF9Khx1XseoMRb3aeQ',
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

export function generateSyncHash(photos: PhotoItem[], events: any[], settings: FrameSettings): string {
  const data = {
    photos: photos.map((p) => ({
      id: p.id,
      url: p.url,
      title: p.title,
      albumTitle: p.albumTitle,
      createTime: p.createTime,
      source: p.source,
    })),
    events: events.map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start,
      end: e.end,
      color: e.color,
      location: e.location,
      calendarName: e.calendarName,
      isAllDay: e.isAllDay,
    })),
    settings: {
      slideInterval: settings.slideInterval,
      transitionStyle: settings.transitionStyle,
      fitMode: settings.fitMode,
      showCalendarOverlay: settings.showCalendarOverlay,
      overlayPosition: settings.overlayPosition,
      overlayWidth: settings.overlayWidth,
      overlayOpacity: settings.overlayOpacity,
      showClock: settings.showClock,
      clockFormat: settings.clockFormat,
      curatedAlbumEnabled: false,
      customPhotos: photos,
    },
    version: 1,
    exportedAt: new Date().toISOString(),
  };

  try {
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(data)))));
  } catch {
    return '';
  }
}

export function parseSyncHash(
  hashStr: string
): { photos?: PhotoItem[]; events?: any[]; settings?: Partial<FrameSettings> } | null {
  try {
    let clean = hashStr.trim();
    if (clean.startsWith('#')) clean = clean.substring(1);
    if (clean.startsWith('?')) clean = clean.substring(1);
    if (clean.startsWith('config=')) clean = clean.substring(7);
    if (clean.startsWith('sync=')) clean = clean.substring(5);
    if (!clean) return null;

    const decodedUri = decodeURIComponent(clean);
    const jsonStr = decodeURIComponent(escape(atob(decodedUri)));
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch {
    try {
      // Fallback direct decode without URI escape
      const clean = hashStr.replace(/^[#?]/, '').replace(/^config=/, '').replace(/^sync=/, '');
      const jsonStr = atob(clean);
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }
}

export function createTVContentJSON(photos: PhotoItem[], events: any[], settings: FrameSettings): string {
  const payload = {
    photos: photos.map((p) => ({
      id: p.id,
      url: p.url,
      title: p.title,
      albumTitle: p.albumTitle,
      createTime: p.createTime,
      source: p.source || 'google_photos',
    })),
    events: events.map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start,
      end: e.end,
      color: e.color,
      location: e.location,
      calendarName: e.calendarName,
      isAllDay: e.isAllDay,
    })),
    settings: {
      slideInterval: settings.slideInterval,
      transitionStyle: settings.transitionStyle,
      fitMode: settings.fitMode,
      showCalendarOverlay: settings.showCalendarOverlay,
      overlayPosition: settings.overlayPosition,
      overlayWidth: settings.overlayWidth,
      overlayOpacity: settings.overlayOpacity,
      showClock: settings.showClock,
      clockFormat: settings.clockFormat,
      curatedAlbumEnabled: false,
    },
    version: 1,
    generatedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}


