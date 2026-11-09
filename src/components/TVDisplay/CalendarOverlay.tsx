import React from 'react';
import { CalendarEvent, FrameSettings } from '../../types';
import {
  Clock,
  MapPin,
  Video,
  CalendarDays,
} from 'lucide-react';

interface CalendarOverlayProps {
  events: CalendarEvent[];
  settings: FrameSettings;
  isSyncing?: boolean;
  onRefresh?: () => void;
  weather?: any;
}

export const CalendarOverlay: React.FC<CalendarOverlayProps> = ({
  events,
  settings,
}) => {
  const currentTime = new Date();
  const todayStr = currentTime.toISOString().split('T')[0];
  const tomorrow = new Date(currentTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const todayEvents = events.filter((ev) => {
    const evDateStr = (ev.start.dateTime || ev.start.date || '').split('T')[0];
    return evDateStr === todayStr;
  });

  const upcomingEvents = events.filter((ev) => {
    const evDateStr = (ev.start.dateTime || ev.start.date || '').split('T')[0];
    return evDateStr !== todayStr;
  });

  // Helper for event time formatting (HH:MM - HH:MM)
  const formatEventTime = (ev: CalendarEvent) => {
    if (ev.isAllDay) return 'Hele dag';
    if (!ev.start.dateTime) return '';
    const start = new Date(ev.start.dateTime);
    const startStr = start.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

    if (ev.end.dateTime) {
      const end = new Date(ev.end.dateTime);
      const endStr = end.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
      return `${startStr} – ${endStr}`;
    }
    return startStr;
  };

  const formatEventDayHeader = (dateStr: string) => {
    const parsed = new Date(dateStr);
    const dayStr = dateStr.split('T')[0];
    if (dayStr === tomorrowStr) return 'Morgen';

    return parsed.toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  // Card width class
  const widthClasses = {
    compact: 'w-full md:w-80 lg:w-88',
    normal: 'w-full md:w-96 lg:w-[400px]',
    wide: 'w-full md:w-[440px] lg:w-[470px]',
  }[settings.overlayWidth];

  const positionClasses =
    settings.overlayPosition === 'left'
      ? 'left-4 md:left-8 lg:left-12'
      : 'right-4 md:right-8 lg:right-12';

  const bgOpacity = (settings.overlayOpacity ?? 80) / 100;

  return (
    <aside
      className={`absolute bottom-4 md:bottom-8 lg:bottom-12 top-auto md:top-8 lg:top-12 z-20 ${positionClasses} ${widthClasses} max-h-[85vh] md:max-h-[calc(100vh-6rem)] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 pointer-events-auto border border-white/15`}
      style={{
        backgroundColor: `rgba(15, 23, 42, ${bgOpacity})`,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
      }}
    >
      {/* Clean Minimalist Header (No lines, no status pill, no 'Google Calendar') */}
      <div className="p-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <CalendarDays className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold tracking-tight">Agenda</h3>
        </div>
      </div>

      {/* Events Body (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 pt-1 space-y-4 scrollbar-thin scrollbar-thumb-white/20">
        {/* Today Section */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Vandaag
          </div>

          {todayEvents.length === 0 ? (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
              <p className="text-sm font-medium text-slate-300">Geen afspraken gepland voor vandaag</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayEvents.map((ev, index) => {
                const dotColor =
                  ev.color ||
                  (index % 3 === 0
                    ? '#10b981'
                    : index % 3 === 1
                    ? '#f43f5e'
                    : '#3b82f6');

                return (
                  <div
                    key={ev.id}
                    className="group relative bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-2xl p-3.5 transition-all duration-200"
                  >
                    <div className="flex items-start gap-3">
                      {/* Status / Category Dot */}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 shadow-sm"
                        style={{ backgroundColor: dotColor }}
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-sm font-semibold text-white leading-snug line-clamp-1">
                            {ev.summary}
                          </h4>
                          <span className="text-xs text-slate-300 font-medium whitespace-nowrap flex-shrink-0">
                            {formatEventTime(ev)}
                          </span>
                        </div>

                        {ev.location && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 truncate">
                            {ev.location.includes('meet.google.com') ? (
                              <Video className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                            )}
                            <span className="truncate">{ev.location}</span>
                          </div>
                        )}

                        {ev.calendarName && (
                          <p className="text-[10px] text-slate-400 mt-1 truncate">
                            {ev.calendarName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Section */}
        {upcomingEvents.length > 0 && (
          <div className="pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Binnenkort
            </div>

            <div className="space-y-2">
              {upcomingEvents.slice(0, 5).map((ev, index) => {
                const dayHeader = formatEventDayHeader(ev.start.dateTime || ev.start.date || '');
                const dotColor =
                  ev.color ||
                  (index % 2 === 0 ? '#3b82f6' : '#a855f7');

                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl px-3.5 py-2.5 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="font-medium text-slate-200 truncate">
                        {ev.summary}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 flex-shrink-0 font-medium">
                      <span>{dayHeader}</span>
                      {!ev.isAllDay && ev.start.dateTime && (
                        <span className="text-slate-500">
                          {new Date(ev.start.dateTime).toLocaleTimeString('nl-NL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
