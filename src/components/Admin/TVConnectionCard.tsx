import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Tv, Copy, Check, ExternalLink, Cast, Monitor, Smartphone, HelpCircle } from 'lucide-react';

interface TVConnectionCardProps {
  onLaunchTV: () => void;
}

export const TVConnectionCard: React.FC<TVConnectionCardProps> = ({ onLaunchTV }) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showTips, setShowTips] = useState(false);

  const basePath = window.location.pathname.replace(/\/admin\/?.*$/, '').replace(/\/$/, '');
  const tvUrl = `${window.location.origin}${basePath}/`;
  const adminUrl = `${window.location.origin}${basePath}/admin`;

  useEffect(() => {
    QRCode.toDataURL(tvUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Failed to generate TV QR code:', err));
  }, [tvUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tvUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Koppel je Televisie</h3>
            <p className="text-xs text-slate-400">
              Gebruik deze unieke URL om de fotolijst op je Smart TV te tonen
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLaunchTV}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs tracking-wide transition-all shadow-lg active:scale-95"
        >
          <Tv className="w-4 h-4" />
          <span>Start TV Weergave</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        {/* Left: QR Code */}
        <div className="flex flex-col items-center justify-center bg-white p-3.5 rounded-2xl border border-white/20 shadow-md">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="TV Link QR Code" className="w-36 h-36 rounded-lg" />
          ) : (
            <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
              Laden...
            </div>
          )}
          <span className="text-[10px] text-slate-600 font-medium mt-1">
            Scan met TV of mobiel
          </span>
        </div>

        {/* Right: URL & Instructions */}
        <div className="md:col-span-2 space-y-3">
          <label className="block text-xs font-medium text-slate-300">
            TV Fotolijst URL
          </label>
          <div className="flex items-center gap-2 bg-neutral-950 p-2 rounded-xl border border-neutral-800">
            <span className="text-xs font-mono text-slate-300 flex-1 truncate select-all px-2">
              {tvUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-colors flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gekopieerd</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopiëren</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="text-blue-400 hover:underline flex items-center gap-1"
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
              Open de internetbrowser app op je televisie (bijv. Samsung TV, LG webOS of Sony Bravia) en ga naar bovenstaande link.
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
              <span>3. Bediening op afstand</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Alle wijzigingen die je hier in het admin paneel doorvoert worden direct gesynchroniseerd met je scherm!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
