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

        {/* Bottom-Left Ambient Clock & Date in Preview (Secondes weg, links onderin) */}
        {settings.showClock && (
          <div className="absolute bottom-2.5 left-3 z-10 select-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            <div className="text-xl font-light font-mono leading-none tracking-tight">{formattedTime}</div>
            <div className="text-[9px] font-medium text-slate-200 capitalize mt-0.5">{formattedDate}</div>
          </div>
        )}

        {/* Clean Agenda Overlay in Preview */}
        {settings.showCalendarOverlay && (
          <div
            className={`absolute top-2 bottom-2 ${
              settings.overlayPosition === 'left' ? 'left-2' : 'right-2'
            } w-[42%] max-w-[210px] rounded-xl p-2.5 flex flex-col border border-white/20 text-white z-10`}
            style={{
              backgroundColor: `rgba(15, 23, 42, ${(settings.overlayOpacity ?? 80) / 100})`,
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Clean Header */}
            <div className="text-[10px] font-bold text-white mb-1.5 flex items-center gap-1">
              <span>Agenda</span>
            </div>

            {/* Event list */}
            <div className="space-y-1 overflow-hidden flex-1">
              {todayEvents.slice(0, 3).map((ev, i) => (
                <div
                  key={ev.id}
                  className="bg-white/10 p-1.5 rounded-lg text-[9px] border border-white/5 flex items-start gap-1.5"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: ev.color || (i === 0 ? '#10b981' : '#3b82f6') }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate text-white leading-tight">{ev.summary}</p>
                    <p className="text-[8px] text-slate-300">
                      {ev.isAllDay ? 'Hele dag' : '10:00 - 11:30'}
                    </p>
                  </div>
                </div>
              ))}
              {todayEvents.length === 0 && (
                <div className="text-[8px] text-slate-400 italic">Geen afspraken gepland</div>
              )}
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
