import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App', () => {
  const queryClient = new QueryClient();

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    );
  };

  it('renders legal search title', () => {
    renderComponent();
    expect(screen.getByText(/Legal Repository Search/i)).toBeInTheDocument();
  });
}); 