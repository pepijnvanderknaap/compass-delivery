# Menu Planner Design Settings - REFERENCE DOCUMENT

**CRITICAL**: This document captures the correct design settings for the Menu Planner page. Use this as reference when making any changes to prevent breaking the design again.

## ✅ Correct Version
**Original Commit**: `ff0c0d6` - "Deploy Apple-inspired UI redesign"
**Improved Commit**: `ed0a569` - "Unify menu planner table structure for better column alignment"
**File**: `app/admin/menus/page.tsx`

## 🎯 Architecture: Unified Table Structure

**CRITICAL**: The header and data sections are now part of ONE unified table, not separate tables. This ensures columns always align perfectly, even when the window is narrowed.

```tsx
<table>
  <thead>   {/* Header with blue/gray background */}
  <tbody>   {/* Data section with light gray background */}
</table>
```

This prevents column misalignment issues that occurred with separate tables.

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

### 2. Unified Table Structure (ONE table, visual separation)
```tsx
{/* Unified table with visual separation */}
<div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
  <table className="w-full border-separate" style={{borderSpacing: '0 0'}}>
    <thead className={`${isCurrent ? "bg-[#4A7DB5]" : "bg-slate-200"}`}>
      {/* Header row with days */}
      <tr>...</tr>
      {/* 8px spacer row for visual floating effect */}
      <tr className="bg-white" style={{height: '8px'}}>
        <td colSpan={days.length + 2}></td>
      </tr>
    </thead>
    <tbody className="bg-slate-100">
      {/* Data rows */}
    </tbody>
  </table>
</div>
```
**Critical Settings**:
- ONE unified table (not two separate tables)
- 8px spacer row creates visual separation between header and data
- Current week: `bg-[#4A7DB5]` (blue background on thead)
- Other weeks: `bg-slate-200` (gray background on thead)
- Data section: `bg-slate-100` (light gray on tbody)
- Border: `border-slate-300`
- Fixed column widths ensure alignment

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

### 5. Column Width Specification
```tsx
<colgroup>
  <col className="w-40" />   {/* Meal type column */}
  <col className="w-8" />    {/* Spacer column */}
  {days.map((day) => (
    <col key={day} className="w-48" />  {/* Day columns */}
  ))}
</colgroup>
```
**Critical**: Fixed column widths ensure header and data columns align perfectly
- Meal type: `w-40`
- Spacer: `w-8`
- Each day: `w-48`
- Same colgroup structure in unified table

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
1. ❌ Do NOT split into separate tables - keep unified table structure
2. ❌ Do NOT stack days vertically - keep `flex items-baseline`
3. ❌ Do NOT remove the 8px spacer row - creates visual separation
4. ❌ Do NOT remove UniversalHeader - it provides logo and navigation
5. ❌ Do NOT change background colors without documenting
6. ❌ Do NOT use gradients - solid colors only
7. ❌ Do NOT change column widths - they ensure alignment
8. ❌ Do NOT remove colgroup - critical for column alignment

## Functionality
- Command palette for adding dishes (NO sidebar with drag-and-drop)
- Click cells to open dish selection modal
- Keyboard navigation supported
- Auto-save on dish selection
- Warning icons (⚠⚠) for recently used dishes

## Version History
- **Original Design**: commit `ff0c0d6` (2026-01-27) - Apple-inspired visual design
- **Headers Restored**: commit `3430065` (2026-01-27) - Fixed invisible headers
- **Architecture Improved**: commit `ed0a569` (2026-01-27) - Unified table for perfect alignment

## Current Best Version
**Commit**: `ed0a569` - "Unify menu planner table structure for better column alignment"

This version has:
- ✅ Beautiful Apple-inspired design
- ✅ Visible blue/gray headers
- ✅ Horizontal day display
- ✅ Perfect column alignment (even on narrow windows)
- ✅ Unified table architecture

---

**REMEMBER**: Use commit `ed0a569` as the reference for the menu planner design and architecture.
