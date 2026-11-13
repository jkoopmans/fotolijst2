import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Tv,
  Copy,
  Check,
  Download,
  HelpCircle,
  Monitor,
  Cast,
  Smartphone,
  Sparkles,
  CalendarDays,
  Image as ImageIcon,
  CloudUpload,
  CloudDownload,
  Trash2,
  RefreshCw,
  FileJson,
  AlertCircle,
} from 'lucide-react';
import { PhotoItem, CalendarEvent, FrameSettings } from '../../types';
import { generateSyncHash, createTVContentJSON } from '../../services/storage';
import {
  DEFAULT_BACKUP_COLLECTION,
  DEFAULT_BACKUP_ID,
  uploadCloudBackup,
  fetchCloudBackup,
  listCloudBackups,
  deleteCloudBackup,
  CloudBackupSummary,
} from '../../services/cloudBackup';

interface TVConnectionCardProps {
  onLaunchTV: () => void;
  photos?: PhotoItem[];
  events?: CalendarEvent[];
  settings?: FrameSettings;
  onRestoreBackup?: (data: {
    settings?: Partial<FrameSettings>;
    photos?: PhotoItem[];
    events?: CalendarEvent[];
  }) => void;
}

export const TVConnectionCard: React.FC<TVConnectionCardProps> = ({
  onLaunchTV,
  photos = [],
  events = [],
  settings,
  onRestoreBackup,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showTips, setShowTips] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Cloud Backup (Firestore) state
  const [collectionName, setCollectionName] = useState<string>(() => {
    return localStorage.getItem('ambient_tv_cloud_collection') || DEFAULT_BACKUP_COLLECTION;
  });
  const [backupId, setBackupId] = useState<string>(() => {
    return localStorage.getItem('ambient_tv_cloud_backup_id') || DEFAULT_BACKUP_ID;
  });
  const [backupLabel, setBackupLabel] = useState<string>('Woonkamer TV');
  const [isUploadingCloud, setIsUploadingCloud] = useState(false);
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [cloudList, setCloudList] = useState<CloudBackupSummary[]>([]);
  const [cloudNotice, setCloudNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const basePath = window.location.pathname.replace(/\/admin\/?.*$/, '').replace(/\/$/, '');
  const origin = window.location.origin;
  const bareTvUrl = `${origin}${basePath}/`;

  // Compute sync hash containing actual Google Drive photos and calendar items
  const syncHash = settings ? generateSyncHash(photos, events, settings) : '';
  const tvSyncUrl = syncHash ? `${bareTvUrl}#config=${syncHash}` : bareTvUrl;

  useEffect(() => {
    QRCode.toDataURL(tvSyncUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Failed to generate TV QR code:', err));
  }, [tvSyncUrl]);

  const handleRefreshCloudList = useCallback(async () => {
    try {
      const items = await listCloudBackups(collectionName);
      setCloudList(items);
    } catch {
      // Silently ignore if user hasn't linked Firebase Auth session yet
    }
  }, [collectionName]);

  useEffect(() => {
    handleRefreshCloudList();
  }, [handleRefreshCloudList]);

  const handleCopySync = async () => {
    try {
      await navigator.clipboard.writeText(tvSyncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCopyJson = async () => {
    if (!settings) return;
    try {
      const jsonStr = createTVContentJSON(photos, events, settings);
      await navigator.clipboard.writeText(jsonStr);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {}
  };

  const handleDownloadJSON = () => {
    if (!settings) return;
    const jsonStr = createTVContentJSON(photos, events, settings);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tv-content.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleUploadToCloud = async () => {
    if (!settings) return;
    setIsUploadingCloud(true);
    setCloudNotice(null);
    try {
      localStorage.setItem('ambient_tv_cloud_collection', collectionName);
      localStorage.setItem('ambient_tv_cloud_backup_id', backupId);
      const res = await uploadCloudBackup({
        collectionName,
        backupId,
        label: backupLabel,
        settings,
        photos,
        events,
      });
      setCloudNotice({
        type: 'success',
        text: `Opgeslagen in Firestore (${res.collectionName}/${res.backupId}): ${res.photoCount} foto's & ${res.eventCount} afspraken.${
          res.skippedLargeUploads > 0
            ? ` (${res.skippedLargeUploads} grote lokale uploads overgeslagen vanwege 1MB-limiet)`
            : ''
        }`,
      });
      await handleRefreshCloudList();
    } catch (err: any) {
      setCloudNotice({
        type: 'error',
        text: err?.message || 'Kon backup niet opslaan in Firestore.',
      });
    } finally {
      setIsUploadingCloud(false);
    }
  };

  const handleFetchFromCloud = async (targetBackupId: string = backupId) => {
    setIsFetchingCloud(true);
    setCloudNotice(null);
    try {
      localStorage.setItem('ambient_tv_cloud_collection', collectionName);
      localStorage.setItem('ambient_tv_cloud_backup_id', targetBackupId);
      const backup = await fetchCloudBackup(collectionName, targetBackupId);
      if (!backup) {
        setCloudNotice({
          type: 'error',
          text: `Geen backup gevonden op ${collectionName}/${targetBackupId}.`,
        });
        return;
      }

      if (onRestoreBackup) {
        onRestoreBackup({
          settings: backup.settings,
          photos: backup.photos || [],
          events: backup.events || [],
        });
      }
      setBackupId(targetBackupId);
      if (backup.label) setBackupLabel(backup.label);
      setCloudNotice({
        type: 'success',
        text: `Backup "${backup.label || targetBackupId}" hersteld (${backup.photos?.length || 0} foto's, ${backup.events?.length || 0} afspraken).`,
      });
    } catch (err: any) {
      setCloudNotice({
        type: 'error',
        text: err?.message || 'Kon backup niet ophalen uit Firestore.',
      });
    } finally {
      setIsFetchingCloud(false);
    }
  };

  const handleDeleteCloudBackup = async (targetBackupId: string) => {
    setCloudNotice(null);
    try {
      await deleteCloudBackup(collectionName, targetBackupId);
      setCloudNotice({
        type: 'success',
        text: `Backup "${targetBackupId}" verwijderd uit ${collectionName}.`,
      });
      await handleRefreshCloudList();
    } catch (err: any) {
      setCloudNotice({
        type: 'error',
        text: err?.message || 'Kon backup niet verwijderen.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cloud Backup (Firestore) Card */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Cloud Backup (Firestore)
              </h3>
              <p className="text-xs text-slate-400">
                Bewaar en herstel je instellingen, foto's & agenda los van je browser-cache
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshCloudList}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-slate-300 text-xs font-medium border border-neutral-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Vernieuwen</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Firestore Collectienaam
            </label>
            <input
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="tv_backups"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Backup ID / Profiel
            </label>
            <input
              type="text"
              value={backupId}
              onChange={(e) => setBackupId(e.target.value)}
              placeholder="default"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Omschrijving
            </label>
            <input
              type="text"
              value={backupLabel}
              onChange={(e) => setBackupLabel(e.target.value)}
              placeholder="Woonkamer TV"
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleUploadToCloud}
            disabled={isUploadingCloud}
            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer shadow-md"
          >
            <CloudUpload className="w-4 h-4" />
            <span>{isUploadingCloud ? 'Opslaan...' : 'Opslaan in Firestore'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleFetchFromCloud(backupId)}
            disabled={isFetchingCloud}
            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white text-xs font-semibold border border-neutral-700 transition-all cursor-pointer"
          >
            <CloudDownload className="w-4 h-4 text-emerald-400" />
            <span>{isFetchingCloud ? 'Ophalen...' : 'Ophalen uit Firestore'}</span>
          </button>
        </div>

        {cloudNotice && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              cloudNotice.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-700/50 text-rose-300'
            }`}
          >
            {cloudNotice.type === 'success' ? (
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <span className="break-words">{cloudNotice.text}</span>
          </div>
        )}

        {cloudList.length > 0 && (
          <div className="pt-2 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Opgeslagen profielen in "{collectionName}"
            </p>
            <div className="space-y-2">
              {cloudList.map((item) => (
                <div
                  key={item.backupId}
                  className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950 border border-neutral-800 px-3 py-2.5 rounded-xl text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {item.label}{' '}
                      <span className="text-slate-500 font-mono text-[10px]">({item.backupId})</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.photoCount} foto's • {item.eventCount} afspraken
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFetchFromCloud(item.backupId)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold cursor-pointer"
                    >
                      Herstellen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCloudBackup(item.backupId)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-neutral-800 cursor-pointer"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main TV Connection & GitHub JSON Card */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Koppel je Televisie</h3>
              <p className="text-xs text-slate-400">
                Toon altijd jouw Google Drive foto's & agenda zonder login op de TV
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLaunchTV}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            <Tv className="w-4 h-4" />
            <span>Start TV Weergave</span>
          </button>
        </div>

        {/* Sync Status Badges */}
        <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{photos.length} eigen foto's klaar</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{events.length} agenda afspraken gesynchroniseerd</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>0 dummy content</span>
          </div>
        </div>

        {/* QR Code and URL Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Left: QR Code */}
          <div className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl border border-white/20 shadow-md">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="TV Sync QR Code" className="w-40 h-40 rounded-lg object-contain" />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                Laden...
              </div>
            )}
            <span className="text-[11px] text-slate-700 font-semibold mt-2 text-center">
              Scan met TV camera of smartphone
            </span>
          </div>

          {/* Right: URL & GitHub JSON Instructions */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  1. TV Directe Sync URL (met jouw foto's en agenda)
                </label>
              </div>
              <div className="flex items-center gap-2 bg-neutral-950 p-2 rounded-xl border border-neutral-800">
                <span className="text-xs font-mono text-slate-300 flex-1 truncate select-all px-2">
                  {tvSyncUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopySync}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex-shrink-0 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Gekopieerd!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopieer Sync Link</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Deze link bevat direct jouw geselecteerde Google Drive foto's en kalender, en slaat deze direct op in het geheugen van de TV.
              </p>
            </div>

            {/* Option B: GitHub Pages JSON file */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileJson className="w-4 h-4 text-emerald-400" />
                  <span>2. Automatisch meenemen bij GitHub Merge: public/tv-content.json</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Download of kopieer deze JSON en plaats het in{' '}
                  <code className="text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                    public/tv-content.json
                  </code>{' '}
                  in je GitHub repo. Bij elke merge naar <code className="text-slate-300">main</code>{' '}
                  neemt GitHub Pages dit bestand automatisch mee en werkt je TV direct bij!
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadJSON}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  {downloadSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Gedownload!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download tv-content.json</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold border border-neutral-700 transition-colors cursor-pointer active:scale-95"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>JSON Gekopieerd!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Kopieer JSON tekst</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => setShowTips(!showTips)}
                className="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Hoe toon ik dit op mijn TV? ({showTips ? 'verbergen' : 'uitleg bekijken'})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Accordion / Expandable Guide */}
        {showTips && (
          <div className="pt-4 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300 animate-fade-in">
            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Monitor className="w-4 h-4 text-blue-400" />
                <span>1. Smart TV Browser</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Open de internetbrowser app op je televisie (bijv. LG webOS, Samsung Tizen of Sony Bravia) en open bovenstaande sync link of scan de QR-code.
              </p>
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Cast className="w-4 h-4 text-emerald-400" />
                <span>2. Chromecast / AirPlay</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Open de link op je laptop of telefoon en cast het tabblad direct naar je TV of Apple TV.
              </p>
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>3. Altijd je eigen content</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Zodra de TV de sync hash eenmalig heeft geopend of public/tv-content.json aanwezig is, blijft de TV altijd jouw Google Drive foto's en agenda tonen zonder inloggen.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


