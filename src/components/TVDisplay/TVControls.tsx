import React from 'react';

interface TVControlsProps {
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  showCalendar?: boolean;
  onToggleCalendar?: () => void;
  onOpenAdmin?: () => void;
  onShowQR?: () => void;
  slideIntervalSeconds?: number;
  progressPercent: number;
  visible?: boolean;
}

export const TVControls: React.FC<TVControlsProps> = ({ progressPercent }) => {
  // Floating controls removed from TV screen per user request.
  // The TV view is kept 100% clean and ambient without intrusive buttons.
  // The Admin panel is accessed via its dedicated URL (/admin).
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30 pointer-events-none overflow-hidden">
      <div
        className="h-full bg-blue-500/80 transition-all duration-300 ease-linear shadow-[0_0_8px_rgba(59,130,246,0.6)]"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
};
