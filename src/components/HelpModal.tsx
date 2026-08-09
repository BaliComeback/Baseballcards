import React from "react";
import { X, CheckCircle2, ShieldAlert, Sparkles, Layers, FileText } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">Guía y Consejos de Escaneo</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-300">
          <p className="text-slate-300 leading-relaxed">
            Esta aplicación utiliza la tecnología de Visión Multimodal de Gemini AI para escanear hojas completas de carpetas (de 9 bolsillos), lotes de tarjetas o fotos individuales.
          </p>

          <div className="space-y-2">
            <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
              Consejos para máxima precisión:
            </h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Buena iluminación:</strong> Evita reflejos excesivos de luz directa o destellos de plástico de la funda protectora.
                </span>
              </li>
              <li className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Ángulo perpendicular:</strong> Procura tomar la foto directamente desde arriba (plano cenital) para que los bordes de las tarjetas no se distorsionen.
                </span>
              </li>
              <li className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Ajuste manual:</strong> Si la IA omite alguna tarjeta, puedes presionar <em>"Agregar Tarjeta"</em> y dibujar el recuadro manualmente.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
