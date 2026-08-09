import jsPDF from "jspdf";
import { SavedCard } from "./db";

export const generateCollectionPDF = async (cards: SavedCard[]) => {
  if (!cards || cards.length === 0) {
    alert("No hay tarjetas en la colección para exportar a PDF.");
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    let y = margin;

    // Top Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setTextColor(245, 158, 11); // amber-500
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen de Inventario de Colección", margin, 12);

    doc.setTextColor(226, 232, 240); // slate-200
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const todayStr = new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    doc.text(`CardCutter AI — Exportado el: ${todayStr}`, margin, 19);

    // Collection Stats Summary Header Box
    y = 32;
    const totalQty = cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
    const totalVal = cards.reduce((sum, c) => sum + ((c.estimatedValue || 0) * (c.quantity || 1)), 0);

    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(margin, y, pageWidth - margin * 2, 16, 3, 3, "F");

    doc.setTextColor(248, 250, 252);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Stock: ${totalQty} pcs`, margin + 6, y + 10);
    doc.text(`Ítems Únicos: ${cards.length}`, margin + 62, y + 10);

    doc.setTextColor(52, 211, 153); // emerald-400
    doc.text(`Valor Estimado: $${totalVal.toFixed(2)} USD`, margin + 115, y + 10);

    y += 22;

    // Table Header Drawing Function
    const drawTableHeader = (currY: number) => {
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, currY, pageWidth - margin * 2, 8, "F");

      doc.setTextColor(251, 191, 36);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");

      doc.text("FOTO", margin + 2, currY + 5.5);
      doc.text("JUGADOR / DETALLE", margin + 18, currY + 5.5);
      doc.text("# NUM", margin + 85, currY + 5.5);
      doc.text("MARCA / SET", margin + 105, currY + 5.5);
      doc.text("AÑO", margin + 140, currY + 5.5);
      doc.text("CANT.", margin + 155, currY + 5.5);
      doc.text("VALOR ($)", margin + 170, currY + 5.5);

      return currY + 8;
    };

    y = drawTableHeader(y);

    const rowHeight = 18;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];

      // Check for page break
      if (y + rowHeight > pageHeight - 14) {
        doc.addPage();
        y = margin;
        y = drawTableHeader(y);
      }

      // Alternating row background
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, "S");

      // Draw card thumbnail image
      if (card.croppedDataUrl && card.croppedDataUrl.startsWith("data:image")) {
        try {
          // Add cropped image into PDF row box
          doc.addImage(card.croppedDataUrl, "PNG", margin + 2, y + 1.5, 11, 15);
        } catch (imgErr) {
          doc.setFillColor(203, 213, 225);
          doc.rect(margin + 2, y + 1.5, 11, 15, "F");
        }
      } else {
        doc.setFillColor(203, 213, 225);
        doc.rect(margin + 2, y + 1.5, 11, 15, "F");
      }

      // Player Name
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      const nameText = card.playerName.length > 30 ? card.playerName.substring(0, 28) + "..." : card.playerName;
      doc.text(nameText, margin + 18, y + 6);

      // Team / Subtitle
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      const subText = card.team ? `Equipo: ${card.team}` : "Tarjeta de colección";
      doc.text(subText, margin + 18, y + 11);

      // Card Number
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(217, 119, 6);
      doc.text(`#${card.cardNumber || "N/A"}`, margin + 85, y + 9);

      // Brand / Set
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const brandText = card.brand ? (card.brand.length > 18 ? card.brand.substring(0, 16) + ".." : card.brand) : "—";
      doc.text(brandText, margin + 105, y + 9);

      // Year
      doc.text(card.year || "—", margin + 140, y + 9);

      // Quantity
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`x${card.quantity || 1}`, margin + 157, y + 9);

      // Estimated Price
      doc.setTextColor(5, 150, 105);
      const cardVal = (card.estimatedValue || 0) * (card.quantity || 1);
      doc.text(`$${cardVal.toFixed(2)}`, margin + 170, y + 9);

      y += rowHeight;
    }

    // Add Page Numbers
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${p} de ${totalPages} — CardCutter AI Resumen de Inventario`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      );
    }

    doc.save(`Inventario_Coleccion_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error("Error generando PDF:", error);
    alert("Hubo un error al generar el archivo PDF.");
  }
};
