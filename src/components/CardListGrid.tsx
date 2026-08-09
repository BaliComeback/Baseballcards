import React, { useState } from "react";
import { DetectedCard } from "../types";
import { CardItemCard } from "./CardItemCard";
import { Download, FileSpreadsheet, Search, Filter, Layers, CheckSquare, Sparkles } from "lucide-react";

interface CardListGridProps {
  cards: DetectedCard[];
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  onRotateCard: (id: string) => void;
  onEditCard: (card: DetectedCard) => void;
  onDownloadCard: (card: DetectedCard) => void;
  onDeleteCard: (id: string) => void;
  onDownloadZip: () => void;
  onExportCSV: () => void;
}

export const CardListGrid: React.FC<CardListGridProps> = ({
  cards,
  selectedCardId,
  onSelectCard,
  onRotateCard,
  onEditCard,
  onDownloadCard,
  onDeleteCard,
  onDownloadZip,
  onExportCSV,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sideFilter, setSideFilter] = useState<"all" | "front" | "back">("all");

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.playerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.cardNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.team && card.team.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (card.brand && card.brand.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSide = sideFilter === "all" || card.side === sideFilter;

    return matchesSearch && matchesSide;
  });

  return (
    <div className="space-y-4">
      {/* Action Bar & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Tarjetas Recortadas e Identificadas
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                {cards.length}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Copia o descarga cada tarjeta individualmente con su número y nombre de jugador
            </p>
          </div>
        </div>

        {/* Global Batch Download Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onDownloadZip}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Download className="w-4 h-4" />
            Descargar Todas en .ZIP
          </button>

          <button
            onClick={onExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
            title="Exportar inventario a Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Search & Filter Inputs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por jugador, # de tarjeta o equipo..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Lado:</span>
          <button
            onClick={() => setSideFilter("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sideFilter === "all" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setSideFilter("front")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sideFilter === "front" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Frente
          </button>
          <button
            onClick={() => setSideFilter("back")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              sideFilter === "back" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Reverso
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-400">No se encontraron tarjetas con el filtro actual.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCards.map((card) => (
            <CardItemCard
              key={card.id}
              card={card}
              isSelected={selectedCardId === card.id}
              onSelect={() => onSelectCard(card.id)}
              onRotate={() => onRotateCard(card.id)}
              onEdit={() => onEditCard(card)}
              onDownload={() => onDownloadCard(card)}
              onDelete={() => onDeleteCard(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
