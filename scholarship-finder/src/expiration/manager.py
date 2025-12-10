"""
Expiration Manager
Automatically marks expired scholarships and archives them
"""
from datetime import datetime, timedelta
from typing import Dict, List

class ExpirationManager:
    def __init__(self, db_connection):
        self.db = db_connection

    def check_and_mark_expired(self) -> Dict[str, int]:
        """
        Check all active scholarships and mark expired ones
        Returns stats on how many were marked
        """
        stats = {
            'checked': 0,
            'marked_expired': 0,
            'errors': 0
        }

        # Find scholarships with past deadlines
        self.db.cursor.execute("""
            UPDATE scholarships
            SET status = 'expired',
                updated_at = NOW()
            WHERE status = 'active'
            AND deadline < CURRENT_DATE
            AND deadline IS NOT NULL
            RETURNING id, name
        """)

        expired = self.db.cursor.fetchall()
        stats['marked_expired'] = len(expired)

        for scholarship in expired:
            print(f"   ⏰ Expired: {scholarship['name']}")

        self.db.connection.commit()

        return stats

    def calculate_expiration_date(self, deadline: datetime) -> datetime:
        """
        Calculate when a scholarship should be marked as expired
        Usually deadline + 30 days grace period
        """
        if not deadline:
            return None

        return deadline + timedelta(days=30)

    def archive_old_expired_scholarships(self, days_old: int = 365) -> int:
        """
        Archive scholarships that have been expired for a long time
        This keeps the database clean
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        self.db.cursor.execute("""
            UPDATE scholarships
            SET status = 'archived'
            WHERE status = 'expired'
            AND updated_at < %s
            RETURNING id
        """, (cutoff_date,))

        archived = self.db.cursor.fetchall()
        self.db.connection.commit()

        return len(archived)

    def reactivate_recurring_scholarships(self) -> int:
        """
        Reactivate scholarships that are recurring (annual)
        """
        # This would check if a scholarship is marked as recurring
        # and if a year has passed, create a new entry with updated deadline

        self.db.cursor.execute("""
            SELECT id, name, organization, deadline
            FROM scholarships
            WHERE recurring = true
            AND status = 'expired'
            AND deadline >= CURRENT_DATE - INTERVAL '1 year'
        """)

        recurring = self.db.cursor.fetchall()
        reactivated = 0

        for scholarship in recurring:
            # Check if we already have this scholarship for the next year
            next_year_deadline = scholarship['deadline'].replace(
                year=scholarship['deadline'].year + 1
            )

            self.db.cursor.execute("""
                SELECT id FROM scholarships
                WHERE organization = %s
                AND name = %s
                AND deadline = %s
            """, (scholarship['organization'], scholarship['name'], next_year_deadline))

            if not self.db.cursor.fetchone():
                # Create new entry for next year
                self.db.cursor.execute("""
                    INSERT INTO scholarships (
                        name, organization, deadline, recurring, status
                    ) VALUES (%s, %s, %s, true, 'active')
                """, (scholarship['name'], scholarship['organization'], next_year_deadline))
                reactivated += 1

        self.db.connection.commit()
        return reactivated
