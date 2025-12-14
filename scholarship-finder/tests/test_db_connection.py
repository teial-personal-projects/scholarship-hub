#!/usr/bin/env python3
"""
Test script to verify database connection and schema
"""
import sys
import os
from pathlib import Path

# Add src directory to path so imports work
# Since we're in tests/, go up one level to get to scholarship-finder root
root_path = Path(__file__).parent.parent
src_path = root_path / 'src'
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

# Import after path is set up
# Type checking: the database module is in src/database/
from database.connection import DatabaseConnection  # type: ignore[import-untyped]
from datetime import datetime

def test_connection():
    """Test basic database connection"""
    print("=" * 60)
    print("Testing Database Connection")
    print("=" * 60)

    db = DatabaseConnection()

    # Test connection
    print("\n1. Testing connection...")
    if not db.connect():
        print("❌ Failed to connect to database")
        assert False, "Failed to connect to database"

    print("✅ Connection successful!")

    # Test table exists
    print("\n2. Checking if scholarships table exists...")
    try:
        db.cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'scholarships'
            );
        """)
        result = db.cursor.fetchone()
        if result and result['exists']:
            print("✅ Scholarships table exists")
        else:
            print("❌ Scholarships table does not exist")
            db.close()
            assert False, "Scholarships table does not exist"
    except Exception as e:
        print(f"❌ Error checking table: {e}")
        db.close()
        raise

    # Test insert scholarship
    print("\n3. Testing insert_scholarship method...")
    test_scholarship = {
        'name': 'Test Database Connection Scholarship',
        'organization': 'Test Organization',
        'organization_website': 'https://test.org',
        'description': 'This is a test scholarship to verify database connection',
        'eligibility': 'Test eligibility criteria',
        'requirements': 'Test requirements',
        'min_award': 1000.00,
        'max_award': 1000.00,
        'url': f'https://test.org/scholarship-test-{datetime.now().timestamp()}',
        'application_url': 'https://test.org/apply',
        'deadline': '2025-12-31',
        'deadline_type': 'fixed',
        'renewable': False,
        'category': 'STEM',
        'target_type': 'Merit',
        'education_level': 'Undergraduate',
        'field_of_study': 'Computer Science',
        'country': 'US',
        'source_type': 'manual',
        'source_name': 'test_script',
        'status': 'active'
    }

    scholarship_id = db.insert_scholarship(test_scholarship)

    if scholarship_id:
        print(f"✅ Successfully inserted test scholarship (ID: {scholarship_id})")

        # Test fetching the scholarship
        print("\n4. Testing fetch scholarship by ID...")
        db.cursor.execute("SELECT * FROM scholarships WHERE id = %s", (scholarship_id,))
        fetched = db.cursor.fetchone()

        if fetched:
            print(f"✅ Successfully fetched scholarship: {fetched['name']}")
            print(f"   Organization: {fetched['organization']}")
            print(f"   Award: ${fetched['min_award']}")
            print(f"   Category: {fetched['category']}")
        else:
            print("❌ Failed to fetch scholarship")

        # Clean up - delete test scholarship
        print("\n5. Cleaning up test data...")
        db.cursor.execute("DELETE FROM scholarships WHERE id = %s", (scholarship_id,))
        db.connection.commit()
        print("✅ Test scholarship deleted")

    else:
        print("❌ Failed to insert test scholarship")
        db.close()
        assert False, "Failed to insert test scholarship"

    # Close connection
    db.close()

    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)

if __name__ == '__main__':
    success = test_connection()
    sys.exit(0 if success else 1)
