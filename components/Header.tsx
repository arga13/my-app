import React from 'react';
import { ShareIcon } from './Icons';

interface HeaderProps {
  onShare: () => void;
  shareNotification: string;
}

export const Header: React.FC<HeaderProps> = ({ onShare, shareNotification }) => {
  return (
    <header className="text-center relative py-8">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-cyan-300 to-blue-500 pb-2 animate-fade-in-down">
        Arduino Pseudo-code Translator
      </h1>
      <p className="mt-4 text-lg text-slate-400 max-w-3xl mx-auto animate-fade-in-up">
        Tuliskan logika Anda dalam format urutan, dan biarkan AI mengubahnya menjadi kode Arduino C++ yang siap pakai dan terstruktur.
      </p>
      <div className="absolute top-0 right-0 sm:top-4 sm:right-4">
        <button
          onClick={onShare}
          className="group flex items-center gap-2 bg-slate-800/50 hover:bg-slate-700/70 border border-slate-700 text-slate-300 font-semibold py-2 px-3 rounded-lg transition-all text-sm shadow-md backdrop-blur-sm"
          aria-label="Bagikan kode"
        >
          <ShareIcon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
          Bagikan
        </button>
         {shareNotification && (
          <div className="absolute top-full right-0 mt-2 text-sm bg-green-500/20 border border-green-500/30 text-green-300 py-1 px-3 rounded-md animate-slide-in-down">
            {shareNotification}
          </div>
        )}
      </div>
    </header>
  );
};