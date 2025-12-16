#!/usr/bin/env python3
"""
Database Manager - Abstract database operations for different environments
"""

import os
import json
import logging
import re
import psycopg
from psycopg.rows import dict_row
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from datetime import datetime
from calendar import month_abbr

MONTH_LOOKUP = {abbr.lower(): index for index, abbr in enumerate(month_abbr) if abbr}
from .scholarship_types import Scholarship

logger = logging.getLogger(__name__)


class DatabaseManager(ABC):
    """Abstract base class for database operations"""
    
    def __init__(self, environment: str):
        self.environment = environment
        self.connection = None
    
    @abstractmethod
    def connect(self) -> bool:
        """Establish database connection"""
        pass
    
    @abstractmethod
    def disconnect(self):
        """Close database connection"""
        pass
    
    @abstractmethod
    def save_scholarship(self, scholarship: Scholarship) -> bool:
        """Save scholarship to database"""
        pass
    
    @abstractmethod
    def update_job_status(self, status: str, metadata: Any):
        """Update job status"""
        pass

    @staticmethod
    def _normalize_string_collection(value: Any, lowercase: bool = True) -> Optional[str]:
        def normalize_items(items) -> list[str]:
            normalized_list: list[str] = []
            for item in items:
                if isinstance(item, str):
                    cleaned = item.strip()
                else:
                    cleaned = str(item).strip()
                if not cleaned:
                    continue
                normalized_list.append(cleaned.lower() if lowercase else cleaned)
            return normalized_list

        if value is None:
            return None

        if isinstance(value, str):
            trimmed = value.strip()
            if not trimmed:
                return None
            try:
                parsed = json.loads(trimmed)
                if isinstance(parsed, list):
                    normalized_list = normalize_items(parsed)
                    if not normalized_list:
                        return None
                    return json.dumps(normalized_list)
            except json.JSONDecodeError:
                pass
            normalized_list = normalize_items(trimmed.split(','))
            if not normalized_list:
                return None
            return json.dumps(normalized_list)

        if isinstance(value, (list, tuple, set)):
            normalized_list = normalize_items(value)
            if not normalized_list:
                return None
            return json.dumps(normalized_list)

        # Fallback for other iterables or unexpected types
        item_str = str(value).strip()
        if not item_str:
            return None
        normalized_value = item_str.lower() if lowercase else item_str
        return json.dumps([normalized_value])

    @staticmethod
    def _normalize_subject_areas(subject_areas: Any) -> Optional[str]:
        return DatabaseManager._normalize_string_collection(subject_areas, lowercase=True)

    @staticmethod
    def _normalize_eligibility(eligibility: Any) -> Optional[str]:
        return DatabaseManager._normalize_string_collection(eligibility, lowercase=True)

    @staticmethod
    def _normalize_ethnicity(ethnicity: Any) -> Optional[str]:
        return DatabaseManager._normalize_string_collection(ethnicity, lowercase=True)

    @staticmethod
    def _normalize_academic_level(academic_level: Any) -> Optional[str]:
        return DatabaseManager._normalize_string_collection(academic_level, lowercase=True)

    @staticmethod
    def _normalize_geographic_restrictions(geographic_restrictions: Any) -> Optional[str]:
        return DatabaseManager._normalize_string_collection(geographic_restrictions, lowercase=True)

    @staticmethod
    def _normalize_deadline(deadline: Optional[str]) -> Optional[str]:
        if not deadline:
            return None

        trimmed = deadline.strip()
        if not trimmed:
            return None

        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", trimmed):
            return trimmed

        short_month_match = re.fullmatch(r"(?i)([A-Za-z]{3})\s+(\d{1,2})(st|nd|rd|th)?", trimmed)
        if short_month_match:
            month_token = short_month_match.group(1).lower()
            day_token = short_month_match.group(2)

            month_number = MONTH_LOOKUP.get(month_token)

            if month_number:
                try:
                    current_year = datetime.now().year
                    normalized_date = datetime(current_year, month_number, int(day_token))
                    return normalized_date.strftime('%Y-%m-%d')
                except ValueError:
                    return trimmed

        return trimmed
    
    def get_connection(self):
        """Get database connection"""
        if not self.connection or self.connection.closed:
            if not self.connect():
                logger.error("Failed to establish database connection")
                return None
        return self.connection


class PostgreSQLDatabaseManager(DatabaseManager):
    """PostgreSQL database manager (used for both local and production)"""
    
    def __init__(self, environment: str = "local"):
        super().__init__(environment)
        # Use DATABASE_URL for all environments
        self.db_url = os.getenv('DATABASE_URL')
    
    def connect(self) -> bool:
        """Connect to PostgreSQL database"""
        try:
            if not self.db_url:
                logger.error("DATABASE_URL not found in environment variables")
                return False
            
            self.connection = psycopg.connect(self.db_url)
            logger.debug(f"Connected to PostgreSQL database ({self.environment})")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL ({self.environment}): {e}")
            return False
    
    def disconnect(self):
        """Close database connection"""
        if self.connection and not self.connection.closed:
            self.connection.close()
            logger.debug(f"Disconnected from PostgreSQL database ({self.environment})")
    
    def save_scholarship(self, scholarship: Scholarship) -> bool:
        """Save scholarship to PostgreSQL database"""
        conn = self.get_connection()
        if not conn:
            return False
        
        cursor = conn.cursor(row_factory=dict_row)
        
        try:
            # Timestamps
            if not scholarship.created_at:
                scholarship.created_at = datetime.now()
            scholarship.updated_at = datetime.now()
            
            # Normalize dedupe key fields to avoid NULLs in DB
            scholarship.title = (scholarship.title or "").strip()
            scholarship.organization = (scholarship.organization or "").strip()
            scholarship.deadline = self._normalize_deadline(scholarship.deadline)
            scholarship.deadline = (scholarship.deadline or "").strip()

            # Handle rolling deadlines: store as NULL date but mark deadline_type
            deadline_type = None
            if isinstance(scholarship.deadline, str) and scholarship.deadline.lower() == "rolling":
                scholarship.deadline = None
                deadline_type = "rolling"
            # Handle vague deadlines like "First Week of January" -> use first day of that month
            elif isinstance(scholarship.deadline, str) and "first week of" in scholarship.deadline.lower():
                try:
                    parts = scholarship.deadline.split()
                    # Expect pattern: "First Week of <Month>"
                    month_name = parts[-1]
                    year = datetime.now().year
                    month_dt = datetime.strptime(month_name, "%B")
                    tentative_date = datetime(year, month_dt.month, 1).date()
                    # If already past this year, roll to next year
                    if tentative_date < datetime.now().date():
                        tentative_date = datetime(year + 1, month_dt.month, 1).date()
                    scholarship.deadline = tentative_date.isoformat()
                    deadline_type = "approximate"
                except Exception:
                    # If parsing fails, drop the deadline to avoid DB errors
                    scholarship.deadline = None
                    deadline_type = "approximate"
            
            # Map dataclass fields to DB schema
            def _list_to_text(val):
                if val is None:
                    return None
                if isinstance(val, list):
                    return ', '.join([str(v) for v in val if v is not None])
                return str(val)

            def _truncate(val, max_len: int):
                if val is None:
                    return None
                s = str(val)
                return s if len(s) <= max_len else s[:max_len]

            data = {
                'name': _truncate(scholarship.title, 500),
                'organization': _truncate(scholarship.organization or None, 300),
                'organization_website': scholarship.org_website,
                'description': scholarship.description,
                'eligibility': _list_to_text(scholarship.eligibility),
                'requirements': None,  # not provided separately
                'min_award': scholarship.min_award,
                'max_award': scholarship.max_award,
                'url': scholarship.source_url or scholarship.apply_url or '',
                'application_url': scholarship.apply_url,
                'apply_url': scholarship.apply_url,
                'source_url': scholarship.source_url,
                'deadline': scholarship.deadline or None,
                'deadline_type': _truncate(deadline_type, 50),
                'renewable': scholarship.renewable,
                'category': None,
                'target_type': _truncate(scholarship.target_type, 50),
                'education_level': _truncate(_list_to_text(scholarship.academic_level), 100),
                'field_of_study': None,
                'ethnicity': _truncate(_list_to_text(scholarship.ethnicity), 100),
                'gender': _truncate(scholarship.gender, 50),
                'geographic_restrictions': _list_to_text(scholarship.geographic_restrictions),
                'country': _truncate(scholarship.country or 'US', 50),
                'essay_required': scholarship.essay_required,
                'recommendation_required': scholarship.recommendation_required,
                'checksum': None,
                'status': 'active' if scholarship.active is not False else 'inactive',
                'verified': False,
                'source_type': _truncate('scraper', 50),
                'source_name': _truncate(scholarship.source or None, 100),
                'discovered_at': datetime.now(),
                'last_verified_at': datetime.now(),
                'expires_at': None
            }
            # Remove empty strings to avoid NOT NULL violations on text columns
            data = {k: (v if v != '' else None) for k, v in data.items()}
            
            # Build INSERT ... ON CONFLICT using unique constraint on url
            placeholders = ', '.join(['%s'] * len(data))
            columns = ', '.join(data.keys())
            updates = ', '.join([f"{k} = EXCLUDED.{k}" for k in data.keys() if k not in ['id', 'created_at']])
            query = (
                f"INSERT INTO scholarships ({columns}) VALUES ({placeholders}) "
                f"ON CONFLICT (url) DO UPDATE SET {updates}, updated_at = CURRENT_TIMESTAMP"
            )
            cursor.execute(query, list(data.values()))
            logger.info(f"Upserted scholarship in {self.environment} DB: {scholarship.title}")
            
            conn.commit()
            return True
            
        except Exception as e:
            conn.rollback()
            logger.error(f"PostgreSQL database error ({self.environment}): {e}")
            raise
        finally:
            cursor.close()
    
    def update_job_status(self, status: str, metadata: Any):
        """Update job status in PostgreSQL database"""
        logger.debug(f"[{self.environment.upper()}] Updating job status: {status} with metadata type: {type(metadata)}")
        if hasattr(metadata, 'website'):
            logger.debug(f"[{self.environment.upper()}] Metadata has website attribute: {metadata.website}")
        elif isinstance(metadata, dict) and 'website' in metadata:
            logger.debug(f"[{self.environment.upper()}] Metadata dict has website key: {metadata['website']}")
        else:
            logger.debug(f"[{self.environment.upper()}] No website found in metadata")
        
        try:
            conn = self.get_connection()
            if not conn:
                logger.error(f"Failed to get database connection for job status update. Host: {self.host}, Database: {self.database}")
                return
        except Exception as e:
            logger.error(f"Exception getting database connection for job status update: {e}")
            return
        
        cursor = conn.cursor(row_factory=dict_row)
        
        try:
            # Extract job_id from metadata if available (should be integer)
            job_id = getattr(metadata, 'id', None) if hasattr(metadata, 'id') else None
            if isinstance(metadata, dict):
                job_id = metadata.get('id', job_id)
            
            # Extract job_type from metadata (required field)
            job_type = getattr(metadata, 'job_type', None) if hasattr(metadata, 'job_type') else None
            if not job_type and isinstance(metadata, dict):
                job_type = metadata.get('job_type')
            if not job_type:
                # Fallback: try to extract from class name or use default
                if hasattr(metadata, '__class__') and hasattr(metadata.__class__, '__name__'):
                    class_name = metadata.__class__.__name__
                    if 'Scraper' in class_name:
                        job_type = 'scraper'
                    elif 'Discovery' in class_name:
                        job_type = 'ai_discovery'
                    else:
                        job_type = 'scraper'  # default
                else:
                    job_type = 'scraper'  # default
            
            # Extract source_id from metadata or derive from website name via scholarship_sources
            source_id = getattr(metadata, 'source_id', None) if hasattr(metadata, 'source_id') else None
            website_name = getattr(metadata, 'website', None) if hasattr(metadata, 'website') else None
            if isinstance(metadata, dict):
                source_id = metadata.get('source_id', source_id)
                website_name = metadata.get('website', website_name)
            if source_id is None and website_name:
                cursor.execute(
                    "SELECT id FROM scholarship_sources WHERE LOWER(name) = LOWER(%s) LIMIT 1",
                    (website_name,)
                )
                row = cursor.fetchone()
                if row:
                    source_id = row['id']
            
            # Convert metadata to JSON-serializable format for config/results
            metadata_dict = {}
            if hasattr(metadata, '__dict__'):
                metadata_dict = {k: v for k, v in metadata.__dict__.items() if v is not None}
            elif isinstance(metadata, dict):
                metadata_dict = metadata.copy()
            
            # Remove fields that go in specific columns
            metadata_dict.pop('id', None)
            metadata_dict.pop('job_type', None)
            metadata_dict.pop('source_id', None)
            metadata_dict.pop('status', None)
            metadata_dict.pop('errors', None)
            
            # Prepare error_message from errors
            error_message = None
            if hasattr(metadata, 'errors') and metadata.errors:
                if isinstance(metadata.errors, list):
                    error_message = '; '.join(str(e) for e in metadata.errors)
                else:
                    error_message = str(metadata.errors)
            elif isinstance(metadata, dict) and metadata.get('errors'):
                errors = metadata['errors']
                if isinstance(errors, list):
                    error_message = '; '.join(str(e) for e in errors)
                else:
                    error_message = str(errors)
            
            # Map old field names to new schema
            scholarships_found = metadata_dict.pop('records_found', metadata_dict.pop('scholarships_found', 0))
            scholarships_new = metadata_dict.pop('records_inserted', metadata_dict.pop('scholarships_new', 0))
            scholarships_updated = metadata_dict.pop('records_updated', metadata_dict.pop('scholarships_updated', 0))
            scholarships_expired = metadata_dict.pop('scholarships_expired', 0)
            
            # Store remaining metadata in config JSONB
            config_json = json.dumps(metadata_dict) if metadata_dict else None
            
            # Check if job exists (only if job_id is provided)
            job_exists = False
            if job_id is not None:
                cursor.execute("SELECT id FROM finder_jobs WHERE id = %s", (job_id,))
                job_exists = cursor.fetchone() is not None
            
            if job_exists and job_id is not None:
                # Update existing job
                if status == 'running':
                    query = """
                        UPDATE finder_jobs SET 
                        status = %s, 
                        started_at = COALESCE(started_at, %s),
                        source_id = COALESCE(source_id, %s),
                        job_type = COALESCE(job_type, %s)
                        WHERE id = %s
                    """
                    cursor.execute(query, (status, datetime.now(), source_id, job_type, job_id))
                elif status in ['completed', 'failed']:
                    query = """
                        UPDATE finder_jobs SET 
                        status = %s,
                        scholarships_found = %s,
                        scholarships_new = %s,
                        scholarships_updated = %s,
                        scholarships_expired = %s,
                        error_message = %s,
                        results = %s,
                        completed_at = %s,
                        source_id = COALESCE(source_id, %s),
                        job_type = COALESCE(job_type, %s)
                        WHERE id = %s
                    """
                    cursor.execute(query, (
                        status,
                        scholarships_found,
                        scholarships_new,
                        scholarships_updated,
                        scholarships_expired,
                        error_message,
                        config_json,
                        datetime.now(),
                        source_id,
                        job_type,
                        job_id
                    ))
                else:
                    query = """
                        UPDATE finder_jobs SET 
                        status = %s,
                        source_id = COALESCE(source_id, %s),
                        job_type = COALESCE(job_type, %s)
                        WHERE id = %s
                    """
                    cursor.execute(query, (status, source_id, job_type, job_id))
            else:
                # Insert new job (id is auto-generated by SERIAL)
                query = """
                    INSERT INTO finder_jobs (
                        job_type, source_id, status, 
                        scholarships_found, scholarships_new, scholarships_updated, scholarships_expired,
                        error_message, config, results,
                        started_at, completed_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id
                """
                started_at = datetime.now() if status == 'running' else None
                completed_at = datetime.now() if status in ['completed', 'failed'] else None
                cursor.execute(query, (
                    job_type,
                    source_id,
                    status,
                    scholarships_found,
                    scholarships_new,
                    scholarships_updated,
                    scholarships_expired,
                    error_message,
                    config_json,
                    config_json,  # Store same data in results for now
                    started_at,
                    completed_at
                ))
                result = cursor.fetchone()
                job_id = result['id'] if result else None
            
            conn.commit()
            logger.info(f"Job status updated in {self.environment} DB: id={job_id}, type={job_type}, status={status}")
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to update job status in {self.environment} DB: {e}")
        finally:
            cursor.close()
    
    def _create_scholarship_id(self) -> str:
        """Generate a unique scholarship ID"""
        import uuid
        return f"sch_{uuid.uuid4().hex[:16]}"

# Backwards compatibility aliases - both use the same PostgreSQLDatabaseManager
LocalDatabaseManager = PostgreSQLDatabaseManager
ProductionDatabaseManager = PostgreSQLDatabaseManager


class DatabaseManagerFactory:
    """Factory for creating database managers based on environment"""
    
    @staticmethod
    def create_database_manager(environment: str) -> DatabaseManager:
        """Create appropriate database manager for environment"""
        logger.debug(f"Creating PostgreSQLDatabaseManager for {environment}")
        return PostgreSQLDatabaseManager(environment)
