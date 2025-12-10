"""
Category Manager for Scholarship Finder
Retrieves category configuration from database instead of JSON file
"""
from typing import List, Dict, Optional
import time


class CategoryManager:
    """
    Manages scholarship categories from database
    Provides caching and fallback to JSON file if database is unavailable
    """

    def __init__(self, db_connection):
        self.db = db_connection
        self._cache = None  # Simple in-memory cache
        self._cache_timestamp = None

    def get_enabled_categories(self, refresh_cache: bool = False) -> List[Dict]:
        """
        Get all enabled categories from database

        Args:
            refresh_cache: Force refresh the cache

        Returns:
            List of category dictionaries with id, name, slug, keywords, priority
        """
        # Simple cache to avoid repeated DB queries
        current_time = time.time()
        cache_duration = 300  # 5 minutes

        if not refresh_cache and self._cache and self._cache_timestamp:
            if current_time - self._cache_timestamp < cache_duration:
                return self._cache

        try:
            self.db.cursor.execute("""
                SELECT
                    id,
                    name,
                    slug,
                    description,
                    enabled,
                    priority,
                    keywords
                FROM scraper_categories
                WHERE enabled = true
                ORDER BY priority DESC, name ASC
            """)

            categories = self.db.cursor.fetchall()

            # Convert JSONB keywords to Python list
            result = []
            for cat in categories:
                result.append({
                    'id': cat['id'],
                    'name': cat['name'],
                    'slug': cat['slug'],
                    'description': cat['description'],
                    'enabled': cat['enabled'],
                    'priority': cat['priority'],
                    'keywords': cat['keywords'] if isinstance(cat['keywords'], list) else []
                })

            # Update cache
            self._cache = result
            self._cache_timestamp = current_time

            print(f"✅ Loaded {len(result)} enabled categories from database")
            return result

        except Exception as e:
            print(f"❌ Error fetching categories from database: {e}")
            # Try fallback to JSON file
            return self._get_from_json_fallback()

    def get_category_by_slug(self, slug: str) -> Optional[Dict]:
        """Get a specific category by slug"""
        categories = self.get_enabled_categories()
        for cat in categories:
            if cat['slug'] == slug:
                return cat
        return None

    def get_category_by_id(self, category_id: int) -> Optional[Dict]:
        """Get a specific category by ID"""
        try:
            self.db.cursor.execute("""
                SELECT
                    id, name, slug, description, enabled, priority, keywords
                FROM scraper_categories
                WHERE id = %s
            """, (category_id,))

            cat = self.db.cursor.fetchone()
            if cat:
                return {
                    'id': cat['id'],
                    'name': cat['name'],
                    'slug': cat['slug'],
                    'description': cat['description'],
                    'enabled': cat['enabled'],
                    'priority': cat['priority'],
                    'keywords': cat['keywords'] if isinstance(cat['keywords'], list) else []
                }
            return None

        except Exception as e:
            print(f"❌ Error fetching category by ID: {e}")
            return None

    def get_category_keywords(self, category_slug: str) -> List[str]:
        """Get keywords for a specific category"""
        category = self.get_category_by_slug(category_slug)
        if category:
            return category.get('keywords', [])
        return []


    def get_all_categories(self) -> List[Dict]:
        """Get all categories (including disabled ones)"""
        try:
            self.db.cursor.execute("""
                SELECT
                    id,
                    name,
                    slug,
                    description,
                    enabled,
                    priority,
                    keywords,
                    created_at,
                    updated_at
                FROM scraper_categories
                ORDER BY priority DESC, name ASC
            """)

            categories = self.db.cursor.fetchall()

            result = []
            for cat in categories:
                result.append({
                    'id': cat['id'],
                    'name': cat['name'],
                    'slug': cat['slug'],
                    'description': cat['description'],
                    'enabled': cat['enabled'],
                    'priority': cat['priority'],
                    'keywords': cat['keywords'] if isinstance(cat['keywords'], list) else [],
                    'created_at': cat['created_at'],
                    'updated_at': cat['updated_at']
                })

            return result

        except Exception as e:
            print(f"❌ Error fetching all categories: {e}")
            return []

    def _get_from_json_fallback(self) -> List[Dict]:
        """
        Fallback: Load categories from JSON file if database is unavailable
        """
        try:
            import json
            import os
            from pathlib import Path

            # Get path to source_categories.json
            current_dir = Path(__file__).parent
            json_path = current_dir.parent / 'config' / 'source_categories.json'

            if not json_path.exists():
                print(f"⚠️  JSON fallback file not found: {json_path}")
                return []

            with open(json_path, 'r') as f:
                config = json.load(f)

            # Convert JSON format to our expected format
            result = []
            for idx, cat in enumerate(config.get('categories', [])):
                if cat.get('include', False):  # Only include enabled categories
                    result.append({
                        'id': idx + 1,  # Temporary ID
                        'name': cat.get('name', ''),
                        'slug': cat.get('id', '').lower(),
                        'description': f"{cat.get('name', '')} scholarships",
                        'enabled': True,
                        'priority': 5,  # Default priority
                        'keywords': cat.get('keywords', [])
                    })

            print(f"⚠️  Loaded {len(result)} categories from JSON fallback")
            return result

        except Exception as e:
            print(f"❌ Error loading JSON fallback: {e}")
            return []
