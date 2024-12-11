export interface SearchResult {
  title: string;
  content: string;
  source: string;
  url: string;
  similarity_score: number;
  jurisdiction: string;
  date_published: string;
}

export interface SearchRequest {
  query: string;
  threshold: number;
} 