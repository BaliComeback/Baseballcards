import React, { useState, useEffect, useMemo, useRef } from "react";
import { SavedCard, getSavedCards, deleteSavedCard, updateSavedCard, deleteMultipleSavedCards, batchUpdateSavedCards, deduplicateCollection, saveEntireCollection, clearDatabase } from "../utils/db";
import { Search, Trash2, Download, Filter, LayoutGrid, FileText, X, Edit3, Save, Eye, TrendingUp, DollarSign, PieChart as PieChartIcon, BarChart3, RefreshCw, Sparkles, Image as ImageIcon, Upload, Layers, CheckSquare, Square, Check, ListChecks, Settings2, SlidersHorizontal, FolderDown, Database, Table, Plus, Minus, CheckCircle2 } from "lucide-react";
import { downloadCardImage, downloadCardsZip, exportCardsToCSV, generateCardBackImage } from "../utils/cropUtils";
import { generateCollectionPDF } from "../utils/pdfExport";
import { MarketPriceModal } from "./MarketPriceModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

const BRAND_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export const CollectionDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sideFilter, setSideFilter] = useState<"all" | "front" | "back">("all");
  
  // Interactive filters
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>("all");
  const [customMinPrice, setCustomMinPrice] = useState<string>("");
  const [customMaxPrice, setCustomMaxPrice] = useState<string>("");

  const [isLoading, setIsLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<"front" | "back">("front");

  // Display View switcher & Database Save state
  const [displayView, setDisplayView] = useState<"table" | "grid">("table");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [dbSaveMessage, setDbSaveMessage] = useState<string | null>(null);

  // File input ref for uploading reverse photo
  const uploadReverseInputRef = useRef<HTMLInputElement>(null);

  // Batch selection & edit modal state
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [batchTeam, setBatchTeam] = useState("");
  const [batchBrand, setBatchBrand] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [batchValue, setBatchValue] = useState("");
  const [batchQuantity, setBatchQuantity] = useState("");

  // Market Modal State
  const [marketModalCard, setMarketModalCard] = useState<SavedCard | null>(null);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [isBatchUpdatingPrices, setIsBatchUpdatingPrices] = useState(false);

  // Edit form state
  const [editPlayerName, setEditPlayerName] = useState("");
  const [editCardNumber, setEditCardNumber] = useState("");
  const [editTeam, setEditTeam] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editSide, setEditSide] = useState<"front" | "back" | "unknown">("unknown");
  const [editValue, setEditValue] = useState<string>("0");

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    setIsLoading(true);
    try {
      const saved = await getSavedCards();
      setCards(saved);
    } catch (error) {
      console.error("Failed to load cards", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isCardSelected = (id: string) => selectedCardIds.includes(id);

  const handleToggleSelectCard = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredList: SavedCard[]) => {
    const allIds = filteredList.map((c) => c.id);
    setSelectedCardIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedCardIds([]);
  };

  const handleBatchDelete = async () => {
    if (selectedCardIds.length === 0) {
      alert("Selecciona al menos una tarjeta usando las casillas de verificación para eliminar.");
      return;
    }
    if (confirm(`¿Estás seguro de que deseas eliminar las ${selectedCardIds.length} tarjetas seleccionadas de tu base de datos?`)) {
      const remainingCards = cards.filter((c) => !selectedCardIds.includes(c.id));
      const updated = await saveEntireCollection(remainingCards);
      setCards(updated);
      setSelectedCardIds([]);
      if (selectedCard && selectedCardIds.includes(selectedCard.id)) {
        setSelectedCard(null);
      }
      setDbSaveMessage(`Se eliminaron ${selectedCardIds.length} tarjetas de la base de datos.`);
      setTimeout(() => setDbSaveMessage(null), 4000);
    }
  };

  const handleApplyBatchEdit = async () => {
    if (selectedCardIds.length === 0) return;
    const changes: Partial<SavedCard> = {};
    if (batchTeam.trim()) changes.team = batchTeam.trim();
    if (batchBrand.trim()) changes.brand = batchBrand.trim();
    if (batchYear.trim()) changes.year = batchYear.trim();
    if (batchValue.trim()) {
      const v = parseFloat(batchValue);
      if (!isNaN(v)) changes.estimatedValue = v;
    }
    if (batchQuantity.trim()) {
      const q = parseInt(batchQuantity, 10);
      if (!isNaN(q) && q > 0) changes.quantity = q;
    }

    if (Object.keys(changes).length === 0) {
      alert("Por favor ingresa al menos un campo para modificar.");
      return;
    }

    const updated = await batchUpdateSavedCards(selectedCardIds, changes);
    setCards(updated);
    setIsBatchEditOpen(false);
    setBatchTeam("");
    setBatchBrand("");
    setBatchYear("");
    setBatchValue("");
    setBatchQuantity("");
  };

  const handleBatchSaveZip = () => {
    const selectedCardsList = cards.filter((c) => selectedCardIds.includes(c.id));
    if (selectedCardsList.length > 0) {
      downloadCardsZip(selectedCardsList, `Seleccion_Tarjetas_${selectedCardsList.length}.zip`);
    }
  };

  const handleBatchExportCSV = () => {
    const selectedCardsList = cards.filter((c) => selectedCardIds.includes(c.id));
    if (selectedCardsList.length > 0) {
      exportCardsToCSV(selectedCardsList, `Seleccion_Tarjetas_${selectedCardsList.length}.csv`);
    }
  };

  const handleQuantityChange = (id: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCards((prev) =>
      prev.map((card) => {
        if (card.id === id) {
          const currentQty = card.quantity && card.quantity > 0 ? card.quantity : 1;
          const newQty = Math.max(1, currentQty + delta);
          return { ...card, quantity: newQty };
        }
        return card;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveDatabase = async () => {
    try {
      const savedList = await saveEntireCollection(cards);
      setCards(savedList);
      setHasUnsavedChanges(false);
      setDbSaveMessage("¡Base de datos guardada con éxito! Todos los cambios y cantidades han sido persistidos sin duplicados.");
      setTimeout(() => setDbSaveMessage(null), 4000);
    } catch (err) {
      console.error("Error al guardar la base de datos", err);
      alert("Hubo un error al guardar la base de datos.");
    }
  };

  const handleDeduplicateDB = async () => {
    try {
      const deduplicated = await saveEntireCollection(cards);
      setCards(deduplicated);
      setSelectedCardIds([]);
      setHasUnsavedChanges(false);
      setDbSaveMessage("¡Base de datos optimizada! Se han unificado tarjetas e imágenes duplicadas incrementando su cantidad en inventario.");
      setTimeout(() => setDbSaveMessage(null), 5000);
    } catch (err) {
      console.error("Error al unificar duplicados:", err);
      alert("Hubo un error al optimizar la base de datos.");
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm("¿Seguro que quieres eliminar esta tarjeta de tu base de datos?")) {
      const updated = await deleteSavedCard(id);
      setCards(updated);
      setSelectedCardIds((prev) => prev.filter((i) => i !== id));
      if (selectedCard?.id === id) {
        setSelectedCard(null);
      }
      setDbSaveMessage("Tarjeta eliminada de la base de datos con éxito.");
      setTimeout(() => setDbSaveMessage(null), 3000);
    }
  };

  const handleClearAll = async () => {
    if (confirm("¿Estás seguro de que deseas ELIMINAR TODA tu colección guardada? Esta acción no se puede deshacer.")) {
      await clearDatabase();
      setCards([]);
      setSelectedCard(null);
    }
  };

  const handleDownloadAllZip = () => {
    if (cards.length > 0) {
      downloadCardsZip(cards, "Mi_Coleccion_Completa.zip");
    }
  };

  const handleExportCSV = () => {
    if (cards.length > 0) {
      exportCardsToCSV(cards, "Mi_Coleccion_Completa.csv");
    }
  };

  const openDetailModal = (card: SavedCard) => {
    setSelectedCard(card);
    setEditPlayerName(card.playerName);
    setEditCardNumber(card.cardNumber);
    setEditTeam(card.team || "");
    setEditBrand(card.brand || "");
    setEditYear(card.year || "");
    setEditSide(card.side || "unknown");
    setEditValue(card.estimatedValue ? String(card.estimatedValue) : "0");
    setIsEditing(false);
    setActiveSideTab("front");
  };

  const handleSaveCardEdits = async () => {
    if (!selectedCard) return;
    const numValue = parseFloat(editValue) || 0;
    const updated: SavedCard = {
      ...selectedCard,
      playerName: editPlayerName,
      cardNumber: editCardNumber,
      team: editTeam,
      brand: editBrand,
      year: editYear,
      side: editSide,
      estimatedValue: numValue,
    };
    const newCollection = await updateSavedCard(updated);
    setCards(newCollection);
    setSelectedCard(updated);
    setIsEditing(false);
  };

  // Generate opposite side (Reverso) automatically using canvas AI renderer
  const handleGenerateReverseSide = async (card: SavedCard) => {
    try {
      const backDataUrl = generateCardBackImage(card);
      const updated: SavedCard = {
        ...card,
        oppositeSideCroppedUrl: backDataUrl
      };
      const newCollection = await updateSavedCard(updated);
      setCards(newCollection);
      if (selectedCard?.id === card.id) {
        setSelectedCard(updated);
        setActiveSideTab("back");
      }
    } catch (e) {
      console.error("Error al generar reverso automáticamente", e);
    }
  };

  // Upload user's photo for the opposite side
  const handleUploadReversePhoto = (card: SavedCard, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updated: SavedCard = {
          ...card,
          oppositeSideCroppedUrl: dataUrl
        };
        const newCollection = await updateSavedCard(updated);
        setCards(newCollection);
        if (selectedCard?.id === card.id) {
          setSelectedCard(updated);
          setActiveSideTab("back");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyMarketValue = async (
    cardId: string,
    value: number,
    source?: string,
    updatedData?: { team?: string; brand?: string; year?: string; cardNumber?: string; playerName?: string }
  ) => {
    const target = cards.find(c => c.id === cardId);
    if (!target) return;
    const updated: SavedCard = {
      ...target,
      estimatedValue: value,
      marketSource: source || "Mercado Online IA",
      marketLastUpdated: Date.now(),
      ...(updatedData?.team ? { team: updatedData.team } : {}),
      ...(updatedData?.brand ? { brand: updatedData.brand } : {}),
      ...(updatedData?.year ? { year: updatedData.year } : {}),
      ...(updatedData?.cardNumber ? { cardNumber: updatedData.cardNumber } : {}),
      ...(updatedData?.playerName ? { playerName: updatedData.playerName } : {})
    };
    const newCollection = await updateSavedCard(updated);
    setCards(newCollection);
    if (selectedCard?.id === cardId) {
      setSelectedCard(updated);
      setEditValue(String(value));
      if (updatedData?.team) setEditTeam(updatedData.team);
      if (updatedData?.brand) setEditBrand(updatedData.brand);
      if (updatedData?.year) setEditYear(updatedData.year);
      if (updatedData?.cardNumber) setEditCardNumber(updatedData.cardNumber);
      if (updatedData?.playerName) setEditPlayerName(updatedData.playerName);
    }
    setIsMarketModalOpen(false);
  };

  // Batch update estimated prices for all cards in collection
  const handleBatchUpdatePrices = async () => {
    if (cards.length === 0) return;
    setIsBatchUpdatingPrices(true);
    try {
      let updatedCollection = [...cards];
      for (let i = 0; i < updatedCollection.length; i++) {
        const card = updatedCollection[i];
        try {
          const res = await fetch("/api/card-market-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playerName: card.playerName,
              cardNumber: card.cardNumber,
              brand: card.brand,
              year: card.year,
              team: card.team
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.estimatedValue) {
              const updatedCard: SavedCard = {
                ...card,
                estimatedValue: data.estimatedValue,
                estimatedPriceMin: data.priceMin,
                estimatedPriceMax: data.priceMax,
                marketSource: "eBay/130Point (Auto IA)",
                marketLastUpdated: Date.now(),
                // Fill missing details automatically
                ...(data.detectedTeam && (!card.team || card.team === "Desconocido") ? { team: data.detectedTeam } : {}),
                ...(data.detectedBrand && (!card.brand || card.brand === "Desconocido") ? { brand: data.detectedBrand } : {}),
                ...(data.detectedYear && (!card.year || card.year === "Desconocido") ? { year: data.detectedYear } : {}),
                ...(data.detectedCardNumber && (!card.cardNumber || card.cardNumber === "S/N") ? { cardNumber: data.detectedCardNumber } : {}),
                ...(data.detectedPlayerName && (!card.playerName || card.playerName === "Jugador Desconocido") ? { playerName: data.detectedPlayerName } : {})
              };
              updatedCollection = await updateSavedCard(updatedCard);
              setCards(updatedCollection);
            }
          }
        } catch (e) {
          console.warn("Skip card batch update error", card.playerName, e);
        }
        // Small delay between batch calls to avoid triggering API rate limits
        if (i < updatedCollection.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    } finally {
      setIsBatchUpdatingPrices(false);
    }
  };

  // Unique lists for team & year selectors
  const uniqueTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    cards.forEach(c => {
      if (c.team && c.team.trim() && c.team.trim() !== "Desconocido") {
        teamsSet.add(c.team.trim());
      }
    });
    return Array.from(teamsSet).sort((a, b) => a.localeCompare(b));
  }, [cards]);

  const uniqueYears = useMemo(() => {
    const yearsSet = new Set<string>();
    cards.forEach(c => {
      if (c.year && c.year.trim() && c.year.trim() !== "Desconocido") {
        yearsSet.add(c.year.trim());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [cards]);

  // Main Card Filtering Logic
  const filteredCards = cards.filter((card) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      card.playerName.toLowerCase().includes(query) ||
      card.cardNumber.toLowerCase().includes(query) ||
      (card.team && card.team.toLowerCase().includes(query)) ||
      (card.brand && card.brand.toLowerCase().includes(query)) ||
      (card.sourceImageName && card.sourceImageName.toLowerCase().includes(query));

    const matchesSide =
      sideFilter === "all" ||
      (sideFilter === "front" && card.side === "front") ||
      (sideFilter === "back" && card.side === "back");

    const matchesTeam =
      teamFilter === "all" || (card.team && card.team.trim().toLowerCase() === teamFilter.toLowerCase());

    const matchesYear =
      yearFilter === "all" || (card.year && card.year.trim().toLowerCase() === yearFilter.toLowerCase());

    let matchesPrice = true;
    const val = card.estimatedValue || 0;
    if (priceRangeFilter === "0-5") matchesPrice = val >= 0 && val <= 5;
    else if (priceRangeFilter === "5-20") matchesPrice = val > 5 && val <= 20;
    else if (priceRangeFilter === "20-50") matchesPrice = val > 20 && val <= 50;
    else if (priceRangeFilter === "50-100") matchesPrice = val > 50 && val <= 100;
    else if (priceRangeFilter === "100+") matchesPrice = val > 100;
    else if (priceRangeFilter === "custom") {
      const min = parseFloat(customMinPrice);
      const max = parseFloat(customMaxPrice);
      if (!isNaN(min) && val < min) matchesPrice = false;
      if (!isNaN(max) && val > max) matchesPrice = false;
    }

    return matchesSearch && matchesSide && matchesTeam && matchesYear && matchesPrice;
  });

  const hasActiveFilters =
    searchQuery !== "" ||
    sideFilter !== "all" ||
    teamFilter !== "all" ||
    yearFilter !== "all" ||
    priceRangeFilter !== "all" ||
    customMinPrice !== "" ||
    customMaxPrice !== "";

  const resetAllFilters = () => {
    setSearchQuery("");
    setSideFilter("all");
    setTeamFilter("all");
    setYearFilter("all");
    setPriceRangeFilter("all");
    setCustomMinPrice("");
    setCustomMaxPrice("");
  };

  const filteredTotalValue = useMemo(() => {
    return filteredCards.reduce((sum, c) => sum + (c.estimatedValue || 0) * (c.quantity && c.quantity > 0 ? c.quantity : 1), 0);
  }, [filteredCards]);

  const filteredTotalQty = useMemo(() => {
    return filteredCards.reduce((sum, c) => sum + (c.quantity && c.quantity > 0 ? c.quantity : 1), 0);
  }, [filteredCards]);

  // Calculate stats & aggregations
  const totalCardsCount = useMemo(() => {
    return cards.reduce((sum, c) => sum + (c.quantity && c.quantity > 0 ? c.quantity : 1), 0);
  }, [cards]);

  const totalEstimatedValue = useMemo(() => {
    return cards.reduce((sum, c) => sum + (c.estimatedValue || 0) * (c.quantity && c.quantity > 0 ? c.quantity : 1), 0);
  }, [cards]);

  const avgCardValue = totalCardsCount > 0 ? totalEstimatedValue / totalCardsCount : 0;
  const uniquePlayers = new Set(cards.map((c) => c.playerName.trim().toLowerCase())).size;

  // Year Distribution Chart Data
  const yearDistributionData = useMemo(() => {
    const yearMap: { [year: string]: { year: string; count: number; totalValue: number } } = {};

    cards.forEach((card) => {
      let rawYear = (card.year || "").trim();
      const match = rawYear.match(/\b(19\d\d|20\d\d)\b/);
      const cleanYear = match ? match[1] : rawYear || "Sin Año";

      if (!yearMap[cleanYear]) {
        yearMap[cleanYear] = { year: cleanYear, count: 0, totalValue: 0 };
      }
      yearMap[cleanYear].count += 1;
      yearMap[cleanYear].totalValue += card.estimatedValue || 0;
    });

    return Object.values(yearMap).sort((a, b) => {
      if (a.year === "Sin Año") return 1;
      if (b.year === "Sin Año") return -1;
      return a.year.localeCompare(b.year);
    });
  }, [cards]);

  // Brand Distribution Chart Data
  const brandDistributionData = useMemo(() => {
    const brandMap: { [brand: string]: number } = {};

    cards.forEach((card) => {
      let b = (card.brand || "").trim() || "Otra/No Esp.";
      brandMap[b] = (brandMap[b] || 0) + 1;
    });

    return Object.entries(brandMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);
  }, [cards]);

  return (
    <div className="space-y-6">
      {/* Header and top actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-6 h-6 text-emerald-400" />
            Tablero "Base de Datos"
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gestión completa de inventario en base de datos. Control de stock sin duplicados, edición masiva y cotizaciones online.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Boton de Guardar Base de Datos */}
          <button
            onClick={handleSaveDatabase}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
              hasUnsavedChanges
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-400/50 animate-pulse"
                : "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30"
            }`}
            title="Guardar todos los cambios realizados en la base de datos local"
          >
            <Save className="w-4 h-4" />
            <span>Boton de Guardar Base de Datos</span>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => {
              setMarketModalCard(null);
              setIsMarketModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            Consulta de Mercado Online
          </button>

          {cards.length > 0 && (
            <button
              onClick={handleBatchUpdatePrices}
              disabled={isBatchUpdatingPrices}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Obtener la cotización estimada de todas las tarjetas registradas"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isBatchUpdatingPrices ? "animate-spin" : ""}`} />
              {isBatchUpdatingPrices ? "Cotizando Lote..." : "Cotizar Precios Online"}
            </button>
          )}

          {cards.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors"
            >
              Vaciar Colección
            </button>
          )}

          <button
            onClick={() => generateCollectionPDF(cards)}
            disabled={cards.length === 0}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            title="Exportar resumen de inventario con fotos en PDF"
          >
            <FileText className="w-4 h-4" />
            Resumen PDF
          </button>
          <button
            onClick={handleExportCSV}
            disabled={cards.length === 0}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            CSV
          </button>
          <button
            onClick={handleDownloadAllZip}
            disabled={cards.length === 0}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            ZIP
          </button>
        </div>
      </div>

      {/* Save Notification Banner */}
      {dbSaveMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-2xl flex items-center gap-3 text-xs font-semibold shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="flex-1">{dbSaveMessage}</span>
          <button onClick={() => setDbSaveMessage(null)} className="text-emerald-400 hover:text-white font-bold text-sm px-1">✕</button>
        </div>
      )}

      {/* Stats KPI Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4 text-amber-400" /> Total de Tarjetas
          </p>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">{totalCardsCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Guardadas en base de datos local</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Valor Estimado Acumulado
          </p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">
            ${totalEstimatedValue.toFixed(2)} <span className="text-xs text-slate-400 font-normal">USD</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Basado en cotización de mercado online</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Promedio por Tarjeta
          </p>
          <p className="text-3xl font-extrabold text-slate-100 mt-2">
            ${avgCardValue.toFixed(2)} <span className="text-xs text-slate-400 font-normal">USD</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Valor promedio en estado Raw/Ungraded</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" /> Jugadores Únicos
          </p>
          <p className="text-3xl font-extrabold text-slate-100 mt-2">{uniquePlayers}</p>
          <p className="text-[11px] text-slate-500 mt-1">Diversidad en la colección</p>
        </div>
      </div>



      {/* Interactive Search & Filter Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-xl">
        <div className="flex flex-col lg:flex-row items-center gap-3">
          {/* Main Search Input */}
          <div className="flex-1 flex items-center gap-2.5 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 w-full focus-within:border-amber-500 transition-colors">
            <Search className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por jugador, número, equipo, marca o archivo..."
              className="bg-transparent border-none focus:outline-none text-slate-200 text-xs w-full"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-slate-500 hover:text-slate-300 text-xs">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Selects */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto shrink-0">
            {/* Team Filter */}
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">🏆 Todos los equipos</option>
              {uniqueTeams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Release Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">📅 Todos los años</option>
              {uniqueYears.map((y) => (
                <option key={y} value={y}>
                  Año {y}
                </option>
              ))}
            </select>

            {/* Price Range Filter */}
            <select
              value={priceRangeFilter}
              onChange={(e) => setPriceRangeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">💵 Todos los precios</option>
              <option value="0-5">Menos de $5 USD</option>
              <option value="5-20">$5 - $20 USD</option>
              <option value="20-50">$20 - $50 USD</option>
              <option value="50-100">$50 - $100 USD</option>
              <option value="100+">Más de $100 USD</option>
              <option value="custom">Rango Personalizado</option>
            </select>

            {/* Side Filter */}
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">📑 Frente y Reverso</option>
              <option value="front">Solo Frente</option>
              <option value="back">Solo Reverso</option>
            </select>
          </div>
        </div>

        {/* Custom Price Range Inputs if selected */}
        {priceRangeFilter === "custom" && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400">Rango de Precio ($ USD):</span>
            <input
              type="number"
              placeholder="Mín $"
              value={customMinPrice}
              onChange={(e) => setCustomMinPrice(e.target.value)}
              className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:border-amber-500 focus:outline-none"
            />
            <span className="text-slate-500">—</span>
            <input
              type="number"
              placeholder="Máx $"
              value={customMaxPrice}
              onChange={(e) => setCustomMaxPrice(e.target.value)}
              className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
        )}

        {/* Active Filter Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-semibold text-slate-200">
              {filteredCards.length} {filteredCards.length === 1 ? "tarjeta mostrada" : "tarjetas mostradas"}
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">
              ${filteredTotalValue.toFixed(2)} USD acumulados en selección
            </span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold text-[11px] transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Batch Operations, Selection Toolbar & View Switcher */}
      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: View Switcher & Selection Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 mr-1">
            <button
              onClick={() => setDisplayView("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                displayView === "table"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Tabla BD
            </button>
            <button
              onClick={() => setDisplayView("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                displayView === "grid"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Galería
            </button>
          </div>

          <button
            onClick={() => handleSelectAll(filteredCards)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            Seleccionar Todo ({filteredCards.length})
          </button>

          {selectedCardIds.length > 0 && (
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              Deseleccionar
            </button>
          )}

          <span className="text-xs font-semibold text-slate-300 ml-1">
            {selectedCardIds.length > 0 ? (
              <span className="text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                {selectedCardIds.length} seleccionadas
              </span>
            ) : (
              <span className="text-slate-500">Ninguna seleccionada</span>
            )}
          </span>
        </div>

        {/* Right: Action Buttons (Guardar Base de Datos, Modificar, Eliminar, Limpiar Duplicados) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Boton de Guardar Base de Datos */}
          <button
            onClick={handleSaveDatabase}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
              hasUnsavedChanges
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 ring-2 ring-emerald-400/50 animate-pulse"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40"
            }`}
            title="Guardar cambios pendientes directamente en la Base de Datos"
          >
            <Save className="w-3.5 h-3.5" />
            Boton de Guardar Base de Datos
            {hasUnsavedChanges && <span className="w-2 h-2 rounded-full bg-amber-400" />}
          </button>

          {/* Boton de Modificar Seleccionadas */}
          <button
            onClick={() => {
              if (selectedCardIds.length === 0) {
                alert("Selecciona al menos una tarjeta para modificar.");
                return;
              }
              setIsBatchEditOpen(true);
            }}
            disabled={selectedCardIds.length === 0}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedCardIds.length > 0
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer"
                : "bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed"
            }`}
            title="Boton de Modificar: Modificar información de las tarjetas seleccionadas"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Boton de Modificar
          </button>

          {/* Boton de Eliminar Seleccionadas */}
          <button
            onClick={handleBatchDelete}
            disabled={selectedCardIds.length === 0}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedCardIds.length > 0
                ? "bg-red-500 hover:bg-red-400 text-white shadow-md cursor-pointer"
                : "bg-slate-800/50 text-slate-600 border border-slate-800 cursor-not-allowed"
            }`}
            title="Boton de Eliminar: Eliminar las tarjetas seleccionadas de la base de datos"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Boton de Eliminar
          </button>

          {/* Boton Limpieza Base de Datos No Duplicados */}
          <button
            onClick={handleDeduplicateDB}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
            title="Optimizar base de datos: Unificar tarjetas e imágenes duplicadas"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            Limpiar Duplicados BD
          </button>
        </div>
      </div>

      {/* Cards Display Section (Table or Grid) */}
      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Cargando colección...</div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
          <p className="text-slate-400 text-sm">
            {hasActiveFilters
              ? "No se encontraron tarjetas que coincidan con los filtros seleccionados."
              : "Tu base de datos está vacía. Ve al escáner para registrar nuevas tarjetas."}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="mt-3 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs border border-slate-700"
            >
              Restablecer Filtros
            </button>
          )}
        </div>
      ) : displayView === "table" ? (
        /* Data Table View for Database Board */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <button
                      onClick={() => {
                        if (selectedCardIds.length === filteredCards.length) {
                          handleDeselectAll();
                        } else {
                          handleSelectAll(filteredCards);
                        }
                      }}
                      className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
                      title="Seleccionar Todo / Deseleccionar Todo"
                    >
                      {selectedCardIds.length > 0 && selectedCardIds.length === filteredCards.length ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 w-16">Imagen</th>
                  <th className="p-3">Jugador / Título</th>
                  <th className="p-3 w-20"># Tarjeta</th>
                  <th className="p-3">Equipo / Colección</th>
                  <th className="p-3">Marca / Set</th>
                  <th className="p-3 w-20">Año</th>
                  <th className="p-3 w-32 text-center">Inventario</th>
                  <th className="p-3 w-28 text-right">Valor Est. ($)</th>
                  <th className="p-3 w-28 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                {filteredCards.map((card) => {
                  const selected = isCardSelected(card.id);
                  const quantity = card.quantity && card.quantity > 0 ? card.quantity : 1;
                  return (
                    <tr
                      key={card.id}
                      onClick={() => openDetailModal(card)}
                      className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        selected ? "bg-amber-500/10 hover:bg-amber-500/15" : ""
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggleSelectCard(card.id, e)}
                          className={`p-1 rounded border transition-colors ${
                            selected
                              ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                              : "bg-slate-900 text-slate-400 hover:text-white border-slate-700"
                          }`}
                        >
                          {selected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Square className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      <td className="p-2">
                        <div className="w-10 h-12 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {card.croppedDataUrl ? (
                            <img src={card.croppedDataUrl} alt={card.playerName} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                      </td>

                      <td className="p-3 font-bold text-slate-100">
                        <div className="flex flex-col">
                          <span>{card.playerName}</span>
                          {card.oppositeSideCroppedUrl && (
                            <span className="text-[10px] text-blue-400 font-normal">Frente y Reverso</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 font-mono text-amber-400">
                        #{card.cardNumber}
                      </td>

                      <td className="p-3 text-slate-300">
                        {card.team || "—"}
                      </td>

                      <td className="p-3 text-slate-300">
                        {card.brand || "—"}
                      </td>

                      <td className="p-3 text-slate-400 font-mono">
                        {card.year || "—"}
                      </td>

                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 shadow-inner">
                          <button
                            onClick={(e) => handleQuantityChange(card.id, -1, e)}
                            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Disminuir cantidad en inventario"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-1.5 text-xs font-extrabold text-amber-400 font-mono">
                            x{quantity}
                          </span>
                          <button
                            onClick={(e) => handleQuantityChange(card.id, 1, e)}
                            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            title="Aumentar cantidad en inventario"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                        ${(card.estimatedValue || 0).toFixed(2)}
                      </td>

                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetailModal(card)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 text-slate-300 hover:text-slate-950 transition-colors"
                            title="Editar información"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setMarketModalCard(card);
                              setIsMarketModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 text-slate-300 hover:text-slate-950 transition-colors"
                            title="Cotizar en Mercado Online"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-amber-400 hover:text-slate-950" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(card.id, e)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500 text-slate-300 hover:text-white transition-colors"
                            title="Eliminar de BD"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Gallery Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredCards.map((card) => {
            const selected = isCardSelected(card.id);
            return (
              <div
                key={card.id}
                onClick={() => openDetailModal(card)}
                className={`group bg-slate-900 border rounded-2xl overflow-hidden transition-all cursor-pointer flex flex-col hover:shadow-lg ${
                  selected
                    ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5 shadow-amber-500/10"
                    : "border-slate-800 hover:border-amber-500/50 hover:shadow-amber-500/5"
                }`}
              >
                <div className="p-2 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                  <div className="flex items-center gap-1.5">
                    {/* Checkbox Selector Button */}
                    <button
                      onClick={(e) => handleToggleSelectCard(card.id, e)}
                      className={`p-1 rounded border transition-colors ${
                        selected
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                          : "bg-slate-900/80 text-slate-400 hover:text-white border-slate-700"
                      }`}
                      title={selected ? "Deseleccionar" : "Seleccionar"}
                    >
                      {selected ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      #{card.cardNumber}
                    </span>
                    {(card.quantity || 1) > 1 && (
                      <span className="text-[10px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full shadow">
                        x{card.quantity}
                      </span>
                    )}
                    {card.oppositeSideCroppedUrl && (
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/20" title="Tiene imagen de Frente y Reverso">
                        2 Lados
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    ${(card.estimatedValue || 0).toFixed(2)}
                  </span>
                </div>

                <div className="relative aspect-[3/4] bg-slate-950 flex items-center justify-center p-2">
                  {card.croppedDataUrl ? (
                    <img src={card.croppedDataUrl} alt={card.playerName} className="max-w-full max-h-full object-contain shadow-md" />
                  ) : (
                    <div className="text-xs text-slate-600">Sin imagen</div>
                  )}

                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMarketModalCard(card);
                        setIsMarketModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-900/90 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded shadow border border-slate-700 transition-colors"
                      title="Cotizar en Mercado Online"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadCardImage(card.croppedDataUrl || "", card.customFilename || `${card.playerName}.png`);
                      }}
                      className="p-1.5 bg-slate-900/90 hover:bg-emerald-500 text-slate-300 hover:text-white rounded shadow border border-slate-700 transition-colors"
                      title="Descargar PNG"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(card.id, e)}
                      className="p-1.5 bg-slate-900/90 hover:bg-red-500 text-slate-300 hover:text-white rounded shadow border border-slate-700 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 leading-tight mb-1 group-hover:text-amber-400 transition-colors">
                    {card.playerName}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {card.year ? `${card.year} ` : ""}{card.brand} {card.team ? `• ${card.team}` : ""}
                  </p>
                </div>
                <div className="text-[9px] text-slate-500 mt-2 flex justify-between items-center border-t border-slate-800/80 pt-2">
                  <span>{new Date(card.savedAt).toLocaleDateString()}</span>
                  <span className="text-amber-400 text-[10px] flex items-center gap-0.5">
                    <Eye className="w-3 h-3" /> Ver
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Card Detail & Edit Modal with Dual-Side View & Auto Reverse Generator */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>{selectedCard.playerName}</span>
                  <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    #{selectedCard.cardNumber}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Origen: {selectedCard.sourceImageName || "Desconocido"}</p>
              </div>

              <button
                onClick={() => setSelectedCard(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Image Viewer & Opposite Side Actions */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-between min-h-[300px]">
                {/* Side Selector Tabs */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs w-full justify-center mb-3">
                  <button
                    onClick={() => setActiveSideTab("front")}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                      activeSideTab === "front" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Frente
                  </button>
                  <button
                    onClick={() => setActiveSideTab("back")}
                    className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1 ${
                      activeSideTab === "back" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Reverso
                    {selectedCard.oppositeSideCroppedUrl && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                </div>

                {/* Display Current Image according to Active Tab */}
                <div className="flex-1 flex items-center justify-center w-full min-h-[200px]">
                  {activeSideTab === "front" ? (
                    selectedCard.croppedDataUrl ? (
                      <img
                        src={selectedCard.croppedDataUrl}
                        alt="Frente"
                        className="max-h-[220px] w-auto object-contain rounded-lg shadow-lg border border-slate-800"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">Sin imagen del frente</span>
                    )
                  ) : selectedCard.oppositeSideCroppedUrl ? (
                    <img
                      src={selectedCard.oppositeSideCroppedUrl}
                      alt="Reverso"
                      className="max-h-[220px] w-auto object-contain rounded-lg shadow-lg border border-slate-800"
                    />
                  ) : (
                    <div className="text-center p-4 space-y-3">
                      <p className="text-xs text-slate-400">Esta tarjeta no tiene imagen del reverso cargada.</p>
                      <button
                        onClick={() => handleGenerateReverseSide(selectedCard)}
                        className="w-full px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4" /> Generar Reverso (IA/Estadísticas)
                      </button>
                      <button
                        onClick={() => uploadReverseInputRef.current?.click()}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-400" /> Subir Foto del Reverso
                      </button>
                    </div>
                  )}
                </div>

                {/* Hidden File Input for uploading reverse */}
                <input
                  type="file"
                  ref={uploadReverseInputRef}
                  onChange={(e) => handleUploadReversePhoto(selectedCard, e)}
                  accept="image/*"
                  className="hidden"
                />

                {/* Bottom Actions for Images */}
                <div className="w-full mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setMarketModalCard(selectedCard);
                      setIsMarketModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Cotizar Mercado Online
                  </button>

                  {!selectedCard.oppositeSideCroppedUrl && activeSideTab === "back" && (
                    <span className="text-[10px] text-slate-500">
                      Puedes generar o subir la imagen del lado opuesto.
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Nombre del Jugador</label>
                      <input
                        type="text"
                        value={editPlayerName}
                        onChange={(e) => setEditPlayerName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Número de Tarjeta</label>
                      <input
                        type="text"
                        value={editCardNumber}
                        onChange={(e) => setEditCardNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Equipo</label>
                        <input
                          type="text"
                          value={editTeam}
                          onChange={(e) => setEditTeam(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Marca / Set</label>
                        <input
                          type="text"
                          value={editBrand}
                          onChange={(e) => setEditBrand(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">Año</label>
                        <input
                          type="text"
                          value={editYear}
                          onChange={(e) => setEditYear(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Valor Est. ($ USD)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-400 block">Jugador:</span>
                      <strong className="text-sm text-slate-100">{selectedCard.playerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Valor Estimado de Mercado:</span>
                      <strong className="text-base text-emerald-400 font-bold">
                        ${(selectedCard.estimatedValue || 0).toFixed(2)} USD
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Número de Tarjeta:</span>
                      <strong className="text-amber-400 font-mono">#{selectedCard.cardNumber}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Equipo:</span>
                      <span className="text-slate-200">{selectedCard.team || "No especificado"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Marca / Set:</span>
                      <span className="text-slate-200">{selectedCard.brand || "No especificada"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Año:</span>
                      <span className="text-slate-200">{selectedCard.year || "No especificado"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {selectedCard.croppedDataUrl && (
                  <button
                    onClick={() =>
                      downloadCardImage(
                        selectedCard.croppedDataUrl || "",
                        `${selectedCard.playerName}_Frente.png`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                    title="Descargar imagen del frente"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Frente PNG
                  </button>
                )}

                {selectedCard.oppositeSideCroppedUrl && (
                  <button
                    onClick={() =>
                      downloadCardImage(
                        selectedCard.oppositeSideCroppedUrl || "",
                        `${selectedCard.playerName}_Reverso.png`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                    title="Descargar imagen del reverso"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    Reverso PNG
                  </button>
                )}

                {selectedCard.croppedDataUrl && selectedCard.oppositeSideCroppedUrl && (
                  <button
                    onClick={() => {
                      downloadCardsZip([
                        { ...selectedCard, croppedDataUrl: selectedCard.croppedDataUrl, customFilename: `${selectedCard.playerName}_Frente.png` },
                        { ...selectedCard, croppedDataUrl: selectedCard.oppositeSideCroppedUrl, customFilename: `${selectedCard.playerName}_Reverso.png` }
                      ], `${selectedCard.playerName}_Frente_y_Reverso.zip`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    title="Descargar frente y reverso comprimidos en un archivo ZIP"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Ambos Lados (ZIP)
                  </button>
                )}

                <button
                  onClick={(e) => handleDelete(selectedCard.id, e)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>

              <div>
                {isEditing ? (
                  <button
                    onClick={handleSaveCardEdits}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Guardar
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    Editar Datos
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Edit Modal */}
      {isBatchEditOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" /> Modificar {selectedCardIds.length} Tarjetas
              </h3>
              <button onClick={() => setIsBatchEditOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ingresa los nuevos datos que deseas asignar a las {selectedCardIds.length} tarjetas seleccionadas. Los campos que dejes en blanco se mantendrán sin cambios.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Equipo / Colección</label>
                <input
                  type="text"
                  placeholder="Ej: Chicago Bulls"
                  value={batchTeam}
                  onChange={(e) => setBatchTeam(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Marca / Set</label>
                <input
                  type="text"
                  placeholder="Ej: Topps Chrome"
                  value={batchBrand}
                  onChange={(e) => setBatchBrand(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Año</label>
                  <input
                    type="text"
                    placeholder="Ej: 1996"
                    value={batchYear}
                    onChange={(e) => setBatchYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Cantidad / Stock</label>
                  <input
                    type="number"
                    placeholder="Ej: 1"
                    value={batchQuantity}
                    onChange={(e) => setBatchQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Precio Estimado ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 25.00"
                  value={batchValue}
                  onChange={(e) => setBatchValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsBatchEditOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyBatchEdit}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
              >
                Guardar Modificaciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Market Price Modal Component */}
      <MarketPriceModal
        card={marketModalCard}
        isOpen={isMarketModalOpen}
        onClose={() => setIsMarketModalOpen(false)}
        onApplyValue={handleApplyMarketValue}
      />
    </div>
  );
};
