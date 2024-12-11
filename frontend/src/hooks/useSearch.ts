import { useMutation } from '@tanstack/react-query';
import { searchLegal } from '../services/api';
import { SearchResult } from '../types';

export function useSearch(onSuccess: (results: SearchResult[]) => void) {
  return useMutation({
    mutationFn: searchLegal,
    onSuccess
  });
} 