# Compass Delivery - System Architecture Documentation

**Last Updated**: February 8, 2026
**Version**: 2.0 (Location-Based Architecture)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [Route Architecture](#route-architecture)
4. [Authentication System](#authentication-system)
5. [Component Structure](#component-structure)
6. [Key Features](#key-features)
7. [File Structure Reference](#file-structure-reference)

---

## 1. System Overview

Compass Delivery is a multi-location food ordering and kitchen management system built with:

- **Frontend**: Next.js 16.1.3 (App Router)
- **Backend/Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS with Apple Design System patterns
- **Authentication**: Supabase Auth + Custom PIN-based auth (Symphony)

### Core Functionality

1. **Multi-location meal planning** - Weekly menu management for different office locations
2. **Kitchen production system** - Recipe management, allergens, dish cards, production schedules
3. **Admin tools** - Location management, menu planning, dish creation
4. **Banqueting orders** - Special event catering orders (Symphony location)
5. **Billing & invoicing** - Cost tracking and invoice generation per location

---

## 2. Database Architecture

### Core Tables

#### `locations`
Primary table defining all service locations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Location name (e.g., "Symphony", "SnapChat 119") |
| `created_at` | TIMESTAMP | Creation timestamp |

**Current Locations** (as of Feb 2026):
- Symphony
- SnapChat 119
- SnapChat 165
- Atlassian
- Snowflake
- JAA Training
- Dark Kitchen *(⚠️ Note: Routes use `/kitchen` but DB has "Dark Kitchen")*

---

#### `user_profiles`
User accounts with role-based access control.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (links to Supabase auth.users) |
| `full_name` | TEXT | User's full name |
| `role` | TEXT | Role: `admin`, `kitchen`, `location_manager` |
| `location_id` | UUID | FK to `locations` (nullable for admins) |
| `created_at` | TIMESTAMP | Account creation date |

**Relationships**:
- `location_id` → `locations.id`

---

#### `banqueting_orders`
Special event catering orders (currently Symphony only).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `location_id` | UUID | FK to `locations` |
| `company_name` | TEXT | Ordering company name |
| `contact_name` | TEXT | Contact person |
| `contact_email` | TEXT | Contact email |
| `contact_phone` | TEXT | Contact phone (nullable) |
| `delivery_date` | DATE | Event date |
| `delivery_time` | TIME | Event time |
| `floor_number` | TEXT | Floor for delivery (nullable) |
| `status` | TEXT | `pending`, `confirmed`, `completed`, `cancelled` |
| `notes` | TEXT | Special instructions (nullable) |
| `total_amount` | DECIMAL | Order total in euros |
| `created_at` | TIMESTAMP | Order placement timestamp |

**Relationships**:
- `location_id` → `locations.id`

---

#### `banqueting_items`
Catalog of items available for banqueting orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Item name |
| `description` | TEXT | Item description (nullable) |
| `category` | TEXT | `breakfast`, `lunch_dinner`, `coffee_tea_snacks`, `borrel` |
| `price` | DECIMAL | Price per unit in euros |
| `is_active` | BOOLEAN | Whether item is currently available |
| `created_at` | TIMESTAMP | Creation timestamp |

**Current Categories** (12 items total):
- **breakfast**: Danish Pastry Selection, Fresh Fruit Platter, Scrambled Eggs & Croissant
- **lunch_dinner**: Executive Board Lunch, Hot Lunch Buffet, Sandwich Platter
- **coffee_tea_snacks**: Afternoon Tea Package, Coffee & Tea Trolley, Snack Box
- **borrel**: Classic Borrel Package, Cocktail Bar Service, Premium Borrel Package

---

#### `banqueting_order_items`
Line items for banqueting orders (many-to-many relationship).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `order_id` | UUID | FK to `banqueting_orders` |
| `item_id` | UUID | FK to `banqueting_items` |
| `quantity` | INTEGER | Number of units ordered |
| `unit_price` | DECIMAL | Price at time of order |
| `created_at` | TIMESTAMP | Creation timestamp |

**Relationships**:
- `order_id` → `banqueting_orders.id`
- `item_id` → `banqueting_items.id`

---

#### `symphony_companies`
Company authentication for Symphony banqueting (PIN-based).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `company_name` | TEXT | Company name (used as username) |
| `contact_name` | TEXT | Primary contact person |
| `contact_email` | TEXT | Primary contact email |
| `contact_phone` | TEXT | Contact phone (nullable) |
| `floor_number` | TEXT | Office floor (nullable) |
| `pin_code` | TEXT | 4-digit PIN for authentication |
| `is_active` | BOOLEAN | Whether company can place orders |
| `created_at` | TIMESTAMP | Account creation date |

**Authentication Flow**:
1. User visits `/symphony` public page
2. Clicks "Order Banqueting"
3. Enters company name + PIN
4. System validates against `symphony_companies` table
5. Stores company data in `sessionStorage` (client-side)
6. Redirects to `/symphony/banqueting-orders`

**Current Test Account**:
- Company: TCS
- PIN: 1234
- Floor: 5

---

### Other Key Tables

*(Not fully documented here - these support menu planning and kitchen operations)*

- `dishes` - Main dish definitions
- `dish_components` - Ingredients/components of dishes
- `menus` - Weekly menu assignments
- `orders` - Daily customer orders
- `invoices` - Billing records
- `recipes` - Kitchen recipes and instructions

---

## 3. Route Architecture

### Understanding Next.js App Router

**File Path** (on disk):
```
/app/symphony/banqueting/orders/page.tsx
```

**Browser URL** (what users visit):
```
https://yoursite.com/symphony/banqueting/orders
```

The `/app` directory is Next.js's routing folder and **does not appear in URLs**.

---

### Current Route Structure

#### **NEW ARCHITECTURE** (Location-Based Routes)

These represent the current active system using location-specific URLs.

**Public Location Pages**:
```
/symphony              → Symphony Offices public page (weekly menu + login)
/symphony/banqueting-orders  → Banqueting order placement (authenticated)
/symphony/banqueting/orders  → Backend order management
/symphony/banqueting/catalog → Banqueting catalog management
```

**Dynamic Location Routes** (Template Pattern):
```
/[location]/dashboard       → Redirects to week-overview
/[location]/week-overview   → Weekly menu overview
/[location]/settings        → Location settings
/[location]/orders          → Order management
/[location]/soup-salad-bar  → Soup & salad bar management
/[location]/catering        → Catering orders
/[location]/cost-billing    → Cost tracking & billing
/[location]/banqueting      → Banqueting management
```

Where `[location]` can be:
- `symphony`
- `snapchat-119`
- `snapchat-165`
- `atlassian`
- `snowflake`
- `jaa`

**SnapChat Special Routes**:
```
/snapchat/dashboard        → Redirects to /snapchat-119/week-overview
/snapchat/week-overview    → Redirects to /snapchat-119/week-overview
/snapchat/settings         → Uses location-management component
/snapchat/soup-salad-bar   → Uses location-management component
/snapchat/orders           → Uses location-management component
/snapchat/banqueting       → Uses location-management component
```

---

#### **OLD ARCHITECTURE** (Still Active - Component Library)

These routes are **NOT deprecated** - they serve different purposes:

**Kitchen Management** (`/kitchen/*`):
```
/kitchen/dashboard         → Entry point for kitchen staff
/kitchen/week-overview     → Weekly production overview
/kitchen/daily-overview    → Daily production schedule
/kitchen/dishes            → Dish management
/kitchen/dish-cards        → Printable dish cards
/kitchen/allergens         → Allergen management
/kitchen/menus             → Menu assignment
/kitchen/recipes           → Recipe database
/kitchen/production        → Production tracking
/kitchen/catering          → Catering orders
```

**Status**: ✅ **ACTIVE** - Full kitchen management system for kitchen staff

**Admin Tools** (`/admin/*`):
```
/admin/locations           → Location CRUD operations (admin only)
/admin/menu-planner/       → Shared components for menu planning
/admin/dish-cards          → Dish card viewing utility
/admin/fix-orders          → Data repair utility
```

**Status**: ✅ **ACTIVE** - Admin utilities and shared components
**Note**: `/admin/menu-planner/components/DishCommandPalette.tsx` is imported by `/kitchen/menus/page.tsx`

**Location Management** (`/location-management/*`):
```
/location-management/              → Dashboard (legacy interface)
/location-management/settings/     → Settings component (imported by new routes)
/location-management/soup-salad-bar/ → Soup/salad component (imported by new routes)
/location-management/cost-billing/ → Billing component (imported by new routes)
/location-management/catering/     → Catering component (imported by new routes)
/location-management/banqueting/   → Banqueting component (imported by new routes)
```

**Status**: ✅ **ACTIVE AS COMPONENT LIBRARY**
**Purpose**: These are NOT old routes - they're **shared components** imported by the new location-specific routes

**Example**:
```typescript
// File: /app/[location]/settings/page.tsx
import SettingsPageContent from '@/app/location-management/settings/SettingsPageContent';

export default function SettingsPage() {
  return <SettingsPageContent />;
}
```

---

#### **Shared/Global Routes**

```
/                          → Root (redirects to /home)
/home                      → Main dashboard with location navigation
/login                     → Generic login
/login/kitchen             → Kitchen staff login
/login/management          → Regional management login
/login/location-management → Location manager login
/login/[location]          → Location-specific login
/orders                    → Order management
/orders/new                → New order creation
/invoicing                 → Invoice management
/management                → Regional management dashboard
/access                    → Access control
/settings                  → Global settings
/demo                      → Demo functionality
```

---

### Location Configuration

Defined in `/lib/locationConfig.ts`:

```typescript
const LOCATIONS = {
  'symphony': {
    name: 'Symphony Offices',
    logo: '/locations/symphony-offices.png',
  },
  'atlassian': {
    name: 'Atlassian',
    logo: '/locations/atlassian-logo.png',
  },
  'snowflake': {
    name: 'Snowflake',
    logo: '/locations/snowflake-logo.png',
  },
  'snapchat-119': {
    name: 'SnapChat',
    subtitle: 'Building 119',
    logo: '/locations/snapchat-logo.jpg',
  },
  'snapchat-165': {
    name: 'SnapChat',
    subtitle: 'Building 165',
    logo: '/locations/snapchat-logo.jpg',
  },
  'jaa': {
    name: 'JAA Training',
    logo: '/locations/jaa-logo.png',
  },
};
```

**Note**: `kitchen` location is NOT in this config - it uses separate routing system.

---

## 4. Authentication System

### Three Authentication Patterns

#### 1. Supabase Auth (Standard)
Used by: Admin, Kitchen Staff, Location Managers

**Flow**:
```
User → /login → Enter email/password → Supabase Auth
     → Verify role in user_profiles table
     → Redirect based on role:
        - admin → /home
        - kitchen → /kitchen/dashboard
        - location_manager → /[location]/dashboard
```

**Files**:
- `/app/login/page.tsx` - Main login
- `/app/login/kitchen/page.tsx` - Kitchen-specific login
- `/app/login/location-management/page.tsx` - Location manager login

---

#### 2. PIN-Based Auth (Symphony Companies)
Used by: Symphony office managers ordering banqueting

**Flow**:
```
User → /symphony → Click "Order Banqueting" → Login Modal
     → Enter company name + PIN
     → Validate against symphony_companies table
     → Store company data in sessionStorage
     → Redirect to /symphony/banqueting-orders
```

**Storage**: Client-side `sessionStorage` only (no Supabase auth session)

**Files**:
- `/app/symphony/page.tsx` - Public page with login modal
- Table: `symphony_companies` - PIN validation

---

#### 3. No Auth (Public Pages)
Used by: Public menu viewing

**Pages**:
- `/symphony` - Weekly menu display (unauthenticated users can view)

---

### Role-Based Access Control

| Role | Access | Routes |
|------|--------|--------|
| `admin` | Full system access | All routes |
| `kitchen` | Kitchen operations | `/kitchen/*`, `/admin/menu-planner/*` |
| `location_manager` | Location-specific management | `/[location]/*` for their assigned location |
| Symphony Company | Banqueting orders only | `/symphony/banqueting-orders` |
| Public | View-only | `/symphony` (menu viewing) |

---

## 5. Component Structure

### Key Shared Components

#### `UniversalHeader`
Location: `/components/UniversalHeader.tsx`

**Props**:
```typescript
{
  title: string;              // Page title
  backPath: string;           // Back button URL
  locationLogo?: string;      // Location logo image path
  locationName?: string;      // Location name display
  locationSubtitle?: string;  // Optional subtitle (e.g., "Building 119")
  actions?: ReactNode;        // Right-side action buttons
}
```

**Usage**: Consistent header across all location-specific pages.

---

#### `AdminQuickNav`
Location: `/components/AdminQuickNav.tsx`

**Purpose**: Quick navigation between locations for admin users.

**Features**:
- Appears at top of page for admin role only
- Links to:
  - Kitchen Dashboard (`/kitchen/dashboard`) - Shows as "DK" (Dark Kitchen)
  - All location dashboards
- Uses `locationConfig.ts` for location list

---

#### Shared Page Components (Location Management)

These live in `/app/location-management/*` but are **imported by new routes**:

- `SettingsPageContent.tsx` - Location settings management
- `SoupSaladBarPageContent.tsx` - Soup & salad bar configuration
- `CostBillingPageContent.tsx` - Cost tracking and billing
- `CateringPageContent.tsx` - Catering order management
- `BanquetingPageContent.tsx` - Banqueting management interface

**Pattern**:
```typescript
// New route imports shared component
import SettingsPageContent from '@/app/location-management/settings/SettingsPageContent';

export default function SettingsPage() {
  return <SettingsPageContent />;
}
```

---

### Design System

Based on Apple's design language. Key patterns:

**Colors**:
```css
--gray-1: #1D1D1F    /* Primary text */
--gray-2: #6E6E73    /* Secondary text */
--gray-3: #86868B    /* Tertiary text */
--gray-4: #D2D2D7    /* Light borders */
--gray-5: #E8E8ED    /* Ultra light borders */
--gray-6: #F5F5F7    /* Subtle backgrounds */
--gray-7: #FAFAFA    /* Section backgrounds */

--blue: #0071E3      /* Primary accent */
--green: #34C759     /* Success */
--red: #FF3B30       /* Error/danger */
--orange: #FF9500    /* Warning */
```

**Typography Scale**:
```
Display:     32px / 600 weight / -0.5px spacing
Title Large: 28px / 600 weight
Title:       22px / 600 weight
Headline:    17px / 600 weight
Body:        17px / 400 weight
Subheadline: 15px / 400 weight
Footnote:    13px / 400 weight
Caption:     12px / 400 weight
```

**Spacing**: Consistent multiples of 4px (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80)

---

## 6. Key Features

### Symphony Banqueting System

**Public Menu Viewing** (`/symphony`):
- Displays current week's menu
- Shows weekly sandwich, daily soup, and hot dishes
- Pulled from database based on Symphony location_id
- No authentication required

**Banqueting Orders** (`/symphony/banqueting-orders`):
- Company login required (PIN-based)
- Browse catalog of banqueting items (12 items across 4 categories)
- Place orders with delivery date/time, floor number, notes
- Order stored with company info from `symphony_companies` table

**Backend Management** (`/symphony/banqueting/orders`):
- View all banqueting orders for Symphony location
- Filter by status (pending, confirmed, completed, cancelled)
- Order details: company, contact, event date/time, total amount
- Accessible by admin/location managers

**Backend Catalog** (`/symphony/banqueting/catalog`):
- Manage banqueting items (add, edit, activate/deactivate)
- Set pricing and categories
- *Status: Coming soon*

---

### Kitchen Production System

**Core Features**:
- Weekly production overview
- Daily production schedules
- Dish management (CRUD)
- Recipe database with allergen tracking
- Printable dish cards for kitchen staff
- Menu assignment to locations and weeks

**Key Pages**:
- `/kitchen/week-overview` - High-level weekly view
- `/kitchen/daily-overview` - Detailed daily production
- `/kitchen/dishes` - Dish database
- `/kitchen/recipes` - Recipe management
- `/kitchen/allergens` - Allergen tracking
- `/kitchen/production` - Production tracking

---

### Multi-Location Menu Management

**Dynamic Routes**:
Each location has identical structure:
```
/[location]/week-overview   → View weekly menu
/[location]/settings        → Configure location
/[location]/orders          → Manage daily orders
/[location]/soup-salad-bar  → Configure soup/salad options
/[location]/cost-billing    → View costs and generate invoices
```

**Template Pattern**:
- Single implementation serves all locations
- Location determined by URL parameter
- Components fetch data based on location_id

---

### Billing & Invoicing

**Features**:
- Cost tracking per location
- Invoice generation
- Central kitchen cost allocation
- Staff cost tracking
- PDF invoice export

**Note**: Invoice text contains "Staff Dark kitchen" - references central kitchen costs, not location name.

---

## 7. File Structure Reference

### Critical Files

**Configuration**:
- `/lib/locationConfig.ts` - Location metadata and routing config
- `/lib/supabase/client.ts` - Supabase client initialization
- `/lib/types.ts` - TypeScript type definitions
- `/.env.local` - Environment variables (Supabase keys)

**Database Scripts**:
- `/scripts/create-banqueting-tables.sql` - Banqueting schema
- `/scripts/check-banqueting-order.mjs` - Order verification utility
- `/scripts/check-db-clean.mjs` - Database health check

**Key Pages**:
- `/app/symphony/page.tsx` - Symphony public page
- `/app/symphony/banqueting-orders/page.tsx` - Banqueting order form
- `/app/symphony/banqueting/orders/page.tsx` - Backend order management
- `/app/kitchen/dashboard/page.tsx` - Kitchen entry point
- `/app/home/page.tsx` - Main dashboard

**Shared Components**:
- `/components/UniversalHeader.tsx` - Standard page header
- `/components/AdminQuickNav.tsx` - Admin navigation
- `/app/admin/menu-planner/components/DishCommandPalette.tsx` - Dish selector
- `/app/location-management/*/` - Shared page components

---

## Database vs Routes Naming Issue

⚠️ **Known Inconsistency**:

**Database**: Location named `"Dark Kitchen"`
**Routes**: URLs use `/kitchen/*`

**Impact**: Low - most code references "kitchen" slug. Only affects:
- AdminQuickNav display text ("Dark Kitchen" → should be "Kitchen")
- Database queries filtering by location name
- Invoice descriptions

**Recommendation**: Rename database location from "Dark Kitchen" to "Kitchen" for consistency.

---

## Architecture Principles

### Separation of Concerns

1. **Routes** (`/app/*`) - Page-level routing and layout
2. **Components** (`/components/*`) - Reusable UI elements
3. **Lib** (`/lib/*`) - Utilities, config, types, database clients
4. **Scripts** (`/scripts/*`) - Database maintenance and utilities

### Data Flow

```
User Action
  ↓
Page Component (Client-side)
  ↓
Supabase Client (`createClient()`)
  ↓
Database Query
  ↓
Data returned to component
  ↓
State update (useState/useEffect)
  ↓
UI re-render
```

### Authentication Flow

```
User visits protected route
  ↓
Check Supabase auth session OR sessionStorage
  ↓
If not authenticated:
  Redirect to appropriate login page
If authenticated:
  Fetch user profile from database
  Verify role/location access
  Render page content
```

---

## API Structure

All database operations use Supabase client-side SDK. No custom API routes.

**Standard Pattern**:
```typescript
const supabase = createClient();

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', 'value')
  .single();
```

**Authentication Check**:
```typescript
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  router.push('/login');
  return;
}
```

---

## Future Considerations

### Empty Location Shells

**Currently Exist But Not Implemented**:
- `/atlassian/*` - Folder exists, no pages
- `/snowflake/*` - Folder exists, no pages
- `/jaa/*` - Folder exists, no pages

**Options**:
1. Remove from `locationConfig.ts` until ready
2. Implement full location pages
3. Leave as placeholders (current state)

### Banqueting Expansion

Currently Symphony-only. To expand to other locations:

1. Create location-specific company tables (e.g., `atlassian_companies`)
2. OR add `location_id` to `symphony_companies` and rename to `banqueting_companies`
3. Update authentication to check location parameter
4. Create location-specific public pages (e.g., `/atlassian/page.tsx`)

### Menu Planner Modernization

Currently uses `/admin/menu-planner/` components imported by `/kitchen/menus/`.

**Potential refactor**:
- Move to `/components/menu-planner/` for clarity
- Create shared component library structure
- Update import paths

---

## Troubleshooting Guide

### "No orders showing in backend"

**Checklist**:
1. Verify order exists: Run `node scripts/check-banqueting-order.mjs`
2. Check location_id matches: Order and location must have same UUID
3. Verify query: Page must query by correct location name (e.g., "Symphony")
4. Check authentication: User must be logged in and have access

### "Location not found"

**Causes**:
1. Location not in `locationConfig.ts`
2. Database location name doesn't match config (e.g., "Dark Kitchen" vs "Kitchen")
3. Page querying wrong location name

### "Authentication redirect loop"

**Causes**:
1. User profile missing or incomplete
2. Role not set correctly in database
3. Location_id not set for location managers
4. Session expired but not cleared

**Fix**: Check `user_profiles` table for complete data

---

## Version History

**v2.0** (Current - February 2026):
- Location-based routing architecture
- Symphony banqueting system
- PIN-based authentication for companies
- Shared component library structure

**v1.0** (Legacy):
- Fixed route structure (`/admin`, `/kitchen`, `/location-management`)
- Single location setup
- All management through fixed URLs

---

## Contact & Support

For questions about this architecture:
1. Review this documentation first
2. Check database with: `node scripts/check-db-clean.mjs`
3. Verify routes match file structure
4. Confirm authentication flow for user role

---

**End of Architecture Documentation**
