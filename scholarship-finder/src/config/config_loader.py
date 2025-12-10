#!/usr/bin/env python3
"""
Configuration Loader for Source Categories
Loads and manages source category configurations from JSON files
"""

import json
import os
from typing import List, Dict, Optional

class SourceCategoryConfig:
    def __init__(self, config_path: str = None):
        if config_path is None:
            # Default to the config file in the same directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(current_dir, 'source_categories.json')
        
        self.config_path = config_path
        self.categories = self._load_config()
    
    def _load_config(self) -> List[Dict]:
        """Load the configuration from JSON file, filtering to only include categories where include=true."""
        try:
            with open(self.config_path, 'r') as f:
                data = json.load(f)
                all_categories = data.get('categories', [])
                # Filter to only include categories where include=true
                # If 'include' field is not present, default to False (exclude)
                return [cat for cat in all_categories if cat.get('include', False) is True]
        except FileNotFoundError:
            print(f"Config file not found: {self.config_path}")
            return []
        except json.JSONDecodeError as e:
            print(f"Error parsing config file: {e}")
            return []
    
    def get_category_by_id(self, category_id: str) -> Optional[Dict]:
        """Get a category by its ID."""
        for category in self.categories:
            if category.get('id') == category_id:
                return category
        return None
    
    def get_all_categories(self) -> List[Dict]:
        """Get all included categories (where include=true)."""
        return self.categories
    
    def get_all_categories_including_excluded(self) -> List[Dict]:
        """Get all categories including those with include=false (for admin/debugging purposes)."""
        try:
            with open(self.config_path, 'r') as f:
                data = json.load(f)
                return data.get('categories', [])
        except (FileNotFoundError, json.JSONDecodeError):
            return []
    
    def get_category_ids(self) -> List[str]:
        """Get all category IDs."""
        return [category.get('id') for category in self.categories]
    
    def get_category_names(self) -> List[str]:
        """Get all category names."""
        return [category.get('name') for category in self.categories]
    
    def get_keywords_for_category(self, category_id: str) -> List[str]:
        """Get keywords for a specific category."""
        category = self.get_category_by_id(category_id)
        return category.get('keywords', []) if category else []
    
    def get_statistics(self) -> Dict:
        """Get basic statistics about the configuration."""
        all_cats = self.get_all_categories_including_excluded()
        return {
            'total_categories': len(all_cats),
            'included_categories': len(self.categories),
            'category_ids': self.get_category_ids(),
            'category_names': self.get_category_names()
        }

if __name__ == "__main__":
    # Test the configuration loader
    config = SourceCategoryConfig()
    
    print("=== Source Category Configuration ===")
    stats = config.get_statistics()
    print(f"Total categories: {stats['total_categories']}")
    print(f"Included categories: {stats['included_categories']}")
    print()
    
    print("Included Categories (will be processed):")
    for category in config.get_all_categories():
        print(f"  - {category['name']} (ID: {category['id']})")
        print(f"    Keywords: {', '.join(category['keywords'])}")
        print()
    
    print("Excluded Categories (will NOT be processed):")
    all_cats = config.get_all_categories_including_excluded()
    excluded = [cat for cat in all_cats if cat.get('include', False) is not True]
    for category in excluded:
        print(f"  - {category['name']} (ID: {category['id']})")
    print()
