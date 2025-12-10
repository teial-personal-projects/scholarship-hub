"""
Simple standalone database connection test
Tests connection to Supabase PostgreSQL and scholarships table
"""
import os
import sys
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from urllib.parse import quote_plus, urlparse, urlunparse

# Load environment
env_path = os.path.join(os.path.dirname(__file__), '../../.env.local')
load_dotenv(env_path)

def test_connection():
    """Test basic database connection"""
    print("\n🧪 Testing Database Connection...")
    print("=" * 60)

    # Get DATABASE_URL from environment
    db_url = os.getenv("DATABASE_URL")

    if not db_url:
        print("\n❌ DATABASE_URL not found in .env.local")
        print("\n📝 To fix this:")
        print("   1. Go to your Supabase Dashboard:")
        print("      https://supabase.com/dashboard/project/ljzvgcbtstxozqlvvzaf")
        print("\n   2. Navigate to: Project Settings > Database")
        print("\n   3. Scroll to 'Connection string' section")
        print("      Choose 'URI' format (not 'Transaction pooler' or 'Session pooler')")
        print("\n   4. Copy the connection string (it will look like:")
        print("      postgresql://postgres.[ref]:[password]@[host]:5432/postgres")
        print("\n   5. Add it to .env.local:")
        print("      DATABASE_URL=postgresql://postgres.ljzvgcbt...")
        print("\n   Note: Replace [password] with your actual database password!")
        return False

    if "[YOUR-DB-PASSWORD]" in db_url:
        print("\n❌ DATABASE_URL contains placeholder password")
        print("\n📝 Please replace [YOUR-DB-PASSWORD] with your actual database password")
        print("   Get it from: Supabase Dashboard > Project Settings > Database")
        return False

    print(f"\n🔗 Connecting to database...")
    print(f"   Host: {db_url.split('@')[1].split(':')[0] if '@' in db_url else 'unknown'}")

    try:
        # Connect directly without re-encoding
        # Supabase provides the connection string already properly encoded
        connection = psycopg2.connect(db_url)
        cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        print("✅ Database connection successful!")

        # Test if scholarships table exists
        print("\n📊 Checking for scholarships table...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'scholarships'
        """)
        result = cursor.fetchone()

        if result:
            print("✅ Scholarships table exists!")

            # Get table structure
            print("\n📋 Table columns:")
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'scholarships'
                ORDER BY ordinal_position
                LIMIT 15
            """)
            columns = cursor.fetchall()

            for col in columns:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                print(f"   ✓ {col['column_name']:25} {col['data_type']:20} {nullable}")

            # Count existing scholarships
            print("\n📈 Current data:")
            cursor.execute("SELECT COUNT(*) as count FROM scholarships")
            count_result = cursor.fetchone()
            print(f"   Total scholarships: {count_result['count']}")

            # Show sample if any exist
            if count_result['count'] > 0:
                print("\n📝 Sample scholarship (first record):")
                cursor.execute("""
                    SELECT id, name, organization, min_award, max_award, deadline
                    FROM scholarships
                    LIMIT 1
                """)
                sample = cursor.fetchone()
                print(f"   ID: {sample['id']}")
                print(f"   Name: {sample['name']}")
                print(f"   Organization: {sample['organization']}")
                if sample['min_award'] and sample['max_award']:
                    print(f"   Award Range: ${sample['min_award']} - ${sample['max_award']}")
                elif sample['min_award']:
                    print(f"   Award: ${sample['min_award']}")
                else:
                    print(f"   Award: Not specified")
                print(f"   Deadline: {sample['deadline']}")

            print("\n" + "=" * 60)
            print("✅ ALL TESTS PASSED!")
            print("=" * 60)
            print("\n🎉 Your database connection is working correctly!")
            print("   You can now use the deduplication engine and other tools.")
            return True

        else:
            print("❌ Scholarships table does not exist")
            print("\n📝 Please run migrations first:")
            print("   cd /Users/teial/Tutorials/scholarship-hub")
            print("   npm run migrate:latest --workspace=api")
            return False

    except psycopg2.OperationalError as e:
        print(f"\n❌ Connection failed: {e}")
        print("\n📝 Common issues:")
        print("   • Wrong password in DATABASE_URL")
        print("   • Database is paused (go to Supabase dashboard to resume)")
        print("   • Incorrect host or port")
        print("   • Network/firewall issues")
        return False

    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'connection' in locals():
            connection.close()
            print("\n🔌 Database connection closed")

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)
