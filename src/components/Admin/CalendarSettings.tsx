import React from 'react';
import { GoogleCalendarMeta, CalendarEvent, FrameSettings } from '../../types';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  MapPin,
  Check,
} from 'lucide-react';

interface CalendarSettingsProps {
  calendars: GoogleCalendarMeta[];
  selectedCalendarIds: string[];
  onToggleCalendar: (calId: string) => void;
  onRefreshCalendars: () => void;
  isLoading: boolean;
  upcomingEvents: CalendarEvent[];
  settings: FrameSettings;
  onUpdateSettings: (updater: (prev: FrameSettings) => FrameSettings) => void;
  hasGoogleToken: boolean;
  onConnectGoogle: () => void;
}

export const CalendarSettings: React.FC<CalendarSettingsProps> = ({
  calendars,
  selectedCalendarIds,
  onToggleCalendar,
  onRefreshCalendars,
  isLoading,
  upcomingEvents,
  settings,
  onUpdateSettings,
  hasGoogleToken,
  onConnectGoogle,
}) => {
  return (
    <div className="space-y-6">
      {/* Calendar connection & refresh header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Google Calendar Koppeling</h3>
            <p className="text-xs text-slate-400">
              Synchroniseert automatisch met de agenda's van je Google account
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!hasGoogleToken ? (
            <button
              type="button"
              onClick={onConnectGoogle}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition-colors"
            >
              Google Account Koppelen
            </button>
          ) : (
            <button
              type="button"
              onClick={onRefreshCalendars}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-xs font-medium border border-neutral-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isLoading ? 'Agenda vernieuwen...' : 'Nu Synchroniseren'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Available Calendars Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">
            Actieve Agenda's ({selectedCalendarIds.length} geselecteerd)
          </h4>
          <span className="text-xs text-slate-400">
            Kies welke agenda's worden getoond op de TV fotolijst
          </span>
        </div>

        {calendars.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
            {hasGoogleToken
              ? 'Geen agenda-lijst gevonden. Klik hierboven op "Nu Synchroniseren".'
              : 'Koppel eerst je Google account om je agenda\'s te selecteren.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {calendars.map((cal) => {
              const isSelected = selectedCalendarIds.includes(cal.id);
              return (
                <div
                  key={cal.id}
                  onClick={() => onToggleCalendar(cal.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-950/20 border-blue-500/80 shadow-md ring-1 ring-blue-500/30'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cal.backgroundColor || '#3b82f6' }}
                    />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-white truncate">
                        {cal.summary}
                      </p>
                      {cal.primary && (
                        <span className="text-[10px] text-blue-400 font-medium">Hoofdagenda</span>
                      )}
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'border border-neutral-700 bg-neutral-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sync Preferences */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-white">Agenda Weergave Opties</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Automatische Vernieuwing (Minuten)
            </label>
            <select
              value={settings.refreshIntervalMinutes}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  refreshIntervalMinutes: parseInt(e.target.value, 10),
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value={2}>Elke 2 minuten</option>
              <option value={5}>Elke 5 minuten (aanbevolen)</option>
              <option value={10}>Elke 10 minuten</option>
              <option value={15}>Elke 15 minuten</option>
              <option value={30}>Elke 30 minuten</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Positie van het Kalenderkader
            </label>
            <select
              value={settings.overlayPosition}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  overlayPosition: e.target.value as 'right' | 'left',
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="right">Rechts over de foto (standaard)</option>
              <option value="left">Links over de foto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Upcoming Events Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">
            Voorbeeld: Aankomende Agenda-afspraken ({upcomingEvents.length})
          </h4>
          <span className="text-xs text-slate-400">Zoals ze op het scherm verschijnen</span>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
            Geen afspraken gepland in de komende periode.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-neutral-700">
            {upcomingEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex items-start gap-3"
              >
                <div
                  className="w-1.5 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: ev.color || '#3b82f6' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{ev.summary}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {ev.isAllDay
                      ? 'Hele dag'
                      : ev.start.dateTime
                      ? new Date(ev.start.dateTime).toLocaleString('nl-NL', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </p>
                  {ev.location && (
                    <p className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      {ev.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
