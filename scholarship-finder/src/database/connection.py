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
        """
        Insert or update scholarship
        Returns the scholarship ID if successful, None otherwise
        """
        try:
            # Generate checksum if not provided
            if 'checksum' not in scholarship or not scholarship['checksum']:
                try:
                    from ..deduplication.engine import DeduplicationEngine
                    dedup = DeduplicationEngine(self)
                    scholarship['checksum'] = dedup.generate_checksum(scholarship)
                except (ImportError, ValueError):
                    # Fallback: generate simple checksum inline
                    import hashlib
                    components = [
                        (scholarship.get('organization') or '').lower().strip(),
                        (scholarship.get('name') or '').lower().strip(),
                        str(scholarship.get('min_award') or scholarship.get('amount') or '0'),
                        str(scholarship.get('deadline') or '')
                    ]
                    checksum_string = '|'.join(components)
                    scholarship['checksum'] = hashlib.sha256(checksum_string.encode()).hexdigest()

            # Prepare SQL for upsert (insert or update on conflict)
            sql = """
                INSERT INTO scholarships (
                    name, organization, organization_website, description, eligibility, requirements,
                    min_award, max_award, url, application_url, apply_url, source_url,
                    deadline, deadline_type, renewable, category, target_type, education_level,
                    field_of_study, ethnicity, gender, geographic_restrictions, country,
                    essay_required, recommendation_required, checksum, status, verified,
                    source_type, source_name, discovered_at, last_verified_at, expires_at
                ) VALUES (
                    %(name)s, %(organization)s, %(organization_website)s, %(description)s,
                    %(eligibility)s, %(requirements)s, %(min_award)s, %(max_award)s,
                    %(url)s, %(application_url)s, %(apply_url)s, %(source_url)s,
                    %(deadline)s, %(deadline_type)s, %(renewable)s, %(category)s,
                    %(target_type)s, %(education_level)s, %(field_of_study)s,
                    %(ethnicity)s, %(gender)s, %(geographic_restrictions)s, %(country)s,
                    %(essay_required)s, %(recommendation_required)s, %(checksum)s,
                    %(status)s, %(verified)s, %(source_type)s, %(source_name)s,
                    %(discovered_at)s, %(last_verified_at)s, %(expires_at)s
                )
                ON CONFLICT (url) DO UPDATE SET
                    name = EXCLUDED.name,
                    organization = EXCLUDED.organization,
                    organization_website = EXCLUDED.organization_website,
                    description = COALESCE(EXCLUDED.description, scholarships.description),
                    eligibility = COALESCE(EXCLUDED.eligibility, scholarships.eligibility),
                    requirements = COALESCE(EXCLUDED.requirements, scholarships.requirements),
                    min_award = COALESCE(EXCLUDED.min_award, scholarships.min_award),
                    max_award = COALESCE(EXCLUDED.max_award, scholarships.max_award),
                    application_url = COALESCE(EXCLUDED.application_url, scholarships.application_url),
                    apply_url = COALESCE(EXCLUDED.apply_url, scholarships.apply_url),
                    deadline = COALESCE(EXCLUDED.deadline, scholarships.deadline),
                    deadline_type = COALESCE(EXCLUDED.deadline_type, scholarships.deadline_type),
                    category = COALESCE(EXCLUDED.category, scholarships.category),
                    field_of_study = COALESCE(EXCLUDED.field_of_study, scholarships.field_of_study),
                    last_verified_at = EXCLUDED.last_verified_at,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id;
            """

            # Prepare scholarship data with defaults
            data = {
                'name': scholarship.get('name', ''),
                'organization': scholarship.get('organization'),
                'organization_website': scholarship.get('organization_website'),
                'description': scholarship.get('description'),
                'eligibility': scholarship.get('eligibility'),
                'requirements': scholarship.get('requirements'),
                'min_award': scholarship.get('min_award') or scholarship.get('amount'),
                'max_award': scholarship.get('max_award') or scholarship.get('amount'),
                'url': scholarship.get('url', ''),
                'application_url': scholarship.get('application_url'),
                'apply_url': scholarship.get('apply_url'),
                'source_url': scholarship.get('source_url'),
                'deadline': scholarship.get('deadline'),
                'deadline_type': scholarship.get('deadline_type', 'fixed'),
                'renewable': scholarship.get('renewable', False),
                'category': scholarship.get('category'),
                'target_type': scholarship.get('target_type'),
                'education_level': scholarship.get('education_level'),
                'field_of_study': scholarship.get('field_of_study'),
                'ethnicity': scholarship.get('ethnicity', 'unspecified'),
                'gender': scholarship.get('gender', 'unspecified'),
                'geographic_restrictions': scholarship.get('geographic_restrictions'),
                'country': scholarship.get('country', 'US'),
                'essay_required': scholarship.get('essay_required', False),
                'recommendation_required': scholarship.get('recommendation_required', False),
                'checksum': scholarship.get('checksum'),
                'status': scholarship.get('status', 'active'),
                'verified': scholarship.get('verified', False),
                'source_type': scholarship.get('source_type', 'scraper'),
                'source_name': scholarship.get('source_name'),
                'discovered_at': scholarship.get('discovered_at'),
                'last_verified_at': scholarship.get('last_verified_at'),
                'expires_at': scholarship.get('expires_at')
            }

            # Execute insert/update
            self.cursor.execute(sql, data)
            result = self.cursor.fetchone()
            self.connection.commit()

            if result:
                scholarship_id = result['id']
                print(f"✅ Inserted/updated scholarship: {scholarship.get('name', 'Unknown')} (ID: {scholarship_id})")
                return scholarship_id
            else:
                print(f"⚠️  No ID returned for scholarship: {scholarship.get('name', 'Unknown')}")
                return None

        except Exception as e:
            print(f"❌ Error inserting scholarship: {e}")
            print(f"   Scholarship: {scholarship.get('name', 'Unknown')}")
            self.connection.rollback()
            return None

    def update_scholarship(self, scholarship_id: int, updates: dict) -> bool:
        """Update specific fields of an existing scholarship"""
        try:
            # Build dynamic UPDATE query based on provided fields
            set_clauses = []
            params = {'id': scholarship_id}

            for key, value in updates.items():
                set_clauses.append(f"{key} = %({key})s")
                params[key] = value

            if not set_clauses:
                return False

            sql = f"""
                UPDATE scholarships
                SET {', '.join(set_clauses)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %(id)s
            """

            self.cursor.execute(sql, params)
            self.connection.commit()

            return self.cursor.rowcount > 0

        except Exception as e:
            print(f"❌ Error updating scholarship: {e}")
            self.connection.rollback()
            return False

    def get_scholarship_by_url(self, url: str) -> Optional[dict]:
        """Get scholarship by URL"""
        try:
            self.cursor.execute(
                "SELECT * FROM scholarships WHERE url = %s",
                (url,)
            )
            return self.cursor.fetchone()
        except Exception as e:
            print(f"❌ Error fetching scholarship by URL: {e}")
            return None

    def get_scholarship_by_checksum(self, checksum: str) -> Optional[dict]:
        """Get scholarship by checksum"""
        try:
            self.cursor.execute(
                "SELECT * FROM scholarships WHERE checksum = %s",
                (checksum,)
            )
            return self.cursor.fetchone()
        except Exception as e:
            print(f"❌ Error fetching scholarship by checksum: {e}")
            return None
