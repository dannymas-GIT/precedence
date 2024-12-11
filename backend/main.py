from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
import requests
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import concurrent.futures
import os
import json
from bs4 import BeautifulSoup
import logging
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add environment variables for API keys
CASE_LAW_API_KEY = os.getenv('CASE_LAW_API_KEY', '')

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
        self.similarity_threshold = similarity_threshold
        self.vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            max_features=10000
        )
        # Use Case Law API endpoint
        self.endpoints = {
            'case_law': {
                'url': 'https://api.case.law/v1/cases/',
                'headers': {
                    'Authorization': f'Token {CASE_LAW_API_KEY}',
                    'User-Agent': 'LegalSearchBot/1.0',
                    'Accept': 'application/json'
                }
            }
        }
        
    def _fetch_from_repository(self, endpoint_info: Dict, query: str) -> List[Dict]:
        if not query.strip():
            return []
            
        try:
            # Use simple search parameters
            params = {
                'search': query,
                'full_case': 'true',
                'page_size': 20,
                'format': 'json'
            }
            
            logger.info(f"Fetching from {endpoint_info['url']} with params: {params}")
            logger.info(f"Using headers: {endpoint_info['headers']}")
            
            response = requests.get(
                endpoint_info['url'],
                headers=endpoint_info['headers'],
                params=params,
                timeout=10  # Add timeout
            )
            
            logger.info(f"Response status: {response.status_code}")
            logger.info(f"Response headers: {response.headers}")
            
            if response.status_code == 401:
                raise Exception("Invalid API key. Please check your CASE_LAW_API_KEY.")
                
            response.raise_for_status()
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    logger.info(f"Received {len(data.get('results', []))} results")
                    
                    # Transform results to match our format
                    transformed_results = []
                    for result in data.get('results', []):
                        transformed_results.append({
                            'title': result.get('name', ''),
                            'text': result.get('casebody', {}).get('data', {}).get('opinions', [{}])[0].get('text', ''),
                            'court': result.get('court', {}).get('name', ''),
                            'absolute_url': result.get('frontend_url', ''),
                            'jurisdiction': result.get('jurisdiction', {}).get('name', ''),
                            'date_created': result.get('decision_date', '2000-01-01')
                        })
                    
                    return transformed_results
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON response: {e}")
                    logger.error(f"Response content: {response.text}")
                    raise Exception("Failed to parse API response")
            
            return []
            
        except requests.RequestException as e:
            logger.error(f"Error fetching from {endpoint_info['url']}: {str(e)}")
            logger.error(f"Response content: {response.text if 'response' in locals() else 'No response'}")
            raise Exception(f"API request failed: {str(e)}")

    def _process_result(self, result: Dict, query: str) -> Optional[SearchResult]:
        content = result.get('text', '')
        if not content or not query.strip():
            return None
            
        try:
            tfidf_matrix = self.vectorizer.fit_transform([query, content])
            similarity = cosine_similarity(
                tfidf_matrix[0:1],
                tfidf_matrix[1:2]
            )[0][0]
        except Exception as e:
            print(f"Error calculating similarity: {str(e)}")
            return None
        
        if similarity >= self.similarity_threshold:
            return SearchResult(
                title=result.get('title', 'Untitled'),
                content=content[:500] + '...' if len(content) > 500 else content,
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
        if not prompt.strip():
            return []
            
        results = []
        
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_endpoint = {
                executor.submit(
                    self._fetch_from_repository, 
                    endpoint_info,
                    prompt
                ): name
                for name, endpoint_info in self.endpoints.items()
            }
            
            for future in concurrent.futures.as_completed(future_to_endpoint):
                raw_results = future.result()
                
                result_futures = [
                    executor.submit(self._process_result, result, prompt)
                    for result in raw_results
                ]
                
                for future in concurrent.futures.as_completed(result_futures):
                    processed_result = future.result()
                    if processed_result:
                        results.append(processed_result)
        
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results

class SearchRequest(BaseModel):
    query: str
    threshold: Optional[float] = 0.7

class SearchResponse(BaseModel):
    results: List[Dict]

@app.post("/search")
async def search_endpoint(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    if not 0 <= request.threshold <= 1:
        raise HTTPException(status_code=400, detail="Threshold must be between 0 and 1")
    
    try:    
        engine = LegalSearchEngine(similarity_threshold=request.threshold)
        results = engine.search(request.query)
        return {"results": [vars(r) for r in results]}
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Legal Search API is running"} 