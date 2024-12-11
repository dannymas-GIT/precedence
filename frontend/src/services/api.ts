import axios from 'axios';
import { SearchRequest, SearchResult } from '../types';

const api = axios.create({
  baseURL: '/api'
});

export const searchLegal = async (request: SearchRequest): Promise<SearchResult[]> => {
  try {
    const response = await api.post<{ results: SearchResult[] }>('/search', request);
    return response.data.results;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || 'Search failed';
      throw new Error(message);
    }
    throw error;
  }
}; 