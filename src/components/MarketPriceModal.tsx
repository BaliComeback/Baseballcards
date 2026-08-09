import React, { useState, useEffect } from "react";
import { X, ExternalLink, DollarSign, TrendingUp, Tag, Copy, Check, Sparkles, RefreshCw, ShoppingCart, Award, ShieldCheck, Share2 } from "lucide-react";
import { CardMarketInfo, DetectedCard } from "../types";
import { SavedCard } from "../utils/db";

interface MarketPriceModalProps {
  card?: SavedCard | DetectedCard | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyValue?: (
    cardId: string,
    value: number,
    marketSource?: string,
    updatedData?: { team?: string; brand?: string; year?: string; cardNumber?: string; playerName?: string }
  ) => void;
}

export const MarketPriceModal: React.FC<MarketPriceModalProps> = ({
  card,
  isOpen,
  onClose,
  onApplyValue
}) => {
  const [playerName, setPlayerName] = useState(card?.playerName || "");
  const [cardNumber, setCardNumber] = useState(card?.cardNumber || "");
  const [brand, setBrand] = useState(card?.brand || "");
  const [year, setYear] = useState(card?.year || "");
  const [team, setTeam] = useState(card?.team || "");

  const [isLoading, setIsLoading] = useState(false);
  const [marketInfo, setMarketInfo] = useState<CardMarketInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [showSalesTemplate, setShowSalesTemplate] = useState(false);

  // Sync inputs when card changes
  useEffect(() => {
    if (card) {
      setPlayerName(card.playerName || "");
      setCardNumber(card.cardNumber || "");
      setBrand(card.brand || "");
      setYear(card.year || "");
      setTeam(card.team || "");
      // Auto fetch market price on open if card exists
      fetchMarketPrice(card.playerName, card.cardNumber, card.brand, card.year, card.team);
    }
  }, [card]);

  const fetchMarketPrice = async (
    pName = playerName,
    cNum = cardNumber,
    bBrand = brand,
    yYear = year,
    tTeam = team
  ) => {
    if (!pName.trim()) {
      setError("Ingresa al menos el nombre del jugador o personaje.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/card-market-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: pName,
          cardNumber: cNum,
          brand: bBrand,
          year: yYear,
          team: tTeam
        })
      });

      if (!res.ok) {
        throw new Error("No se pudo obtener la cotización.");
      }

      const data: CardMarketInfo = await res.json();
      setMarketInfo(data);
    } catch (err: any) {
      console.error("Error fetching market price:", err);
      setError("Ocurrió un problema al consultar los precios online.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCopyTitle = () => {
    if (marketInfo?.suggestedListingTitle) {
      navigator.clipboard.writeText(marketInfo.suggestedListingTitle);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    }
  };

  const generateSalesPost = () => {
    if (!marketInfo) return "";
    return `🔥 EN VENTA / FOR SALE 🔥
🃏 Tarjeta: ${year} ${brand} ${playerName} #${cardNumber} ${team ? `(${team})` : ""}
💵 Precio sugerido: $${marketInfo.estimatedValue.toFixed(2)} USD (Rango: $${marketInfo.priceMin.toFixed(2)} - $${marketInfo.priceMax.toFixed(2)})
🌟 Estado: Ungraded / Near Mint
📦 Envío seguro en toploader y sobre acolchado con número de rastreo.
✉️ Interesados enviar mensaje directo. #SportsCards #CardCollector #${playerName.replace(/\s+/g, "")} #${brand}`;
  };

  const handleCopySalesTemplate = () => {
    const text = generateSalesPost();
    navigator.clipboard.writeText(text);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  const handleApplyToCard = () => {
    if (card && marketInfo && onApplyValue) {
      onApplyValue(
        card.id,
        marketInfo.estimatedValue,
        "Cotización Online (Mercado Real)",
        {
          team: marketInfo.detectedTeam || team || card.team,
          brand: marketInfo.detectedBrand || brand || card.brand,
          year: marketInfo.detectedYear || year || card.year,
          cardNumber: marketInfo.detectedCardNumber || cardNumber || card.cardNumber,
          playerName: marketInfo.detectedPlayerName || playerName || card.playerName
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Consulta de Precio de Mercado Online
              </h3>
              <p className="text-xs text-slate-400">
                Precios de referencia en tiempo real, historial de ventas y enlaces directos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Controls */}
        <div className="p-5 bg-slate-950/50 border-b border-slate-800 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1">Jugador / Titular *</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Ej: Ken Griffey Jr"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Número</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Ej: #1"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Marca / Set</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ej: Upper Deck"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Año</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ej: 1989"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              {card ? (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5" /> Vinculado a: {card.playerName} (#{card.cardNumber})
                </span>
              ) : (
                "Puedes buscar cualquier tarjeta de tu catálogo o de coleccionistas."
              )}
            </div>

            <button
              onClick={() => fetchMarketPrice()}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              {isLoading ? "Consultando Mercado..." : "Buscar Precios Online"}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-300 font-medium">Analizando cotización de mercado online...</p>
              <p className="text-xs text-slate-500">Consultando eBay, 130Point, Beckett y ventas recientes</p>
            </div>
          )}

          {!isLoading && marketInfo && (
            <>
              {/* Estimated Price Overview Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-bl-xl">
                    PRECIO ESTIMADO (RAW)
                  </div>
                  <span className="text-xs text-slate-400 block mb-1">Estimación Ungraded</span>
                  <div className="text-3xl font-extrabold text-amber-400 flex items-baseline gap-1">
                    ${marketInfo.estimatedValue.toFixed(2)}
                    <span className="text-xs text-slate-400 font-normal">USD</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                    <span>Mín: ${marketInfo.priceMin.toFixed(2)}</span>
                    <span>Máx: ${marketInfo.priceMax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                  <span className="text-xs text-slate-400 block mb-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-blue-400" /> Valores Graduados (PSA)
                  </span>
                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-mono">PSA 9 (Mint):</span>
                      <strong className="text-slate-100">${marketInfo.psa9Value?.toFixed(2) || "N/A"} USD</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-mono">PSA 10 (Gem Mint):</span>
                      <strong className="text-emerald-400 font-bold">${marketInfo.psa10Value?.toFixed(2) || "N/A"} USD</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">Confianza de Mercado</span>
                    <div className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {marketInfo.confidence}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    {marketInfo.marketSummary}
                  </p>
                </div>
              </div>

              {/* Direct Marketplace Links */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-amber-400" />
                  Plataformas de Venta y Comparación Online
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <a
                    href={marketInfo.salesLinks.ebaySold}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">eBay (Ventas Vendidas)</span>
                      <span className="text-[10px] text-slate-500">Historial real completado</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </a>

                  <a
                    href={marketInfo.salesLinks.ebayActive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">eBay (Mercado Activo)</span>
                      <span className="text-[10px] text-slate-500">Publicaciones en curso</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </a>

                  <a
                    href={marketInfo.salesLinks.point130}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">130Point</span>
                      <span className="text-[10px] text-slate-500">Ventas con oferta aceptada</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </a>

                  <a
                    href={marketInfo.salesLinks.beckett}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">Beckett</span>
                      <span className="text-[10px] text-slate-500">Guía de precios oficial</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </a>

                  <a
                    href={marketInfo.salesLinks.comc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">COMC</span>
                      <span className="text-[10px] text-slate-500">Check Out My Cards</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </a>

                  <a
                    href={marketInfo.salesLinks.tcgplayer || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all group flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200 block group-hover:text-amber-400">TCGPlayer / Otros</span>
                      <span className="text-[10px] text-slate-500">Mercado TCG y deportes</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Selling Options & Title Optimizers */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    Herramientas y Opciones de Venta
                  </h4>
                  <button
                    onClick={() => setShowSalesTemplate(!showSalesTemplate)}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {showSalesTemplate ? "Ocultar plantilla" : "Generar plantilla de anuncio"}
                  </button>
                </div>

                {/* Suggested Title */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Título Optimizado para eBay / Marketplace:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={marketInfo.suggestedListingTitle || ""}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 w-full font-mono"
                    />
                    <button
                      onClick={handleCopyTitle}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 flex items-center gap-1"
                    >
                      {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedTitle ? "¡Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>

                {/* Template Generator Modal/Box */}
                {showSalesTemplate && (
                  <div className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                      <span>Plantilla para Publicación de Venta:</span>
                      <button
                        onClick={handleCopySalesTemplate}
                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center gap-1"
                      >
                        {copiedTemplate ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedTemplate ? "Copiado" : "Copiar Texto"}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={5}
                      value={generateSalesPost()}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-mono focus:outline-none"
                    />
                  </div>
                )}

                {/* Selling Tips */}
                {marketInfo.sellingTips && marketInfo.sellingTips.length > 0 && (
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1">Recomendaciones de Venta:</span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {marketInfo.sellingTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>

          {card && marketInfo && onApplyValue && (
            <button
              onClick={handleApplyToCard}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              Aplicar Valor (${marketInfo.estimatedValue.toFixed(2)}) a esta Tarjeta
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
