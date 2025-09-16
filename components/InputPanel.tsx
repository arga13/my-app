import React from 'react';
import { ClearIcon, SparklesIcon, TrashIcon } from './Icons';

export interface InputValues {
  libraries: string;
  declarations: string;

  setup: string;
  loop: string;
  functions: string;
}

interface InputPanelProps {
  values: InputValues;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onLoadExample: () => void;
  onClearInput: (fieldName: keyof InputValues) => void;
  onClearAll: () => void;
}

interface InputSectionProps {
  label: string;
  fieldName: keyof InputValues;
  urutan: number;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onClear: (fieldName: keyof InputValues) => void;
  placeholder: string;
  rows?: number;
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

const InputSection: React.FC<InputSectionProps> = ({ label, fieldName, urutan, value, onChange, onClear, placeholder, rows = 2 }) => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${getUrutanColor(urutan)}`}></div>
        <label htmlFor={fieldName} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      </div>
      <div className="relative w-full group">
        <textarea
          id={fieldName}
          name={fieldName}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-slate-900/70 border border-slate-700 rounded-lg p-3 pr-8 font-mono text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 focus:bg-slate-900 transition-all duration-300 resize-y shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          rows={rows}
          aria-label={label}
        />
        {value.length > 0 && (
          <button
            onClick={() => onClear(fieldName)}
            className="absolute top-2.5 right-2 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500/50 opacity-0 group-hover:opacity-100"
            aria-label={`Hapus input ${label}`}
          >
            <ClearIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export const InputPanel: React.FC<InputPanelProps> = ({ values, onChange, onLoadExample, onClearInput, onClearAll }) => {
  const hasAnyInput = Object.values(values).some(v => v.trim() !== '');
  
  return (
    <div className="bg-slate-800/30 p-6 rounded-xl shadow-2xl border border-slate-700/50 flex flex-col h-full backdrop-blur-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-100 bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">
          Input Pseudo-code
        </h2>
        <div className="flex items-center gap-2">
            <button
              onClick={onLoadExample}
              className="group flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-300 font-semibold py-1.5 px-4 rounded-lg transition-all text-sm shadow-md"
              aria-label="Load example pseudo-code"
            >
              <SparklesIcon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              Coba Contoh
            </button>
            {hasAnyInput && (
              <button
                onClick={onClearAll}
                className="group flex items-center gap-2 bg-slate-700 hover:bg-red-800/50 border border-slate-600 hover:border-red-700/60 text-slate-300 hover:text-red-200 font-semibold py-1.5 px-4 rounded-lg transition-all text-sm shadow-md"
                aria-label="Bersihkan semua input"
              >
                <TrashIcon className="w-4 h-4 text-slate-400 group-hover:text-red-300 transition-colors" />
                Bersihkan Semua
              </button>
            )}
        </div>
      </div>
      <div className="flex-grow flex flex-col gap-4">
        <InputSection
          label="Urutan 1: Libraries"
          fieldName="libraries"
          urutan={1}
          value={values.libraries}
          onChange={onChange}
          onClear={onClearInput}
          placeholder="e.g., library WiFi"
          rows={1}
        />
        <InputSection
          label="Urutan 2: Variables & Pins"
          fieldName="declarations"
          urutan={2}
          value={values.declarations}
          onChange={onChange}
          onClear={onClearInput}
          placeholder={`e.g., pin LED = 13\nvariabel hitung = 0`}
          rows={3}
        />
        <InputSection
          label="Urutan 3: Setup"
          fieldName="setup"
          urutan={3}
          value={values.setup}
          onChange={onChange}
          onClear={onClearInput}
          placeholder="e.g., atur LED sebagai output"
          rows={3}
        />
        <InputSection
          label="Urutan 4: Loop"
          fieldName="loop"
          urutan={4}
          value={values.loop}
          onChange={onChange}
          onClear={onClearInput}
          placeholder="e.g., nyalakan LED"
          rows={5}
        />
        <InputSection
          label="Urutan 5: Additional Functions"
          fieldName="functions"
          urutan={5}
          value={values.functions}
          onChange={onChange}
          onClear={onClearInput}
          placeholder="e.g., fungsi customLampu(int durasi)"
          rows={3}
        />
      </div>
    </div>
  );
};