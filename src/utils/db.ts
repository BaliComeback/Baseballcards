import localforage from "localforage";
import { DetectedCard } from "../types";

// Initialize localforage
localforage.config({
  name: "CardCutterDB",
  storeName: "cards_collection",
  description: "Database for saved collectible cards"
});

export interface SavedCard extends DetectedCard {
  savedAt: number;
  sourceImageName?: string;
}

const normalizeStr = (str?: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();

const getCardKey = (card: { playerName: string; cardNumber: string; brand?: string; year?: string }) => {
  const p = normalizeStr(card.playerName);
  const num = normalizeStr(card.cardNumber);
  const b = normalizeStr(card.brand);
  const y = normalizeStr(card.year);
  return `${p}|${num}|${b}|${y}`;
};

export const fetchMarketPriceForCard = async (card: DetectedCard): Promise<{ estimatedValue?: number; priceMin?: number; priceMax?: number; marketSource?: string; marketLastUpdated?: number }> => {
  if (!card.playerName) return {};
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
      return {
        estimatedValue: data.estimatedValue,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        marketSource: "Mercado Real IA",
        marketLastUpdated: Date.now()
      };
    }
  } catch (err) {
    console.warn("Auto-pricing error for card:", card.playerName, err);
  }
  return {};
};

export const saveCardsToDatabase = async (cards: DetectedCard[], sourceImageName: string = "Desconocido") => {
  try {
    const existingCards: SavedCard[] = (await localforage.getItem("saved_cards")) || [];
    const updatedCollection = [...existingCards];

    for (let idx = 0; idx < cards.length; idx++) {
      const card = cards[idx];
      const cardKey = getCardKey(card);

      // Fetch or refine price if not set
      let marketPriceData = {};
      if (card.playerName && (!card.estimatedValue || card.estimatedValue === 0)) {
        marketPriceData = await fetchMarketPriceForCard(card);
      }

      // STRICT MATCHING: Only merge quantity if BOTH playerName AND cardNumber are valid non-empty names!
      const hasValidPlayer = card.playerName && card.playerName.trim() !== "" && card.playerName !== "Desconocido" && card.playerName !== "Sin Nombre" && card.playerName !== "Jugador Nuevo";
      const hasValidNumber = card.cardNumber && card.cardNumber.trim() !== "" && card.cardNumber !== "0" && card.cardNumber !== "N/A";

      let existingIndex = -1;
      if (hasValidPlayer && hasValidNumber && cardKey && cardKey !== "|||") {
        existingIndex = updatedCollection.findIndex(c => {
          return getCardKey(c) === cardKey;
        });
      }

      if (existingIndex >= 0) {
        // Increment quantity and update item info ONLY for valid matched card keys
        const match = updatedCollection[existingIndex];
        const currentQty = match.quantity && match.quantity > 0 ? match.quantity : 1;
        const addQty = card.quantity && card.quantity > 0 ? card.quantity : 1;

        updatedCollection[existingIndex] = {
          ...match,
          quantity: currentQty + addQty,
          savedAt: Date.now(),
          sourceImageName: match.sourceImageName || sourceImageName,
          ...(marketPriceData || {}),
          ...(card.estimatedValue ? { estimatedValue: card.estimatedValue } : {})
        };
      } else {
        // Insert as new card item
        let uniqueId = card.id ? `${card.id}_${Date.now()}_${idx}` : `card_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
        if (updatedCollection.some(c => c.id === uniqueId)) {
          uniqueId = `${uniqueId}_${Math.random().toString(36).substring(2, 6)}`;
        }

        const newSavedCard: SavedCard = {
          ...card,
          ...marketPriceData,
          id: uniqueId,
          quantity: card.quantity && card.quantity > 0 ? card.quantity : 1,
          savedAt: Date.now(),
          sourceImageName
        };

        updatedCollection.unshift(newSavedCard);
      }
    }

    await localforage.setItem("saved_cards", updatedCollection);
    return updatedCollection;
  } catch (error) {
    console.error("Error saving cards to database:", error);
    throw error;
  }
};

export const getSavedCards = async (): Promise<SavedCard[]> => {
  try {
    const cards: SavedCard[] = (await localforage.getItem("saved_cards")) || [];
    const seenIds = new Set<string>();
    let hasDuplicates = false;

    // Sanitize cards so no duplicate IDs exist
    const sanitizedCards = cards.map((card, idx) => {
      let id = card.id;
      if (!id || seenIds.has(id)) {
        id = `${id || 'card'}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
        hasDuplicates = true;
      }
      seenIds.add(id);
      return { ...card, id };
    });

    if (hasDuplicates) {
      await localforage.setItem("saved_cards", sanitizedCards);
    }

    return sanitizedCards;
  } catch (error) {
    console.error("Error getting cards from database:", error);
    return [];
  }
};

export const deleteSavedCard = async (id: string): Promise<SavedCard[]> => {
  try {
    const existingCards: SavedCard[] = (await localforage.getItem("saved_cards")) || [];
    const updatedCards = existingCards.filter(card => card.id !== id);
    await localforage.setItem("saved_cards", updatedCards);
    return updatedCards;
  } catch (error) {
    console.error("Error deleting card from database:", error);
    throw error;
  }
};

export const updateSavedCard = async (updatedCard: SavedCard): Promise<SavedCard[]> => {
  try {
    const existingCards: SavedCard[] = (await localforage.getItem("saved_cards")) || [];
    const updatedCards = existingCards.map(card => card.id === updatedCard.id ? updatedCard : card);
    await localforage.setItem("saved_cards", updatedCards);
    return updatedCards;
  } catch (error) {
    console.error("Error updating card in database:", error);
    throw error;
  }
};

export const deleteMultipleSavedCards = async (ids: string[]): Promise<SavedCard[]> => {
  try {
    const idsSet = new Set(ids);
    const existingCards: SavedCard[] = (await localforage.getItem("saved_cards")) || [];
    const updatedCards = existingCards.filter(card => !idsSet.has(card.id));
    await localforage.setItem("saved_cards", updatedCards);
    return updatedCards;
  } catch (error) {
    console.error("Error deleting multiple cards from database:", error);
    throw error;
  }
};

export const batchUpdateSavedCards = async (ids: string[], changes: Partial<SavedCard>): Promise<SavedCard[]> => {
  try {
    const idsSet = new Set(ids);
    const existingCards: SavedCard[] = (await localforage.getItem("saved_cards")) || [];
    const updatedCards = existingCards.map(card => {
      if (idsSet.has(card.id)) {
        return { ...card, ...changes, savedAt: Date.now() };
      }
      return card;
    });
    await localforage.setItem("saved_cards", updatedCards);
    return updatedCards;
  } catch (error) {
    console.error("Error batch updating cards in database:", error);
    throw error;
  }
};

export const saveEntireCollection = async (cards: SavedCard[]): Promise<SavedCard[]> => {
  try {
    // Automatically deduplicate before saving entire collection to database
    const deduplicatedMap = new Map<string, SavedCard>();

    for (const card of cards) {
      const cardKey = getCardKey(card);
      const imgKey = (card.croppedDataUrl && card.croppedDataUrl.length > 50)
        ? `img_${card.croppedDataUrl.substring(0, 120)}_${card.croppedDataUrl.length}`
        : "";
      
      const key = (cardKey && cardKey !== "|||") ? cardKey : (imgKey || card.id);

      if (deduplicatedMap.has(key)) {
        const existing = deduplicatedMap.get(key)!;
        const currentQty = existing.quantity && existing.quantity > 0 ? existing.quantity : 1;
        const addQty = card.quantity && card.quantity > 0 ? card.quantity : 1;
        deduplicatedMap.set(key, {
          ...existing,
          quantity: currentQty + addQty,
          savedAt: Date.now()
        });
      } else {
        deduplicatedMap.set(key, {
          ...card,
          quantity: card.quantity && card.quantity > 0 ? card.quantity : 1,
          savedAt: card.savedAt || Date.now()
        });
      }
    }

    const deduplicatedList = Array.from(deduplicatedMap.values());
    await localforage.setItem("saved_cards", deduplicatedList);
    return deduplicatedList;
  } catch (error) {
    console.error("Error saving entire collection to database:", error);
    throw error;
  }
};

export const deduplicateCollection = async (): Promise<SavedCard[]> => {
  try {
    const existingCards: SavedCard[] = (await localforage.getItem("saved_cards")) || [];
    return await saveEntireCollection(existingCards);
  } catch (error) {
    console.error("Error deduplicating collection:", error);
    return [];
  }
};

export const clearDatabase = async () => {
  try {
    await localforage.removeItem("saved_cards");
    await localforage.clear();
  } catch (error) {
    console.error("Error clearing database:", error);
    throw error;
  }
};
