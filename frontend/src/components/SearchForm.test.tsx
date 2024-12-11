import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import SearchForm from './SearchForm';

describe('SearchForm', () => {
  const queryClient = new QueryClient();
  const mockOnSearch = vi.fn();

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SearchForm onSearch={mockOnSearch} isLoading={false} />
      </QueryClientProvider>
    );
  };

  it('renders search form elements', () => {
    renderComponent();
    
    expect(screen.getByLabelText(/search query input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/similarity threshold slider/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('updates query value on input change', () => {
    renderComponent();
    
    const input = screen.getByLabelText(/search query input/i);
    fireEvent.change(input, { target: { value: 'test query' } });
    
    expect(input).toHaveValue('test query');
  });

  it('updates threshold value on slider change', () => {
    renderComponent();
    
    const slider = screen.getByLabelText(/similarity threshold slider/i);
    fireEvent.change(slider, { target: { value: '0.8' } });
    
    expect(slider).toHaveValue('0.8');
  });

  it('calls onSearch when form is submitted', async () => {
    renderComponent();
    
    const input = screen.getByLabelText(/search query input/i);
    fireEvent.change(input, { target: { value: 'test query' } });
    
    const form = screen.getByRole('button', { name: /search/i }).closest('form');
    fireEvent.submit(form!);
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query', 0.7);
  });

  it('disables search button when loading', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SearchForm onSearch={mockOnSearch} isLoading={true} />
      </QueryClientProvider>
    );
    
    const button = screen.getByRole('button', { name: /searching/i });
    expect(button).toBeDisabled();
  });
}); 