import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhotoItem, CalendarEvent, WeatherData, FrameSettings } from '../../types';
import { CalendarOverlay } from './CalendarOverlay';
import { TVControls } from './TVControls';
import { QRCodeModal } from './QRCodeModal';

interface TVFrameProps {
  photos: PhotoItem[];
  events: CalendarEvent[];
  weather?: WeatherData | null;
  settings: FrameSettings;
  onOpenAdmin: () => void;
  isSyncingCalendar?: boolean;
  onRefreshCalendar?: () => void;
}

export const TVFrame: React.FC<TVFrameProps> = ({
  photos,
  events,
  weather,
  settings,
  onOpenAdmin,
  isSyncingCalendar,
  onRefreshCalendar,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showCalendar, setShowCalendar] = useState<boolean>(settings.showCalendarOverlay);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Format time without seconds: HH:MM
  const formattedTime = currentTime.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: settings.clockFormat === '12h',
  });

  // Format Dutch date: e.g. "maandag 9 november"
  const formattedDate = currentTime.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalPhotos = photos.length;
  const currentPhoto = totalPhotos > 0 ? photos[currentIndex % totalPhotos] : null;

  // Next photo handler
  const handleNext = useCallback(() => {
    if (totalPhotos === 0) return;
    setCurrentIndex((prev) => (prev + 1) % totalPhotos);
    setProgressPercent(0);
  }, [totalPhotos]);

  // Previous photo handler
  const handlePrev = useCallback(() => {
    if (totalPhotos === 0) return;
    setCurrentIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
    setProgressPercent(0);
  }, [totalPhotos]);

  // Slideshow auto-advance timer & progress bar
  useEffect(() => {
    if (!isPlaying || totalPhotos <= 1) {
      setProgressPercent(0);
      return;
    }

    const intervalMs = Math.max(settings.slideInterval, 4) * 1000;
    const stepMs = 100;
    let elapsed = 0;

    progressIntervalRef.current = setInterval(() => {
      elapsed += stepMs;
      setProgressPercent(Math.min((elapsed / intervalMs) * 100, 100));
    }, stepMs);

    timerRef.current = setTimeout(() => {
      handleNext();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, isPlaying, settings.slideInterval, totalPhotos, handleNext]);

  // Mouse activity controls reveal & auto-hide
  const handleUserActivity = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleUserActivity();
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'c') {
        setShowCalendar((s) => !s);
      } else if (e.key.toLowerCase() === 'a') {
        onOpenAdmin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleUserActivity, onOpenAdmin]);

  // Fullscreen API toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Compute TV & Admin direct URLs
  const origin = window.location.origin;
  const basePath = window.location.pathname.replace(/\/admin\/?.*$/, '').replace(/\/$/, '');
  const tvUrl = `${origin}${basePath}/`;
  const adminUrl = `${origin}${basePath}/admin`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans"
    >
      {/* Background & Main Photo Renderer */}
      {currentPhoto ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {/* Blurred Backdrop for imperfect aspect ratios (eliminates harsh black bars) */}
          {settings.fitMode === 'blur-backdrop' && (
            <div
              key={`blur-${currentPhoto.id}-${currentIndex}`}
              className="absolute -inset-10 w-[calc(100%+5rem)] h-[calc(100%+5rem)] bg-cover bg-center filter blur-3xl opacity-60 scale-110 pointer-events-none transition-all duration-1000"
              style={{
                backgroundImage: `url(${currentPhoto.url})`,
              }}
            />
          )}

          {/* Vignette & Ambient Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none z-10" />

          {/* Foreground Photo with Transition Effect */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <img
              key={`photo-${currentPhoto.id}-${currentIndex}`}
              src={currentPhoto.url}
              alt={currentPhoto.title || 'Foto'}
              className={`w-full h-full transition-all duration-1000 ease-out ${
                settings.fitMode === 'cover'
                  ? 'object-cover'
                  : settings.fitMode === 'contain'
                  ? 'object-contain'
                  : 'object-contain'
              } ${
                settings.transitionStyle === 'kenburns'
                  ? 'animate-ken-burns'
                  : settings.transitionStyle === 'zoom'
                  ? 'animate-zoom-in'
                  : 'animate-fade-in'
              }`}
            />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-neutral-950 to-black flex items-center justify-center">
          <div className="text-center p-6 max-w-md text-slate-400 text-xs">
            <p className="opacity-60 tracking-wide">
              Koppel je Google Drive foto's in het beheerpaneel op <span className="text-slate-300 font-mono">/admin</span>
            </p>
          </div>
        </div>
      )}

      {/* Bottom-Left Ambient Clock & Date (secondes weg, links onderin, geen streep) */}
      {settings.showClock && (
        <div className="absolute bottom-8 left-8 md:bottom-12 md:left-12 z-20 pointer-events-none select-none">
          <div className="flex flex-col">
            <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-light tracking-tight text-white font-mono leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
              {formattedTime}
            </div>
            <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-slate-200 capitalize mt-2.5 tracking-wide drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
              {formattedDate}
            </div>
          </div>
        </div>
      )}

      {/* Right-Side Google Calendar Overlay */}
      {showCalendar && (
        <CalendarOverlay
          events={events}
          weather={weather}
          settings={settings}
          isSyncing={isSyncingCalendar}
          onRefresh={onRefreshCalendar}
        />
      )}



      {/* On-Screen TV Navigation & Controls */}
      <TVControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onPrev={handlePrev}
        onNext={handleNext}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        showCalendar={showCalendar}
        onToggleCalendar={() => setShowCalendar((s) => !s)}
        onOpenAdmin={onOpenAdmin}
        onShowQR={() => setShowQRModal(true)}
        slideIntervalSeconds={settings.slideInterval}
        progressPercent={progressPercent}
        visible={controlsVisible}
      />

      {/* TV URL & QR Code Modal */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        tvUrl={tvUrl}
        adminUrl={adminUrl}
      />
    </div>
  );
};
