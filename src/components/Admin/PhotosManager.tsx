import React, { useState } from 'react';
import { GoogleAlbum, PhotoItem, FrameSettings } from '../../types';
import {
  Image as ImageIcon,
  FolderPlus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Plus,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';

interface PhotosManagerProps {
  albums: GoogleAlbum[];
  selectedAlbumIds: string[];
  onToggleAlbum: (albumId: string) => void;
  onRefreshAlbums: () => void;
  isLoadingAlbums: boolean;
  activePhotos: PhotoItem[];
  settings: FrameSettings;
  onUpdateSettings: (updater: (prev: FrameSettings) => FrameSettings) => void;
  hasGoogleToken: boolean;
  onConnectGoogle: () => void;
}

export const PhotosManager: React.FC<PhotosManagerProps> = ({
  albums,
  selectedAlbumIds,
  onToggleAlbum,
  onRefreshAlbums,
  isLoadingAlbums,
  activePhotos,
  settings,
  onUpdateSettings,
  hasGoogleToken,
  onConnectGoogle,
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customAlbum, setCustomAlbum] = useState('Eigen Foto\'s');
  const [activeTab, setActiveTab] = useState<'albums' | 'custom' | 'preview'>('albums');

  const handleAddCustomPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    const newPhoto: PhotoItem = {
      id: `custom-${Date.now()}`,
      url: customUrl.trim(),
      title: customTitle.trim() || 'Aangepaste foto',
      albumTitle: customAlbum.trim() || 'Eigen collectie',
      createTime: new Date().toISOString(),
      source: 'custom',
    };

    onUpdateSettings((prev) => ({
      ...prev,
      customPhotos: [newPhoto, ...prev.customPhotos],
    }));

    setCustomUrl('');
    setCustomTitle('');
  };

  const handleRemoveCustomPhoto = (id: string) => {
    onUpdateSettings((prev) => ({
      ...prev,
      customPhotos: prev.customPhotos.filter((p) => p.id !== id),
    }));
  };

  const handleToggleCurated = () => {
    onUpdateSettings((prev) => ({
      ...prev,
      curatedAlbumEnabled: !prev.curatedAlbumEnabled,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex border-b border-neutral-800 pb-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('albums')}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'albums'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Google Photos Albums ({selectedAlbumIds.length} geselecteerd)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'preview'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Actieve Fotolijst ({activePhotos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'custom'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Eigen Foto URLs ({settings.customPhotos.length})</span>
        </button>
      </div>

      {/* Tab: Google Photos Albums */}
      {activeTab === 'albums' && (
        <div className="space-y-6">
          {/* Curated fallback toggle card */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white">Curated Natuur & Architectuur Collectie</h4>
                <p className="text-xs text-slate-400">
                  Toon hoge-resolutie foto's van Nederlandse landschappen, steden en minimalistische interieurs als basis.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.curatedAlbumEnabled}
                onChange={handleToggleCurated}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Albums header & refresh button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Jouw Google Photos Albums</h3>
              <p className="text-xs text-slate-400">
                Kies welke albums gerouleerd worden op je TV fotolijst
              </p>
            </div>

            <button
              type="button"
              onClick={onRefreshAlbums}
              disabled={isLoadingAlbums}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-xs font-medium border border-neutral-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAlbums ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isLoadingAlbums ? 'Albums laden...' : 'Vernieuwen'}</span>
            </button>
          </div>

          {!hasGoogleToken ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
              <p className="text-slate-300 font-medium mb-3">
                Log in met je Google Account om toegang te krijgen tot jouw Google Photos albums.
              </p>
              <button
                type="button"
                onClick={onConnectGoogle}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
              >
                Inloggen met Google
              </button>
            </div>
          ) : albums.length === 0 ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
              <p className="text-slate-300 font-medium">
                {isLoadingAlbums ? 'Google Photos albums ophalen...' : 'Geen albums gevonden in Google Photos.'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Zorg dat je albums hebt aangemaakt op photos.google.com of voeg foto URLs toe via het tabblad "Eigen Foto URLs".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {albums.map((album) => {
                const isSelected = selectedAlbumIds.includes(album.id);
                return (
                  <div
                    key={album.id}
                    onClick={() => onToggleAlbum(album.id)}
                    className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 flex flex-col ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/20 shadow-lg ring-2 ring-blue-500/30'
                        : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900'
                    }`}
                  >
                    {/* Album Cover */}
                    <div className="aspect-video bg-neutral-800 relative overflow-hidden">
                      {album.coverPhotoBaseUrl ? (
                        <img
                          src={album.coverPhotoBaseUrl}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}

                      {/* Selection checkbox indicator */}
                      <div className="absolute top-2.5 right-2.5">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-black/60 text-transparent border border-white/30 backdrop-blur-sm'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                    </div>

                    {/* Album Info */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <h4 className="text-sm font-semibold text-white tracking-tight line-clamp-1">
                        {album.title}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                        <span>{album.mediaItemsCount} items</span>
                        {album.productUrl && (
                          <a
                            href={album.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Open in Google Photos"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Active Slideshow Preview */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-white">
              Alle foto's die momenteel op de TV rouleren ({activePhotos.length})
            </h4>
            <span className="text-xs text-slate-400">
              Interval: elke {settings.slideInterval} seconden
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-neutral-700">
            {activePhotos.map((photo, i) => (
              <div
                key={`${photo.id}-${i}`}
                className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 group"
              >
                <img
                  src={photo.url}
                  alt={photo.title || 'Foto'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-[11px] text-white">
                  <span className="font-medium truncate">{photo.title}</span>
                  <span className="text-[10px] text-slate-400 truncate">{photo.albumTitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Custom Photo URLs */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddCustomPhoto}
            className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4"
          >
            <h4 className="text-base font-semibold text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-blue-400" />
              <span>Voeg een foto URL toe</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Afbeelding URL (JPG / PNG / WebP)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Titel / Omschrijving
                </label>
                <input
                  type="text"
                  placeholder="bijv. Vakantiehuisje Italië"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Toevoegen aan Fotolijst</span>
            </button>
          </form>

          {/* List of Custom Photos */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300">
              Aangepaste Foto's ({settings.customPhotos.length})
            </h4>

            {settings.customPhotos.length === 0 ? (
              <p className="text-xs text-slate-500">Nog geen aangepaste foto URLs toegevoegd.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {settings.customPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl p-2.5"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-16 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{photo.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{photo.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomPhoto(photo.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
