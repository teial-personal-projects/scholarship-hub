"""
Database connection for Scholarship Finder
Connects to the same database as the Node.js API
"""
import os
from supabase import create_client
from typing import Optional
from dotenv import load_dotenv

# Load environment from root .env
load_dotenv(os.path.join(os.path.dirname(__file__), '../../../.env'))

class DatabaseConnection:
    def __init__(self):
        self.supabase = None

    def connect(self):
        """Connect to Supabase database (same as Node.js API)"""
        try:
            self.supabase = create_client(
                os.getenv("SUPABASE_URL"),
                os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            )
            return True
        except Exception as e:
            print(f"❌ Database connection error: {e}")
            return False

    def close(self):
        """Close database connection"""
        # Supabase client doesn't require explicit closing
        self.supabase = None

    def insert_scholarship(self, scholarship: dict) -> Optional[int]:
        """Insert or update scholarship"""
        # Implementation in next step
        pass
