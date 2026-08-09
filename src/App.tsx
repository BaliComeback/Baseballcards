import React, { useState, useEffect, useRef } from "react";
import { DetectedCard, BoundingBox } from "./types";
import { SAMPLE_BINDER_IMAGE_URL, SAMPLE_DETECTED_CARDS } from "./data/sampleData";
import {
  cropCardFromImage,
  downloadCardImage,
  downloadCardsZip,
  exportCardsToCSV,
  generateCardFilename,
} from "./utils/cropUtils";
import { saveCardsToDatabase } from "./utils/db";
import { Header } from "./components/Header";
import { ImageUploader } from "./components/ImageUploader";
import { ImageCanvasEditor } from "./components/ImageCanvasEditor";
import { CardListGrid } from "./components/CardListGrid";
import { CardEditModal } from "./components/CardEditModal";
import { HelpModal } from "./components/HelpModal";
import { CollectionDashboard } from "./components/CollectionDashboard";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { Sparkles, AlertTriangle, RefreshCw, CheckCircle2, LayoutGrid, Save, Database, BarChart3 } from "lucide-react";

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceImageElement, setSourceImageElement] = useState<HTMLImageElement | null>(null);
  const [detectedCards, setDetectedCards] = useState<DetectedCard[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<DetectedCard | null>(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detectionSummary, setDetectionSummary] = useState<string | null>(null);
  const [sourceImageName, setSourceImageName] = useState<string>("Tarjetas_AI");
  const [viewMode, setViewMode] = useState<"scanner" | "collection" | "analytics">("scanner");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Helper to load HTMLImageElement from data URL
  const loadImageElement = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  };

  // Perform Gemini AI card detection
  const analyzeImageWithAI = async (imageDataUrl: string, imgElement: HTMLImageElement) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setDetectionSummary("Detectando tarjetas con Inteligencia Artificial...");

    try {
      const response = await fetch("/api/detect-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          mimeType: imageDataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "No se pudo realizar el análisis de imagen.");
      }

      let cardsResult: DetectedCard[] = data.cards || [];

      // Generate cropped data URLs for each detected card using HTML5 Canvas
      const cardsWithCrops = cardsResult.map((card) => {
        const croppedUrl = cropCardFromImage(imgElement, card.boundingBox, card.rotation || 0);
        return {
          ...card,
          croppedDataUrl: croppedUrl,
          customFilename: generateCardFilename(card),
        };
      });

      setDetectedCards(cardsWithCrops);
      setDetectionSummary(data.summary || `Se detectaron ${cardsWithCrops.length} tarjetas con éxito.`);
      if (cardsWithCrops.length > 0) {
        setSelectedCardId(cardsWithCrops[0].id);
      }
    } catch (err: any) {
      console.warn("Fallo análisis de API, probando fallback:", err);
      setErrorMessage(`Nota: No se pudo conectar a la API de IA (${err.message}). Si usaste la imagen de muestra, se han aplicado los datos guardados.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Process user uploaded file
  const handleImageSelected = async (file: File) => {
    // Reset previous scan data completely
    setSourceImage(null);
    setSourceImageElement(null);
    setDetectedCards([]);
    setSelectedCardId(null);
    setErrorMessage(null);

    // Set base filename without extension
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    setSourceImageName(baseName || "Tarjetas_AI");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      setSourceImage(dataUrl);

      try {
        const imgEl = await loadImageElement(dataUrl);
        setSourceImageElement(imgEl);
        await analyzeImageWithAI(dataUrl, imgEl);
      } catch (err) {
        setErrorMessage("Error al cargar la imagen. Intenta con otra foto.");
      }
    };
    reader.readAsDataURL(file);
  };

  // Process sample binder page image
  const handleLoadSample = async () => {
    // Reset previous scan data completely
    setSourceImage(null);
    setSourceImageElement(null);
    setDetectedCards([]);
    setSelectedCardId(null);
    setErrorMessage(null);

    setIsAnalyzing(true);
    setSourceImage(SAMPLE_BINDER_IMAGE_URL);
    setSourceImageName("Hoja_Muestra");

    try {
      const imgEl = await loadImageElement(SAMPLE_BINDER_IMAGE_URL);
      setSourceImageElement(imgEl);

      // Try API detection on sample image
      try {
        // Convert image URL to base64 for API
        const canvas = document.createElement("canvas");
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(imgEl, 0, 0);
        const base64Data = canvas.toDataURL("image/jpeg");

        await analyzeImageWithAI(base64Data, imgEl);
      } catch (e) {
        // Fallback to sample presets if API is offline
        const croppedSampleCards = SAMPLE_DETECTED_CARDS.map((card) => ({
          ...card,
          croppedDataUrl: cropCardFromImage(imgEl, card.boundingBox, card.rotation || 0),
          customFilename: generateCardFilename(card),
        }));

        setDetectedCards(croppedSampleCards);
        setDetectionSummary(`Se cargó la imagen de prueba con ${croppedSampleCards.length} tarjetas identificadas.`);
        setSelectedCardId(croppedSampleCards[0].id);
      }
    } catch (err) {
      setErrorMessage("Error al cargar la imagen de muestra.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Card list handlers
  const handleSelectCard = (id: string | null) => {
    setSelectedCardId(id);
  };

  const handleRotateCard = (id: string) => {
    if (!sourceImageElement) return;

    setDetectedCards((prevCards) =>
      prevCards.map((card) => {
        if (card.id === id) {
          const newRotation = ((card.rotation || 0) + 90) % 360;
          const newCropped = cropCardFromImage(sourceImageElement, card.boundingBox, newRotation);
          return {
            ...card,
            rotation: newRotation,
            croppedDataUrl: newCropped,
          };
        }
        return card;
      })
    );
  };

  const handleToggleSideCard = (id: string) => {
    setDetectedCards((prevCards) =>
      prevCards.map((card) => {
        if (card.id === id) {
          const nextSide = card.side === "back" ? "front" : "back";
          return { ...card, side: nextSide };
        }
        return card;
      })
    );
  };

  const handleSaveEditedCard = (updatedCard: DetectedCard) => {
    setDetectedCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  };

  const handleDeleteCard = (id: string) => {
    setDetectedCards((prev) => prev.filter((c) => c.id !== id));
    if (selectedCardId === id) {
      setSelectedCardId(null);
    }
  };

  const handleAddCustomCard = (newBox: BoundingBox) => {
    if (!sourceImageElement) return;

    const newId = `card-custom-${Date.now()}`;
    const newCropped = cropCardFromImage(sourceImageElement, newBox, 0);

    const newCard: DetectedCard = {
      id: newId,
      cardNumber: `${detectedCards.length + 1}`,
      playerName: "Jugador Nuevo",
      team: "",
      brand: "",
      year: "",
      side: "front",
      boundingBox: newBox,
      rotation: 0,
      croppedDataUrl: newCropped,
      customFilename: `Card_${detectedCards.length + 1}_Jugador_Nuevo.png`,
    };

    setDetectedCards((prev) => [...prev, newCard]);
    setSelectedCardId(newId);
    setEditingCard(newCard); // Open edit modal immediately for easy labeling!
  };

  const handleDownloadSingleCard = (card: DetectedCard) => {
    if (card.croppedDataUrl) {
      const filename = card.customFilename || generateCardFilename(card);
      downloadCardImage(card.croppedDataUrl, filename);
    }
  };

  const handleDownloadZip = () => {
    downloadCardsZip(detectedCards, `${sourceImageName}.zip`);
  };

  const handleSaveToCollection = async () => {
    try {
      setDetectionSummary("Guardando en base de datos y actualizando cotizaciones reales...");
      await saveCardsToDatabase(detectedCards, sourceImageName);
      setSaveSuccess(true);

      // Auto-remove image and reset canvas automatically after saving to records
      setTimeout(() => {
        setSourceImage(null);
        setSourceImageElement(null);
        setDetectedCards([]);
        setSelectedCardId(null);
        setSaveSuccess(false);
        setDetectionSummary(null);
        setViewMode("collection");
      }, 1200);
    } catch (err) {
      setErrorMessage("No se pudieron guardar las tarjetas en la colección.");
    }
  };

  const handleExportCSV = () => {
    exportCardsToCSV(detectedCards, `${sourceImageName}.csv`);
  };

  const handleReset = () => {
    setSourceImage(null);
    setSourceImageElement(null);
    setDetectedCards([]);
    setSelectedCardId(null);
    setErrorMessage(null);
    setDetectionSummary(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header
        cardCount={detectedCards.length}
        onReset={handleReset}
        onOpenHelp={() => setHelpModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto">
          <button
            onClick={() => setViewMode("scanner")}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer shrink-0 ${
              viewMode === "scanner"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 inline-block mr-2" />
            Escáner de Imágenes
          </button>
          <button
            onClick={() => setViewMode("collection")}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer shrink-0 ${
              viewMode === "collection"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className="w-4 h-4 inline-block mr-2 text-emerald-400" />
            Tablero "Base de Datos"
          </button>
          <button
            onClick={() => setViewMode("analytics")}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors cursor-pointer shrink-0 ${
              viewMode === "analytics"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4 inline-block mr-2 text-amber-400" />
            Estadísticas y Gráficas
          </button>
        </div>

        {/* View Router */}
        {viewMode === "collection" ? (
          <CollectionDashboard onClose={() => setViewMode("scanner")} />
        ) : viewMode === "analytics" ? (
          <AnalyticsDashboard onGoToDatabase={() => setViewMode("collection")} />
        ) : (
          <>
            {/* Error notification banner if any */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Aviso de detección</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-amber-400 hover:text-amber-200 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* View state 1: No Image uploaded -> Upload Screen */}
        {!sourceImage ? (
          <ImageUploader
            onImageSelected={handleImageSelected}
            onLoadSample={handleLoadSample}
            isAnalyzing={isAnalyzing}
          />
        ) : (
          /* View state 2: Image loaded -> Canvas Editor + Card Grid Split Layout */
          <div className="space-y-6">
            {/* Detection Summary Banner */}
            {detectionSummary && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{detectionSummary}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isAnalyzing || detectedCards.length === 0}
                    onClick={handleSaveToCollection}
                    className={`px-4 py-1.5 rounded-lg text-slate-950 font-bold transition-all flex items-center gap-1.5 ${
                      saveSuccess ? "bg-emerald-400" : "bg-amber-500 hover:bg-amber-400 shadow-md"
                    }`}
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        ¡Guardado en Tablero!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Guardar en Base de Datos
                      </>
                    )}
                  </button>

                  <button
                    disabled={isAnalyzing}
                    onClick={() => sourceImageElement && analyzeImageWithAI(sourceImage, sourceImageElement)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 font-medium"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                    Re-analizar
                  </button>
                </div>
              </div>
            )}

            {/* Primary Visual Canvas */}
            <ImageCanvasEditor
              imageSrc={sourceImage}
              cards={detectedCards}
              selectedCardId={selectedCardId}
              onSelectCard={handleSelectCard}
              onUpdateBoundingBox={(id, newBox) => {
                setDetectedCards((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, boundingBox: newBox } : c))
                );
              }}
              onAddCustomCard={handleAddCustomCard}
              isAnalyzing={isAnalyzing}
            />

            {/* Cards Collection Grid */}
            <CardListGrid
              cards={detectedCards}
              selectedCardId={selectedCardId}
              onSelectCard={handleSelectCard}
              onRotateCard={handleRotateCard}
              onToggleSideCard={handleToggleSideCard}
              onEditCard={(card) => setEditingCard(card)}
              onDownloadCard={handleDownloadSingleCard}
              onDeleteCard={handleDeleteCard}
              onDownloadZip={handleDownloadZip}
              onExportCSV={handleExportCSV}
            />
          </div>
        )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>CardCutter AI • Reconocimiento y recorte inteligente de tarjetas coleccionables</p>
      </footer>

      {/* Modal for editing card metadata */}
      {editingCard && (
        <CardEditModal
          card={editingCard}
          sourceImageElement={sourceImageElement}
          onClose={() => setEditingCard(null)}
          onSave={handleSaveEditedCard}
          onDownload={handleDownloadSingleCard}
        />
      )}

      {/* Help Modal */}
      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </div>
  );
}
