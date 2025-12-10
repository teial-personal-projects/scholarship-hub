"""
Database connection for Scholarship Finder
Connects to the same database as the Node.js API using PostgreSQL
"""
import os
import psycopg
from psycopg.rows import dict_row
from typing import Optional
from dotenv import load_dotenv

# Load environment from root .env.local
env_path = os.path.join(os.path.dirname(__file__), '../../../.env.local')
load_dotenv(env_path)

class DatabaseConnection:
    def __init__(self):
        self.connection = None
        self.cursor = None

    def connect(self):
        """Connect to Supabase PostgreSQL database (same as Node.js API)"""
        try:
            # Extract connection details from Supabase URL
            supabase_url = os.getenv("SUPABASE_URL")

            # Supabase PostgreSQL connection pattern:
            # postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
            # We'll construct this from the Supabase URL

            project_ref = supabase_url.split("//")[1].split(".")[0] if supabase_url else None

            # For now, let's use direct connection string if available in env
            # Otherwise construct from Supabase URL
            db_url = os.getenv("DATABASE_URL")

            if not db_url:
                # If no DATABASE_URL, we need to construct connection params
                # For Supabase, we'll use the pooler connection
                print("⚠️  DATABASE_URL not found in .env.local")
                print("    Please add your Supabase PostgreSQL connection string")
                print("    You can find it in: Supabase Dashboard > Project Settings > Database")
                print("    Format: postgres://postgres.[ref]:[password]@[host]:6543/postgres")
                return False

            # Connect using psycopg (v3)
            self.connection = psycopg.connect(db_url)
            self.cursor = self.connection.cursor(row_factory=dict_row)

            # Test connection
            self.cursor.execute("SELECT 1")
            print("✅ Database connection successful")
            return True

        except Exception as e:
            print(f"❌ Database connection error: {e}")
            return False

    def close(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        print("Database connection closed")

    def insert_scholarship(self, scholarship: dict) -> Optional[int]:
        """Insert or update scholarship"""
        # Implementation in next step
        pass
