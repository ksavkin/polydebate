import sqlite3
import os

DB_PATH = 'backend/storage/polydebate.db'

def add_column():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Add debate_id column
        print("Adding debate_id column to user_favorites...")
        cursor.execute("ALTER TABLE user_favorites ADD COLUMN debate_id VARCHAR(36)")
        print("Column added successfully.")
        
        # Create index for debate_id
        print("Creating index for debate_id...")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_user_favorites_debate_id ON user_favorites (debate_id)")
        print("Index created successfully.")
        
        conn.commit()
        print("Migration completed.")
        
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column debate_id already exists.")
        else:
            print(f"Error: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
