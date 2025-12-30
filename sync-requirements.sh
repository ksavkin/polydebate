#!/bin/bash
# Sync backend/requirements.txt to root requirements.txt
# This ensures Railway can find requirements.txt during build

# Preserve the header comment
cat > requirements.txt << 'EOF'
# IMPORTANT: This file must be kept in sync with backend/requirements.txt
# Run ./sync-requirements.sh after updating backend/requirements.txt
# Or manually copy backend/requirements.txt to this file

EOF

# Append backend requirements
cat backend/requirements.txt >> requirements.txt

echo "✓ Synced backend/requirements.txt to root/requirements.txt"
