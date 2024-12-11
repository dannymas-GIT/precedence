import { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { useSearch } from './useSearch';

describe('useSearch', () => {
  const queryClient = new QueryClient();
  const mockOnSuccess = vi.fn();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('returns mutation object with correct properties', () => {
    const { result } = renderHook(() => useSearch(mockOnSuccess), { wrapper });

    expect(result.current.mutate).toBeDefined();
    expect(result.current.isPending).toBeDefined();
    expect(result.current.isError).toBeDefined();
    expect(result.current.isSuccess).toBeDefined();
  });
}); 