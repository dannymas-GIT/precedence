import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SearchResults from './SearchResults';

describe('SearchResults', () => {
  const mockResults = [
    {
      title: 'Test Case 1',
      content: 'Test content',
      source: 'Test Court',
      url: 'http://test.com',
      similarity_score: 0.85,
      jurisdiction: 'Test State',
      date_published: '2023-12-11'
    }
  ];

  it('renders nothing when results are empty', () => {
    render(<SearchResults results={[]} />);
    expect(screen.queryByText(/results/i)).not.toBeInTheDocument();
  });

  it('renders results when provided', () => {
    render(<SearchResults results={mockResults} />);
    
    // Test exact matches
    expect(screen.getByText('Test Case 1')).toBeInTheDocument();
    
    // Test partial matches using regex
    expect(screen.getByText(/85\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/Jurisdiction:\s*Test State/)).toBeInTheDocument();
    expect(screen.getByText(/Source:\s*Test Court/)).toBeInTheDocument();
  });

  it('renders view source link when URL is provided', () => {
    render(<SearchResults results={mockResults} />);
    
    const link = screen.getByRole('link', { name: /view source/i });
    expect(link).toHaveAttribute('href', 'http://test.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
}); 