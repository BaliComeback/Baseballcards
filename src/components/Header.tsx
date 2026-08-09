import React from "react";
import { Sparkles, Layers, Image as ImageIcon, Download, HelpCircle } from "lucide-react";

interface HeaderProps {
  cardCount: number;
  onReset: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ cardCount, onReset, onOpenHelp }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onReset}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">
                CardCutter <span className="text-amber-400 font-extrabold text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">AI</span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Detector y Recortador de Tarjetas Deportivas
            </p>
          </div>
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-3">
          {cardCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                <strong className="text-amber-400">{cardCount}</strong> tarjetas detectadas
              </span>
            </div>
          )}

          <button
            onClick={onOpenHelp}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Ayuda y consejos de escaneo"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {cardCount > 0 && (
            <button
              onClick={onReset}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Nueva Imagen
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
