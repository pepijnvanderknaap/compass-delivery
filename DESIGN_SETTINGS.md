# Menu Planner Design Settings - REFERENCE DOCUMENT

**CRITICAL**: This document captures the correct design settings for the Menu Planner page. Use this as reference when making any changes to prevent breaking the design again.

## ✅ Correct Version
**Commit**: `ff0c0d6` - "Deploy Apple-inspired UI redesign"
**File**: `app/admin/menus/page.tsx`

## Key Design Elements

### 1. Week Header Structure
```tsx
{/* Floating header text above the box */}
<div className="px-5 py-2">
  <div className="flex items-center gap-3">
    <h3 className="text-apple-headline font-medium italic text-slate-700">
      {format(weekStart, 'd MMM')} - {format(addDays(weekStart, 4), 'd MMM yyyy')}
    </h3>
    <span className="text-apple-footnote font-medium italic tracking-wider text-slate-500">
      (Week {getWeek(weekStart, { weekStartsOn: 1 })})
    </span>
  </div>
</div>
```
**Important**: Week numbers are floating above WITHOUT background, displayed as "(Week X)"

### 2. Detached Header Table
```tsx
{/* Container for header and data table with tiny gap */}
<div className="space-y-2">
  {/* Header box - separate and detached */}
  <div className={`border border-slate-300 rounded-lg overflow-hidden ${isCurrent ? "bg-[#4A7DB5]" : "bg-slate-200"}`}>
```
**Critical Settings**:
- `space-y-2` creates the visual separation (detachment)
- Current week: `bg-[#4A7DB5]` (blue background)
- Other weeks: `bg-slate-200` (gray background)
- Border: `border-slate-300`

### 3. Days Display Format (HORIZONTAL)
```tsx
<th key={day} className="py-4">
  <div className={`flex items-baseline justify-center gap-1 ${isCurrent ? 'text-white' : 'text-slate-700'}`}>
    <span className="text-apple-footnote font-medium uppercase tracking-wide">
      {day.substring(0, 3).toUpperCase()}
    </span>
    <span className={`text-apple-caption font-light ${isCurrent ? 'text-white/70' : 'text-slate-400'}`}>
      {format(addDays(weekStart, dayIndex), 'd MMM')}
    </span>
  </div>
</th>
```
**Critical**: Days and dates are on the SAME LINE using `flex items-baseline gap-1`
- Format: "MON 26 Jan" (not stacked)
- Day name: `text-apple-footnote font-medium uppercase`
- Date: `text-apple-caption font-light`
- Current week: white text
- Other weeks: slate-700/slate-400

### 4. Header Row Styling
```tsx
<tr>
  <th className={`px-5 py-4 text-left text-apple-footnote font-semibold uppercase tracking-wide ${isCurrent ? 'text-white' : 'text-slate-500'}`}>
    Meal
  </th>
  <th></th>
  {/* Days columns */}
</tr>
```
**Important**: "MEAL TYPE" column uses same background as the header table

### 5. Data Table (Separate from Header)
```tsx
{/* Data table box - separate with tiny gap */}
<div className="overflow-hidden bg-slate-100 pb-4 border border-slate-300 rounded-xl">
  <table className="w-full bg-slate-100 border-separate" style={{borderSpacing: '0 0'}}>
```
**Critical**: Data table is a SEPARATE div from the header table
- Background: `bg-slate-100`
- Border: `border-slate-300`
- Rounded corners: `rounded-xl`

### 6. Overall Layout
```tsx
{/* 4-week calendar grid - refined and constrained */}
<div className="space-y-8 px-8 lg:px-12 -ml-[15px] -mr-[15px]">
```
**Important**: Margins and padding create the constrained layout

### 7. Top Navigation
```tsx
<UniversalHeader
  title="Menu Planner"
  backPath="/dark-kitchen"
/>
```
**Critical**: UniversalHeader component provides logo and top navigation

## Color Palette Reference
```
Current Week Header: #4A7DB5 (blue)
Other Week Headers: bg-slate-200 (gray)
Borders: border-slate-300
Text (current week): text-white / text-white/70
Text (other weeks): text-slate-700 / text-slate-400 / text-slate-500
Data Table Background: bg-slate-100
```

## Typography Classes Used
```
text-apple-headline: Week date range (17px, medium, italic)
text-apple-footnote: Week number, "Meal" label, day names (13px)
text-apple-caption: Dates next to day names (12px)
text-apple-subheadline: "+ Add" text (15px)
text-apple-body: Dish names (17px)
```

## What NOT to Change
1. ❌ Do NOT change `space-y-2` - this creates the detached effect
2. ❌ Do NOT stack days vertically - keep `flex items-baseline`
3. ❌ Do NOT merge the header and data tables - they must be separate divs
4. ❌ Do NOT remove UniversalHeader - it provides logo and navigation
5. ❌ Do NOT change background colors without documenting
6. ❌ Do NOT use gradients - solid colors only

## Functionality
- Command palette for adding dishes (NO sidebar with drag-and-drop)
- Click cells to open dish selection modal
- Keyboard navigation supported
- Auto-save on dish selection
- Warning icons (⚠⚠) for recently used dishes

## Last Verified Working
- Date: 2026-01-27
- Commit: ff0c0d6
- Restored in commit: 3430065

---

**REMEMBER**: When in doubt, reference commit `ff0c0d6` for the correct design implementation.
