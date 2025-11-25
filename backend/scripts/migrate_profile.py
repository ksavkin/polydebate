"""
Migration script for profile page feature
Adds new columns to users and debates tables
"""
import sys
import os

# Add parent directory to path so we can import from backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db, init_db
from sqlalchemy import text
from config import config

def migrate():
    """Run database migration for profile page feature"""
    print("Starting profile page migration...")

    # Initialize database
    init_db(config.DATABASE_URL, echo=False)
    db = get_db()

    try:
        # Migrate users table
        print("\n1. Migrating users table...")

        try:
            db.execute(text('ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)'))
            print("   ✓ Added avatar_url column")
        except Exception as e:
            if 'duplicate column name' in str(e).lower() or 'already exists' in str(e).lower():
                print("   ⊘ avatar_url column already exists")
            else:
                print(f"   ✗ Error adding avatar_url: {e}")

        try:
            db.execute(text('ALTER TABLE users ADD COLUMN tokens_remaining INTEGER DEFAULT 100000'))
            print("   ✓ Added tokens_remaining column")
        except Exception as e:
            if 'duplicate column name' in str(e).lower() or 'already exists' in str(e).lower():
                print("   ⊘ tokens_remaining column already exists")
            else:
                print(f"   ✗ Error adding tokens_remaining: {e}")

        try:
            db.execute(text('ALTER TABLE users ADD COLUMN total_debates INTEGER DEFAULT 0'))
            print("   ✓ Added total_debates column")
        except Exception as e:
            if 'duplicate column name' in str(e).lower() or 'already exists' in str(e).lower():
                print("   ⊘ total_debates column already exists")
            else:
                print(f"   ✗ Error adding total_debates: {e}")

        db.commit()
        print("   ✓ Users table migration completed")

        # Migrate debates table
        print("\n2. Migrating debates table...")

        try:
            db.execute(text('ALTER TABLE debates ADD COLUMN user_id INTEGER'))
            print("   ✓ Added user_id column")
        except Exception as e:
            if 'duplicate column name' in str(e).lower() or 'already exists' in str(e).lower():
                print("   ⊘ user_id column already exists")
            else:
                print(f"   ✗ Error adding user_id: {e}")

        try:
            db.execute(text('ALTER TABLE debates ADD COLUMN is_deleted BOOLEAN DEFAULT 0'))
            print("   ✓ Added is_deleted column")
        except Exception as e:
            if 'duplicate column name' in str(e).lower() or 'already exists' in str(e).lower():
                print("   ⊘ is_deleted column already exists")
            else:
                print(f"   ✗ Error adding is_deleted: {e}")

        try:
            db.execute(text('ALTER TABLE debates ADD COLUMN total_tokens_used INTEGER DEFAULT 0'))
            print("   ✓ Added total_tokens_used column")
        except Exception as e:
            if 'duplicate column name' in str(e).lower() or 'already exists' in str(e).lower():
                print("   ⊘ total_tokens_used column already exists")
            else:
                print(f"   ✗ Error adding total_tokens_used: {e}")

        try:
            db.execute(text('ALTER TABLE debates ADD COLUMN tokens_by_model TEXT'))
            print("   ✓ Added tokens_by_model column")
        except Exception as e:
            if 'duplicate column name' in str(e).lower() or 'already exists' in str(e).lower():
                print("   ⊘ tokens_by_model column already exists")
            else:
                print(f"   ✗ Error adding tokens_by_model: {e}")

        try:
            db.execute(text('ALTER TABLE debates ADD COLUMN market_category VARCHAR(100)'))
            print("   ✓ Added market_category column")
        except Exception as e:
            if 'duplicate column name' in str(e).lower() or 'already exists' in str(e).lower():
                print("   ⊘ market_category column already exists")
            else:
                print(f"   ✗ Error adding market_category: {e}")

        db.commit()
        print("   ✓ Debates table migration completed")

        # Update existing users to have default token balance
        print("\n3. Updating existing users...")
        result = db.execute(text('UPDATE users SET tokens_remaining = 100000 WHERE tokens_remaining IS NULL'))
        db.commit()
        print(f"   ✓ Updated {result.rowcount} users with default token balance")

        # Update existing debates to have default values
        print("\n4. Updating existing debates...")
        result = db.execute(text('UPDATE debates SET is_deleted = 0 WHERE is_deleted IS NULL'))
        db.commit()
        print(f"   ✓ Updated {result.rowcount} debates with is_deleted = False")

        result = db.execute(text('UPDATE debates SET total_tokens_used = 0 WHERE total_tokens_used IS NULL'))
        db.commit()
        print(f"   ✓ Updated {result.rowcount} debates with total_tokens_used = 0")

        print("\n✓ Migration completed successfully!")
        print("\nNext steps:")
        print("1. Restart the Flask backend")
        print("2. Verify the changes with: SELECT * FROM users LIMIT 1;")
        print("3. Verify the changes with: SELECT * FROM debates LIMIT 1;")

    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    migrate()
