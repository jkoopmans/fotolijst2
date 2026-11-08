import React, { useState } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Settings,
  Calendar,
  QrCode,
  Tv,
} from 'lucide-react';

interface TVControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  showCalendar: boolean;
  onToggleCalendar: () => void;
  onOpenAdmin: () => void;
  onShowQR: () => void;
  slideIntervalSeconds: number;
  progressPercent: number;
  visible: boolean;
}

export const TVControls: React.FC<TVControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  isFullscreen,
  onToggleFullscreen,
  showCalendar,
  onToggleCalendar,
  onOpenAdmin,
  onShowQR,
  progressPercent,
  visible,
}) => {
  return (
    <>
      {/* Subtle Progress Bar along top or bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30 pointer-events-none overflow-hidden">
        <div
          className="h-full bg-blue-500/80 transition-all duration-300 ease-linear shadow-[0_0_8px_rgba(59,130,246,0.6)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Floating Control Bar (reveals on mouse movement or touch) */}
      <div
        className={`absolute top-6 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ${
          visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-2xl border border-white/20 p-2 rounded-2xl shadow-2xl text-white">
          <button
            type="button"
            onClick={onPrev}
            title="Vorige foto (Pijl links)"
            aria-label="Vorige foto"
            className="p-2.5 rounded-xl hover:bg-white/15 active:scale-95 transition-all text-slate-200 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pauzeren (Spatiebalk)' : 'Afspelen (Spatiebalk)'}
            aria-label={isPlaying ? 'Pauzeren' : 'Afspelen'}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white shadow-lg"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>

          <button
            type="button"
            onClick={onNext}
            title="Volgende foto (Pijl rechts)"
            aria-label="Volgende foto"
            className="p-2.5 rounded-xl hover:bg-white/15 active:scale-95 transition-all text-slate-200 hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-6 bg-white/15 mx-1" />

          <button
            type="button"
            onClick={onToggleCalendar}
            title="Toon/verberg kalender (C)"
            aria-label="Kalender weergave"
            className={`p-2.5 rounded-xl transition-all ${
              showCalendar
                ? 'bg-white/20 text-blue-300 border border-blue-400/30'
                : 'hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            title="Volledig scherm (F)"
            aria-label="Volledig scherm"
            className="p-2.5 rounded-xl hover:bg-white/15 active:scale-95 transition-all text-slate-200 hover:text-white"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onShowQR}
            title="Toon TV URL & QR Code"
            aria-label="QR Code & TV URL"
            className="p-2.5 rounded-xl hover:bg-white/15 active:scale-95 transition-all text-slate-200 hover:text-white"
          >
            <QrCode className="w-5 h-5" />
          </button>

          <div className="w-[1px] h-6 bg-white/15 mx-1" />

          <button
            type="button"
            onClick={onOpenAdmin}
            title="Beheer & Instellingen"
            aria-label="Beheer en instellingen"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-semibold tracking-wide border border-white/10 transition-all"
          >
            <Settings className="w-4 h-4" />
            <span>Beheer</span>
          </button>
        </div>
      </div>
    </>
  );
};
