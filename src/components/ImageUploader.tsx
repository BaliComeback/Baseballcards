import React, { useRef, useState } from "react";
import { Upload, Camera, Image as ImageIcon, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  onLoadSample: () => void;
  isAnalyzing: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  onLoadSample,
  isAnalyzing,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        onImageSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelected(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-4">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Reconocimiento Multimodal con Visión Inteligente</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
          Carga una foto de tus tarjetas deportivas o coleccionables
        </h2>
        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
          La IA identificará individualmente cada tarjeta en hojas de carpeta, carpetas de 9 bolsillos o sobre superficies, recortará la imagen y extraerá el <strong># de tarjeta</strong> y el <strong>nombre del jugador</strong>.
        </p>
      </div>

      {/* Main Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all bg-slate-900/60 backdrop-blur-sm ${
          isDragging
            ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
            : "border-slate-700 hover:border-slate-500 hover:bg-slate-900/90"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shadow-xl group">
            <Upload className="w-8 h-8 transition-transform group-hover:-translate-y-1" />
          </div>

          <div>
            <p className="text-base font-semibold text-slate-200">
              Arrastra y suelta tu imagen aquí
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Soporta hojas de carpeta (9-cards page), fotos de grupo o tarjetas individuales (JPG, PNG, WEBP)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <button
              disabled={isAnalyzing}
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4" />
              Seleccionar Imagen
            </button>

            <button
              disabled={isAnalyzing}
              onClick={() => cameraInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Camera className="w-4 h-4 text-slate-300" />
              Tomar Foto
            </button>
          </div>

          {/* Sample Loader */}
          <div className="pt-4 mt-2 border-t border-slate-800/80 w-full max-w-md flex flex-col items-center gap-2">
            <p className="text-xs text-slate-400">¿Quieres probar rápido sin subir archivos?</p>
            <button
              disabled={isAnalyzing}
              onClick={onLoadSample}
              className="px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all flex items-center gap-2 group"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              Usar Imagen de Muestra (Hoja de Carpeta con Tarjetas)
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-slate-200">Detección de Bounding Box</h4>
            <p className="text-xs text-slate-400 mt-0.5">Encuentra los bordes físicos exactos de cada tarjeta en la hoja.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-slate-200">Reconocimiento de # y Nombre</h4>
            <p className="text-xs text-slate-400 mt-0.5">Extrae automáticamente el número de tarjeta (#86, 402, etc.) y nombre del jugador.</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-slate-200">Recorte y Exportación ZIP</h4>
            <p className="text-xs text-slate-400 mt-0.5">Genera archivos individuales nombrados listos para descargar o guardar en paquete ZIP.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
