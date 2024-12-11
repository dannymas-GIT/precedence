# Legal Repository Search Implementation Guide

This guide provides implementation details for a legal repository search application with both backend and frontend components.

## Table of Contents
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Setup Instructions](#setup-instructions)
- [Usage Examples](#usage-examples)

## Backend Implementation

### Required Dependencies

```bash
pip install sentence-transformers sklearn requests numpy fastapi uvicorn
```

### Backend Code (main.py)

```python
import requests
from typing import List, Dict, Optional
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import concurrent.futures
from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel

# SearchResult and LegalSearchEngine classes from previous implementation
@dataclass
class SearchResult:
    """Data class to store search results with metadata"""
    title: str
    content: str
    source: str
    url: str
    similarity_score: float
    jurisdiction: str
    date_published: datetime

class LegalSearchEngine:
    def __init__(self, similarity_threshold: float = 0.7):
        """
        Initialize the search engine with configurable parameters
        
        Args:
            similarity_threshold: Minimum similarity score (0-1) for including results
        """
        self.similarity_threshold = similarity_threshold
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.endpoints = {
            'courtlistener': 'https://www.courtlistener.com/api/rest/v3/opinions/',
            'public_access': 'https://pcl.uscourts.gov/pcl/pages/search',
            'supreme_court': 'https://www.supremecourt.gov/opinions/opinions.aspx'
        }
        
    def _fetch_from_repository(self, endpoint: str, query: str) -> List[Dict]:
        try:
            headers = {
                'User-Agent': 'LegalSearchBot/1.0',
                'Accept': 'application/json'
            }
            params = {'q': query, 'format': 'json'}
            response = requests.get(endpoint, headers=headers, params=params)
            response.raise_for_status()
            return response.json().get('results', [])
        except requests.RequestException as e:
            print(f"Error fetching from {endpoint}: {str(e)}")
            return []

    def _process_result(self, result: Dict, query_embedding) -> Optional[SearchResult]:
        content = result.get('text', '')
        if not content:
            return None
            
        content_embedding = self.model.encode([content])[0]
        similarity = cosine_similarity(
            query_embedding.reshape(1, -1),
            content_embedding.reshape(1, -1)
        )[0][0]
        
        if similarity >= self.similarity_threshold:
            return SearchResult(
                title=result.get('title', 'Untitled'),
                content=content,
                source=result.get('court', 'Unknown Court'),
                url=result.get('absolute_url', ''),
                similarity_score=float(similarity),
                jurisdiction=result.get('jurisdiction', 'Unknown'),
                date_published=datetime.fromisoformat(
                    result.get('date_created', '2000-01-01')
                )
            )
        return None

    def search(self, prompt: str) -> List[SearchResult]:
        query_embedding = self.model.encode([prompt])[0]
        results = []
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_endpoint = {
                executor.submit(self._fetch_from_repository, endpoint, prompt): name
                for name, endpoint in self.endpoints.items()
            }
            
            for future in concurrent.futures.as_completed(future_to_endpoint):
                raw_results = future.result()
                
                result_futures = [
                    executor.submit(self._process_result, result, query_embedding)
                    for result in raw_results
                ]
                
                for future in concurrent.futures.as_completed(result_futures):
                    processed_result = future.result()
                    if processed_result:
                        results.append(processed_result)
        
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results

# FastAPI implementation
app = FastAPI()

class SearchRequest(BaseModel):
    query: str
    threshold: Optional[float] = 0.7

class SearchResponse(BaseModel):
    results: List[Dict]

@app.post("/search", response_model=SearchResponse)
async def search_endpoint(request: SearchRequest):
    engine = LegalSearchEngine(similarity_threshold=request.threshold)
    results = engine.search(request.query)
    return {"results": [vars(r) for r in results]}
```

## Frontend Implementation

### Required Dependencies
Create a new React project:

```bash
npx create-react-app legal-search-frontend
cd legal-search-frontend
npm install @tailwindcss/forms axios react-query
```

### Frontend Code (App.js)

```jsx
import React, { useState } from 'react';
import axios from 'react-axios';
import { useQuery } from 'react-query';

function App() {
  const [query, setQuery] = useState('');
  const [threshold, setThreshold] = useState(0.7);
  const [isSearching, setIsSearching] = useState(false);

  const searchLegal = async () => {
    setIsSearching(true);
    try {
      const response = await axios.post('http://localhost:8000/search', {
        query,
        threshold
      });
      return response.data.results;
    } finally {
      setIsSearching(false);
    }
  };

  const { data: results, refetch } = useQuery(
    ['legalSearch', query, threshold],
    searchLegal,
    { enabled: false }
  );

  const handleSearch = (e) => {
    e.preventDefault();
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-8">Legal Repository Search</h2>
                
                <form onSubmit={handleSearch} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Search Query
                    </label>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Enter your search query"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Similarity Threshold: {threshold}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="mt-1 block w-full"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </form>

                {results && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold mb-4">Results</h3>
                    <div className="space-y-6">
                      {results.map((result, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 shadow-sm"
                        >
                          <h4 className="font-bold">{result.title}</h4>
                          <p className="text-sm text-gray-600">
                            Similarity: {(result.similarity_score * 100).toFixed(1)}%
                          </p>
                          <p className="text-sm text-gray-600">
                            Jurisdiction: {result.jurisdiction}
                          </p>
                          <p className="text-sm text-gray-600">
                            Source: {result.source}
                          </p>
                          {result.url && (
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              View Source
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
```

## Setup Instructions

1. Create a new directory for your project:
```bash
mkdir legal-search-app
cd legal-search-app
```

2. Create virtual environment and install backend dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

3. Start the backend server:
```bash
uvicorn main:app --reload
```

4. In a new terminal, set up and start the frontend:
```bash
cd frontend
npm install
npm start
```

## Usage Examples

1. Basic search:
```python
from main import LegalSearchEngine

engine = LegalSearchEngine()
results = engine.search("patent infringement software")

for result in results:
    print(f"Title: {result.title}")
    print(f"Similarity: {result.similarity_score:.2%}")
```

2. Custom threshold:
```python
engine = LegalSearchEngine(similarity_threshold=0.85)
results = engine.search("copyright fair use")
```

3. API endpoint:
```bash
curl -X POST "http://localhost:8000/search" \
     -H "Content-Type: application/json" \
     -d '{"query": "trademark infringement", "threshold": 0.8}'
```

## Notes

- The frontend uses Tailwind CSS for styling
- The backend uses FastAPI for the REST API
- Similarity matching uses the sentence-transformers library
- Results are sorted by similarity score in descending order
- The application supports concurrent processing of multiple legal repositories

Remember to handle API rate limits and implement appropriate error handling in a production environment.

Feel free to customize the UI components and add additional features as needed for your specific use case.
