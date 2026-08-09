import React from "react";
import { DetectedCard } from "../types";
import { RotateCw, Download, Edit3, Trash2, CheckCircle, Tag, Shield } from "lucide-react";

interface CardItemCardProps {
  card: DetectedCard;
  isSelected: boolean;
  onSelect: () => void;
  onRotate: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export const CardItemCard: React.FC<CardItemCardProps> = ({
  card,
  isSelected,
  onSelect,
  onRotate,
  onEdit,
  onDownload,
  onDelete,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer bg-slate-900/80 backdrop-blur-sm flex flex-col ${
        isSelected
          ? "border-amber-500 ring-2 ring-amber-500/30 shadow-xl shadow-amber-500/10 scale-[1.01]"
          : "border-slate-800 hover:border-slate-700 hover:bg-slate-900"
      }`}
    >
      {/* Top Header info */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold text-xs font-mono shrink-0">
            #{card.cardNumber}
          </span>
          <h3 className="text-xs font-bold text-slate-100 truncate" title={card.playerName}>
            {card.playerName}
          </h3>
        </div>

        {card.side && card.side !== "unknown" && (
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
            {card.side === "front" ? "Frente" : "Reverso"}
          </span>
        )}
      </div>

      {/* Cropped Thumbnail Container */}
      <div className="relative p-3 flex-1 flex items-center justify-center bg-slate-950/40 min-h-[180px]">
        {card.croppedDataUrl ? (
          <img
            src={card.croppedDataUrl}
            alt={`${card.cardNumber} - ${card.playerName}`}
            className="max-h-[220px] w-auto object-contain rounded-lg shadow-md border border-slate-800/80 transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-36 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-500 text-xs font-medium">
            Recortando...
          </div>
        )}

        {/* Quick action overlay bar */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-slate-950/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRotate();
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors"
            title="Rotar 90° a la derecha"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors"
            title="Editar nombre / datos"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
            title="Descargar esta tarjeta"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
            title="Eliminar de la lista"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer details */}
      <div className="px-3 py-2 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <div className="truncate flex items-center gap-1">
          {card.team && <span className="text-slate-300 font-medium">{card.team}</span>}
          {card.team && card.brand && <span>•</span>}
          {card.brand && <span className="text-slate-400">{card.brand}</span>}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="text-amber-400 hover:text-amber-300 font-semibold text-[11px] flex items-center gap-1 shrink-0"
        >
          <Download className="w-3 h-3" />
          <span>PNG</span>
        </button>
      </div>
    </div>
  );
};
