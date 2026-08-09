export interface BoundingBox {
  ymin: number; // 0 to 1000 or 0 to 1
  xmin: number; // 0 to 1000 or 0 to 1
  ymax: number; // 0 to 1000 or 0 to 1
  xmax: number; // 0 to 1000 or 0 to 1
}

export interface DetectedCard {
  id: string;
  cardNumber: string;
  playerName: string;
  team?: string;
  brand?: string;
  year?: string;
  side?: 'front' | 'back' | 'unknown';
  boundingBox: BoundingBox;
  confidence?: number;
  rotation?: number; // 0, 90, 180, 270 degrees
  croppedDataUrl?: string;
  oppositeSideCroppedUrl?: string; // High-res image or generated back side
  customFilename?: string;
  notes?: string;
  estimatedValue?: number; // Valor estimado en USD
  estimatedPriceMin?: number;
  estimatedPriceMax?: number;
  marketSource?: string;
  marketLastUpdated?: number;
  condition?: string; // Ungraded, PSA 8, PSA 9, PSA 10, Raw, etc.
  quantity?: number; // Cantidad de ejemplares acumulados
}

export interface CardMarketInfo {
  playerName: string;
  cardNumber: string;
  brand?: string;
  year?: string;
  estimatedValue: number;
  priceMin: number;
  priceMax: number;
  psa10Value?: number;
  psa9Value?: number;
  rawNMValue?: number;
  confidence: string;
  marketSummary: string;
  recentSales?: Array<{
    title: string;
    price: number;
    date: string;
    source: string;
    url?: string;
  }>;
  salesLinks: {
    ebaySold: string;
    ebayActive: string;
    point130: string;
    beckett: string;
    comc: string;
    tcgplayer?: string;
  };
  sellingTips?: string[];
  suggestedListingTitle?: string;
}

export interface DetectionResponse {
  cards: DetectedCard[];
  summary?: string;
  totalDetected?: number;
  error?: string;
}

export interface ImageProcessingOptions {
  paddingPercent: number; // e.g. 1% to 5% padding around crop box
  autoEnhance: boolean;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
}

