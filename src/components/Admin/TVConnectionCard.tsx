import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { PhotoItem, CalendarEvent, FrameSettings } from '../../types';
import { generateSyncHash, createTVContentJSON } from '../../services/storage';

interface TVConnectionCardProps {
  onLaunchTV: () => void;
  photos?: PhotoItem[];
  events?: CalendarEvent[];
  settings?: FrameSettings;
}

export const TVConnectionCard: React.FC<TVConnectionCardProps> = ({
  onLaunchTV,
  photos = [],
  events = [],
  settings,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedClean, setCopiedClean] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showTips, setShowTips] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const basePath = window.location.pathname.replace(/\/admin\/?.*$/, '').replace(/\/$/, '');
  const origin = window.location.origin;
  const bareTvUrl = `${origin}${basePath}/`;

  // Compute sync hash containing actual Google Drive photos and calendar items
  const syncHash = settings ? generateSyncHash(photos, events, settings) : '';
  const tvSyncUrl = syncHash ? `${bareTvUrl}#config=${syncHash}` : bareTvUrl;

  useEffect(() => {
    // Generate QR code for instant scan on TV or mobile
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

  const handleCopySync = async () => {
    try {
      await navigator.clipboard.writeText(tvSyncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCopyClean = async () => {
    try {
      await navigator.clipboard.writeText(bareTvUrl);
      setCopiedClean(true);
      setTimeout(() => setCopiedClean(false), 2000);
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

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 space-y-6">
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

        {/* Right: URL & Instructions */}
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

          {/* Option B: Download tv-content.json for permanent zero-config on GitHub Pages */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. Permanente GitHub Pages optie: tv-content.json</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Download het contentbestand en plaats het in je repo (<code className="text-slate-300">public/tv-content.json</code>). Elke TV laadt dan altijd automatisch jouw content via de korte URL!
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadJSON}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex-shrink-0 cursor-pointer shadow-sm active:scale-95"
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
              Zodra de TV de sync hash eenmalig heeft geopend of tv-content.json aanwezig is, blijft de TV altijd jouw Google Drive foto's en agenda tonen zonder inloggen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

