# Quick Start Guide

## 5-Minute Setup

### 1. Create Supabase Project (2 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Name: "compass-kitchen-orders"
   - Database Password: (choose a strong password and save it)
   - Region: (choose closest to you)
5. Wait for project to be ready (usually 1-2 minutes)

### 2. Set Up Database (1 minute)

1. In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Open the file `supabase-schema.sql` from this project
4. Copy ALL the contents
5. Paste into the SQL Editor
6. Click "Run" (bottom right)
7. You should see "Success. No rows returned"

### 3. Get Your API Keys (30 seconds)

1. In Supabase dashboard, go to "Settings" (gear icon) > "API"
2. Copy these two values:
   - Project URL (looks like: `https://xxxxx.supabase.co`)
   - `anon` `public` key (long string starting with `eyJ...`)

### 4. Configure Your App (30 seconds)

1. In your project folder, create a file called `.env.local`
2. Add these lines (replace with your actual values):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 5. Start the App (1 minute)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Create Your Admin Account (1 minute)

Since there are no users yet, let's create one:

1. In Supabase dashboard, go to "Authentication" > "Users"
2. Click "Add User" > "Create new user"
3. Enter:
   - Email: your-email@example.com
   - Password: (choose a password)
   - Auto Confirm User: YES
4. Click "Create user"
5. After created, click on the user in the list
6. Copy the UUID (the long string at the top, looks like: `123e4567-e89b-12d3-a456-426614174000`)

7. Go back to "SQL Editor" and run this (replace with your values):
   ```sql
   INSERT INTO user_profiles (id, email, role, full_name)
   VALUES (
     'paste-your-user-uuid-here',
     'your-email@example.com',
     'admin',
     'Your Name'
   );
   ```

### 7. Log In!

Go back to [http://localhost:3000](http://localhost:3000) and log in with the email/password you created!

## Next Steps

Now that you're logged in as admin, set up your system:

### Add Your First Location

1. Click "Manage Locations"
2. Click "Add Location"
3. Fill in:
   - Location Name: "Office Amsterdam"
   - Contact Name: "John Doe"
   - Contact Email: "john@example.com"
4. Click "Create"

### Add Some Dishes

1. Click "Manage Dishes"
2. Add a soup:
   - Name: "Tomato Soup"
   - Category: Soup
   - Default Portion Size (ml): 250
   - Click "Create"
3. Add a hot dish:
   - Name: "Chicken Curry"
   - Category: Hot Dish (Meat)
   - Default Portion Size (g): 350
   - Click "Create"
4. Add a vegetarian option:
   - Name: "Vegetable Pasta"
   - Category: Hot Dish (Vegetarian)
   - Default Portion Size (g): 350
   - Click "Create"

### Create This Week's Menu

1. Click "Weekly Menus"
2. Click "Create Menu"
3. Select next Monday as the week start
4. Choose your dishes from the dropdowns
5. Set deadline to Wednesday 17:00
6. Click "Create Menu"
7. Click "Publish" on the menu you just created

### Set Pricing (via SQL)

1. Go to Supabase SQL Editor
2. First, get your location and dish IDs:
   ```sql
   SELECT id, name FROM locations;
   SELECT id, name FROM dishes;
   ```
3. Copy the IDs and run (replace with actual IDs):
   ```sql
   -- Pricing for Tomato Soup at Office Amsterdam
   INSERT INTO location_dish_pricing (location_id, dish_id, portion_size_ml, price_per_portion)
   VALUES ('location-id', 'soup-dish-id', 250, 3.50);

   -- Pricing for Chicken Curry
   INSERT INTO location_dish_pricing (location_id, dish_id, portion_size_g, price_per_portion)
   VALUES ('location-id', 'chicken-dish-id', 350, 7.50);

   -- Pricing for Vegetable Pasta
   INSERT INTO location_dish_pricing (location_id, dish_id, portion_size_g, price_per_portion)
   VALUES ('location-id', 'pasta-dish-id', 350, 6.50);
   ```

### Create a Manager Account (Optional)

1. In Supabase, create another user (same process as admin)
2. In SQL Editor:
   ```sql
   INSERT INTO user_profiles (id, email, role, location_id, full_name)
   VALUES (
     'manager-user-uuid',
     'manager@example.com',
     'manager',
     'office-amsterdam-location-id',
     'Manager Name'
   );
   ```

Now you can log in as the manager and place test orders!

## Testing the System

### As Manager:
1. Log in with manager account
2. Go to "Place Orders"
3. Select the published week
4. Enter portion quantities for each day
5. Click "Save Orders"

### As Kitchen Staff:
1. Log in as admin (or create kitchen staff account)
2. Go to "Daily Overview"
3. Select a date with orders
4. See all portions needed per location

### Generate Invoice:
1. As admin, go to "Monthly Invoicing"
2. Select current month
3. Click "Generate Report"
4. Click "Export to Excel"
5. Check your downloads folder

## Common Issues

**Can't log in**: Make sure you created the user_profiles entry with matching email

**No menus showing**: Make sure you clicked "Publish" on the menu

**Orders not saving**: Check that the deadline hasn't passed

**Pricing showing €0.00**: Make sure you added location_dish_pricing entries

## Ready to Deploy?

See the main [README.md](README.md#deployment-to-vercel) for deployment instructions!
