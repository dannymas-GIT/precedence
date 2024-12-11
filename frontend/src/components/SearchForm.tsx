import { useState } from 'react';

interface SearchFormProps {
  onSearch: (query: string, threshold: number) => Promise<void>;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [threshold, setThreshold] = useState(0.7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSearch(query, threshold);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label 
          htmlFor="search-query"
          className="block text-sm font-medium text-gray-700"
        >
          Search Query
        </label>
        <input
          id="search-query"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Enter your search query"
          aria-label="Search query input"
        />
      </div>
      
      <div>
        <label 
          htmlFor="threshold"
          className="block text-sm font-medium text-gray-700"
        >
          Similarity Threshold: {threshold}
        </label>
        <input
          id="threshold"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value))}
          className="mt-1 block w-full"
          aria-label="Similarity threshold slider"
        />
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        aria-label={isLoading ? 'Searching...' : 'Search'}
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
} 