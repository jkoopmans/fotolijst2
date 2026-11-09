import React, { useState, useRef } from 'react';
import { GoogleAlbum, PhotoItem, FrameSettings } from '../../types';
import { openGooglePhotoPicker } from '../../services/googlePhotos';
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
  Upload,
  Info,
  Check,
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
  photosError?: string | null;
  accessToken?: string | null;
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
  photosError,
  accessToken,
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customAlbum, setCustomAlbum] = useState('Eigen Foto\'s');
  const [activeTab, setActiveTab] = useState<'picker' | 'preview' | 'custom'>('picker');
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Google Photo Picker
  const handleOpenGooglePicker = () => {
    if (!accessToken) {
      onConnectGoogle();
      return;
    }
    setIsOpeningPicker(true);
    openGooglePhotoPicker({
      accessToken,
      developerKey: settings.googleApiKey,
      onPhotosPicked: (pickedPhotos) => {
        setIsOpeningPicker(false);
        onUpdateSettings((prev) => ({
          ...prev,
          customPhotos: [...pickedPhotos, ...prev.customPhotos],
        }));
      },
      onError: (err) => {
        setIsOpeningPicker(false);
        console.warn('Google Picker notice:', err);
      },
    });
  };

  // Local File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          const newPhoto: PhotoItem = {
            id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            url: base64Url,
            title: file.name.replace(/\.[^/.]+$/, ''),
            albumTitle: 'Geüpload',
            createTime: new Date(file.lastModified).toISOString(),
            source: 'custom',
          };

          onUpdateSettings((prev) => ({
            ...prev,
            customPhotos: [newPhoto, ...prev.customPhotos],
          }));
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
      <div className="flex border-b border-neutral-800 pb-2 gap-4 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('picker')}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'picker'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Google Drive & Foto Selectie</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'preview'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Actieve Fotolijst op TV ({activePhotos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-2 pb-2 px-1 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeTab === 'custom'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Foto URLs Toevoegen ({settings.customPhotos.length})</span>
        </button>
      </div>

      {/* Tab: Google Drive & Photo Selection */}
      {activeTab === 'picker' && (
        <div className="space-y-6">
          {/* Primary Action: Direct Upload (Fastest, zero API friction) */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                handleFileUpload({ target: { files: e.dataTransfer.files } } as any);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-950/20 scale-[1.01]'
                : 'border-neutral-700 bg-neutral-900/40 hover:border-emerald-500/60 hover:bg-neutral-900/70 shadow-lg'
            }`}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3">
              <Upload className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-1">
              Foto's direct toevoegen (Sleep hierheen of klik om te kiezen)
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
              Selecteer je mooiste foto's vanaf je computer of smartphone. Ze worden direct in hoge resolutie bewaard en vertoond op je tv-scherm.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow">
              <Upload className="w-4 h-4" />
              <span>Kies Foto Bestanden</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Google Drive Integration Card */}
          <div className="bg-gradient-to-r from-blue-950/40 via-neutral-900 to-indigo-950/40 border border-blue-500/30 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Selecteer Afbeeldingen uit Google Drive
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                    Kies afbeeldingen en foto's rechtstreeks uit je Google Drive mappen via het officiële selectievenster.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenGooglePicker}
                  disabled={isOpeningPicker}
                  className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{isOpeningPicker ? 'Google Drive openen...' : 'Kies Afbeeldingen uit Google Drive'}</span>
                </button>
              </div>
            </div>

            {/* Explanation of Google Drive API requirement */}
            <div className="bg-neutral-950/60 border border-white/5 rounded-2xl p-4 text-xs text-slate-300 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-semibold text-white">
                  Instelling voor Google Drive in Google Cloud:
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Zorg ervoor dat in je Google Cloud Project (<strong>114756915443</strong>) onder <em>APIs &amp; Services &gt; Library</em> zowel de <strong>Google Drive API</strong> als de <strong>Google Picker API</strong> zijn ingeschakeld.
                </p>
              </div>
            </div>
          </div>

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

          {/* Google Photos Albums Section (if any app-created albums exist) */}
          {albums.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Gekoppelde Google Albums</h3>
                  <p className="text-xs text-slate-400">Selecteer welke albums rouleren</p>
                </div>

                <button
                  type="button"
                  onClick={onRefreshAlbums}
                  disabled={isLoadingAlbums}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-200 text-xs font-medium border border-neutral-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAlbums ? 'animate-spin text-blue-400' : ''}`} />
                  <span>Vernieuwen</span>
                </button>
              </div>

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
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold tracking-wide transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Toevoegen aan Fotolijst</span>
            </button>
          </form>

          {/* List of Custom Photos */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-300">
              Geselecteerde / Aangepaste Foto's ({settings.customPhotos.length})
            </h4>

            {settings.customPhotos.length === 0 ? (
              <p className="text-xs text-slate-500">Nog geen foto's geselecteerd via Google Picker of handmatig toegevoegd.</p>
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
                      <p className="text-[10px] text-slate-400 truncate">{photo.albumTitle || photo.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomPhoto(photo.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
