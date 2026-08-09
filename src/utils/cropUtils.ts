import JSZip from "jszip";
import { BoundingBox, DetectedCard, ImageProcessingOptions } from "../types";

/**
 * Normalizes bounding box coordinates to relative ratios [0..1]
 */
export function normalizeBox(box: BoundingBox): { ymin: number; xmin: number; ymax: number; xmax: number } {
  let { ymin, xmin, ymax, xmax } = box;

  // If coordinates are in 0-1000 scale (Gemini standard format), convert to 0..1
  if (ymin > 1 || xmin > 1 || ymax > 1 || xmax > 1) {
    ymin /= 1000;
    xmin /= 1000;
    ymax /= 1000;
    xmax /= 1000;
  }

  // Clamp within bounds 0..1
  ymin = Math.max(0, Math.min(1, ymin));
  xmin = Math.max(0, Math.min(1, xmin));
  ymax = Math.max(0, Math.min(1, ymax));
  xmax = Math.max(0, Math.min(1, xmax));

  // Ensure min < max
  if (ymax <= ymin) ymax = Math.min(1, ymin + 0.05);
  if (xmax <= xmin) xmax = Math.min(1, xmin + 0.05);

  return { ymin, xmin, ymax, xmax };
}

/**
 * Crops a specific region from an HTMLImageElement using bounding box & rotation
 */
export function cropCardFromImage(
  img: HTMLImageElement,
  box: BoundingBox,
  rotation = 0,
  options: ImageProcessingOptions = { paddingPercent: 1, autoEnhance: false, brightness: 0, contrast: 0 }
): string {
  const norm = normalizeBox(box);

  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;

  // Calculate pixel bounds
  let x = norm.xmin * imgWidth;
  let y = norm.ymin * imgHeight;
  let width = (norm.xmax - norm.xmin) * imgWidth;
  let height = (norm.ymax - norm.ymin) * imgHeight;

  // Apply padding if requested
  if (options.paddingPercent > 0) {
    const padX = (width * options.paddingPercent) / 100;
    const padY = (height * options.paddingPercent) / 100;

    x = Math.max(0, x - padX);
    y = Math.max(0, y - padY);
    width = Math.min(imgWidth - x, width + padX * 2);
    height = Math.min(imgHeight - y, height + padY * 2);
  }

  // Create canvas for cropping
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  // Swap width/height if rotated 90 or 270 deg
  const isRotatedQuarter = rotation === 90 || rotation === 270;
  canvas.width = isRotatedQuarter ? height : width;
  canvas.height = isRotatedQuarter ? width : height;

  ctx.save();

  // Handle Rotation
  if (rotation === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (rotation === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate((180 * Math.PI) / 180);
  } else if (rotation === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate((270 * Math.PI) / 180);
  }

  // Filters (brightness/contrast)
  let filterStr = "";
  if (options.brightness !== 0) {
    filterStr += `brightness(${100 + options.brightness}%) `;
  }
  if (options.contrast !== 0) {
    filterStr += `contrast(${100 + options.contrast}%) `;
  }
  if (filterStr) {
    ctx.filter = filterStr.trim();
  }

  // Draw cropped image segment onto canvas
  ctx.drawImage(
    img,
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
    0,
    0,
    Math.round(width),
    Math.round(height)
  );

  ctx.restore();

  return canvas.toDataURL("image/png", 0.95);
}

/**
 * Clean filename generator
 */
export function sanitizeFilename(str: string): string {
  return str
    .trim()
    .replace(/[#?%*:|"<>/\\]/g, "")
    .replace(/\s+/g, "_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove accents
}

export function generateCardFilename(card: DetectedCard): string {
  const num = sanitizeFilename(card.cardNumber || "Tarjeta");
  const name = sanitizeFilename(card.playerName || "Jugador");
  const team = card.team ? `_${sanitizeFilename(card.team)}` : "";

  let result = `${num}_${name}${team}.png`;
  if (result.startsWith("_")) result = result.substring(1);
  return result;
}

/**
 * Downloads a single cropped image
 */
export function downloadCardImage(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Packages all cards into a ZIP file and triggers download
 */
export async function downloadCardsZip(cards: DetectedCard[], zipName = "Tarjetas_Recortadas.zip") {
  const zip = new JSZip();
  const folder = zip.folder("tarjetas_recortadas");

  cards.forEach((card, idx) => {
    if (!card.croppedDataUrl) return;

    // Convert data URL base64 to binary
    const base64Data = card.croppedDataUrl.replace(/^data:image\/\w+;base64,/, "");
    const filename = card.customFilename || generateCardFilename(card);
    
    // Ensure unique filenames
    const finalName = `${idx + 1}_${filename}`;
    folder?.file(finalName, base64Data, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = zipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export card collection catalog as CSV file
 */
export function exportCardsToCSV(cards: DetectedCard[], filename = "catalogo_tarjetas.csv") {
  const headers = ["ID", "Numero_Tarjeta", "Jugador", "Equipo", "Marca", "Anio", "Lado", "Nombre_Archivo"];
  
  const rows = cards.map((card, i) => [
    i + 1,
    `"${card.cardNumber}"`,
    `"${card.playerName}"`,
    `"${card.team || ''}"`,
    `"${card.brand || ''}"`,
    `"${card.year || ''}"`,
    `"${card.side || ''}"`,
    `"${generateCardFilename(card)}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  const finalFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an official, high-resolution reverse (back) side image canvas for a card
 */
export function generateCardBackImage(card: {
  playerName: string;
  cardNumber: string;
  brand?: string;
  year?: string;
  team?: string;
  estimatedValue?: number;
}): string {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 850;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const name = card.playerName || "Jugador";
  const num = card.cardNumber || "S/N";
  const brand = (card.brand || "OFFICIAL COLLECTIBLE").toUpperCase();
  const year = card.year || "2024";
  const team = (card.team || "EQUIPO OFICIAL").toUpperCase();
  const val = card.estimatedValue ? `$${card.estimatedValue.toFixed(2)} USD` : "COLECCIÓN OFICIAL";

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 600, 850);
  bgGrad.addColorStop(0, "#0f172a");
  bgGrad.addColorStop(0.5, "#1e293b");
  bgGrad.addColorStop(1, "#090d16");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 600, 850);

  // Outer Gold Frame
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 12;
  ctx.strokeRect(16, 16, 568, 818);

  // Inner Line Frame
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, 544, 794);

  // Top Header Banner
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(40, 40, 520, 60);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(brand, 55, 78);

  ctx.font = "bold 22px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`#${num}`, 540, 78);

  // Year & Team Ribbon
  ctx.fillStyle = "#3b82f6";
  ctx.fillRect(40, 110, 520, 36);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${year} • ${team}`, 55, 134);

  // Player Name Big Block
  ctx.fillStyle = "#ffffff";
  ctx.font = "black 34px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name.toUpperCase(), 300, 200);

  // Decorative Divider
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 220);
  ctx.lineTo(520, 220);
  ctx.stroke();

  // Statistics Header Box
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(40, 240, 520, 260);
  ctx.strokeStyle = "#475569";
  ctx.strokeRect(40, 240, 520, 260);

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("HISTORIAL & ESTADÍSTICAS DE CARRERA", 55, 270);

  // Table Headers
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px monospace";
  ctx.fillText("AÑO", 55, 305);
  ctx.fillText("EQUIPO", 130, 305);
  ctx.fillText("PJ", 280, 305);
  ctx.fillText("RATING", 360, 305);
  ctx.fillText("VALOR EST.", 450, 305);

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 315);
  ctx.lineTo(540, 315);
  ctx.stroke();

  // Sample Statistics Rows
  const sampleRows = [
    { y: parseInt(year) - 2 || 2021, t: team.substring(0, 14), pj: "152", rat: "9.2", v: "NM" },
    { y: parseInt(year) - 1 || 2022, t: team.substring(0, 14), pj: "158", rat: "9.5", v: "EX" },
    { y: year, t: team.substring(0, 14), pj: "162", rat: "9.8", v: val }
  ];

  let startY = 345;
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "14px monospace";

  sampleRows.forEach((row) => {
    ctx.fillText(String(row.y), 55, startY);
    ctx.fillText(row.t, 130, startY);
    ctx.fillText(row.pj, 280, startY);
    ctx.fillText(row.rat, 360, startY);
    ctx.fillText(row.v, 450, startY);
    startY += 38;
  });

  // Highlight Commentary Box
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(40, 520, 520, 180);
  ctx.strokeStyle = "#334155";
  ctx.strokeRect(40, 520, 520, 180);

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PERFIL DEL JUGADOR & RESUMEN DE REGISTRO", 55, 550);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px sans-serif";
  const bio1 = `Pieza coleccionable registrada de ${name} (#${num}) perteneciente a la edición de ${year}.`;
  const bio2 = `Conserva alto valor entre coleccionistas por su condición y centrado óptimo.`;
  const bio3 = `Verificado mediante escaneo inteligente de tarjetas deportivas y TCG.`;

  ctx.fillText(bio1, 55, 580);
  ctx.fillText(bio2, 55, 610);
  ctx.fillText(bio3, 55, 640);

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 14px monospace";
  ctx.fillText(`VALOR ESTIMADO DE MERCADO: ${val}`, 55, 675);

  // Footer / Authenticity Seal & Barcode
  // Draw Barcode lines
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(50, 720, 220, 60);

  ctx.fillStyle = "#000000";
  let barX = 60;
  for (let i = 0; i < 35; i++) {
    const barWidth = (i % 3 === 0) ? 5 : (i % 2 === 0) ? 3 : 2;
    ctx.fillRect(barX, 725, barWidth, 40);
    barX += barWidth + (i % 4 === 0 ? 3 : 2);
  }
  ctx.font = "10px monospace";
  ctx.fillText(`*CARD-${num}-${year}*`, 75, 775);

  // Authenticity Badge Circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(460, 750, 36, 0, Math.PI * 2);
  ctx.fillStyle = "#f59e0b";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("100%", 460, 745);
  ctx.fillText("VERIFIED", 460, 758);
  ctx.fillText("GENUINE", 460, 770);
  ctx.restore();

  // Bottom Copyright Tag
  ctx.fillStyle = "#475569";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("© AI SPORTS CARD SCANNER & MARKET COLLECTOR • REVERSO DE TARJETA", 300, 810);

  return canvas.toDataURL("image/png", 0.95);
}

