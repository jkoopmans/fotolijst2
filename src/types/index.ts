export interface PhotoItem {
  id: string;
  url: string;
  title?: string;
  albumTitle?: string;
  createTime?: string;
  source: 'google_photos' | 'curated' | 'custom';
  width?: number;
  height?: number;
}

export interface GoogleAlbum {
  id: string;
  title: string;
  productUrl?: string;
  coverPhotoBaseUrl?: string;
  mediaItemsCount?: string;
  selected?: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  htmlLink?: string;
  calendarId: string;
  calendarName?: string;
  color?: string;
  isAllDay: boolean;
}

export interface GoogleCalendarMeta {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
}

export interface WeatherData {
  temperature: number;
  conditionCode: number;
  conditionText: string;
  isDay: boolean;
  city: string;
  humidity?: number;
  windSpeed?: number;
}

export interface FrameSettings {
  slideInterval: number; // in seconds (e.g., 15)
  transitionStyle: 'kenburns' | 'crossfade' | 'fade' | 'zoom';
  fitMode: 'blur-backdrop' | 'cover' | 'contain';
  showCalendarOverlay: boolean;
  overlayPosition: 'right' | 'left';
  overlayWidth: 'compact' | 'normal' | 'wide';
  overlayOpacity: number; // 0 - 100
  showClock: boolean;
  clockFormat: '24h' | '12h';
  showWeather: boolean;
  weatherCity: string;
  weatherLat: number;
  weatherLon: number;
  showPhotoInfo: boolean;
  selectedAlbumIds: string[];
  selectedCalendarIds: string[];
  customPhotos: PhotoItem[];
  curatedAlbumEnabled: boolean;
  authorizedEmails: string[];
  refreshIntervalMinutes: number; // calendar sync interval
}
