"""
Scholarship Deduplication Engine
Uses checksums and fuzzy matching to prevent duplicates
"""
import hashlib
from typing import Dict, Optional, Tuple
from difflib import SequenceMatcher
from datetime import datetime

class DeduplicationEngine:
    def __init__(self, db_connection):
        self.db = db_connection
        self.similarity_threshold = 0.85  # 85% similarity = duplicate

    def generate_checksum(self, scholarship: dict) -> str:
        """
        Generate SHA-256 checksum from key fields
        Format: org_name + scholarship_name + amount + deadline

        Handles both legacy 'amount' field and new 'min_award' field
        """
        # Get amount - try min_award first, then amount
        amount = scholarship.get('min_award') or scholarship.get('amount') or '0'

        components = [
            (scholarship.get('organization') or '').lower().strip(),
            (scholarship.get('name') or '').lower().strip(),
            str(amount),
            str(scholarship.get('deadline') or '')
        ]

        checksum_string = '|'.join(components)
        return hashlib.sha256(checksum_string.encode()).hexdigest()

    def check_duplicate(self, scholarship: dict) -> Tuple[bool, Optional[int]]:
        """
        Check if scholarship is a duplicate
        Returns: (is_duplicate, existing_id)
        """
        # 1. Check exact checksum match (fastest)
        checksum = self.generate_checksum(scholarship)

        self.db.cursor.execute(
            "SELECT id FROM scholarships WHERE checksum = %s AND status != 'invalid'",
            (checksum,)
        )
        result = self.db.cursor.fetchone()
        if result:
            return (True, result['id'])

        # 2. Check URL match (second fastest)
        if scholarship.get('url'):
            self.db.cursor.execute(
                "SELECT id FROM scholarships WHERE url = %s AND status != 'invalid'",
                (scholarship['url'],)
            )
            result = self.db.cursor.fetchone()
            if result:
                return (True, result['id'])

        # 3. Fuzzy match on name + organization (slowest, but catches variations)
        similar_id = self._find_similar_scholarship(scholarship)
        if similar_id:
            return (True, similar_id)

        return (False, None)

    def _find_similar_scholarship(self, scholarship: dict) -> Optional[int]:
        """
        Find similar scholarships using fuzzy string matching
        Only checks recent scholarships for performance
        """
        org = (scholarship.get('organization') or '').lower().strip()
        name = (scholarship.get('name') or '').lower().strip()

        if not org or not name:
            return None

        # Only check scholarships from same organization
        self.db.cursor.execute("""
            SELECT id, name, organization
            FROM scholarships
            WHERE LOWER(organization) LIKE %s
            AND status != 'invalid'
            AND discovered_at > NOW() - INTERVAL '6 months'
            LIMIT 50
        """, (f'%{org}%',))

        candidates = self.db.cursor.fetchall()

        for candidate in candidates:
            candidate_name = (candidate['name'] or '').lower().strip()
            candidate_org = (candidate['organization'] or '').lower().strip()

            # Calculate similarity scores
            name_similarity = SequenceMatcher(None, name, candidate_name).ratio()
            org_similarity = SequenceMatcher(None, org, candidate_org).ratio()

            # Weighted average (name is more important)
            overall_similarity = (name_similarity * 0.7) + (org_similarity * 0.3)

            if overall_similarity >= self.similarity_threshold:
                return candidate['id']

        return None

    def merge_scholarship_data(self, existing: dict, new: dict) -> dict:
        """
        Merge new scholarship data with existing
        Keeps most complete/recent information
        """
        merged = existing.copy()

        # Update fields if new data is more complete
        for field in ['description', 'eligibility', 'requirements',
                      'application_url', 'apply_url', 'organization_website']:
            if new.get(field) and not existing.get(field):
                merged[field] = new[field]
            elif new.get(field) and len(str(new[field])) > len(str(existing.get(field, ''))):
                merged[field] = new[field]

        # Handle amount fields (both legacy and new schema)
        # Update min_award/max_award if new data is present
        if new.get('min_award') and not existing.get('min_award'):
            merged['min_award'] = new['min_award']
        if new.get('max_award') and not existing.get('max_award'):
            merged['max_award'] = new['max_award']
        # Handle legacy 'amount' field
        if new.get('amount'):
            if not existing.get('min_award'):
                merged['min_award'] = new['amount']
            if not existing.get('max_award'):
                merged['max_award'] = new['amount']

        # Always update deadline if it's newer
        if new.get('deadline'):
            new_deadline = new['deadline']
            existing_deadline = existing.get('deadline')
            # Handle both date objects and strings
            if not existing_deadline or str(new_deadline) > str(existing_deadline):
                merged['deadline'] = new_deadline

        # Update last_verified timestamp
        merged['last_verified_at'] = datetime.utcnow()

        return merged
