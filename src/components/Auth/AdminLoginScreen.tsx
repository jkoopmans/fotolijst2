import React from 'react';
import { User } from 'firebase/auth';
import { GoogleSignInButton } from './GoogleSignInButton';
import { Tv, ShieldCheck, Calendar, Image as ImageIcon, Sparkles, ArrowRight, LogOut } from 'lucide-react';

interface AdminLoginScreenProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  isUnauthorized?: boolean;
  onGoToTV: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  isUnauthorized = false,
  onGoToTV,
}) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        {/* App Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
          <Tv className="w-8 h-8" />
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Ambient TV Fotolijst
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Afgeschermde Beheeromgeving
          </p>
        </div>

        {/* Unauthorized case */}
        {isUnauthorized && user ? (
          <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Geen beheerderstoegang</span>
            </div>
            <p className="text-xs text-slate-300">
              Je bent ingelogd met <span className="font-mono text-white font-semibold">{user.email}</span>. Dit Google account staat niet in de lijst met bevoegdheden.
            </p>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Inloggen met ander account</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Login Prompt */
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Log in met je Google Account om toegang te krijgen tot het beheren van je Google Photos albums, Google Calendar agenda en TV weergave-instellingen.
            </p>

            <div className="pt-2 flex justify-center">
              <GoogleSignInButton
                onClick={onLogin}
                loading={isLoggingIn}
                label="Inloggen met Google"
              />
            </div>

            {/* Feature highlights */}
            <div className="pt-4 border-t border-neutral-800/80 grid grid-cols-2 gap-3 text-left">
              <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/60">
                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold mb-1">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Google Photos</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Selecteer je eigen vakantie- en familiealbums.
                </p>
              </div>

              <div className="bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/60">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Google Calendar</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Live agenda-kader rechts over de foto.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Direct link to TV mode without login */}
        <div className="pt-4 border-t border-neutral-800/80">
          <button
            type="button"
            onClick={onGoToTV}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
          >
            <span>Direct naar TV Weergave</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
