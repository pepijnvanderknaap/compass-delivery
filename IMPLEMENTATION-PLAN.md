# Compass Kitchen Orders - Implementation Plan

## Overview
Three-portal system for managing kitchen orders across multiple locations:
- **A: Kitchen/Head Chef Portal** - Menu management, production sheets, reviews
- **B: Location Manager Portal** - View menus, place orders, provide feedback
- **C: Regional Manager Portal** - Invoicing, analytics (Phase 4)

---

## Phase 1: Location Settings & Portion Conversion

### Database Changes
- [x] Add `soup_portion_ml` and `salad_bar_portion_grams` to locations table
- [x] Create allergens table with common allergens pre-populated
- [x] Create dish_allergens junction table
- [x] Add `photo_url` and `description` to dishes table

### Features to Build

#### 1.1 Location Settings Page (Managers)
**Route:** `/settings`
**Access:** Manager role only

**Features:**
- View/edit location-specific portion sizes:
  - Soup portion size (ml) - default 250ml
  - Salad bar portion size (grams) - default 150g
- Hot dishes remain in fixed portions (no conversion)
- Save settings to locations table

**UI Components:**
- Number inputs for portion sizes
- Show current values
- Save button
- Success/error messages

---

## Phase 2: Kitchen Portal - Menu & Allergen Management

### 2.1 Allergen Management (Admin/Kitchen)
**Route:** `/admin/allergens`

**Features:**
- View all allergens (pre-populated: Gluten, Dairy, Eggs, Fish, etc.)
- Add custom allergens
- Edit allergen display (icon, color)
- Assign allergens to dishes

### 2.2 Enhanced Dish Management
**Route:** `/admin/dishes` (enhance existing)

**New Fields:**
- Photo upload (Supabase Storage)
- Description text
- Allergen checkboxes (multi-select)
- Preview card showing dish with allergens

### 2.3 Weekly Menu Planner
**Route:** `/kitchen/menu-planner`

**Features:**
- Calendar view showing weeks
- Drag-and-drop or select dishes for each day
- Monday-Friday for each dish category
- Preview what managers will see
- Publish menu for ordering

**Database:**
- `weekly_menus` table (one per week)
- `menu_dishes` table (links menu → dish → day_of_week)

---

## Phase 3: Enhanced Manager Experience

### 3.1 Menu Viewing
**Routes:**
- `/menu/weekly` - Full week overview
- `/menu/daily` - Single day view

**Features:**
- Display published weekly menu
- Show dish photos
- Display allergen badges with icons
- Filter by category
- Switch between week/daily view

### 3.2 Enhanced Ordering
**Route:** `/orders/new` (enhance existing)

**Changes:**
- Show which dishes are available each day (from weekly_menus)
- Display photos and allergens in ordering interface
- Managers can only order what's on the menu (unless bespoke)

### 3.3 Review System
**Route:** `/orders/[id]/review`

**Features:**
- After delivery week, managers can review
- Rate each dish 1-5 stars
- Written feedback per dish
- Submit reviews for kitchen to see

---

## Phase 4: Production Sheets (Kitchen)

### 4.1 Daily Production Overview
**Route:** `/kitchen/production/[date]`

**Key Feature: Automatic Conversion**

**Display Format:**
```
Daily Production Sheet - Monday, Feb 10, 2026

SOUP
─────────────────────────────────────
Location          Portions    Liters
SnapChat 119      45          11.25 L  (45 × 250ml)
SnapChat 165      32          8.0 L    (32 × 250ml)
Symphonys         28          7.0 L    (28 × 250ml)
─────────────────────────────────────
TOTAL             105         26.25 L

SALAD BAR
─────────────────────────────────────
Location          Portions    Kilograms
SnapChat 119      45          6.75 kg  (45 × 150g)
SnapChat 165      32          4.8 kg   (32 × 150g)
Symphonys         28          4.2 kg   (28 × 150g)
─────────────────────────────────────
TOTAL             105         15.75 kg

HOT DISH - MEAT/FISH
─────────────────────────────────────
Location          Portions
SnapChat 119      38
SnapChat 165      25
Symphonys         22
─────────────────────────────────────
TOTAL             85

HOT DISH - VEGETARIAN
─────────────────────────────────────
Location          Portions
SnapChat 119      12
SnapChat 165      8
Symphonys         6
─────────────────────────────────────
TOTAL             26

BESPOKE ITEMS
─────────────────────────────────────
Bitter ballen [portions]
  SnapChat 119:    7 portions

Fruit platter [kilograms]
  Symphonys:       2.5 kg
```

**Features:**
- Date selector (defaults to today)
- Aggregates all orders for selected date
- Converts soups: portions → liters (using location's soup_portion_ml)
- Converts salad bar: portions → kg (using location's salad_bar_portion_grams)
- Shows hot dishes as portions (no conversion)
- Shows bespoke items with their units
- Print-friendly layout
- Export to PDF

**Calculation Logic:**
```typescript
// Soup conversion
const soupLiters = (portions * location.soup_portion_ml) / 1000;

// Salad bar conversion
const saladKg = (portions * location.salad_bar_portion_grams) / 1000;

// Hot dishes - no conversion
const hotDishPortions = portions;
```

### 4.2 Weekly Production Overview
**Route:** `/kitchen/production/week/[date]`

**Features:**
- Shows Monday-Friday production needs
- Same conversion logic as daily
- Overview for week planning
- Ingredient estimation

---

## Phase 5: Review Dashboard (Kitchen)

### 5.1 Review Collection
**Route:** `/kitchen/reviews`

**Features:**
- View all reviews from all locations
- Filter by:
  - Location
  - Dish
  - Rating (1-5 stars)
  - Date range
- Average rating per dish
- Trend analysis
- Respond to feedback

---

## Phase 6: Regional Manager Portal (Future)

### 6.1 Invoicing
**Route:** `/invoicing` (enhance existing)

**Features:**
- Add pricing to dishes
- Calculate order totals by location
- Generate PDF invoices
- Track payment status
- Export to accounting software

### 6.2 Analytics Dashboard
**Route:** `/analytics`

**Features:**
- Order volume trends
- Popular dishes by location
- Review score trends
- Cost analysis
- Overall operation health score

---

## Implementation Priority

### Must Have (Build Now):
1. ✅ Location portion settings page
2. ✅ Allergen management
3. ✅ Photo upload for dishes
4. ✅ Daily production sheets with conversions
5. ✅ Menu viewing for managers

### Should Have (Next):
6. Weekly menu planner
7. Review system
8. Weekly production overview

### Nice to Have (Later):
9. Invoicing module
10. Analytics dashboard

---

## Technical Notes

### Conversion Formulas
- **Soup:** `portions × soup_portion_ml ÷ 1000 = liters`
- **Salad Bar:** `portions × salad_bar_portion_grams ÷ 1000 = kg`
- **Hot Dishes:** No conversion (portions remain portions)

### Default Portion Sizes
- Soup: 250ml per portion
- Salad Bar: 150g per portion
- Hot Dishes: 1 portion = 1 plate (no conversion)

### Storage
- Dish photos: Supabase Storage bucket `dish-photos`
- Max file size: 5MB
- Formats: JPG, PNG, WebP

---

## Next Steps

1. Run `schema-updates.sql` in Supabase Dashboard
2. Build location settings page
3. Add photo upload to dish management
4. Build daily production sheet with conversions
5. Test with real data from multiple locations
