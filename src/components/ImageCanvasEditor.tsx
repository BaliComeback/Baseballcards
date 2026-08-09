import React, { useState, useRef, useEffect } from "react";
import { BoundingBox, DetectedCard } from "../types";
import { normalizeBox } from "../utils/cropUtils";
import { ZoomIn, ZoomOut, Maximize2, Plus, Eye, EyeOff, Tag, Move } from "lucide-react";

interface ImageCanvasEditorProps {
  imageSrc: string;
  cards: DetectedCard[];
  selectedCardId: string | null;
  onSelectCard: (id: string | null) => void;
  onUpdateBoundingBox: (id: string, newBox: BoundingBox) => void;
  onAddCustomCard: (newBox: BoundingBox) => void;
  isAnalyzing: boolean;
}

export const ImageCanvasEditor: React.FC<ImageCanvasEditorProps> = ({
  imageSrc,
  cards,
  selectedCardId,
  onSelectCard,
  onUpdateBoundingBox,
  onAddCustomCard,
  isAnalyzing,
}) => {
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isDrawingNewBox, setIsDrawingNewBox] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle click on canvas background to deselect or draw
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingNewBox || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingNewBox || !drawStart || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    setDrawCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawingNewBox || !drawStart || !drawCurrent) return;

    const xmin = Math.min(drawStart.x, drawCurrent.x);
    const xmax = Math.max(drawStart.x, drawCurrent.x);
    const ymin = Math.min(drawStart.y, drawCurrent.y);
    const ymax = Math.max(drawStart.y, drawCurrent.y);

    // Ensure it's not a tiny click (at least 2% width/height)
    if (xmax - xmin > 0.02 && ymax - ymin > 0.02) {
      onAddCustomCard({
        ymin: Math.round(ymin * 1000),
        xmin: Math.round(xmin * 1000),
        ymax: Math.round(ymax * 1000),
        xmax: Math.round(xmax * 1000),
      });
    }

    setDrawStart(null);
    setDrawCurrent(null);
    setIsDrawingNewBox(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Editor Controls Bar */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-amber-400" />
            Vista de Detección en Foto Original
          </span>
          <span className="text-xs text-slate-500">
            ({cards.length} {cards.length === 1 ? "tarjeta" : "tarjetas"})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Label Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showLabels
                ? "bg-slate-800 border-slate-700 text-slate-200"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
            title="Mostrar/Ocultar Etiquetas de Tarjeta"
          >
            {showLabels ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Etiquetas</span>
          </button>

          {/* Add Box manually */}
          <button
            onClick={() => setIsDrawingNewBox(!isDrawingNewBox)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              isDrawingNewBox
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            }`}
            title="Dibujar área de tarjeta manualmente"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isDrawingNewBox ? "Arrastra en la foto..." : "Agregar Tarjeta"}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setZoom(Math.max(0.8, zoom - 0.2))}
              className="p-1 hover:bg-slate-700 text-slate-300 rounded"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-slate-400 font-mono px-1.5">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(2.5, zoom + 0.2))}
              className="p-1 hover:bg-slate-700 text-slate-300 rounded"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-slate-700 text-slate-300 rounded border-l border-slate-700 ml-0.5"
              title="Restablecer Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        ref={containerRef}
        className="relative overflow-auto p-4 bg-slate-950 min-h-[400px] max-h-[600px] flex items-center justify-center select-none"
      >
        {isAnalyzing && (
          <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-sm font-bold text-amber-400">Analizando tarjetas con Visión IA...</p>
              <p className="text-xs text-slate-400 mt-1">Identificando tarjetas, # de serie y nombres de jugadores</p>
            </div>
          </div>
        )}

        <div
          className={`relative inline-block transition-transform duration-200 ${
            isDrawingNewBox ? "cursor-crosshair" : "cursor-default"
          }`}
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Hoja de tarjetas deportivas"
            className="max-w-full max-h-[550px] object-contain rounded-lg shadow-lg block pointer-events-none"
          />

          {/* Render Bounding Boxes Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {cards.map((card, idx) => {
              const norm = normalizeBox(card.boundingBox);
              const isSelected = selectedCardId === card.id;

              const topPct = `${norm.ymin * 100}%`;
              const leftPct = `${norm.xmin * 100}%`;
              const widthPct = `${(norm.xmax - norm.xmin) * 100}%`;
              const heightPct = `${(norm.ymax - norm.ymin) * 100}%`;

              return (
                <g key={card.id}>
                  {/* Bounding box rectangle */}
                  <rect
                    x={leftPct}
                    y={topPct}
                    width={widthPct}
                    height={heightPct}
                    className={`transition-all ${
                      isSelected
                        ? "stroke-amber-400 stroke-[3] fill-amber-400/20"
                        : "stroke-emerald-400/80 stroke-[2] hover:stroke-emerald-300 fill-emerald-500/10"
                    }`}
                  />
                </g>
              );
            })}

            {/* Drawing preview box */}
            {drawStart && drawCurrent && (
              <rect
                x={`${Math.min(drawStart.x, drawCurrent.x) * 100}%`}
                y={`${Math.min(drawStart.y, drawCurrent.y) * 100}%`}
                width={`${Math.abs(drawCurrent.x - drawStart.x) * 100}%`}
                height={`${Math.abs(drawCurrent.y - drawStart.y) * 100}%`}
                className="stroke-amber-400 stroke-[2] stroke-dasharray-4 fill-amber-500/30 animate-pulse"
              />
            )}
          </svg>

          {/* Clickable HTML Labels overlay on top of boxes */}
          {cards.map((card, idx) => {
            const norm = normalizeBox(card.boundingBox);
            const isSelected = selectedCardId === card.id;

            return (
              <div
                key={`label-${card.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCard(card.id);
                }}
                className={`absolute cursor-pointer rounded transition-all flex flex-col justify-between ${
                  isSelected
                    ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 z-10"
                    : "hover:ring-1 hover:ring-emerald-300/80 z-0"
                }`}
                style={{
                  top: `${norm.ymin * 100}%`,
                  left: `${norm.xmin * 100}%`,
                  width: `${(norm.xmax - norm.xmin) * 100}%`,
                  height: `${(norm.ymax - norm.ymin) * 100}%`,
                }}
              >
                {/* Top Badge label */}
                {showLabels && (
                  <div className="m-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950/90 text-[10px] font-extrabold text-amber-300 shadow border border-amber-500/30 max-w-full truncate pointer-events-auto backdrop-blur-xs">
                    <span className="text-amber-400">#{card.cardNumber}</span>
                    <span className="text-slate-200 truncate">{card.playerName}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
