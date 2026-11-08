import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhotoItem, CalendarEvent, WeatherData, FrameSettings } from '../../types';
import { CalendarOverlay } from './CalendarOverlay';
import { PhotoInfoBadge } from './PhotoInfoBadge';
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
  const tvUrl = `${origin}?mode=tv`;
  const adminUrl = `${origin}?mode=admin`;

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
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-neutral-950">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Geen foto's geselecteerd</h2>
          <p className="text-slate-400 max-w-md text-sm mb-6">
            Log in op de admin-omgeving om je Google Photos albums te kiezen of bewaar samengestelde collecties.
          </p>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg"
          >
            Naar Admin Omgeving
          </button>
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

      {/* Bottom-Left Photo Information Badge */}
      {settings.showPhotoInfo && currentPhoto && (
        <PhotoInfoBadge
          photo={currentPhoto}
          currentIndex={currentIndex}
          totalPhotos={totalPhotos}
          visible={!controlsVisible || true}
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
