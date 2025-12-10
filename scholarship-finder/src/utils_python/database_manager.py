#!/usr/bin/env python3
"""
Database Manager - Abstract database operations for different environments
"""

import os
import json
import logging
import re
import pymysql
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
        if not self.connection or not self.connection.open:
            if not self.connect():
                logger.error("Failed to establish database connection")
                return None
        return self.connection


class LocalDatabaseManager(DatabaseManager):
    """Local MySQL database manager"""
    
    def __init__(self, environment: str = "local"):
        super().__init__(environment)
        self.host = os.getenv('MYSQL_HOST', 'localhost')
        self.port = int(os.getenv('MYSQL_PORT', '3306'))
        self.user = os.getenv('MYSQL_USER', 'root')
        self.password = os.getenv('MYSQL_PASSWORD', '')
        self.database = os.getenv('MYSQL_DATABASE', 'scholarships')
    
    def connect(self) -> bool:
        """Connect to local MySQL database"""
        try:
            self.connection = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor
            )
            logger.debug(f"Connected to local MySQL database: {self.database}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to local MySQL: {e}")
            return False
    
    def disconnect(self):
        """Close local database connection"""
        if self.connection and self.connection.open:
            self.connection.close()
            logger.debug("Disconnected from local MySQL database")
    
    def save_scholarship(self, scholarship: Scholarship) -> bool:
        """Save scholarship to local MySQL database"""
        conn = self.get_connection()
        if not conn:
            return False
        
        cursor = conn.cursor()
        
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
            
            # Convert to dict and omit scholarship_id if None to let AUTO_INCREMENT handle it
            data = scholarship.to_dict()
            if 'scholarship_id' in data and data['scholarship_id'] is None:
                del data['scholarship_id']

            if 'subject_areas' in data:
                normalized_subjects = self._normalize_subject_areas(data['subject_areas'])
                if normalized_subjects is None:
                    data.pop('subject_areas', None)
                else:
                    data['subject_areas'] = normalized_subjects

            if 'eligibility' in data:
                normalized_eligibility = self._normalize_eligibility(data['eligibility'])
                if normalized_eligibility is None:
                    data.pop('eligibility', None)
                else:
                    data['eligibility'] = normalized_eligibility

            if 'academic_level' in data:
                normalized_academic_level = self._normalize_academic_level(data['academic_level'])
                if normalized_academic_level is None:
                    data.pop('academic_level', None)
                else:
                    data['academic_level'] = normalized_academic_level

            if 'geographic_restrictions' in data:
                normalized_geo = self._normalize_geographic_restrictions(data['geographic_restrictions'])
                if normalized_geo is None:
                    data.pop('geographic_restrictions', None)
                else:
                    data['geographic_restrictions'] = normalized_geo

            if 'ethnicity' in data:
                normalized_ethnicity = self._normalize_ethnicity(data['ethnicity'])
                if normalized_ethnicity is None:
                    data.pop('ethnicity', None)
                else:
                    data['ethnicity'] = normalized_ethnicity

            if 'min_gpa' in data:
                min_gpa_value = data['min_gpa']
                if min_gpa_value is None or min_gpa_value == '':
                    data.pop('min_gpa', None)
                else:
                    try:
                        data['min_gpa'] = round(float(min_gpa_value), 2)
                    except (TypeError, ValueError):
                        data.pop('min_gpa', None)
            
            # Build INSERT ... ON DUPLICATE KEY UPDATE using unique(title, organization, deadline)
            placeholders = ', '.join(['%s'] * len(data))
            columns = ', '.join(data.keys())
            updates = ', '.join([f"{k} = VALUES({k})" for k in data.keys() if k not in ['scholarship_id', 'created_at']])
            query = (
                f"INSERT INTO scholarships ({columns}) VALUES ({placeholders}) "
                f"ON DUPLICATE KEY UPDATE {updates}, updated_at = CURRENT_TIMESTAMP"
            )
            cursor.execute(query, list(data.values()))
            logger.info(f"Upserted scholarship in local DB: {scholarship.title}")
            
            conn.commit()
            return True
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Local MySQL database error: {e}")
            raise
        finally:
            cursor.close()
    
    def update_job_status(self, status: str, metadata: Any):
        """Update job status in local MySQL database"""
        logger.debug(f"[LOCAL] Updating job status: {status} with metadata type: {type(metadata)}")
        if hasattr(metadata, 'website'):
            logger.debug(f"[LOCAL] Metadata has website attribute: {metadata.website}")
        elif isinstance(metadata, dict) and 'website' in metadata:
            logger.debug(f"[LOCAL] Metadata dict has website key: {metadata['website']}")
        else:
            logger.debug(f"[LOCAL] No website found in metadata")
        
        try:
            conn = self.get_connection()
            if not conn:
                logger.error(f"Failed to get database connection for job status update. Host: {self.host}, Database: {self.database}")
                return
        except Exception as e:
            logger.error(f"Exception getting database connection for job status update: {e}")
            return
        
        cursor = conn.cursor()
        
        try:
            # Extract job_id from metadata if available
            job_id = getattr(metadata, 'job_id', None) if hasattr(metadata, 'job_id') else None
            if not job_id:
                # Generate a job_id if not provided
                job_id = f"local_{int(datetime.now().timestamp())}"
            
            # Extract website name from metadata or use default
            if hasattr(metadata, 'website') and metadata.website:
                website = metadata.website
            elif isinstance(metadata, dict) and metadata.get('website'):
                website = metadata['website']
            else:
                # Fallback: try to extract from class name or use default
                website = 'unknown'
                if hasattr(metadata, '__class__') and hasattr(metadata.__class__, '__name__'):
                    class_name = metadata.__class__.__name__
                    if 'Scraper' in class_name:
                        website = class_name.replace('Scraper', '').lower()
            
            # Convert metadata to JSON-serializable format
            metadata_dict = {}
            if hasattr(metadata, '__dict__'):
                metadata_dict = {k: v for k, v in metadata.__dict__.items() if v is not None}
            elif isinstance(metadata, dict):
                metadata_dict = metadata
            
            # Prepare errors as JSON
            errors_json = None
            if hasattr(metadata, 'errors') and metadata.errors:
                errors_json = json.dumps(metadata.errors)
            
            # Check if job exists
            cursor.execute("SELECT job_id FROM jobs WHERE job_id = %s", (job_id,))
            job_exists = cursor.fetchone()
            
            if job_exists:
                # Update existing job
                if status == 'running':
                    query = """
                        UPDATE jobs SET 
                        status = %s, 
                        started_at = %s,
                        updated_at = CURRENT_TIMESTAMP
                        WHERE job_id = %s
                    """
                    cursor.execute(query, (status, datetime.now(), job_id))
                elif status in ['completed', 'failed']:
                    query = """
                        UPDATE jobs SET 
                        status = %s,
                        records_found = %s,
                        records_processed = %s,
                        records_inserted = %s,
                        records_updated = %s,
                        errors = %s,
                        metadata = %s,
                        completed_at = %s,
                        updated_at = CURRENT_TIMESTAMP
                        WHERE job_id = %s
                    """
                    cursor.execute(query, (
                        status,
                        metadata_dict.get('records_found', 0),
                        metadata_dict.get('records_processed', 0),
                        metadata_dict.get('records_inserted', 0),
                        metadata_dict.get('records_updated', 0),
                        errors_json,
                        json.dumps(metadata_dict),
                        datetime.now(),
                        job_id
                    ))
                else:
                    query = """
                        UPDATE jobs SET 
                        status = %s,
                        updated_at = CURRENT_TIMESTAMP
                        WHERE job_id = %s
                    """
                    cursor.execute(query, (status, job_id))
            else:
                # Insert new job
                query = """
                    INSERT INTO jobs (
                        job_id, website, status, records_found, records_processed, 
                        records_inserted, records_updated, errors, metadata, 
                        started_at, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                """
                cursor.execute(query, (
                    job_id,
                    website,
                    status,
                    metadata_dict.get('records_found', 0),
                    metadata_dict.get('records_processed', 0),
                    metadata_dict.get('records_inserted', 0),
                    metadata_dict.get('records_updated', 0),
                    errors_json,
                    json.dumps(metadata_dict),
                    datetime.now() if status == 'running' else None
                ))
            
            conn.commit()
            logger.info(f"Job status updated in local DB: {job_id} - {status} - Website: {website}")
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to update job status in local DB: {e}")
        finally:
            cursor.close()
    
    def _create_scholarship_id(self) -> str:
        """Generate a unique scholarship ID"""
        import uuid
        return f"sch_{uuid.uuid4().hex[:16]}"


class ProductionDatabaseManager(DatabaseManager):
    """Production MySQL database manager"""
    
    def __init__(self, environment: str = "prod"):
        super().__init__(environment)
        self.host = os.getenv('PROD_MYSQL_HOST')
        self.port = int(os.getenv('PROD_MYSQL_PORT', '3306'))
        self.user = os.getenv('PROD_MYSQL_USER')
        self.password = os.getenv('PROD_MYSQL_PASSWORD')
        self.database = os.getenv('PROD_MYSQL_DATABASE', 'scholarships')
    
    def connect(self) -> bool:
        """Connect to production MySQL database"""
        try:
            self.connection = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor
            )
            logger.debug(f"Connected to production MySQL database: {self.database}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to production MySQL: {e}")
            return False
    
    def disconnect(self):
        """Close production database connection"""
        if self.connection and self.connection.open:
            self.connection.close()
            logger.debug("Disconnected from production MySQL database")
    
    def save_scholarship(self, scholarship: Scholarship) -> bool:
        """Save scholarship to production MySQL database"""
        conn = self.get_connection()
        if not conn:
            return False
        
        cursor = conn.cursor()
        
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
            
            # Convert to dict and omit scholarship_id if None to let AUTO_INCREMENT handle it
            data = scholarship.to_dict()
            if 'scholarship_id' in data and data['scholarship_id'] is None:
                del data['scholarship_id']

            if 'subject_areas' in data:
                normalized_subjects = self._normalize_subject_areas(data['subject_areas'])
                if normalized_subjects is None:
                    data.pop('subject_areas', None)
                else:
                    data['subject_areas'] = normalized_subjects

            if 'eligibility' in data:
                normalized_eligibility = self._normalize_eligibility(data['eligibility'])
                if normalized_eligibility is None:
                    data.pop('eligibility', None)
                else:
                    data['eligibility'] = normalized_eligibility

            if 'academic_level' in data:
                normalized_academic_level = self._normalize_academic_level(data['academic_level'])
                if normalized_academic_level is None:
                    data.pop('academic_level', None)
                else:
                    data['academic_level'] = normalized_academic_level

            if 'geographic_restrictions' in data:
                normalized_geo = self._normalize_geographic_restrictions(data['geographic_restrictions'])
                if normalized_geo is None:
                    data.pop('geographic_restrictions', None)
                else:
                    data['geographic_restrictions'] = normalized_geo

            if 'ethnicity' in data:
                normalized_ethnicity = self._normalize_ethnicity(data['ethnicity'])
                if normalized_ethnicity is None:
                    data.pop('ethnicity', None)
                else:
                    data['ethnicity'] = normalized_ethnicity

            if 'min_gpa' in data:
                min_gpa_value = data['min_gpa']
                if min_gpa_value is None or min_gpa_value == '':
                    data.pop('min_gpa', None)
                else:
                    try:
                        data['min_gpa'] = round(float(min_gpa_value), 2)
                    except (TypeError, ValueError):
                        data.pop('min_gpa', None)
            
            # Build INSERT ... ON DUPLICATE KEY UPDATE using unique(title, organization, deadline)
            placeholders = ', '.join(['%s'] * len(data))
            columns = ', '.join(data.keys())
            updates = ', '.join([f"{k} = VALUES({k})" for k in data.keys() if k not in ['scholarship_id', 'created_at']])
            query = (
                f"INSERT INTO scholarships ({columns}) VALUES ({placeholders}) "
                f"ON DUPLICATE KEY UPDATE {updates}, updated_at = CURRENT_TIMESTAMP"
            )
            cursor.execute(query, list(data.values()))
            logger.info(f"Upserted scholarship in production DB: {scholarship.title}")
            
            conn.commit()
            return True
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Production MySQL database error: {e}")
            raise
        finally:
            cursor.close()
    
    def update_job_status(self, status: str, metadata: Any):
        """Update job status in production MySQL database"""
        try:
            conn = self.get_connection()
            if not conn:
                logger.error(f"Failed to get database connection for job status update. Host: {self.host}, Database: {self.database}")
                return
        except Exception as e:
            logger.error(f"Exception getting database connection for job status update: {e}")
            return
        
        cursor = conn.cursor()
        
        try:
            # Extract job_id from metadata if available
            job_id = getattr(metadata, 'job_id', None) if hasattr(metadata, 'job_id') else None
            if not job_id:
                # Generate a job_id if not provided
                job_id = f"prod_{int(datetime.now().timestamp())}"
            
            # Extract website name from metadata or use default
            if hasattr(metadata, 'website') and metadata.website:
                website = metadata.website
            elif isinstance(metadata, dict) and metadata.get('website'):
                website = metadata['website']
            else:
                # Fallback: try to extract from class name or use default
                website = 'unknown'
                if hasattr(metadata, '__class__') and hasattr(metadata.__class__, '__name__'):
                    class_name = metadata.__class__.__name__
                    if 'Scraper' in class_name:
                        website = class_name.replace('Scraper', '').lower()
            
            # Convert metadata to JSON-serializable format
            metadata_dict = {}
            if hasattr(metadata, '__dict__'):
                metadata_dict = {k: v for k, v in metadata.__dict__.items() if v is not None}
            elif isinstance(metadata, dict):
                metadata_dict = metadata
            
            # Prepare errors as JSON
            errors_json = None
            if hasattr(metadata, 'errors') and metadata.errors:
                errors_json = json.dumps(metadata.errors)
            
            # Check if job exists
            cursor.execute("SELECT job_id FROM jobs WHERE job_id = %s", (job_id,))
            job_exists = cursor.fetchone()
            
            if job_exists:
                # Update existing job
                if status == 'running':
                    query = """
                        UPDATE jobs SET 
                        status = %s, 
                        started_at = %s,
                        updated_at = CURRENT_TIMESTAMP
                        WHERE job_id = %s
                    """
                    cursor.execute(query, (status, datetime.now(), job_id))
                elif status in ['completed', 'failed']:
                    query = """
                        UPDATE jobs SET 
                        status = %s,
                        records_found = %s,
                        records_processed = %s,
                        records_inserted = %s,
                        records_updated = %s,
                        errors = %s,
                        metadata = %s,
                        completed_at = %s,
                        updated_at = CURRENT_TIMESTAMP
                        WHERE job_id = %s
                    """
                    cursor.execute(query, (
                        status,
                        metadata_dict.get('records_found', 0),
                        metadata_dict.get('records_processed', 0),
                        metadata_dict.get('records_inserted', 0),
                        metadata_dict.get('records_updated', 0),
                        errors_json,
                        json.dumps(metadata_dict),
                        datetime.now(),
                        job_id
                    ))
                else:
                    query = """
                        UPDATE jobs SET 
                        status = %s,
                        updated_at = CURRENT_TIMESTAMP
                        WHERE job_id = %s
                    """
                    cursor.execute(query, (status, job_id))
            else:
                # Insert new job
                query = """
                    INSERT INTO jobs (
                        job_id, website, status, records_found, records_processed, 
                        records_inserted, records_updated, errors, metadata, 
                        started_at, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                """
                cursor.execute(query, (
                    job_id,
                    website,
                    status,
                    metadata_dict.get('records_found', 0),
                    metadata_dict.get('records_processed', 0),
                    metadata_dict.get('records_inserted', 0),
                    metadata_dict.get('records_updated', 0),
                    errors_json,
                    json.dumps(metadata_dict),
                    datetime.now() if status == 'running' else None
                ))
            
            conn.commit()
            logger.info(f"Job status updated in production DB: {job_id} - {status}")
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to update job status in production DB: {e}")
        finally:
            cursor.close()
    
    def _create_scholarship_id(self) -> str:
        """Generate a unique scholarship ID"""
        import uuid
        return f"sch_{uuid.uuid4().hex[:16]}"


class DatabaseManagerFactory:
    """Factory for creating database managers based on environment"""
    
    @staticmethod
    def create_database_manager(environment: str) -> DatabaseManager:
        """Create appropriate database manager for environment"""
        if environment == "local":
            logger.debug("Creating LocalDatabaseManager")
            return LocalDatabaseManager(environment)
        elif environment in ["dev", "staging", "prod"]:
            logger.debug(f"Creating ProductionDatabaseManager for {environment}")
            return ProductionDatabaseManager(environment)
        else:
            logger.warning(f"Unknown environment '{environment}', defaulting to local")
            return LocalDatabaseManager("local")
