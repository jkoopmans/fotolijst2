import React, { useState, useEffect } from 'react';
import { CalendarEvent, WeatherData, FrameSettings } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sparkles,
  RefreshCw,
  Video,
} from 'lucide-react';

interface CalendarOverlayProps {
  events: CalendarEvent[];
  weather?: WeatherData | null;
  settings: FrameSettings;
  isSyncing?: boolean;
  onRefresh?: () => void;
}

export const CalendarOverlay: React.FC<CalendarOverlayProps> = ({
  events,
  weather,
  settings,
  isSyncing = false,
  onRefresh,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time (24h or 12h)
  const formattedTime = currentTime.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: settings.clockFormat === '12h',
  });

  const formattedSeconds = currentTime.toLocaleTimeString('nl-NL', {
    second: '2-digit',
  });

  // Format Dutch date: e.g. "Zondag 8 november"
  const formattedDate = currentTime.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Separate events into Today vs Upcoming
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

  // Helper for event time formatting
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

  // Weather icon selector
  const renderWeatherIcon = () => {
    if (!weather) return <Sun className="w-6 h-6 text-amber-400" />;
    const code = weather.conditionCode;
    if (code === 0 || code === 1) {
      return weather.isDay ? (
        <Sun className="w-6 h-6 text-amber-400 animate-spin-slow" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-amber-200/90 shadow-sm" />
      );
    }
    if (code >= 2 && code <= 48) {
      return <Cloud className="w-6 h-6 text-slate-300" />;
    }
    if (code >= 51 && code <= 65) {
      return <CloudRain className="w-6 h-6 text-blue-400" />;
    }
    if (code >= 71 && code <= 86) {
      return <CloudSnow className="w-6 h-6 text-cyan-200" />;
    }
    if (code >= 95) {
      return <CloudLightning className="w-6 h-6 text-yellow-400" />;
    }
    return <Cloud className="w-6 h-6 text-slate-300" />;
  };

  // Card width class
  const widthClasses = {
    compact: 'w-full md:w-80 lg:w-88',
    normal: 'w-full md:w-96 lg:w-[410px]',
    wide: 'w-full md:w-[440px] lg:w-[480px]',
  }[settings.overlayWidth];

  const positionClasses =
    settings.overlayPosition === 'left'
      ? 'left-4 md:left-8 lg:left-12'
      : 'right-4 md:right-8 lg:right-12';

  // Opacity styles
  const bgOpacity = (settings.overlayOpacity ?? 80) / 100;

  return (
    <aside
      className={`absolute bottom-4 md:bottom-8 lg:bottom-12 top-auto md:top-8 lg:top-12 z-20 ${positionClasses} ${widthClasses} max-h-[85vh] md:max-h-[calc(100vh-6rem)] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 pointer-events-auto border border-white/20`}
      style={{
        backgroundColor: `rgba(15, 23, 42, ${bgOpacity})`,
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
      }}
    >
      {/* Top Header: Clock, Date, Weather */}
      <div className="p-6 pb-4 border-b border-white/10 flex-shrink-0 bg-white/5">
        <div className="flex items-start justify-between">
          <div>
            {/* Big Clock */}
            {settings.showClock && (
              <div className="flex items-baseline gap-1.5 text-white">
                <span className="text-4xl md:text-5xl lg:text-6xl font-extralight tracking-tight font-mono">
                  {formattedTime}
                </span>
                <span className="text-xs md:text-sm font-light text-slate-400 font-mono">
                  :{formattedSeconds}
                </span>
              </div>
            )}
            {/* Dutch Date */}
            <p className="text-sm md:text-base font-medium text-slate-200 capitalize mt-1 tracking-wide">
              {formattedDate}
            </p>
          </div>

          {/* Weather Widget */}
          {settings.showWeather && weather && (
            <div className="flex flex-col items-end text-right bg-white/10 hover:bg-white/15 px-3 py-2 rounded-2xl border border-white/10 transition-colors">
              <div className="flex items-center gap-2">
                {renderWeatherIcon()}
                <span className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {weather.temperature}°C
                </span>
              </div>
              <span className="text-xs text-slate-300 font-medium mt-0.5 truncate max-w-[120px]">
                {weather.city || 'Weer'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize">
                {weather.conditionText}
              </span>
            </div>
          )}
        </div>

        {/* Sync & Calendar Status Pill */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Google Calendar
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              {todayEvents.length} {todayEvents.length === 1 ? 'afspraak' : 'afspraken'} vandaag
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Vernieuw agenda"
                aria-label="Vernieuw agenda"
                className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events Body (Scrollable if many events) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/20">
        {/* Today Section */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vandaag</span>
          </div>

          {todayEvents.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-sm font-medium text-slate-300">Geen afspraken gepland voor vandaag</p>
              <p className="text-xs text-slate-400 mt-1">Geniet van een ontspannen dag!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="group relative bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/25 rounded-2xl p-3.5 transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    {/* Time badge */}
                    <div className="flex-shrink-0 flex items-center justify-center bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-medium px-2.5 py-1 rounded-xl">
                      <Clock className="w-3 h-3 mr-1 opacity-70" />
                      {formatEventTime(ev)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        {ev.summary}
                      </h4>

                      {ev.location && (
                        <div className="flex items-center gap-1 text-xs text-slate-300 mt-1 truncate">
                          {ev.location.includes('meet.google.com') ? (
                            <Video className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <MapPin className="w-3 h-3 text-rose-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}

                      {ev.calendarName && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: ev.color || '#3b82f6' }}
                          />
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                            {ev.calendarName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Section */}
        {upcomingEvents.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              <span>Binnenkort</span>
              <span className="text-[10px] text-slate-500">Volgende 7 dagen</span>
            </div>

            <div className="space-y-2">
              {upcomingEvents.slice(0, 5).map((ev) => {
                const dayHeader = formatEventDayHeader(ev.start.dateTime || ev.start.date || '');
                return (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl px-3.5 py-2.5 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ev.color || '#3b82f6' }}
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

      {/* Footer subtle brand indicator */}
      <div className="px-6 py-2.5 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span>Google Calendar Sync</span>
        <span className="text-[10px] text-slate-500 font-mono">
          Bijgewerkt om {currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </aside>
  );
};
