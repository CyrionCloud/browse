"""
Run community skills migration
"""

from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

def read_sql_file(filepath):
    with open(filepath, 'r') as f:
        return f.read()

def main():
    print("🚀 Running community skills migration...\n")
    
   # Read SQL file
    sql_content = read_sql_file('migrations/community_skills.sql')
    
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("⚠️  NOTE: SQL migrations must be run via Supabase Dashboard")
    print("\nPlease follow these steps:")
    print("1. Go to: https://pwebxxmyksequxxwfdar.supabase.co/project/_/sql")
    print("2. Click 'New Query'")
    print("3. Copy the contents of: backend/migrations/community_skills.sql")
    print("4. Paste into the SQL editor")
    print("5. Click 'Run'")
    
    print("\n🔍 Checking if tables already exist...")
    try:
        # Check if skill_ratings table exists
        result = client.table('skill_ratings').select('count', count='exact').execute()
        print(f"✅ skill_ratings table exists with {result.count} ratings")
        
        result = client.table('skill_forks').select('count', count='exact').execute()
        print(f"✅ skill_forks table exists with {result.count} forks")
        
        result = client.table('skill_imports').select('count', count='exact').execute()
        print(f"✅ skill_imports table exists with {result.count} imports")
        
        # Check if skills table has new columns
        result = client.table('skills').select('is_public, rating_avg, import_count').limit(1).execute()
        if result.data:
            print(f"✅ skills table has community columns")
        
        print("\n✨ Migration appears to be already applied!")
        
    except Exception as e:
        print(f"❌ Tables not found: {e}")
        print("\n👉 Please run the migration via Supabase Dashboard (see steps above)")

if __name__ == '__main__':
    main()
