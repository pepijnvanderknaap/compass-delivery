# Quick Start - Get Demo Working in 5 Minutes

## Step 1: Open Supabase Dashboard (1 min)

1. Go to https://supabase.com/dashboard
2. Find your project: **agwheuqqvdtcaqpgviya**
3. Make sure you're logged in

## Step 2: Create Demo User (2 min)

1. In left sidebar, click **Authentication** → **Users**
2. Click green **Add user** button (top right)
3. Click **Create new user**
4. Fill in:
   - Email: `demo@compass.com`
   - Password: `compass2024`
   - ✅ Check **Auto Confirm User** (IMPORTANT!)
5. Click **Create user**
6. **COPY THE USER ID** - it looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
   - Keep this somewhere, you'll need it in 30 seconds!

## Step 3: Run SQL Script (2 min)

1. In left sidebar, click **SQL Editor**
2. Click **New query**
3. Copy and paste this entire script:

```sql
-- Create demo location
INSERT INTO locations (name, contact_email, contact_name, is_active)
VALUES ('Demo Office - Amsterdam', 'demo@compass.com', 'Demo Manager', true)
ON CONFLICT DO NOTHING;

-- Create sample dishes - Soups
INSERT INTO dishes (name, category, default_portion_size_ml, is_active) VALUES
  ('Tomato Basil Soup', 'soup', 250, true),
  ('Chicken Noodle Soup', 'soup', 250, true),
  ('Butternut Squash Soup', 'soup', 250, true)
ON CONFLICT DO NOTHING;

-- Hot Dishes - Meat/Fish
INSERT INTO dishes (name, category, default_portion_size_g, is_active) VALUES
  ('Chicken Curry with Rice', 'hot_dish_meat', 350, true),
  ('Grilled Salmon with Vegetables', 'hot_dish_meat', 300, true),
  ('Beef Stroganoff', 'hot_dish_meat', 350, true)
ON CONFLICT DO NOTHING;

-- Hot Dishes - Vegetarian
INSERT INTO dishes (name, category, default_portion_size_g, is_active) VALUES
  ('Vegetable Pasta Primavera', 'hot_dish_vegetarian', 350, true),
  ('Lentil Dal with Rice', 'hot_dish_vegetarian', 350, true),
  ('Mushroom Risotto', 'hot_dish_vegetarian', 350, true)
ON CONFLICT DO NOTHING;

-- Salad Bar
INSERT INTO dishes (name, category, default_portion_size_g, is_active) VALUES
  ('Mixed Salad Bar', 'salad_bar', 200, true)
ON CONFLICT DO NOTHING;

-- Create user profile - PASTE YOUR USER ID BELOW!
INSERT INTO user_profiles (id, email, full_name, role, location_id)
VALUES (
  'PASTE_YOUR_USER_ID_HERE',  -- ← Replace this entire text with your UUID
  'demo@compass.com',
  'Demo Manager',
  'manager',
  (SELECT id FROM locations WHERE name = 'Demo Office - Amsterdam' LIMIT 1)
);
```

4. **IMPORTANT**: Find the line that says `'PASTE_YOUR_USER_ID_HERE'`
5. Replace `PASTE_YOUR_USER_ID_HERE` (including the quotes!) with your user ID from Step 2
   - Example: Change `'PASTE_YOUR_USER_ID_HERE'` to `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'`
6. Click **Run** (bottom right)
7. You should see "Success. No rows returned"

## Step 4: Test Login (30 sec)

1. Go to http://localhost:3000/login
2. Enter:
   - Email: `demo@compass.com`
   - Password: `compass2024`
3. Click **Sign In**
4. You should see the dashboard!
5. Click **New Order** to test the ordering system

## That's It!

You now have:
- ✅ Working login system
- ✅ Manager dashboard
- ✅ Full ordering functionality (soup, salad bar, hot dishes meat/fish, hot dishes vegetarian)
- ✅ Sample dishes to choose from

## For Tomorrow's Demo

Just tell them to:
1. Go to the URL
2. Log in with `demo@compass.com` / `compass2024`
3. Click "New Order" and start ordering!

---

## Troubleshooting

**If login doesn't work:**
- Make sure you checked "Auto Confirm User" when creating the user
- Try the "Forgot Password" flow to verify the email
- Check Supabase logs: Dashboard → Logs → Auth Logs

**If you see "Unable to load profile":**
- The user profile SQL didn't run correctly
- Check you replaced the USER_ID correctly (including removing the quotes around 'PASTE_YOUR_USER_ID_HERE' but keeping the quotes around the actual UUID)

**Need help?**
Let me know what error message you see!
