import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Tv, ExternalLink, Smartphone } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tvUrl: string;
  adminUrl: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  tvUrl,
  adminUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'tv' | 'admin'>('tv');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const currentUrl = activeTab === 'tv' ? tvUrl : adminUrl;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(currentUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [isOpen, currentUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-neutral-900 border border-white/20 rounded-3xl p-6 shadow-2xl text-white">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Koppel je TV of Telefoon</h2>
            <p className="text-xs text-slate-400">Open deze fotolijst eenvoudig op elk scherm</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-neutral-800 p-1 rounded-xl mb-5 text-sm font-medium border border-neutral-700">
          <button
            type="button"
            onClick={() => setActiveTab('tv')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'tv'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>TV Weergave URL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'admin'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Admin Beheer</span>
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center shadow-inner mb-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-56 h-56 object-contain rounded-lg"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400">
              <span className="animate-spin text-sm">Laden...</span>
            </div>
          )}
          <p className="text-[11px] text-slate-500 font-medium text-center mt-2">
            Scan met de camera van je telefoon of tablet
          </p>
        </div>

        {/* URL Box & Copy */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 text-xs">
            <span className="text-slate-300 font-mono truncate flex-1 select-all">
              {currentUrl}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Gekopieerd!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopiëren</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center pt-2">
            {activeTab === 'tv'
              ? 'Tip: Voer deze link in de internetbrowser van je Smart TV in en zet het venster op volledig scherm.'
              : 'Beheer de gewenste fotoalbums en agenda-instellingen vanaf je smartphone of laptop.'}
          </p>
        </div>
      </div>
    </div>
  );
};
