#!/bin/bash
# Clear Next.js cache and restart dev server

echo "Stopping dev server..."
pkill -f "next dev" || pkill -f "node.*next"

echo "Clearing .next cache..."
rm -rf .next

echo "Restarting dev server..."
npm run dev
