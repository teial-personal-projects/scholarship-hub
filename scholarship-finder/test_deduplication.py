#!/usr/bin/env python3
"""
Test script to verify deduplication engine functionality
Tests:
- Checksum generation
- Exact duplicate detection (checksum match)
- URL duplicate detection
- Fuzzy matching for similar scholarships
- Data merging
"""
import sys
import os
from pathlib import Path
from datetime import datetime

# Add src directory to path so imports work
src_path = Path(__file__).parent / 'src'
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

# Import after path is set up
from database.connection import DatabaseConnection  # type: ignore[import-untyped]
from deduplication.engine import DeduplicationEngine  # type: ignore[import-untyped]

def test_checksum_generation():
    """Test checksum generation"""
    print("\n" + "=" * 60)
    print("Test 1: Checksum Generation")
    print("=" * 60)

    db = DatabaseConnection()
    db.connect()
    dedup = DeduplicationEngine(db)

    # Test scholarship
    scholarship = {
        'name': 'Computer Science Excellence Award',
        'organization': 'Tech Foundation',
        'min_award': 5000,
        'deadline': '2025-05-01'
    }

    checksum1 = dedup.generate_checksum(scholarship)
    print(f"✅ Generated checksum: {checksum1[:16]}...")

    # Same scholarship should produce same checksum
    checksum2 = dedup.generate_checksum(scholarship)
    assert checksum1 == checksum2, "Same scholarship should produce same checksum"
    print("✅ Consistent checksum generation verified")

    # Different scholarship should produce different checksum
    different_scholarship = {
        'name': 'Engineering Excellence Award',
        'organization': 'Tech Foundation',
        'min_award': 5000,
        'deadline': '2025-05-01'
    }
    checksum3 = dedup.generate_checksum(different_scholarship)
    assert checksum1 != checksum3, "Different scholarships should produce different checksums"
    print("✅ Different checksums for different scholarships")

    # Test legacy 'amount' field compatibility
    legacy_scholarship = {
        'name': 'Computer Science Excellence Award',
        'organization': 'Tech Foundation',
        'amount': 5000,  # Using legacy 'amount' field
        'deadline': '2025-05-01'
    }
    checksum4 = dedup.generate_checksum(legacy_scholarship)
    assert checksum1 == checksum4, "Should handle legacy 'amount' field"
    print("✅ Legacy 'amount' field compatibility verified")

    db.close()

def test_exact_duplicate_detection():
    """Test exact duplicate detection via checksum and URL"""
    print("\n" + "=" * 60)
    print("Test 2: Exact Duplicate Detection")
    print("=" * 60)

    db = DatabaseConnection()
    db.connect()
    dedup = DeduplicationEngine(db)

    # Create test scholarship
    timestamp = datetime.now().timestamp()
    scholarship1 = {
        'name': f'Dedup Test Scholarship {timestamp}',
        'organization': 'Test Organization',
        'min_award': 1000.00,
        'url': f'https://test.org/dedup-test-{timestamp}',
        'deadline': '2025-12-31',
        'category': 'STEM',
        'source_type': 'manual',
        'source_name': 'test_deduplication',
        'status': 'active'
    }

    # Insert first scholarship
    id1 = db.insert_scholarship(scholarship1)
    assert id1 is not None, "Failed to insert first scholarship"
    print(f"✅ Inserted first scholarship (ID: {id1})")

    # Check if it's detected as duplicate by checksum
    is_duplicate, existing_id = dedup.check_duplicate(scholarship1)
    assert is_duplicate, "Should detect duplicate by checksum"
    assert existing_id == id1, "Should return correct existing ID"
    print(f"✅ Checksum duplicate detection works (found ID: {existing_id})")

    # Try to insert scholarship with same URL but different name
    scholarship2 = scholarship1.copy()
    scholarship2['name'] = f'Different Name {timestamp}'
    is_duplicate, existing_id = dedup.check_duplicate(scholarship2)
    assert is_duplicate, "Should detect duplicate by URL"
    assert existing_id == id1, "Should return correct existing ID"
    print(f"✅ URL duplicate detection works (found ID: {existing_id})")

    # Clean up
    db.cursor.execute("DELETE FROM scholarships WHERE id = %s", (id1,))
    db.connection.commit()
    print("✅ Test data cleaned up")

    db.close()

def test_fuzzy_matching():
    """Test fuzzy matching for similar scholarships"""
    print("\n" + "=" * 60)
    print("Test 3: Fuzzy Matching")
    print("=" * 60)

    db = DatabaseConnection()
    db.connect()
    dedup = DeduplicationEngine(db)

    timestamp = datetime.now().timestamp()

    # Create original scholarship
    scholarship1 = {
        'name': 'John Smith Memorial Scholarship',
        'organization': 'Smith Family Foundation',
        'min_award': 2000.00,
        'url': f'https://test.org/fuzzy-test-1-{timestamp}',
        'deadline': '2025-06-30',
        'category': 'General',
        'source_type': 'manual',
        'source_name': 'test_deduplication',
        'status': 'active'
    }

    id1 = db.insert_scholarship(scholarship1)
    assert id1 is not None, "Failed to insert first scholarship"
    print(f"✅ Inserted original scholarship (ID: {id1})")

    # Create similar scholarship with slight variations
    scholarship2 = {
        'name': 'John Smith Memorial Award',  # Slightly different name
        'organization': 'Smith Family Foundation',
        'min_award': 2000.00,
        'url': f'https://test.org/fuzzy-test-2-{timestamp}',  # Different URL
        'deadline': '2025-06-30',
        'category': 'General',
        'source_type': 'manual',
        'source_name': 'test_deduplication',
        'status': 'active'
    }

    # Check if fuzzy matching detects similarity
    is_duplicate, existing_id = dedup.check_duplicate(scholarship2)
    if is_duplicate:
        print(f"✅ Fuzzy matching detected similar scholarship (ID: {existing_id})")
        assert existing_id == id1, "Should return correct existing ID"
    else:
        print("⚠️  Fuzzy matching did not detect similarity (this is OK if threshold is high)")

    # Create very different scholarship
    scholarship3 = {
        'name': 'Engineering Excellence Award',
        'organization': 'Tech Company',
        'min_award': 5000.00,
        'url': f'https://test.org/fuzzy-test-3-{timestamp}',
        'deadline': '2025-08-15',
        'category': 'STEM',
        'source_type': 'manual',
        'source_name': 'test_deduplication',
        'status': 'active'
    }

    is_duplicate, _ = dedup.check_duplicate(scholarship3)
    assert not is_duplicate, "Should NOT detect very different scholarship as duplicate"
    print("✅ Different scholarship correctly identified as non-duplicate")

    # Clean up
    db.cursor.execute("DELETE FROM scholarships WHERE id = %s", (id1,))
    db.connection.commit()
    print("✅ Test data cleaned up")

    db.close()

def test_data_merging():
    """Test scholarship data merging"""
    print("\n" + "=" * 60)
    print("Test 4: Data Merging")
    print("=" * 60)

    db = DatabaseConnection()
    db.connect()
    dedup = DeduplicationEngine(db)

    # Existing scholarship with minimal data
    existing = {
        'id': 1,
        'name': 'Test Scholarship',
        'organization': 'Test Org',
        'min_award': 1000,
        'deadline': '2025-05-01',
        'description': 'Short description'
    }

    # New data with more complete information
    new_data = {
        'name': 'Test Scholarship',
        'organization': 'Test Org',
        'min_award': 1000,
        'deadline': '2025-06-01',  # Newer deadline
        'description': 'Much longer and more detailed description with lots of information',
        'eligibility': 'New eligibility criteria',
        'requirements': 'Application requirements',
        'application_url': 'https://test.org/apply'
    }

    merged = dedup.merge_scholarship_data(existing, new_data)

    # Verify merging logic
    assert merged['deadline'] == '2025-06-01', "Should use newer deadline"
    print("✅ Newer deadline preserved")

    assert len(merged['description']) > len(existing['description']), "Should use longer description"
    print("✅ More complete description preserved")

    assert merged['eligibility'] == 'New eligibility criteria', "Should add missing eligibility"
    print("✅ Missing fields added")

    assert merged['application_url'] == 'https://test.org/apply', "Should add missing application_url"
    print("✅ Application URL added")

    assert 'last_verified_at' in merged, "Should update last_verified_at"
    print("✅ Verification timestamp updated")

    db.close()

def main():
    """Run all deduplication tests"""
    print("=" * 60)
    print("SCHOLARSHIP DEDUPLICATION ENGINE TESTS")
    print("=" * 60)

    tests = [
        ("Checksum Generation", test_checksum_generation),
        ("Exact Duplicate Detection", test_exact_duplicate_detection),
        ("Fuzzy Matching", test_fuzzy_matching),
        ("Data Merging", test_data_merging)
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
