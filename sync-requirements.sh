#!/bin/bash
# Sync backend/requirements.txt to root requirements.txt
# This ensures Railway can find requirements.txt during build

cp backend/requirements.txt requirements.txt
echo "Synced backend/requirements.txt to root/requirements.txt"

