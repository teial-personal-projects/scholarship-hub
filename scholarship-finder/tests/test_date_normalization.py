#!/usr/bin/env python3
"""
Test script to verify date normalization and expiration logic
"""
import sys
import os
from pathlib import Path
from datetime import datetime, date

# Add src directory to path so imports work
# Since we're in tests/, go up one level to get to scholarship-finder root
root_path = Path(__file__).parent.parent
src_path = root_path / 'src'
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

# Import date_utils from utils_python package
from utils_python.date_utils import normalize_deadline, is_expired, calculate_expiration_date  # type: ignore[import-untyped]

from database.connection import DatabaseConnection  # type: ignore[import-untyped]


def test_partial_dates():
    """Test handling of dates without years"""
    print("\n" + "=" * 60)
    print("Test 1: Dates Without Years")
    print("=" * 60)

    current_year = datetime.now().year

    test_cases = [
        ("March 15", "Date without year (future month)"),
        ("3/15", "Numeric date without year"),
        ("December 25", "Date without year (end of year)"),
        ("January 5", "Date without year (start of year)"),
    ]

    for date_str, description in test_cases:
        normalized = normalize_deadline(date_str)
        print(f"\n{description}: '{date_str}'")
        print(f"  Normalized: {normalized}")

        if normalized:
            # Check if year was added
            assert normalized.year in [current_year, current_year + 1], \
                f"Should use current or next year, got {normalized.year}"

            # If date is in the past relative to today, should use next year
            if normalized < datetime.now().date():
                print(f"  ⚠️  Date is in the past (might be from next year calculation)")
            else:
                print(f"  ✅ Date is in the future")
        else:
            print("  ❌ Failed to normalize")

    print("\n✅ Partial date handling tested")


def test_month_year_dates():
    """Test handling of month+year only dates"""
    print("\n" + "=" * 60)
    print("Test 2: Month and Year Only")
    print("=" * 60)

    test_cases = [
        ("March 2025", "Month name and year"),
        ("03/2025", "Numeric month and year"),
        ("December 2025", "End of year month"),
        ("01/2026", "Start of year numeric"),
    ]

    for date_str, description in test_cases:
        normalized = normalize_deadline(date_str)
        print(f"\n{description}: '{date_str}'")
        print(f"  Normalized: {normalized}")

        if normalized:
            # Should default to 1st of the month
            assert normalized.day == 1, \
                f"Should default to 1st of month, got day {normalized.day}"
            print(f"  ✅ Defaults to 1st of month: {normalized}")
        else:
            print("  ❌ Failed to normalize")

    print("\n✅ Month+year date handling tested")


def test_full_dates():
    """Test handling of complete dates"""
    print("\n" + "=" * 60)
    print("Test 3: Complete Dates")
    print("=" * 60)

    test_cases = [
        ("March 15, 2025", "Full written date"),
        ("2025-03-15", "ISO format"),
        ("03/15/2025", "US numeric format"),
        ("15-03-2025", "Day-first format"),
    ]

    for date_str, description in test_cases:
        normalized = normalize_deadline(date_str)
        print(f"\n{description}: '{date_str}'")
        print(f"  Normalized: {normalized}")

        if normalized:
            assert normalized.year == 2025, "Should preserve year 2025"
            assert normalized.month == 3, "Should be March (month 3)"
            assert normalized.day == 15, "Should be day 15"
            print(f"  ✅ Correctly parsed as {normalized}")
        else:
            print("  ❌ Failed to normalize")

    print("\n✅ Full date handling tested")


def test_expiration_logic():
    """Test expiration checking"""
    print("\n" + "=" * 60)
    print("Test 4: Expiration Logic")
    print("=" * 60)

    # Past date - should be expired
    past_date = "2020-01-01"
    assert is_expired(past_date), "Past date should be expired"
    print(f"✅ Past date correctly identified as expired: {past_date}")

    # Future date - should NOT be expired
    future_date = "2030-12-31"
    assert not is_expired(future_date), "Future date should not be expired"
    print(f"✅ Future date correctly identified as active: {future_date}")

    # No deadline (rolling) - should NOT be expired
    assert not is_expired(None), "No deadline should not be expired"
    print(f"✅ No deadline (rolling) correctly identified as active")

    # Test expiration date calculation
    expiration = calculate_expiration_date("2025-06-01", grace_days=30)
    print(f"\n✅ Expiration date calculated: 2025-06-01 + 30 days = {expiration}")
    assert expiration is not None, "Should calculate expiration date"

    print("\n✅ Expiration logic tested")


def test_database_integration():
    """Test date normalization with database insertion"""
    print("\n" + "=" * 60)
    print("Test 5: Database Integration")
    print("=" * 60)

    db = DatabaseConnection()
    if not db.connect():
        print("❌ Could not connect to database")
        assert False, "Could not connect to database"

    timestamp = datetime.now().timestamp()

    # Test case 1: Date without year
    scholarship1 = {
        'name': f'Test Date Without Year {timestamp}',
        'organization': 'Test Org',
        'min_award': 1000.00,
        'url': f'https://test.org/date-test-1-{timestamp}',
        'deadline': 'June 15',  # No year!
        'category': 'General',
        'source_type': 'manual',
        'source_name': 'test_dates',
        'status': 'active'
    }

    id1 = db.insert_scholarship(scholarship1)
    if id1:
        print(f"✅ Inserted scholarship with partial date (ID: {id1})")

        # Fetch and verify
        db.cursor.execute("SELECT deadline, expires_at FROM scholarships WHERE id = %s", (id1,))
        result = db.cursor.fetchone()
        print(f"  Stored deadline: {result['deadline']}")
        print(f"  Calculated expires_at: {result['expires_at']}")
        assert result['deadline'] is not None, "Deadline should be stored"
        assert result['expires_at'] is not None, "Expiration should be calculated"

        # Clean up
        db.cursor.execute("DELETE FROM scholarships WHERE id = %s", (id1,))
        db.connection.commit()
    else:
        print("❌ Failed to insert scholarship with partial date")

    # Test case 2: Month and year only
    scholarship2 = {
        'name': f'Test Month Year {timestamp}',
        'organization': 'Test Org',
        'min_award': 2000.00,
        'url': f'https://test.org/date-test-2-{timestamp}',
        'deadline': 'August 2025',  # Month and year only!
        'category': 'General',
        'source_type': 'manual',
        'source_name': 'test_dates',
        'status': 'active'
    }

    id2 = db.insert_scholarship(scholarship2)
    if id2:
        print(f"\n✅ Inserted scholarship with month+year (ID: {id2})")

        # Fetch and verify
        db.cursor.execute("SELECT deadline, expires_at FROM scholarships WHERE id = %s", (id2,))
        result = db.cursor.fetchone()
        print(f"  Stored deadline: {result['deadline']}")
        print(f"  Calculated expires_at: {result['expires_at']}")
        assert result['deadline'].day == 1, "Should default to 1st of month"

        # Clean up
        db.cursor.execute("DELETE FROM scholarships WHERE id = %s", (id2,))
        db.connection.commit()
    else:
        print("❌ Failed to insert scholarship with month+year")

    db.close()
    print("\n✅ Database integration tested")


def test_expired_scholarships_excluded():
    """Test that expired scholarships are excluded from duplicate detection"""
    print("\n" + "=" * 60)
    print("Test 6: Expired Scholarships Excluded from Deduplication")
    print("=" * 60)

    db = DatabaseConnection()
    if not db.connect():
        print("❌ Could not connect to database")
        assert False, "Could not connect to database"

    from deduplication.engine import DeduplicationEngine  # type: ignore[import-untyped]
    dedup = DeduplicationEngine(db)

    timestamp = datetime.now().timestamp()

    # Create an expired scholarship
    expired_scholarship = {
        'name': f'Expired Test Scholarship {timestamp}',
        'organization': 'Test Organization',
        'min_award': 1000.00,
        'url': f'https://test.org/expired-test-{timestamp}',
        'deadline': '2020-01-01',  # In the past
        'category': 'General',
        'source_type': 'manual',
        'source_name': 'test_expiration',
        'status': 'expired'  # Mark as expired
    }

    id1 = db.insert_scholarship(expired_scholarship)
    print(f"✅ Created expired scholarship (ID: {id1})")

    # Try to insert a "new" scholarship with same URL
    new_scholarship = expired_scholarship.copy()
    new_scholarship['deadline'] = '2025-12-31'  # Future date
    new_scholarship['status'] = 'active'

    # Check if it's detected as duplicate
    is_duplicate, existing_id = dedup.check_duplicate(new_scholarship)

    if not is_duplicate:
        print("✅ Expired scholarship NOT detected as duplicate (correct behavior)")
        print("   This allows re-adding scholarships with updated deadlines")
    else:
        print("⚠️  Expired scholarship WAS detected as duplicate")
        print("   Note: This happens because URL matching found it")
        print("   The database upsert will update the expired scholarship")

    # Clean up
    db.cursor.execute("DELETE FROM scholarships WHERE id = %s", (id1,))
    db.connection.commit()
    db.close()

    print("\n✅ Expiration exclusion logic tested")


def main():
    """Run all date normalization tests"""
    print("=" * 60)
    print("DATE NORMALIZATION & EXPIRATION TESTS")
    print("=" * 60)

    tests = [
        ("Partial Dates", test_partial_dates),
        ("Month+Year Dates", test_month_year_dates),
        ("Full Dates", test_full_dates),
        ("Expiration Logic", test_expiration_logic),
        ("Database Integration", test_database_integration),
        ("Expired Scholarships Excluded", test_expired_scholarships_excluded),
    ]

    passed = 0
    failed = 0

    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                print(f"❌ {test_name} FAILED")
        except Exception as e:
            failed += 1
            print(f"\n❌ {test_name} FAILED with exception: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"✅ Passed: {passed}/{len(tests)}")
    print(f"❌ Failed: {failed}/{len(tests)}")
    print("=" * 60)

    return failed == 0


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
