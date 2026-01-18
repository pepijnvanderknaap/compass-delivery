# Component Reference Guide

## Quick Navigation

### For Admins
1. **Locations** → `/admin/locations` - Add/edit location sites
2. **Dishes** → `/admin/dishes` - Manage menu dishes
3. **Menus** → `/admin/menus` - Create weekly menus
4. **Invoicing** → `/invoicing` - Generate invoices and reports

### For Kitchen Staff
1. **Daily Overview** → `/kitchen/daily-overview` - See daily portions

### For Managers
1. **New Order** → `/orders/new` - Place weekly orders
2. **View Orders** → `/orders` - See existing orders (to be implemented)

## Component Features

### Login Page
```typescript
// Features:
- Email/password authentication
- Loading states
- Error messages
- Demo credentials display
- Auto-redirect on success

// Demo Accounts:
admin@compass.com
kitchen@compass.com
manager@compass.com
Password: password123
```

### Dashboard
```typescript
// Features:
- Role-based card display
- User info header
- Sign out button
- Navigation to all features

// Cards vary by role:
- Admin: 4 cards (locations, dishes, menus, invoicing)
- Kitchen: 1 card (daily overview)
- Manager: 2 cards (new order, view orders)
```

### New Order (Manager)
```typescript
// Features:
- Week selector
- 5-day calendar (Mon-Fri)
- Dish dropdown per day
- Portions input per day
- Validation before submit
- Prevents duplicate orders

// Workflow:
1. Select week starting date
2. Choose dish for each day
3. Enter portions needed
4. Submit creates order + order items
5. Redirects to dashboard on success
```

### Daily Overview (Kitchen)
```typescript
// Features:
- Date selector
- Previous/Next day buttons
- Grouped by dish
- Shows total portions per dish
- Location breakdown
- No orders message

// Display:
- Each dish gets its own card
- Shows all locations ordering that dish
- Running total of portions
- Clean, readable table format
```

### Locations Management (Admin)
```typescript
// Features:
- Add new locations
- Edit existing locations
- Delete locations
- Toggle active/inactive
- Contact information
- Address management

// Fields:
- Name (required)
- Address
- Contact person
- Contact email
- Contact phone
- Active status
```

### Dishes Management (Admin)
```typescript
// Features:
- Add new dishes
- Edit existing dishes
- Delete dishes
- Toggle active/inactive
- Category organization
- Pricing

// Fields:
- Name (required)
- Description
- Category
- Base price
- Active status
```

### Weekly Menus (Admin)
```typescript
// Features:
- Create menus for any week
- Edit existing menus
- Add/remove menu items
- Assign dishes to days
- View recent menus

// Workflow:
1. Select week start date
2. Add menu items
3. For each item:
   - Select day (Mon-Fri)
   - Select dish
4. Save updates database
5. Shows in recent menus sidebar
```

### Invoicing (Admin)
```typescript
// Features:
- Week selector
- View all orders for week
- Grouped by location
- Price calculations
- Excel export
- Grand total

// Export includes:
- Location name
- Week starting date
- Delivery date
- Dish name
- Portions
- Price per portion
- Total price

// Calculations:
- Per item: portions × base_price
- Per order: sum of all items
- Grand total: sum of all orders
```

## Common Patterns

### Page Structure
```typescript
export default function PageName() {
  // 1. State hooks
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  
  // 2. Router and Supabase
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // 3. Auth check (on mount)
  useEffect(() => {
    // Check authentication
    // Verify role
    // Fetch initial data
  }, []);
  
  // 4. Data fetching (on change)
  useEffect(() => {
    // Fetch data when dependencies change
  }, [dependency]);
  
  // 5. Event handlers
  const handleSubmit = async (e) => { /* ... */ };
  
  // 6. Loading state
  if (loading) return <LoadingSpinner />;
  
  // 7. Main render
  return (
    <div>
      <nav>...</nav>
      <main>...</main>
    </div>
  );
}
```

### Data Fetching Pattern
```typescript
const fetchData = async () => {
  const { data, error } = await supabase
    .from('table_name')
    .select('*, related_table(field)')
    .eq('field', value)
    .order('field');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  setData(data || []);
};
```

### Form Submit Pattern
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  setMessage(null);
  
  try {
    // Validation
    if (!isValid) throw new Error('Invalid data');
    
    // Database operation
    const { error } = await supabase
      .from('table')
      .insert(formData);
      
    if (error) throw error;
    
    // Success
    setMessage({ type: 'success', text: 'Success!' });
    resetForm();
    
  } catch (err: any) {
    setMessage({ type: 'error', text: err.message });
  } finally {
    setSubmitting(false);
  }
};
```

### Navigation Pattern
```typescript
// Back to dashboard
<button onClick={() => router.push('/dashboard')}>
  Back to Dashboard
</button>

// Navigate with Link
import Link from 'next/link';
<Link href="/path">Go to Page</Link>

// Programmatic navigation
router.push('/path');
router.refresh(); // Refresh data
```

## Styling Classes

### Common Button Styles
```css
/* Primary Button */
className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"

/* Secondary Button */
className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"

/* Danger Button */
className="text-red-600 hover:text-red-900"

/* Disabled */
disabled:opacity-50 disabled:cursor-not-allowed
```

### Common Container Styles
```css
/* Page Container */
className="min-h-screen bg-gray-50"

/* Card */
className="bg-white rounded-xl shadow-md p-6"

/* Navigation */
className="bg-white shadow-sm border-b"

/* Table */
className="min-w-full divide-y divide-gray-200"
```

### Status Badges
```css
/* Active */
className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800"

/* Inactive */
className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800"
```

## Database Relations

```
locations
  ↓ (one-to-many)
user_profiles (managers)
  ↓ (one-to-many)
orders
  ↓ (one-to-many)
order_items
  ↓ (many-to-one)
dishes

weekly_menus
  ↓ (one-to-many)
menu_items
  ↓ (many-to-one)
dishes
```

## API Patterns

### Select with Relations
```typescript
// Get orders with location and items
const { data } = await supabase
  .from('orders')
  .select(`
    *,
    locations(name),
    order_items(*, dishes(name, base_price))
  `)
  .eq('week_start_date', weekStart);
```

### Insert with Return
```typescript
const { data, error } = await supabase
  .from('orders')
  .insert({ field: value })
  .select()
  .single();
```

### Update
```typescript
const { error } = await supabase
  .from('table')
  .update({ field: value })
  .eq('id', id);
```

### Delete
```typescript
const { error } = await supabase
  .from('table')
  .delete()
  .eq('id', id);
```

## Error Handling

```typescript
try {
  // Operation
} catch (err: any) {
  console.error('Context:', err);
  setMessage({ 
    type: 'error', 
    text: err.message || 'Generic error message'
  });
}
```

## Date Handling (date-fns)

```typescript
import { format, startOfWeek, addDays } from 'date-fns';

// Format for display
format(date, 'MMM d, yyyy')    // Jan 18, 2026
format(date, 'EEEE, MMM d')    // Saturday, Jan 18
format(date, 'EEE')            // Sat

// Format for database
format(date, 'yyyy-MM-dd')     // 2026-01-18

// Week calculations
const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
const nextDay = addDays(date, 1);
```

## TypeScript Types

All types are defined in `/lib/types.ts`:
- Location
- UserProfile
- Dish
- WeeklyMenu
- MenuItem
- Order
- OrderItem

Import as needed:
```typescript
import type { Location, Dish, Order } from '@/lib/types';
```
