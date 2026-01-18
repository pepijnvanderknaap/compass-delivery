# Setup Checklist

Use this checklist to track your setup progress.

## Initial Setup

- [ ] Create Supabase account at [supabase.com](https://supabase.com)
- [ ] Create new Supabase project
- [ ] Wait for database to provision (1-2 minutes)
- [ ] Go to SQL Editor in Supabase dashboard
- [ ] Copy entire contents of `supabase-schema.sql`
- [ ] Paste and run in SQL Editor
- [ ] Verify "Success" message

## Get API Credentials

- [ ] In Supabase, go to Settings > API
- [ ] Copy "Project URL" (save it)
- [ ] Copy "anon public" API key (save it)

## Configure Application

- [ ] Create `.env.local` file in project root
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL=` with your URL
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY=` with your key
- [ ] Save the file

## Install and Test Locally

- [ ] Run `npm install` in terminal
- [ ] Wait for installation to complete
- [ ] Run `npm run dev`
- [ ] Open browser to `http://localhost:3000`
- [ ] Verify login page appears

## Create Admin User

- [ ] In Supabase, go to Authentication > Users
- [ ] Click "Add user" > "Create new user"
- [ ] Enter your email and password
- [ ] Check "Auto Confirm User"
- [ ] Click "Create User"
- [ ] Click on the created user
- [ ] Copy the UUID at the top

- [ ] Go to SQL Editor
- [ ] Run this query (replace YOUR_UUID and YOUR_EMAIL):
  ```sql
  INSERT INTO user_profiles (id, email, role, full_name)
  VALUES ('YOUR_UUID', 'YOUR_EMAIL', 'admin', 'Your Name');
  ```

## First Login

- [ ] Go back to `http://localhost:3000`
- [ ] Enter your email and password
- [ ] Click "Sign in"
- [ ] Verify you see the dashboard

## Add Your Data

### Locations
- [ ] Click "Manage Locations"
- [ ] Add each office location
- [ ] Include contact name and email
- [ ] Note: You can add more locations anytime

### Dishes
- [ ] Click "Manage Dishes"
- [ ] Add soups (set portion size in ml)
- [ ] Add meat hot dishes (set portion size in g)
- [ ] Add vegetarian hot dishes (set portion size in g)
- [ ] Note: You can add more dishes anytime

### Pricing (Via SQL)
- [ ] In Supabase SQL Editor, get your IDs:
  ```sql
  SELECT id, name FROM locations;
  SELECT id, name, category FROM dishes;
  ```
- [ ] For each location + dish combo, run:
  ```sql
  INSERT INTO location_dish_pricing
    (location_id, dish_id, portion_size_ml, portion_size_g, price_per_portion)
  VALUES
    ('LOCATION_UUID', 'DISH_UUID', 250, NULL, 3.50);
    -- Use portion_size_ml for soups, portion_size_g for solid food
  ```
- [ ] Alternative: Run `sample-data.sql` for test data

### Create Weekly Menu
- [ ] Click "Weekly Menus"
- [ ] Click "Create Menu"
- [ ] Select next Monday as start date
- [ ] Choose soup, meat dish, and veg dish
- [ ] Set order deadline (typically Wednesday 5 PM)
- [ ] Click "Create Menu"
- [ ] Click "Publish" on the menu

## Add Manager Users (Optional)

For each location manager:

- [ ] Create user in Supabase Authentication
- [ ] Get their user UUID
- [ ] Run in SQL Editor:
  ```sql
  INSERT INTO user_profiles (id, email, role, location_id, full_name)
  VALUES (
    'MANAGER_UUID',
    'manager@example.com',
    'manager',
    'LOCATION_UUID',
    'Manager Name'
  );
  ```

## Test the System

- [ ] Log out and log in as manager (if created)
- [ ] Go to "Place Orders"
- [ ] Select published menu
- [ ] Enter some test portion numbers
- [ ] Click "Save Orders"
- [ ] Log back in as admin
- [ ] Go to "Daily Overview"
- [ ] Verify orders appear
- [ ] Go to "Monthly Invoicing"
- [ ] Generate report
- [ ] Export to Excel
- [ ] Open Excel file and verify data

## Deploy to Production

Choose one:

### Option A: Vercel (Recommended)
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Run `vercel` in project directory
- [ ] Follow prompts
- [ ] Add environment variables when asked
- [ ] Note the production URL

### Option B: GitHub + Vercel
- [ ] Push code to GitHub
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Import your GitHub repository
- [ ] Add environment variables
- [ ] Deploy

### Option C: Railway
- [ ] Create account at [railway.app](https://railway.app)
- [ ] New Project > Deploy from GitHub
- [ ] Add environment variables
- [ ] Deploy

## Post-Deployment

- [ ] Test production URL
- [ ] Verify login works
- [ ] Share URL with managers
- [ ] Train users on the system
- [ ] Set up weekly routine (see workflow in README)

## Ongoing Maintenance

Weekly:
- [ ] Create next week's menu
- [ ] Publish menu by Friday
- [ ] Check orders after Wednesday deadline
- [ ] Review daily overview each morning

Monthly:
- [ ] Export invoice data
- [ ] Send to each location
- [ ] Archive or backup data (Supabase auto-backs up)

## Troubleshooting

If something doesn't work:
- [ ] Check browser console for errors (F12)
- [ ] Verify `.env.local` has correct values
- [ ] Check Supabase logs in dashboard
- [ ] Verify user has correct role in user_profiles
- [ ] Try logging out and back in
- [ ] Check README.md troubleshooting section

## Done!

Once you've checked all the boxes above, your system is fully operational!

Remember:
- Managers can order until Wednesday deadline
- Kitchen staff check daily overview each morning
- Export invoices at month-end
- Add new locations/dishes anytime
- All data is automatically backed up by Supabase

Need help? Check:
1. README.md - Full documentation
2. QUICKSTART.md - Detailed setup steps
3. PROJECT_SUMMARY.md - Overview and features
