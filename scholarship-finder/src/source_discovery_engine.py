#!/usr/bin/env python3
"""
Source Discovery Engine
AI-powered discovery of scholarship opportunities from various sources
"""

import os
import json
import time
import hashlib
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
from openai import OpenAI
import requests
from .config.config_loader import SourceCategoryConfig
from .constants import (
    MAX_GOOGLE_SEARCH_RESULTS,
    MAX_SOURCES_PER_CATEGORY_DEFAULT,
    GOOGLE_CSE_MAX_RESULTS,
    GOOGLE_MAX_RETRIES,
    GOOGLE_BACKOFF_BASE_DELAY_SEC,
    GOOGLE_MIN_INTERVAL_BETWEEN_REQUESTS_SEC,
)

logger = logging.getLogger(__name__)

@dataclass
class DiscoverySource:
    """Represents a discovered scholarship source"""
    url: str
    title: str
    description: str
    category: str
    confidence: float
    discovered_at: str

@dataclass
class SearchQuery:
    """Represents a search query for discovering sources"""
    query: str
    category: str
    priority: int

@dataclass
class SearchResult:
    """Typed result item from Google Custom Search"""
    url: str
    title: str
    description: str

class SourceDiscoveryEngine:
    """AI-powered engine for discovering new scholarship sources"""
    
    def __init__(self, openai_api_key: str, google_api_key: str, google_cse_id: str):
        self.openai_client = OpenAI(api_key=openai_api_key)
        self.google_api_key = google_api_key
        self.google_cse_id = google_cse_id
        self.config = SourceCategoryConfig()
        
    def discover_sources(self, categories: Optional[List[str]] = None, max_sources_per_category: int = MAX_SOURCES_PER_CATEGORY_DEFAULT) -> List[DiscoverySource]:
        """Discover scholarship sources for specified categories.

        Parameters:
            categories: Optional list of category IDs to search. If None, all configured
                categories from `SourceCategoryConfig` are used.
            max_sources_per_category: Maximum number of verified/high-confidence sources
                to retain per category (after AI verification and sorting).

        Returns:
            A list of `DiscoverySource` objects representing candidate pages that are
            likely to directly offer scholarships (not just aggregate lists).
        """
        if categories is None:
            categories = self.config.get_category_ids()
        
        all_sources = []
        
        for category_id in categories:
            logger.info(f"Discovering sources for category: {category_id}")
            
            # Generate search queries for this category
            queries = self._generate_search_queries(category_id)
            
            # Search for sources using each query
            category_sources = []
            for query in queries[:3]:  # Limit to top 3 queries per category
                sources = self._search_google(query.query, max_results=MAX_GOOGLE_SEARCH_RESULTS)
                
                # Verify sources using AI
                verified_sources = self._verify_sources(sources, category_id)
                category_sources.extend(verified_sources)
                
                # Rate limiting
                time.sleep(1)
            
            # Take top sources for this category
            category_sources = sorted(category_sources, key=lambda x: x.confidence, reverse=True)
            all_sources.extend(category_sources[:max_sources_per_category])
            
            logger.info(f"Found {len(category_sources)} sources for {category_id}")
        
        return all_sources
    
    def _generate_search_queries(self, category_id: str) -> List[SearchQuery]:
        """Generate targeted Google search queries for a given category.

        Parameters:
            category_id: The category key as defined by `SourceCategoryConfig`.

        Returns:
            A list of `SearchQuery` objects (AI-generated when possible). If the AI
            request fails, falls back to a small set of deterministic queries.
        """
        category = self.config.get_category_by_id(category_id)
        if not category:
            return []
        
        keywords = category.get('keywords', [])
        category_name = category.get('name', category_id)
        
        prompt = f"""
        Generate 5 specific Google search queries to find scholarship opportunities from {category_name} companies and organizations.
        
        Category: {category_name}
        Keywords: {', '.join(keywords)}
        
        Focus on finding:
        1. Companies in this industry that offer scholarships
        2. Professional associations that provide scholarships
        3. Industry-specific scholarship programs
        4. Corporate scholarship initiatives
        
        Make queries specific and targeted. Include terms like "scholarship", "student", "education", "financial aid".
        
        Return only the search queries, one per line, without numbering or additional text.
        """
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7
            )
            
            queries_text = response.choices[0].message.content.strip()
            queries = [query.strip() for query in queries_text.split('\n') if query.strip()]
            
            return [SearchQuery(query=query, category=category_id, priority=1) for query in queries]
            
        except Exception as e:
            logger.error(f"Error generating queries for {category_id}: {e}")
            # Fallback to basic queries
            fallback_queries = [
                f'"{category_name}" "scholarship" "student"',
                f'"{category_name}" "scholarship program"',
                f'"{category_name}" "financial aid" "student"'
            ]
            return [SearchQuery(query=query, category=category_id, priority=2) for query in fallback_queries]
    
    def _search_google(self, query: str, max_results: int = MAX_GOOGLE_SEARCH_RESULTS) -> List[SearchResult]:
        """Search Google Custom Search API for a single query with throttling and retries.

        Parameters:
            query: The fully formed Google query string.
            max_results: Desired number of results to request (capped by the API limit).

        Behavior:
            - Enforces a minimum interval between calls to respect rate limits.
            - Implements exponential backoff on HTTP 429 responses.

        Returns:
            A list of `SearchResult` items with basic metadata (url, title, description).
        """
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            'key': self.google_api_key,
            'cx': self.google_cse_id,
            'q': query,
            'num': min(max_results, GOOGLE_CSE_MAX_RESULTS)
        }
        
        max_retries = GOOGLE_MAX_RETRIES
        base_delay = GOOGLE_BACKOFF_BASE_DELAY_SEC
        
        for attempt in range(max_retries):
            try:
                # Rate limiting: wait between requests
                if hasattr(self, '_last_google_request'):
                    time_since_last = time.time() - self._last_google_request
                    if time_since_last < GOOGLE_MIN_INTERVAL_BETWEEN_REQUESTS_SEC:
                        sleep_time = GOOGLE_MIN_INTERVAL_BETWEEN_REQUESTS_SEC - time_since_last
                        logger.debug(f"Rate limiting: waiting {sleep_time:.2f} seconds")
                        time.sleep(sleep_time)
                
                self._last_google_request = time.time()
                
                response = requests.get(url, params=params, timeout=30)
                
                # Handle rate limiting specifically
                if response.status_code == 429:
                    delay = base_delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"Rate limited by Google API (attempt {attempt + 1}/{max_retries}). Waiting {delay} seconds...")
                    time.sleep(delay)
                    continue
                
                response.raise_for_status()
                
                data = response.json()
                items = data.get('items', [])
                
                results: List[SearchResult] = []
                for item in items:
                    results.append(SearchResult(
                        url=item.get('link', ''),
                        title=item.get('title', ''),
                        description=item.get('snippet', '')
                    ))
                
                logger.debug(f"Google search successful for query: {query[:50]}...")
                return results
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Rate limited by Google API (attempt {attempt + 1}/{max_retries}). Waiting {delay} seconds...")
                    time.sleep(delay)
                    continue
                else:
                    logger.error(f"HTTP error searching Google: {e}")
                    return []
            except Exception as e:
                logger.error(f"Error searching Google: {e}")
                return []
        
        logger.error(f"Failed to search Google after {max_retries} attempts due to rate limiting")
        return []
    
    def _verify_sources(self, sources: List[SearchResult], category_id: str) -> List[DiscoverySource]:
        """Use AI to verify whether search results are true scholarship providers.

        Parameters:
            sources: Search results returned by `_search_google`.
            category_id: The category context to include in the AI prompt for relevance.

        Returns:
            A list of `DiscoverySource` entries filtered to those that the AI considers
            likely to offer scholarships, each with a confidence score.
        """
        category = self.config.get_category_by_id(category_id)
        category_name = category.get('name', category_id) if category else category_id
        
        verified_sources = []
        
        for source in sources:
            prompt = f"""
            Analyze this website to determine if it offers scholarships for students in {category_name}.
            
            URL: {source.url}
            Title: {source.title}
            Description: {source.description}
            
            Determine if this source:
            1. Offers scholarships (not just lists other scholarships)
            2. Is relevant to {category_name} industry
            3. Is a legitimate organization/company
            
            Respond with a JSON object:
            {{
                "offers_scholarships": true/false,
                "relevance_score": 0.0-1.0,
                "confidence": 0.0-1.0,
                "reasoning": "brief explanation"
            }}
            """
            
            try:
                response = self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=150,
                    temperature=0.3
                )
                
                result_text = response.choices[0].message.content.strip()
                
                # Try to parse JSON response
                try:
                    result = json.loads(result_text)
                    
                    if result.get('offers_scholarships', False) and result.get('confidence', 0) > 0.6:
                        verified_sources.append(DiscoverySource(
                            url=source.url,
                            title=source.title,
                            description=source.description,
                            category=category_id,
                            confidence=result.get('confidence', 0.5),
                            discovered_at=time.strftime('%Y-%m-%d %H:%M:%S')
                        ))
                
                except json.JSONDecodeError:
                    logger.warning(f"Could not parse AI response for {source.url}")
                    continue
                    
            except Exception as e:
                logger.error(f"Error verifying source {source.url}: {e}")
                continue
        
        return verified_sources
    
    def get_discovery_statistics(self) -> Dict:
        """Get high-level statistics about loaded discovery configuration.

        Returns:
            A dictionary including number of categories, their names, and a boolean
            indicating whether configuration was successfully loaded.
        """
        categories = self.config.get_all_categories()
        
        return {
            'total_categories': len(categories),
            'categories': [cat['name'] for cat in categories],
            'config_loaded': len(categories) > 0
        }
