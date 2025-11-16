"""
Database initialization script
Run this to create/reset the database tables
"""
import os
import sys
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import init_db, Session, User, VerificationCode
from config import config


def create_tables():
    """Create all database tables"""
    print("=" * 60)
    print("Database Initialization Script")
    print("=" * 60)
    print(f"\nDatabase URL: {config.DATABASE_URL}")
    print(f"Environment: {config.ENV}")
    print(f"Debug: {config.DEBUG}")
    print("=" * 60)

    # Confirm if not in development
    if config.ENV != 'development':
        response = input("\n⚠️  You are not in development mode. Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            return

    print("\n📊 Creating database tables...")
    try:
        init_db()
        print("✅ Database tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return

    # Verify tables were created
    print("\n🔍 Verifying tables...")
    db = Session()
    try:
        # Check users table
        user_count = db.query(User).count()
        print(f"   Users table: ✅ ({user_count} users)")

        # Check verification_codes table
        code_count = db.query(VerificationCode).count()
        print(f"   Verification codes table: ✅ ({code_count} codes)")

        print("\n✅ All tables verified!")

    except Exception as e:
        print(f"❌ Error verifying tables: {e}")
    finally:
        db.close()

    print("\n" + "=" * 60)
    print("Database initialization complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Start your Flask app: python app.py")
    print("2. Test the auth endpoints: python test_auth.py")
    print("3. Check AUTH_README.md for full documentation")
    print("=" * 60)


def reset_database():
    """Reset database (WARNING: Deletes all data!)"""
    print("=" * 60)
    print("⚠️  DATABASE RESET - THIS WILL DELETE ALL DATA!")
    print("=" * 60)

    response = input("\nAre you sure you want to delete all data? (yes/no): ")
    if response.lower() != 'yes':
        print("Aborted.")
        return

    # Delete database file if SQLite
    if config.DATABASE_URL.startswith('sqlite'):
        db_path = config.DATABASE_URL.replace('sqlite:///', '')
        if os.path.exists(db_path):
            os.remove(db_path)
            print(f"✅ Deleted database file: {db_path}")
        else:
            print(f"ℹ️  Database file not found: {db_path}")

    # Recreate tables
    create_tables()


def show_stats():
    """Show database statistics"""
    print("=" * 60)
    print("Database Statistics")
    print("=" * 60)

    db = Session()
    try:
        # User stats
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        print(f"\n👥 Users:")
        print(f"   Total: {total_users}")
        print(f"   Active: {active_users}")
        print(f"   Inactive: {total_users - active_users}")

        # Code stats
        total_codes = db.query(VerificationCode).count()
        used_codes = db.query(VerificationCode).filter(VerificationCode.used_at.isnot(None)).count()
        unused_codes = total_codes - used_codes
        print(f"\n📧 Verification Codes:")
        print(f"   Total: {total_codes}")
        print(f"   Used: {used_codes}")
        print(f"   Unused: {unused_codes}")

        # Recent users
        recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
        if recent_users:
            print(f"\n🕐 Recent Users:")
            for user in recent_users:
                created = user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else "N/A"
                print(f"   - {user.email} ({user.name}) - Created: {created}")

    except Exception as e:
        print(f"❌ Error getting stats: {e}")
    finally:
        db.close()

    print("\n" + "=" * 60)


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("""
Usage: python init_db.py [command]

Commands:
    create      - Create database tables (safe, doesn't delete data)
    reset       - Reset database (WARNING: deletes all data!)
    stats       - Show database statistics

Examples:
    python init_db.py create
    python init_db.py stats
    python init_db.py reset
        """)
        return

    command = sys.argv[1].lower()

    if command == 'create':
        create_tables()
    elif command == 'reset':
        reset_database()
    elif command == 'stats':
        show_stats()
    else:
        print(f"❌ Unknown command: {command}")
        print("Valid commands: create, reset, stats")


if __name__ == "__main__":
    main()
