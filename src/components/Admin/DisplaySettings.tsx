import React, { useState } from 'react';
import { FrameSettings } from '../../types';
import {
  Sliders,
  Tv,
  Clock,
  CloudSun,
  ShieldCheck,
  Eye,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface DisplaySettingsProps {
  settings: FrameSettings;
  onUpdateSettings: (updater: (prev: FrameSettings) => FrameSettings) => void;
}

const CITY_PRESETS = [
  { name: 'Amsterdam', lat: 52.3676, lon: 4.9041 },
  { name: 'Rotterdam', lat: 51.9244, lon: 4.4777 },
  { name: 'Utrecht', lat: 52.0907, lon: 5.1214 },
  { name: 'Eindhoven', lat: 51.4416, lon: 5.4697 },
  { name: 'Groningen', lat: 53.2194, lon: 6.5665 },
  { name: 'Brussel', lat: 50.8503, lon: 4.3517 },
  { name: 'Antwerpen', lat: 51.2194, lon: 4.4025 },
];

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [newEmail, setNewEmail] = useState('');

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || settings.authorizedEmails.includes(clean)) return;

    onUpdateSettings((prev) => ({
      ...prev,
      authorizedEmails: [...prev.authorizedEmails, clean],
    }));
    setNewEmail('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    if (settings.authorizedEmails.length <= 1) return; // keep at least 1
    onUpdateSettings((prev) => ({
      ...prev,
      authorizedEmails: prev.authorizedEmails.filter((e) => e !== emailToRemove),
    }));
  };

  const handleSelectCityPreset = (cityName: string) => {
    const found = CITY_PRESETS.find((c) => c.name === cityName);
    if (!found) return;
    onUpdateSettings((prev) => ({
      ...prev,
      weatherCity: found.name,
      weatherLat: found.lat,
      weatherLon: found.lon,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Slideshow Dynamics */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Tv className="w-5 h-5 text-blue-400" />
          <span>Diavoorstelling & Overgangen</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Slide Interval */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-2">
              <span>Wisseltijd per foto:</span>
              <span className="text-blue-400 font-semibold">{settings.slideInterval} seconden</span>
            </div>
            <input
              type="range"
              min={4}
              max={60}
              step={1}
              value={settings.slideInterval}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  slideInterval: parseInt(e.target.value, 10),
                }))
              }
              className="w-full accent-blue-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Snel (4s)</span>
              <span>Standaard (12s)</span>
              <span>Rustig (60s)</span>
            </div>
          </div>

          {/* Transition Style */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Overgangseffect
            </label>
            <select
              value={settings.transitionStyle}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  transitionStyle: e.target.value as any,
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="kenburns">Ken Burns (Cinematisch inzoomen & pannen)</option>
              <option value="crossfade">Crossfade (Vloeiend in elkaar overvloeien)</option>
              <option value="zoom">Inzoomen bij wissel</option>
              <option value="fade">Subtiele fade-in</option>
            </select>
          </div>

          {/* Picture Fit Mode */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Fotopassing op TV Scherm
            </label>
            <select
              value={settings.fitMode}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  fitMode: e.target.value as any,
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="blur-backdrop">
                Onscherpe achtergrond (Aanbevolen voor staande & liggende foto's)
              </option>
              <option value="cover">Vullend (volledig scherm, randen bijgesneden)</option>
              <option value="contain">Passend (volledige foto met zwarte balken)</option>
            </select>
          </div>

          {/* Show Photo Info Badge */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <p className="text-xs font-semibold text-white">Foto Info Badge tonen</p>
              <p className="text-[11px] text-slate-400">
                Toont albumnaam, titel en datum linksonder op het scherm
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showPhotoInfo}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showPhotoInfo: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Calendar & Overlay Styling */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-400" />
          <span>Kalenderkader & Klok Vormgeving</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Show Calendar Toggle */}
          <div className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <div>
              <p className="text-xs font-semibold text-white">Kalenderkader Inschakelen</p>
              <p className="text-[11px] text-slate-400">Toont het agenda-kader rechts over de foto</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showCalendarOverlay}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    showCalendarOverlay: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Overlay Width */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Breedte van het Kader
            </label>
            <select
              value={settings.overlayWidth}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  overlayWidth: e.target.value as any,
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="compact">Compact (320px breed)</option>
              <option value="normal">Normaal (390px breed - ideaal voor 1080p & 4K)</option>
              <option value="wide">Breed (460px breed)</option>
            </select>
          </div>

          {/* Overlay Opacity */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-2">
              <span>Achtergrond Dekking:</span>
              <span className="text-blue-400 font-semibold">{settings.overlayOpacity}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              step={5}
              value={settings.overlayOpacity}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  overlayOpacity: parseInt(e.target.value, 10),
                }))
              }
              className="w-full accent-blue-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Clock format */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tijdformaat van de Klok
            </label>
            <select
              value={settings.clockFormat}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  clockFormat: e.target.value as any,
                }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-blue-500 focus:outline-none"
            >
              <option value="24h">24-uurs weergave (14:30)</option>
              <option value="12h">12-uurs weergave (2:30 PM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Weather Widget Settings */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">Weerbericht in Kalenderkader</h3>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showWeather}
              onChange={(e) =>
                onUpdateSettings((prev) => ({
                  ...prev,
                  showWeather: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.showWeather && (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-300">
              Kies stad of locatie:
            </label>
            <div className="flex flex-wrap gap-2">
              {CITY_PRESETS.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => handleSelectCityPreset(city.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    settings.weatherCity === city.name
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-neutral-800 text-slate-300 hover:bg-neutral-700'
                  }`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Access Control & Authorized Google Accounts */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Geautoriseerde Google Accounts (Admin Toegang)</span>
        </h3>
        <p className="text-xs text-slate-400">
          Alleen deze Google accounts hebben toegang tot de beheeromgeving om instellingen en albums te wijzigen.
        </p>

        <form onSubmit={handleAddEmail} className="flex gap-2">
          <input
            type="email"
            placeholder="bijv. familie@gmail.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700"
          >
            <Plus className="w-4 h-4" />
            <span>Toevoegen</span>
          </button>
        </form>

        <div className="space-y-2">
          {settings.authorizedEmails.map((email) => (
            <div
              key={email}
              className="flex items-center justify-between bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 rounded-xl text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-slate-200 font-mono">{email}</span>
                {email === 'jasper@23g.nl' && (
                  <span className="text-[10px] text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded font-medium border border-blue-500/30">
                    Eigenaar
                  </span>
                )}
              </div>

              {settings.authorizedEmails.length > 1 && email !== 'jasper@23g.nl' && (
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(email)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                  title="Verwijderen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
