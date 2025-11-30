import sqlite3
import os

# Path to database
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'storage', 'polydebate.db')

print(f"Connecting to database at {DB_PATH}")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Check if columns exist
cursor.execute("PRAGMA table_info(debate_outcomes)")
columns = [info[1] for info in cursor.fetchall()]
print(f"Current columns in debate_outcomes: {columns}")

# Add missing columns
new_columns = [
    ('shares', 'VARCHAR(50)'),
    ('volume', 'FLOAT'),
    ('price_change_24h', 'FLOAT'),
    ('image_url', 'VARCHAR(500)')
]

for col_name, col_type in new_columns:
    if col_name not in columns:
        print(f"Adding column {col_name}...")
        try:
            cursor.execute(f"ALTER TABLE debate_outcomes ADD COLUMN {col_name} {col_type}")
            print(f"Successfully added {col_name}")
        except Exception as e:
            print(f"Error adding {col_name}: {e}")
    else:
        print(f"Column {col_name} already exists")

conn.commit()
conn.close()
print("Database schema update complete")
