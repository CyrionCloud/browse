"""
Script to run the error patterns SQL migration via Supabase.
"""

from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def read_sql_file(filepath):
    """Read SQL file and return content"""
    with open(filepath, 'r') as f:
        return f.read()

def main():
    """Run the migration"""
    print("🚀 Running error patterns migration...")
    
    # Read SQL file
    sql_content = read_sql_file('migrations/error_patterns.sql')
    
    # Create Supabase client
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Note: Supabase Python client doesn't directly support running raw SQL
    # We need to use the PostgREST API or run this via Supabase Dashboard
    
    print("⚠️  NOTE: SQL migrations must be run via Supabase Dashboard")
    print("\nPlease follow these steps:")
    print("1. Go to: https://pwebxxmyksequxxwfdar.supabase.co/project/_/sql")
    print("2. Click 'New Query'")
    print("3. Copy the contents of: backend/migrations/error_patterns.sql")
    print("4. Paste into the SQL editor")
    print("5. Click 'Run'")
    print("\n✅ Or use the Supabase CLI:")
    print("   supabase db push --db-url YOUR_DATABASE_URL")
    
    # Alternative: Test if tables exist
    print("\n🔍 Checking if tables already exist...")
    try:
        # Try to query error_patterns table
        result = client.table('error_patterns').select('count', count='exact').execute()
        print(f"✅ error_patterns table exists with {result.count} patterns")
        
        result = client.table('error_recovery_history').select('count', count='exact').execute()
        print(f"✅ error_recovery_history table exists with {result.count} entries")
        
        print("\n✨ Migration appears to be already applied!")
        
    except Exception as e:
        print(f"❌ Tables not found: {e}")
        print("\n👉 Please run the migration via Supabase Dashboard (see steps above)")

if __name__ == '__main__':
    main()
