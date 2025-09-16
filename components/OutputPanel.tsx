import React, { useState, useEffect, useRef } from 'react';
import { CopyIcon, CheckIcon, WarningIcon, CodeIcon, LightBulbIcon } from './Icons';

// Declare hljs to TypeScript since it's loaded from CDN
declare const hljs: any;

export type ParsedCode = Array<{ urutan: number | null; code: string; }>;

interface OutputPanelProps {
  code: ParsedCode;
  isLoading: boolean;
  error: string | null;
  onExplain: () => void;
  isExplaining: boolean;
}

const getUrutanColor = (urutan: number | null) => {
    switch (urutan) {
        case 1: return 'bg-sky-500/80';
        case 2: return 'bg-emerald-500/80';
        case 3: return 'bg-amber-500/80';
        case 4: return 'bg-rose-500/80';
        case 5: return 'bg-violet-500/80';
        default: return 'bg-transparent';
    }
};

const SkeletonLoader: React.FC = () => (
    <div className="animate-pulse p-2">
        {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3 my-2.5">
                <div className="h-4 w-5 rounded-sm bg-slate-700/50"></div>
                <div className={`h-3 rounded-full bg-slate-700 ${i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-5/6' : 'w-1/2'}`}></div>
            </div>
        ))}
    </div>
);


export const OutputPanel: React.FC<OutputPanelProps> = ({ code, isLoading, error, onExplain, isExplaining }) => {
  const [copied, setCopied] = useState(false);
  const codeContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  useEffect(() => {
    if (codeContainerRef.current) {
      // Tell hljs to find and highlight all <pre><code> blocks inside the container
      codeContainerRef.current.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [code]);

  const handleCopy = () => {
    const plainCode = code.map(segment => segment.code).join('');
    if (plainCode) {
      navigator.clipboard.writeText(plainCode);
      setCopied(true);
    }
  };
  
  const renderContent = () => {
    if (isLoading && code.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <SkeletonLoader />
          <p className="mt-4 text-lg">AI sedang bekerja...</p>
          <p className="text-sm">Membangun kode Arduino Anda.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-400 p-4">
          <WarningIcon className="w-12 h-12 mb-4 text-red-500" />
          <p className="text-lg font-semibold text-center text-red-300">Terjadi Kesalahan</p>
          <p className="text-sm text-red-400 text-center mt-2 max-w-sm">{error}</p>
        </div>
      );
    }

    if (code.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <CodeIcon className="w-16 h-16 mb-4" />
          <p className="text-lg">Kode Arduino Anda akan muncul di sini.</p>
          <p className="text-sm">Mulai ketik untuk melihat hasil terjemahan otomatis.</p>
        </div>
      );
    }

    return (
      <div ref={codeContainerRef} className="text-sm">
        {code.map((segment, index) => (
            <div key={index} className="flex group">
                <div className="w-5 flex-shrink-0 mr-3 self-stretch py-0.5">
                  {segment.urutan && (
                      <div className={`h-full w-full rounded-sm flex items-center justify-center text-white text-xs font-bold transition-all duration-300 ${getUrutanColor(segment.urutan)}`}>
                          <span className="opacity-70 group-hover:opacity-100 transition-opacity">{segment.urutan}</span>
                      </div>
                  )}
                </div>
                <pre className="flex-grow m-0 p-0 bg-transparent"><code className="language-cpp bg-transparent p-0">{segment.code}</code></pre>
            </div>
        ))}
    </div>
    );
  };


  return (
    <div className="bg-slate-800/30 p-6 rounded-xl shadow-2xl border border-slate-700/50 flex flex-col min-h-[460px] lg:h-full backdrop-blur-sm">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-slate-100 bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">
            Hasil Kode Arduino
        </h2>
        {code.length > 0 && !error && (
          <div className="flex items-center gap-2">
            <button
              onClick={onExplain}
              disabled={isExplaining}
              className="group flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 font-semibold py-1.5 px-4 rounded-lg transition-all text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LightBulbIcon className={`w-4 h-4 text-amber-400 ${isExplaining ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
              {isExplaining ? 'Menjelaskan...' : 'Jelaskan Kode Ini'}
            </button>
            <button
              onClick={handleCopy}
              className="group flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 font-semibold py-1.5 px-4 rounded-lg transition-all text-sm shadow-md"
            >
              {copied 
                ? <CheckIcon className="w-4 h-4 text-green-400" /> 
                : <CopyIcon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              }
              {copied ? 'Disalin!' : 'Salin Kode'}
            </button>
          </div>
        )}
      </div>
      <div className="flex-grow bg-slate-900/70 border border-slate-700 rounded-lg p-4 font-mono overflow-auto relative min-h-[300px] shadow-inner">
        {renderContent()}
      </div>
    </div>
  );
};