import { SearchResult } from '../types';

interface ResultCardProps {
  result: SearchResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <h4 className="font-bold text-lg">{result.title}</h4>
      <div className="mt-2 space-y-1">
        <p className="text-sm text-gray-600">
          Similarity: {(result.similarity_score * 100).toFixed(1)}%
        </p>
        <p className="text-sm text-gray-600">
          Jurisdiction: {result.jurisdiction}
        </p>
        <p className="text-sm text-gray-600">
          Source: {result.source}
        </p>
      </div>
      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-indigo-600 hover:text-indigo-800"
          aria-label={`View source for ${result.title}`}
        >
          View Source
        </a>
      )}
    </div>
  );
} 