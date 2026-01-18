# Compass Kitchen Orders

A cloud-based ordering system for production kitchens serving multiple office locations. Built for Compass Group to manage daily meal orders, track portions, and generate monthly invoices.

## Features

### For Location Managers
- Place weekly orders for soup, salad bar, and hot dishes (meat/vegetarian)
- Order multiple weeks in advance
- Automatic order deadline enforcement (typically Wednesday before delivery week)
- View and edit orders before deadline

### For Kitchen Staff
- Daily production overview showing all portions per location
- Quick summary of total portions needed
- Ingredient planning interface
- Real-time order tracking

### For Administrators
- Manage delivery locations and contacts
- Configure dishes with portion sizes
- Create weekly menus with deadlines
- Set location-specific pricing and portion sizes
- Publish/unpublish menus

### For Invoicing
- Monthly export to Excel
- Automatic calculation based on portions and pricing
- Separate sheets for each location
- Summary sheet with totals

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (recommended) or any Node.js hosting

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)
- Git

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for your database to be provisioned
3. Go to the SQL Editor in your Supabase dashboard
4. Copy the contents of `supabase-schema.sql` and run it in the SQL Editor
5. Go to Settings > API to find your project URL and anon key

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create First Admin User

Since this is a new installation, you'll need to create your first user manually in Supabase:

1. Go to your Supabase dashboard > Authentication > Users
2. Click "Add User" and create an account with email/password
3. Note the User ID (UUID) from the users table
4. Go to SQL Editor and run:
   ```sql
   INSERT INTO user_profiles (id, email, role, full_name)
   VALUES ('paste-user-id-here', 'your-email@example.com', 'admin', 'Your Name');
   ```

Now you can log in with this account!

## Initial Setup Workflow

After deploying, follow these steps to set up your system:

### 1. Add Locations
1. Log in as admin
2. Go to "Manage Locations"
3. Add all your delivery locations with contact info

### 2. Configure Dishes
1. Go to "Manage Dishes"
2. Add your standard dishes:
   - Soups (category: Soup)
   - Hot dishes with meat (category: Hot Dish Meat)
   - Hot dishes vegetarian (category: Hot Dish Vegetarian)
3. Set default portion sizes (ml for soups, g for solids)

### 3. Set Location Pricing
Currently, pricing needs to be added via SQL. Go to your Supabase SQL Editor:

```sql
-- Example: Set pricing for a specific location and dish
INSERT INTO location_dish_pricing (location_id, dish_id, portion_size_ml, portion_size_g, price_per_portion)
VALUES (
  'location-uuid-here',
  'dish-uuid-here',
  150,  -- 150ml soup portion for this location
  NULL,
  2.50  -- €2.50 per portion
);
```

You can find the UUIDs by querying:
```sql
SELECT id, name FROM locations;
SELECT id, name, category FROM dishes;
```

### 4. Create Weekly Menus
1. Go to "Weekly Menus"
2. Click "Create Menu"
3. Select the Monday of the week you want to plan
4. Choose dishes for that week
5. Set the order deadline (typically Wednesday at 5 PM before the week)
6. Click "Publish" to make it visible to managers

### 5. Add Manager Users
For each location manager:

1. Create user in Supabase Authentication
2. Add their profile:
   ```sql
   INSERT INTO user_profiles (id, email, role, location_id, full_name)
   VALUES (
     'user-id-from-auth',
     'manager@example.com',
     'manager',
     'location-id-here',
     'Manager Name'
   );
   ```

### 6. Add Kitchen Staff Users
Similar to managers, but with role 'kitchen' and no location_id:

```sql
INSERT INTO user_profiles (id, email, role, full_name)
VALUES (
  'user-id-from-auth',
  'kitchen@example.com',
  'kitchen',
  'Kitchen Staff Name'
);
```

## Deployment to Vercel

### Option 1: Deploy with Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts and add your environment variables when asked.

### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click "Deploy"

## Alternative Deployment Options

### Railway.app
1. Create account at [railway.app](https://railway.app)
2. New Project > Deploy from GitHub
3. Add environment variables
4. Deploy

### Render.com
1. Create account at [render.com](https://render.com)
2. New > Web Service
3. Connect GitHub repository
4. Build Command: `npm run build`
5. Start Command: `npm start`
6. Add environment variables
7. Deploy

## User Roles

- **admin**: Full access to all features, can manage locations, dishes, menus, and pricing
- **kitchen**: Can view all orders, access daily overview, and export invoices
- **manager**: Can only place and edit orders for their assigned location

## Weekly Workflow

### Monday-Tuesday
- Managers place orders for upcoming weeks
- Deadline typically Wednesday at 5 PM

### Wednesday
- Order deadline passes
- Kitchen reviews all orders for the week
- Export ingredient requirements

### Thursday
- Order ingredients based on requirements

### Monday-Friday (next week)
- Kitchen produces and delivers daily orders
- Daily overview shows what each location needs

### End of Month
- Go to "Monthly Invoicing"
- Select month
- Generate report
- Export to Excel
- Send to each location for billing

## Customization

### Changing Portion Sizes Per Location

Some locations might need different portion sizes (e.g., Location X needs 150ml soup, Location Y needs 200ml):

```sql
UPDATE location_dish_pricing
SET portion_size_ml = 200
WHERE location_id = 'location-y-id' AND dish_id = 'soup-id';
```

### Adding Salad Bar Pricing

The salad bar currently has a hardcoded default price. To make it configurable, you can create a generic "Salad Bar" dish and set pricing per location.

### Customizing Order Deadlines

Each menu can have its own deadline. You can set it when creating the menu. The system automatically enforces deadlines and prevents ordering after they pass.

## Troubleshooting

### Can't log in
- Check that your email/password are correct in Supabase Auth
- Verify user_profiles entry exists for your user ID
- Check browser console for errors

### Orders not saving
- Check that the order deadline hasn't passed
- Verify your user has a location_id assigned
- Check browser console for permission errors

### Pricing not showing in invoices
- Verify location_dish_pricing entries exist
- Check that dish IDs match between menus and pricing
- Default salad bar price is €5.00 if not configured

### Can't see published menus
- Verify menu is marked as published (is_published = true)
- Check that week_start_date is in the future or current
- Verify you're logged in

## Support

For issues or questions:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Verify your database schema matches `supabase-schema.sql`

## Security Notes

- Row Level Security (RLS) is enabled on all tables
- Managers can only see/edit their own location's data
- Kitchen staff and admins have broader access
- All authentication is handled by Supabase
- Passwords are never stored in your application

## Future Enhancements

Possible features to add:
- Email notifications when orders are placed
- Automatic ingredient calculation with recipes
- Mobile app for managers
- Barcode scanning for inventory
- Historical analytics and reports
- Automated invoice email sending
- Multi-language support
- Custom branding per location
