export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface AtlasMemory {
  question: string;
  answer: string;
  timestamp: number;
}

export interface AtlasResponse {
  answer: string;
  confidence: number;
  sources: SearchResult[];
}