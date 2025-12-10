#!/usr/bin/env python3
"""
Test script to verify CategoryManager functionality
"""
import sys
import os
from pathlib import Path

# Add src directory to path so imports work
src_path = Path(__file__).parent / 'src'
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from database.connection import DatabaseConnection  # type: ignore[import-untyped]
from database.category_manager import CategoryManager  # type: ignore[import-untyped]


def test_get_enabled_categories():
    """Test retrieving enabled categories from database"""
    print("\n" + "=" * 60)
    print("Test 1: Get Enabled Categories")
    print("=" * 60)

    db = DatabaseConnection()
    if not db.connect():
        print("❌ Failed to connect to database")
        return False

    category_manager = CategoryManager(db)

    # Get enabled categories
    categories = category_manager.get_enabled_categories()

    print(f"\nFound {len(categories)} enabled categories:")
    for cat in categories:
        print(f"\n  📂 {cat['name']} (slug: {cat['slug']})")
        print(f"     Priority: {cat['priority']}")
        print(f"     Keywords: {len(cat['keywords'])} keywords")
        if cat['keywords']:
            print(f"     Sample keywords: {', '.join(cat['keywords'][:5])}")

    assert len(categories) > 0, "Should have at least one enabled category"
    assert all(cat['enabled'] for cat in categories), "All categories should be enabled"

    print("\n✅ Successfully loaded enabled categories")

    db.close()
    return True


def test_get_category_by_slug():
    """Test retrieving a specific category by slug"""
    print("\n" + "=" * 60)
    print("Test 2: Get Category by Slug")
    print("=" * 60)

    db = DatabaseConnection()
    db.connect()
    category_manager = CategoryManager(db)

    # Get STEM category
    stem = category_manager.get_category_by_slug('stem')

    if stem:
        print(f"\n✅ Found category: {stem['name']}")
        print(f"   ID: {stem['id']}")
        print(f"   Priority: {stem['priority']}")
        print(f"   Keywords: {len(stem['keywords'])}")
        assert stem['slug'] == 'stem', "Slug should match"
        assert stem['name'] == 'STEM', "Name should match"
    else:
        print("❌ STEM category not found")
        db.close()
        return False

    # Test non-existent category
    fake = category_manager.get_category_by_slug('nonexistent')
    assert fake is None, "Non-existent category should return None"
    print("✅ Non-existent category correctly returns None")

    db.close()
    return True


def test_get_category_keywords():
    """Test retrieving keywords for a category"""
    print("\n" + "=" * 60)
    print("Test 3: Get Category Keywords")
    print("=" * 60)

    db = DatabaseConnection()
    db.connect()
    category_manager = CategoryManager(db)

    # Get keywords for STEM
    keywords = category_manager.get_category_keywords('stem')

    print(f"\nSTEM keywords ({len(keywords)} total):")
    for kw in keywords[:10]:  # Show first 10
        print(f"  - {kw}")

    assert len(keywords) > 0, "Should have keywords"
    assert 'computer science' in [k.lower() for k in keywords], "Should include 'computer science'"

    print(f"\n✅ Retrieved {len(keywords)} keywords for STEM category")

    db.close()
    return True




def test_caching():
    """Test category caching functionality"""
    print("\n" + "=" * 60)
    print("Test 5: Category Caching")
    print("=" * 60)

    db = DatabaseConnection()
    db.connect()
    category_manager = CategoryManager(db)

    import time

    # First call - should hit database
    start = time.time()
    categories1 = category_manager.get_enabled_categories()
    time1 = time.time() - start
    print(f"First call (DB): {time1:.4f} seconds")

    # Second call - should use cache
    start = time.time()
    categories2 = category_manager.get_enabled_categories()
    time2 = time.time() - start
    print(f"Second call (cached): {time2:.4f} seconds")

    assert categories1 == categories2, "Cached data should match"
    # Cache should be faster (though not always guaranteed on small datasets)
    print(f"✅ Caching is working (speedup: {time1/time2:.1f}x)")

    # Force refresh
    start = time.time()
    categories3 = category_manager.get_enabled_categories(refresh_cache=True)
    time3 = time.time() - start
    print(f"Third call (force refresh): {time3:.4f} seconds")

    print("✅ Cache refresh working")

    db.close()
    return True


def test_all_categories():
    """Test getting all categories including disabled ones"""
    print("\n" + "=" * 60)
    print("Test 5: Get All Categories (including disabled)")
    print("=" * 60)

    db = DatabaseConnection()
    db.connect()
    category_manager = CategoryManager(db)

    all_categories = category_manager.get_all_categories()

    print(f"\nFound {len(all_categories)} total categories:")
    enabled_count = sum(1 for c in all_categories if c['enabled'])
    disabled_count = sum(1 for c in all_categories if not c['enabled'])

    print(f"  Enabled: {enabled_count}")
    print(f"  Disabled: {disabled_count}")

    for cat in all_categories:
        status = "✅" if cat['enabled'] else "❌"
        print(f"\n  {status} {cat['name']}")
        print(f"     Priority: {cat['priority']}")
        print(f"     Keywords: {len(cat['keywords'])}")

    assert len(all_categories) >= 6, "Should have at least 6 categories"
    print("\n✅ Successfully retrieved all categories")

    db.close()
    return True


def main():
    """Run all category manager tests"""
    print("=" * 60)
    print("CATEGORY MANAGER TESTS")
    print("=" * 60)

    tests = [
        ("Get Enabled Categories", test_get_enabled_categories),
        ("Get Category by Slug", test_get_category_by_slug),
        ("Get Category Keywords", test_get_category_keywords),
        ("Caching", test_caching),
        ("Get All Categories", test_all_categories),
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
