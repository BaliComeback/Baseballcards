import React, { useState, useEffect, useMemo } from "react";
import { SavedCard, getSavedCards } from "../utils/db";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  DollarSign,
  Sparkles,
  LayoutGrid,
  FileText,
  RefreshCw,
  Trophy,
  Award,
  Download,
  Calendar,
  Layers,
  ArrowUpRight
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { generateCollectionPDF } from "../utils/pdfExport";

const BRAND_COLORS = [
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#64748b"  // Slate
];

interface AnalyticsDashboardProps {
  onGoToDatabase?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onGoToDatabase }) => {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDatabase = async () => {
    setIsLoading(true);
    try {
      const dbCards = await getSavedCards();
      setCards(dbCards);
    } catch (err) {
      console.error("Error al cargar tarjetas para analíticas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Compute metrics
  const totalCardsCount = useMemo(() => {
    return cards.reduce((sum, c) => sum + (c.quantity && c.quantity > 0 ? c.quantity : 1), 0);
  }, [cards]);

  const totalEstimatedValue = useMemo(() => {
    return cards.reduce((sum, c) => {
      const qty = c.quantity && c.quantity > 0 ? c.quantity : 1;
      const val = c.estimatedValue || 0;
      return sum + val * qty;
    }, 0);
  }, [cards]);

  const avgCardValue = useMemo(() => {
    if (cards.length === 0) return 0;
    return totalEstimatedValue / (totalCardsCount || 1);
  }, [totalEstimatedValue, totalCardsCount, cards.length]);

  const uniquePlayers = useMemo(() => {
    const set = new Set(cards.map((c) => (c.playerName || "").toLowerCase().trim()).filter(Boolean));
    return set.size;
  }, [cards]);

  // Top Most Valuable Card
  const topValuedCard = useMemo(() => {
    if (cards.length === 0) return null;
    return [...cards].sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))[0];
  }, [cards]);

  // Top 5 Valuable Cards
  const top5ValuableCards = useMemo(() => {
    return [...cards]
      .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0))
      .slice(0, 5);
  }, [cards]);

  // Distribution by Year / Season
  const yearDistributionData = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number }> = {};
    cards.forEach((c) => {
      const yearStr = c.year && c.year.trim().length > 0 ? c.year.trim() : "Sin Año";
      const qty = c.quantity && c.quantity > 0 ? c.quantity : 1;
      const val = (c.estimatedValue || 0) * qty;

      if (!map[yearStr]) {
        map[yearStr] = { count: 0, totalValue: 0 };
      }
      map[yearStr].count += qty;
      map[yearStr].totalValue += val;
    });

    return Object.entries(map)
      .map(([year, data]) => ({
        year,
        count: data.count,
        totalValue: data.totalValue
      }))
      .sort((a, b) => {
        if (a.year === "Sin Año") return 1;
        if (b.year === "Sin Año") return -1;
        return a.year.localeCompare(b.year);
      });
  }, [cards]);

  // Distribution by Brand / Manufacturer
  const brandDistributionData = useMemo(() => {
    const map: Record<string, number> = {};
    cards.forEach((c) => {
      const brandStr = c.brand && c.brand.trim().length > 0 ? c.brand.trim() : "Sin Marca";
      const qty = c.quantity && c.quantity > 0 ? c.quantity : 1;
      map[brandStr] = (map[brandStr] || 0) + qty;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [cards]);

  // Distribution by Team
  const teamDistributionData = useMemo(() => {
    const map: Record<string, number> = {};
    cards.forEach((c) => {
      const teamStr = c.team && c.team.trim().length > 0 ? c.team.trim() : "Sin Equipo / Varios";
      const qty = c.quantity && c.quantity > 0 ? c.quantity : 1;
      map[teamStr] = (map[teamStr] || 0) + qty;
    });

    return Object.entries(map)
      .map(([team, value]) => ({ team, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [cards]);

  const handleExportPDF = () => {
    generateCollectionPDF(cards);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            Tablero de Estadísticas y Gráficas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Análisis visual en tiempo real, valoración acumulada y distribución de marcas y temporadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadDatabase}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
            title="Recargar datos de la base de datos"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" />
            Actualizar Gráficas
          </button>

          <button
            onClick={handleExportPDF}
            disabled={cards.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${
              cards.length > 0
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer"
                : "bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed"
            }`}
            title="Generar resumen de inventario con fotos en PDF"
          >
            <FileText className="w-4 h-4" />
            Exportar Resumen PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-slate-400">Cargando análisis y estadísticas...</div>
      ) : cards.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-lg space-y-4">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200">No hay datos en la Base de Datos</h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            Escanea nuevas tarjetas o abre el tablero de base de datos para guardar tus primeros ítems coleccionables.
          </p>
          {onGoToDatabase && (
            <button
              onClick={onGoToDatabase}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              Ir a la Base de Datos
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Main KPI Stats Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-amber-400" /> Total Stock Tarjetas
              </p>
              <p className="text-3xl font-extrabold text-amber-400 mt-2">{totalCardsCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">{cards.length} ítems únicos</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Valor Total Estimado
              </p>
              <p className="text-3xl font-extrabold text-emerald-400 mt-2">
                ${totalEstimatedValue.toFixed(2)} <span className="text-xs text-slate-400 font-normal">USD</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Cotización mercado online IA</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Promedio por Tarjeta
              </p>
              <p className="text-3xl font-extrabold text-slate-100 mt-2">
                ${avgCardValue.toFixed(2)} <span className="text-xs text-slate-400 font-normal">USD</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Valor promedio en inventario</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" /> Jugadores Únicos
              </p>
              <p className="text-3xl font-extrabold text-slate-100 mt-2">{uniquePlayers}</p>
              <p className="text-[11px] text-slate-500 mt-1">Diversidad de catálogo</p>
            </div>

            <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
              <p className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" /> Tarjeta Más Valiosa
              </p>
              {topValuedCard ? (
                <div className="mt-2">
                  <p className="text-sm font-bold text-slate-100 truncate">{topValuedCard.playerName}</p>
                  <p className="text-xl font-extrabold text-emerald-400 mt-0.5 font-mono">
                    ${(topValuedCard.estimatedValue || 0).toFixed(2)} USD
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">—</p>
              )}
              <p className="text-[11px] text-slate-400 mt-1">Máxima cotización actual</p>
            </div>
          </div>

          {/* Charts Row 1: Bar Chart Year & Donut Chart Brands */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Year / Season Bar Chart */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Distribución por Año de Publicación / Temporada
                </h3>
                <span className="text-[11px] text-slate-400">Cantidad y Valor ($)</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearDistributionData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                      formatter={(value: any, name: any) => [
                        name === "count" ? `${value} tarjetas` : `$${Number(value).toFixed(2)} USD`,
                        name === "count" ? "Stock" : "Valor Acumulado"
                      ]}
                      labelStyle={{ color: "#fbbf24", fontWeight: "bold" }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} name="count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Brand / Set Donut Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-emerald-400" />
                  Distribución por Marcas / Fabricantes
                </h3>
                <span className="text-[11px] text-slate-400">Proporción de sets</span>
              </div>

              <div className="h-56 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={brandDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {brandDistributionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {brandDistributionData.slice(0, 6).map((item, idx) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-[10px] text-slate-300 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BRAND_COLORS[idx % BRAND_COLORS.length] }} />
                    <span>{item.name}:</span>
                    <strong className="text-amber-400">{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Team Distribution & Top 5 Valuable Cards Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Distribution Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-400" />
                Top Equipos / Categorías con Mayor Presencia
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamDistributionData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                    <XAxis type="number" stroke="#64748b" fontSize={11} />
                    <YAxis dataKey="team" type="category" stroke="#94a3b8" fontSize={11} width={100} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} name="Cantidad" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 5 Valued Cards Leaderboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Top 5 Tarjetas Más Valiosas
                </h3>
                <span className="text-[11px] text-emerald-400 font-semibold">Valor Unitario ($ USD)</span>
              </div>

              <div className="space-y-2.5 flex-1">
                {top5ValuableCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        index === 0 ? "bg-amber-500 text-slate-950" : index === 1 ? "bg-slate-300 text-slate-950" : index === 2 ? "bg-amber-700 text-white" : "bg-slate-800 text-slate-400"
                      }`}>
                        {index + 1}
                      </span>
                      {card.croppedDataUrl && (
                        <img src={card.croppedDataUrl} alt={card.playerName} className="w-8 h-10 object-contain rounded bg-slate-900 border border-slate-800" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-200">{card.playerName}</p>
                        <p className="text-[10px] text-slate-400">
                          #{card.cardNumber} • {card.brand || "—"} ({card.year || "—"})
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-extrabold text-emerald-400 font-mono">
                        ${(card.estimatedValue || 0).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">x{card.quantity || 1} en stock</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
