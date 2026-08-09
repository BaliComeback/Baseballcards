import { SavedCard } from "./db";
import { googleSignIn, getAccessToken } from "./googleAuth";

export interface ExportToSheetsResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export const exportCardsToGoogleSheets = async (
  cards: SavedCard[],
  customTitle: string = "Colección de Tarjetas - CardCutter AI"
): Promise<ExportToSheetsResult> => {
  if (cards.length === 0) {
    throw new Error("No hay tarjetas para exportar a Google Sheets.");
  }

  // Get or request access token
  let token = await getAccessToken();
  if (!token) {
    const authResult = await googleSignIn();
    if (!authResult?.accessToken) {
      throw new Error("Se requiere iniciar sesión con Google para exportar a Google Sheets.");
    }
    token = authResult.accessToken;
  }

  // 1. Create a new Spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: {
        title: `${customTitle} (${new Date().toLocaleDateString("es-ES")})`
      },
      sheets: [
        {
          properties: {
            title: "Inventario de Tarjetas",
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errorData = await createRes.json();
    console.error("Error al crear la hoja de cálculo de Google:", errorData);
    throw new Error(errorData?.error?.message || "Error al crear la hoja de cálculo en Google Drive.");
  }

  const createData = await createRes.json();
  const spreadsheetId = createData.spreadsheetId;
  const spreadsheetUrl = createData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare Rows Data
  const headers = [
    "ID Ítem",
    "Nombre del Jugador",
    "Número de Tarjeta",
    "Marca / Fabricante",
    "Año / Temporada",
    "Equipo / Categoría",
    "Cantidad (Stock)",
    "Valor Est. Unitario ($ USD)",
    "Valor Total Stock ($ USD)",
    "Fecha Guardado",
    "Origen"
  ];

  const dataRows = cards.map((card) => {
    const qty = card.quantity && card.quantity > 0 ? card.quantity : 1;
    const estVal = card.estimatedValue || 0;
    const totalVal = estVal * qty;
    const savedDateStr = card.savedAt ? new Date(card.savedAt).toLocaleString("es-ES") : "—";

    return [
      card.id || "—",
      card.playerName || "Sin Nombre",
      card.cardNumber || "N/A",
      card.brand || "—",
      card.year || "—",
      card.team || "—",
      qty,
      estVal > 0 ? estVal : 0,
      totalVal > 0 ? totalVal : 0,
      savedDateStr,
      card.sourceImageName || "CardCutter Scanner"
    ];
  });

  // Calculate summary totals
  const totalQty = cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const grandTotalValue = cards.reduce((sum, c) => sum + (c.estimatedValue || 0) * (c.quantity || 1), 0);

  const summaryRow = [
    "TOTALES DE INVENTARIO",
    `Total ítems: ${cards.length}`,
    "",
    "",
    "",
    "",
    "",
    totalQty,
    "",
    grandTotalValue,
    `Exportado el ${new Date().toLocaleString("es-ES")}`,
    ""
  ];

  const allValues = [headers, ...dataRows, [], summaryRow];

  // 3. Write data to Spreadsheet
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Inventario de Tarjetas!A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: allValues
      })
    }
  );

  if (!updateRes.ok) {
    const updateError = await updateRes.json();
    console.error("Error al escribir datos en Google Sheets:", updateError);
    throw new Error(updateError?.error?.message || "Error al escribir los datos en Google Sheets.");
  }

  return {
    spreadsheetId,
    spreadsheetUrl
  };
};
