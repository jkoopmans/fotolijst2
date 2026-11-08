import React, { useState } from 'react';
import {
  FrameSettings,
  PhotoItem,
  GoogleAlbum,
  CalendarEvent,
  GoogleCalendarMeta,
  WeatherData,
  AuthUserProfile,
} from '../../types';
import { PhotosManager } from './PhotosManager';
import { CalendarSettings } from './CalendarSettings';
import { DisplaySettings } from './DisplaySettings';
import { TVConnectionCard } from './TVConnectionCard';
import { LiveTVPreview } from './LiveTVPreview';
import {
  Tv,
  Image as ImageIcon,
  Calendar,
  Sliders,
  LogOut,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

interface AdminDashboardProps {
  user: AuthUserProfile;
  onLogout: () => void;
  settings: FrameSettings;
  onUpdateSettings: (updater: (prev: FrameSettings) => FrameSettings) => void;
  photos: PhotoItem[];
  albums: GoogleAlbum[];
  selectedAlbumIds: string[];
  onToggleAlbum: (albumId: string) => void;
  onRefreshAlbums: () => void;
  isLoadingAlbums: boolean;
  calendars: GoogleCalendarMeta[];
  selectedCalendarIds: string[];
  onToggleCalendar: (calId: string) => void;
  onRefreshCalendars: () => void;
  isLoadingCalendars: boolean;
  events: CalendarEvent[];
  weather?: WeatherData | null;
  onLaunchTV: () => void;
  hasGoogleToken: boolean;
  onConnectGoogle: () => void;
  saveNoticeVisible?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onLogout,
  settings,
  onUpdateSettings,
  photos,
  albums,
  selectedAlbumIds,
  onToggleAlbum,
  onRefreshAlbums,
  isLoadingAlbums,
  calendars,
  selectedCalendarIds,
  onToggleCalendar,
  onRefreshCalendars,
  isLoadingCalendars,
  events,
  weather,
  onLaunchTV,
  hasGoogleToken,
  onConnectGoogle,
  saveNoticeVisible = false,
}) => {
  const [activeTab, setActiveTab] = useState<'photos' | 'calendar' | 'display' | 'tv'>('photos');

  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  TV Fotolijst & Kalender
                </h1>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold px-2 py-0.5 rounded-full">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Beheerpaneel & Display Configuratie
              </p>
            </div>
          </div>

          {/* User profile & TV Action */}
          <div className="flex items-center gap-3">
            {/* Launch TV Button */}
            <button
              type="button"
              onClick={onLaunchTV}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Tv className="w-4 h-4" />
              <span>Naar TV Scherm</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* User profile menu */}
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Gebruiker'}
                  className="w-8 h-8 rounded-full border border-neutral-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}

              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {user.displayName || 'Beheerder'}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                  {user.email}
                </p>
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="Uitloggen"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-2 border-t border-neutral-900 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
              activeTab === 'photos'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-slate-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-blue-400" />
            <span>Foto's & Albums ({photos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-slate-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Google Calendar ({events.length} afspraken)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('display')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
              activeTab === 'display'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-slate-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Weergave & Instellingen</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
              activeTab === 'tv'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-slate-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Tv className="w-4 h-4 text-amber-400" />
            <span>TV Koppeling & Live Preview</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Mobile Quick TV Launcher Button */}
        <div className="sm:hidden">
          <button
            type="button"
            onClick={onLaunchTV}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg"
          >
            <Tv className="w-5 h-5" />
            <span>Open TV Weergave Scherm</span>
          </button>
        </div>

        {/* Tab 1: Photos & Albums */}
        {activeTab === 'photos' && (
          <PhotosManager
            albums={albums}
            selectedAlbumIds={selectedAlbumIds}
            onToggleAlbum={onToggleAlbum}
            onRefreshAlbums={onRefreshAlbums}
            isLoadingAlbums={isLoadingAlbums}
            activePhotos={photos}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            hasGoogleToken={hasGoogleToken}
            onConnectGoogle={onConnectGoogle}
          />
        )}

        {/* Tab 2: Calendar Settings */}
        {activeTab === 'calendar' && (
          <CalendarSettings
            calendars={calendars}
            selectedCalendarIds={selectedCalendarIds}
            onToggleCalendar={onToggleCalendar}
            onRefreshCalendars={onRefreshCalendars}
            isLoading={isLoadingCalendars}
            upcomingEvents={events}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            hasGoogleToken={hasGoogleToken}
            onConnectGoogle={onConnectGoogle}
          />
        )}

        {/* Tab 3: Display Settings */}
        {activeTab === 'display' && (
          <DisplaySettings
            settings={settings}
            onUpdateSettings={onUpdateSettings}
          />
        )}

        {/* Tab 4: TV Connection & Live Preview */}
        {activeTab === 'tv' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <TVConnectionCard onLaunchTV={onLaunchTV} />
            <LiveTVPreview
              photos={photos}
              events={events}
              weather={weather}
              settings={settings}
              onLaunchTV={onLaunchTV}
            />
          </div>
        )}
      </main>

      {/* Subtle Auto-Save Toast indicator */}
      {saveNoticeVisible && (
        <div className="fixed bottom-6 right-6 z-40 bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400/40 animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          <span>Instellingen opgeslagen & gesynchroniseerd</span>
        </div>
      )}
    </div>
  );
};
