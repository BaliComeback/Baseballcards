import React, { useState, useEffect } from "react";
import { DetectedCard, ImageProcessingOptions } from "../types";
import { cropCardFromImage, generateCardFilename } from "../utils/cropUtils";
import { X, RotateCw, Save, Download, Sliders, Check, RefreshCw, Layers } from "lucide-react";

interface CardEditModalProps {
  card: DetectedCard | null;
  sourceImageElement: HTMLImageElement | null;
  onClose: () => void;
  onSave: (updatedCard: DetectedCard) => void;
  onDownload: (card: DetectedCard) => void;
}

export const CardEditModal: React.FC<CardEditModalProps> = ({
  card,
  sourceImageElement,
  onClose,
  onSave,
  onDownload,
}) => {
  const [cardNumber, setCardNumber] = useState(card?.cardNumber || "");
  const [playerName, setPlayerName] = useState(card?.playerName || "");
  const [team, setTeam] = useState(card?.team || "");
  const [brand, setBrand] = useState(card?.brand || "");
  const [year, setYear] = useState(card?.year || "");
  const [side, setSide] = useState<"front" | "back" | "unknown">(card?.side || "unknown");
  const [rotation, setRotation] = useState(card?.rotation || 0);

  // Image processing options
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [paddingPercent, setPaddingPercent] = useState(1);

  const [previewDataUrl, setPreviewDataUrl] = useState(card?.croppedDataUrl || "");

  // Update preview image when adjustments or crop change
  useEffect(() => {
    if (sourceImageElement && card) {
      const newCropped = cropCardFromImage(sourceImageElement, card.boundingBox, rotation, {
        paddingPercent,
        autoEnhance: false,
        brightness,
        contrast,
      });
      if (newCropped) {
        setPreviewDataUrl(newCropped);
      }
    }
  }, [sourceImageElement, card, rotation, brightness, contrast, paddingPercent]);

  const handleSave = () => {
    if (!card) return;
    const updated: DetectedCard = {
      ...card,
      cardNumber,
      playerName,
      team,
      brand,
      year,
      side,
      rotation,
      croppedDataUrl: previewDataUrl,
      customFilename: generateCardFilename({ ...card, cardNumber, playerName, team }),
    };

    onSave(updated);
    onClose();
  };

  if (!card) return null;

  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Editar Tarjeta #{cardNumber}</span>
              <span className="text-xs font-mono font-normal text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                {playerName}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Ajusta los metadatos o la calidad del recorte</p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
          {/* Left Column: Image Preview & Enhancements */}
          <div className="space-y-4 flex flex-col items-center">
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-center min-h-[260px] relative">
              {previewDataUrl ? (
                <img
                  src={previewDataUrl}
                  alt={playerName}
                  className="max-h-[280px] w-auto object-contain rounded-lg shadow-lg border border-slate-800"
                />
              ) : (
                <div className="text-xs text-slate-500">Cargando vista previa...</div>
              )}

              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button
                  onClick={() => setSide(side === "back" ? "front" : "back")}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer ${
                    side === "back"
                      ? "bg-purple-600 text-white border-purple-400 hover:bg-purple-500"
                      : "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400"
                  }`}
                  title="Cambiar entre Frente y Reverso"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{side === "back" ? "Reverso" : "Frente"}</span>
                </button>

                <button
                  onClick={handleRotate90}
                  className="p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-slate-200 hover:text-amber-400 transition-colors shadow-md cursor-pointer"
                  title="Rotar 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Adjustments Panel */}
            <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Ajustes de Imagen</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Brillo: {brightness}%</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Contraste: {contrast}%</label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-xs block mb-1">
                  Margen de Margen Borde: {paddingPercent}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={paddingPercent}
                  onChange={(e) => setPaddingPercent(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Metadata Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                # de Tarjeta / ID <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="ej: 86"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Nombre del Jugador / Título <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="ej: Junior Ortiz"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Equipo</label>
                <input
                  type="text"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="ej: Pirates"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Marca / Set</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="ej: Topps, Score"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Año</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="ej: 1988"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Lado de la Tarjeta</span>
                  <span className="text-[10px] text-slate-400 font-normal">Alternar con 1 clic</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSide("front")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      side === "front"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500 shadow-md ring-1 ring-amber-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Frente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSide("back")}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      side === "back"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500 shadow-md ring-1 ring-purple-500/50"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Reverso</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSide("unknown")}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      side === "unknown"
                        ? "bg-slate-800 text-slate-200 border-slate-600 shadow-md"
                        : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
                    }`}
                  >
                    <span>Sin especificar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[11px] text-slate-400">
                Nombre de archivo generado:{" "}
                <strong className="text-amber-400 font-mono">
                  {generateCardFilename({ ...card, cardNumber, playerName, team })}
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => onDownload({ ...card, croppedDataUrl: previewDataUrl, cardNumber, playerName, team })}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Descargar esta PNG
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
