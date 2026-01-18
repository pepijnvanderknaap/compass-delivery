# Demo Setup Guide

## Quick Setup for Tomorrow's Demo

Follow these steps to get the functional ordering system working with authentication:

### Step 1: Create Demo User in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `agwheuqqvdtcaqpgviya`
3. Go to **Authentication** > **Users**
4. Click **Add user** > **Create new user**
5. Enter:
   - **Email**: `demo@compass.com`
   - **Password**: `compass2024`
   - **Auto Confirm User**: ✅ (check this box!)
6. Click **Create user**
7. **Copy the User ID** (UUID) that appears - you'll need this in the next step!

### Step 2: Run SQL in Supabase

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Paste the following SQL (replace `YOUR_USER_ID` with the UUID you copied):

```sql
-- First, ensure schema is set up (skip if already done)
-- Run supabase-schema.sql first if you haven't

-- Insert sample locations if not already done
INSERT INTO locations (name, contact_email, contact_name, is_active)
VALUES ('Demo Office', 'demo@compass.com', 'Demo Manager', true)
ON CONFLICT DO NOTHING;

-- Create user profile for demo user
-- REPLACE 'YOUR_USER_ID' with the actual UUID from Step 1!
INSERT INTO user_profiles (id, email, full_name, role, location_id)
VALUES (
  'YOUR_USER_ID',  -- Replace this with your user ID!
  'demo@compass.com',
  'Demo Manager',
  'manager',
  (SELECT id FROM locations WHERE name = 'Demo Office' LIMIT 1)
);

-- Insert sample dishes if not already done
INSERT INTO dishes (name, category, default_portion_size_ml, is_active) VALUES
  ('Tomato Basil Soup', 'soup', 250, true),
  ('Chicken Noodle Soup', 'soup', 250, true)
ON CONFLICT DO NOTHING;

INSERT INTO dishes (name, category, default_portion_size_g, is_active) VALUES
  ('Chicken Curry with Rice', 'hot_dish_meat', 350, true),
  ('Grilled Salmon', 'hot_dish_meat', 300, true),
  ('Vegetable Pasta', 'hot_dish_vegetarian', 350, true),
  ('Lentil Dal', 'hot_dish_vegetarian', 350, true)
ON CONFLICT DO NOTHING;
```

4. Click **Run**

### Step 3: Update Login Page

The login page is already set up to use email/password authentication. The demo user can now log in with:
- Email: `demo@compass.com`
- Password: `compass2024`

### Step 4: Test the System

1. Go to `http://localhost:3000/login`
2. Enter:
   - Email: `demo@compass.com`
   - Password: `compass2024`
3. Click **Sign In**
4. You should see the dashboard with manager options
5. Click **New Order** to test the ordering functionality

## Alternative: Use Password-Protected Demo Mode

If you prefer NOT to use email login and just want the password gate (compass2024), I can create a demo version of the ordering pages that bypasses Supabase auth. This would be faster to set up but won't show the full authentication system.

Let me know which approach you prefer!

## What You'll Have After Setup

Once the user is created, you'll have access to:

1. **Dashboard** - Shows available actions based on role
2. **New Order** - Place weekly orders with soup, salad bar, hot dishes (meat/vegetarian)
3. **View Orders** - See all submitted orders
4. Full authentication with email/password

The system managers can:
- Select dishes for each day of the week (Monday-Friday)
- Enter portion quantities for each dish
- Submit weekly orders
- View order history
