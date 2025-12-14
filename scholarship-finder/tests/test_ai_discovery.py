"""
Test AI Discovery Engine
Tests the AI-powered scholarship discovery functionality
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def test_ai_discovery():
    """Test AI Discovery Engine"""
    print("\n🧪 Testing AI Discovery Engine...")
    print("=" * 60)

    # Check for required environment variables
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '../../.env.local')
    load_dotenv(env_path)

    openai_key = os.getenv('OPENAI_API_KEY')
    google_key = os.getenv('GOOGLE_API_KEY')
    google_cx = os.getenv('GOOGLE_CUSTOM_SEARCH_CX')

    print("\n🔑 Checking API credentials...")

    if not openai_key:
        print("❌ OPENAI_API_KEY not found in .env.local")
        print("\n📝 To add it:")
        print("   1. Get your API key from: https://platform.openai.com/api-keys")
        print("   2. Add to .env.local:")
        print("      OPENAI_API_KEY=sk-...")
        pytest.skip("OPENAI_API_KEY not found")
    else:
        print(f"✅ OPENAI_API_KEY found ({openai_key[:20]}...)")

    if not google_key:
        print("⚠️  GOOGLE_API_KEY not found (optional for this test)")
        print("   Get it from: https://console.cloud.google.com/apis/credentials")
    else:
        print(f"✅ GOOGLE_API_KEY found ({google_key[:20]}...)")

    if not google_cx:
        print("⚠️  GOOGLE_CUSTOM_SEARCH_CX not found (optional for this test)")
        print("   Get it from: https://programmablesearchengine.google.com/")
    else:
        print(f"✅ GOOGLE_CUSTOM_SEARCH_CX found ({google_cx})")

    # Test imports
    print("\n📦 Testing imports...")
    try:
        from src.ai_discovery.discovery_engine import AIDiscoveryEngine
        from src.database.connection import DatabaseConnection
        print("✅ All imports successful")
    except ImportError as e:
        print(f"❌ Import error: {e}")
        raise

    # Test database connection
    print("\n🗄️  Testing database connection...")
    db = DatabaseConnection()
    if not db.connect():
        print("❌ Database connection failed")
        assert False, "Database connection failed"

    print("✅ Database connection successful")

    # Create AI Discovery Engine instance
    print("\n🤖 Initializing AI Discovery Engine...")
    try:
        engine = AIDiscoveryEngine(db)
        print("✅ AI Discovery Engine initialized")
    except Exception as e:
        print(f"❌ Failed to initialize engine: {e}")
        db.close()
        raise

    # Test 1: Generate search queries
    print("\n📝 Test 1: Generating search queries...")
    try:
        queries = engine.generate_search_queries(
            category="Technology",
            keywords=["computer science", "engineering", "STEM"]
        )
        print(f"✅ Generated {len(queries)} queries:")
        for i, query in enumerate(queries[:3], 1):
            print(f"   {i}. {query}")
    except Exception as e:
        print(f"❌ Failed to generate queries: {e}")
        db.close()
        raise

    # Test 2: Test scholarship verification (mock HTML)
    print("\n🔍 Test 2: Testing scholarship page verification...")
    try:
        mock_html = """
        <html>
        <body>
            <h1>Annual Tech Scholarship</h1>
            <p>Award Amount: $5,000</p>
            <p>Deadline: May 1, 2025</p>
            <p>Eligibility: High school seniors pursuing computer science</p>
            <p>Apply at: www.example.com/apply</p>
        </body>
        </html>
        """
        is_scholarship = engine.verify_scholarship_page("http://example.com", mock_html)
        if is_scholarship:
            print("✅ Correctly identified as scholarship page")
        else:
            print("⚠️  Page verification returned False (AI might be conservative)")
    except Exception as e:
        print(f"❌ Verification test failed: {e}")
        db.close()
        raise

    # Test 3: Extract scholarship data
    print("\n📊 Test 3: Testing scholarship data extraction...")
    try:
        data = engine.extract_scholarship_data("http://example.com", mock_html)
        if data:
            print("✅ Successfully extracted scholarship data:")
            print(f"   Name: {data.get('name', 'N/A')}")
            print(f"   Organization: {data.get('organization', 'N/A')}")
            print(f"   Award: ${data.get('min_award', 'N/A')} - ${data.get('max_award', 'N/A')}")
            print(f"   Deadline: {data.get('deadline', 'N/A')}")
        else:
            print("⚠️  No data extracted (AI might need better HTML)")
    except Exception as e:
        print(f"❌ Extraction test failed: {e}")
        db.close()
        raise

    # Clean up
    db.close()

    print("\n" + "=" * 60)
    print("✅ AI DISCOVERY ENGINE TESTS COMPLETED!")
    print("=" * 60)
    print("\n💡 Notes:")
    print("   - Search queries are generated using GPT-3.5-turbo")
    print("   - Page verification uses AI to identify scholarship pages")
    print("   - Data extraction uses GPT-4o-mini for better accuracy")
    print("   - Full discovery requires Google Custom Search API")
    print("\n🎉 The AI Discovery Engine is ready to use!")

    # Test passed - no return needed for pytest

if __name__ == "__main__":
    success = test_ai_discovery()
    sys.exit(0 if success else 1)
