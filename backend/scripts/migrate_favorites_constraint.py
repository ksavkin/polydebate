import sqlite3
import os

DB_PATH = 'backend/storage/polydebate.db'

def migrate_table():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        print("Starting migration of user_favorites table...")

        # 1. Rename existing table
        cursor.execute("ALTER TABLE user_favorites RENAME TO user_favorites_old")
        
        # 2. Create new table without the strict (user_id, market_id) constraint
        # We will add partial unique indexes later
        cursor.execute("""
            CREATE TABLE user_favorites (
                id INTEGER NOT NULL, 
                user_id INTEGER NOT NULL, 
                market_id VARCHAR(100) NOT NULL, 
                debate_id VARCHAR(36),
                created_at DATETIME NOT NULL, 
                PRIMARY KEY (id), 
                FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # 3. Copy data
        # Note: We need to handle the case where debate_id might not exist in _old if the previous script failed or was partial
        # But assuming previous script ran, debate_id exists in _old.
        cursor.execute("""
            INSERT INTO user_favorites (id, user_id, market_id, debate_id, created_at)
            SELECT id, user_id, market_id, debate_id, created_at FROM user_favorites_old
        """)
        
        # 4. Drop old table
        cursor.execute("DROP TABLE user_favorites_old")
        
        # 5. Create Indexes
        cursor.execute("CREATE INDEX ix_user_favorites_market_id ON user_favorites (market_id)")
        cursor.execute("CREATE INDEX ix_user_favorites_user_id ON user_favorites (user_id)")
        cursor.execute("CREATE INDEX ix_user_favorites_debate_id ON user_favorites (debate_id)")
        
        # 6. Create Partial Unique Indexes
        # Unique per debate if debate_id is present
        cursor.execute("CREATE UNIQUE INDEX uq_user_debate_favorite ON user_favorites (user_id, debate_id) WHERE debate_id IS NOT NULL")
        
        # Unique per market if debate_id is NULL (for generic market favorites)
        cursor.execute("CREATE UNIQUE INDEX uq_user_market_favorite_generic ON user_favorites (user_id, market_id) WHERE debate_id IS NULL")
        
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_table()
