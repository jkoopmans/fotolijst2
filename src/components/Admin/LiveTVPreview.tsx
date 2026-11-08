import React from 'react';
import { PhotoItem, CalendarEvent, WeatherData, FrameSettings } from '../../types';
import { Calendar, Clock, Tv, ExternalLink, Sparkles } from 'lucide-react';

interface LiveTVPreviewProps {
  photos: PhotoItem[];
  events: CalendarEvent[];
  weather?: WeatherData | null;
  settings: FrameSettings;
  onLaunchTV: () => void;
}

export const LiveTVPreview: React.FC<LiveTVPreviewProps> = ({
  photos,
  events,
  weather,
  settings,
  onLaunchTV,
}) => {
  const currentPhoto = photos[0];
  const currentTime = new Date();

  const formattedTime = currentTime.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: settings.clockFormat === '12h',
  });

  const formattedDate = currentTime.toLocaleDateString('nl-NL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const todayStr = currentTime.toISOString().split('T')[0];
  const todayEvents = events.filter((ev) => {
    const evDateStr = (ev.start.dateTime || ev.start.date || '').split('T')[0];
    return evDateStr === todayStr;
  });

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-semibold text-white">Live TV Voorvertoning</h3>
        </div>

        <button
          type="button"
          onClick={onLaunchTV}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition-all shadow-md active:scale-95"
        >
          <span>Open Volledig Scherm</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 16:9 TV Mockup Frame */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border-4 border-neutral-800 shadow-2xl select-none">
        {/* Background photo & blur */}
        {currentPhoto ? (
          <>
            {settings.fitMode === 'blur-backdrop' && (
              <div
                className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-50 scale-110"
                style={{ backgroundImage: `url(${currentPhoto.url})` }}
              />
            )}
            <img
              src={currentPhoto.url}
              alt="Preview"
              className={`w-full h-full relative z-0 ${
                settings.fitMode === 'cover' ? 'object-cover' : 'object-contain'
              }`}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
            Geen foto's geladen
          </div>
        )}

        {/* Calendar Overlay in Preview */}
        {settings.showCalendarOverlay && (
          <div
            className={`absolute top-2 bottom-2 ${
              settings.overlayPosition === 'left' ? 'left-2' : 'right-2'
            } w-[42%] max-w-[210px] rounded-xl p-2.5 flex flex-col justify-between border border-white/20 text-white z-10`}
            style={{
              backgroundColor: `rgba(15, 23, 42, ${(settings.overlayOpacity ?? 80) / 100})`,
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Clock & Date Header */}
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold font-mono tracking-tight leading-none">
                  {formattedTime}
                </span>
              </div>
              <p className="text-[9px] text-slate-300 capitalize mt-0.5">{formattedDate}</p>
            </div>

            {/* Event list mock */}
            <div className="my-1.5 space-y-1 overflow-hidden">
              <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-blue-400">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Vandaag ({todayEvents.length})</span>
              </div>
              {todayEvents.slice(0, 2).map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white/10 p-1.5 rounded-lg text-[9px] truncate border border-white/5"
                >
                  <p className="font-semibold truncate text-white">{ev.summary}</p>
                  <p className="text-[8px] text-slate-400">
                    {ev.isAllDay ? 'Hele dag' : '10:00 - 11:30'}
                  </p>
                </div>
              ))}
              {todayEvents.length === 0 && (
                <div className="text-[8px] text-slate-400 italic">Geen afspraken vandaag</div>
              )}
            </div>

            {/* Google Calendar sync pill */}
            <div className="text-[7px] text-slate-400 flex items-center justify-between border-t border-white/10 pt-1">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Google Calendar
              </span>
              <span>Live</span>
            </div>
          </div>
        )}


      </div>

      <p className="text-xs text-slate-400 text-center">
        De lay-out schaalt automatisch en vloeiend mee voor alle TV's, tablets en breedbeeldmonitoren.
      </p>
    </div>
  );
};
