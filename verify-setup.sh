#!/bin/bash
echo "=== Compass Kitchen Orders - Setup Verification ==="
echo ""
echo "Checking required files..."
echo ""

files=(
  "package.json:Configuration"
  "README.md:Documentation"
  "QUICKSTART.md:Setup Guide"
  "SETUP_CHECKLIST.md:Checklist"
  "supabase-schema.sql:Database Schema"
  "app/layout.tsx:App Layout"
  "app/login/page.tsx:Login Page"
  "app/dashboard/page.tsx:Dashboard"
  "app/orders/new/page.tsx:Order Form"
  "app/kitchen/daily-overview/page.tsx:Kitchen View"
  "app/admin/locations/page.tsx:Location Management"
  "app/admin/dishes/page.tsx:Dish Management"
  "app/admin/menus/page.tsx:Menu Management"
  "app/invoicing/page.tsx:Invoicing"
  "lib/types.ts:TypeScript Types"
  "lib/supabase/client.ts:Supabase Client"
  "lib/supabase/server.ts:Supabase Server"
  "middleware.ts:Auth Middleware"
  ".env.local.example:Environment Template"
)

all_good=true

for item in "${files[@]}"; do
  file="${item%:*}"
  desc="${item#*:}"
  if [ -f "$file" ]; then
    echo "✅ $desc ($file)"
  else
    echo "❌ MISSING: $desc ($file)"
    all_good=false
  fi
done

echo ""
if [ "$all_good" = true ]; then
  echo "✅ All files present! You're ready to go!"
else
  echo "❌ Some files are missing. Please check the output above."
fi
echo ""
echo "Next: Follow SETUP_CHECKLIST.md to deploy your application"
