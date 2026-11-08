import React from 'react';
import { PhotoItem } from '../../types';
import { Image as ImageIcon, Calendar } from 'lucide-react';

interface PhotoInfoBadgeProps {
  photo: PhotoItem;
  currentIndex: number;
  totalPhotos: number;
  visible?: boolean;
}

export const PhotoInfoBadge: React.FC<PhotoInfoBadgeProps> = ({
  photo,
  currentIndex,
  totalPhotos,
  visible = true,
}) => {
  if (!visible) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('nl-NL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const formattedDate = formatDate(photo.createTime);

  return (
    <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 z-20 pointer-events-none select-none max-w-md">
      <div className="bg-black/40 backdrop-blur-xl border border-white/15 px-4 py-3 rounded-2xl shadow-xl text-white transition-opacity duration-500">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-400/30">
            <ImageIcon className="w-3 h-3" />
            {photo.albumTitle || 'Album'}
          </span>

          <span className="text-[11px] text-slate-300 font-mono">
            {currentIndex + 1} / {totalPhotos}
          </span>
        </div>

        <h3 className="text-base md:text-lg font-semibold tracking-tight text-white drop-shadow-md truncate">
          {photo.title || 'Foto'}
        </h3>

        {formattedDate && (
          <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{formattedDate}</span>
          </div>
        )}
      </div>
    </div>
  );
};
