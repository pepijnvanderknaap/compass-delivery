# Production Sheet Design System

**Version**: 1.0 LOCKED
**Last Updated**: January 28, 2026
**Status**: FINALIZED - Do not modify without explicit approval

This document captures the finalized design patterns from the production sheets to be applied across all data tables in the application.

## Color Palette

### Table Headers
- **Background**: `bg-[#4A7DB5]` (blue)
- **Text**: `text-white`
- **Font**: `text-xs font-bold uppercase tracking-wider`

### Category Column (First Column)
- **Background**: `bg-slate-100`
- **Text**: `text-slate-700`
- **Font**: `text-sm font-bold uppercase tracking-wide`
- **Alignment**: `text-left` (left-aligned)
- **Borders**: `border-r border-gray-300` (only right vertical border, NO horizontal borders)
- **Width**: `10%` (narrower than item column)

### Subcategories (Left-aligned in Category Column)
- **Background**: `bg-white`
- **Text**: `text-blue-600`
- **Font**: `text-[11px] font-semibold uppercase tracking-wide`
- **Alignment**: `text-left` (left-aligned, NOT right-aligned)
- **Borders**: `border-r border-gray-300` (only right vertical border, plus bottom border when at section end)

### Item Column (Second Column)
- **Main Dishes**: `font-bold text-gray-900`
- **Component Dishes**: `font-medium text-gray-900`
- **Alternating Backgrounds**:
  - Even rows: `bg-gray-200`
  - Odd rows: `bg-white`

### Data Columns (Third Column Onwards)
- **Text**: `text-gray-700 font-medium`
- **Alignment**: `text-center`
- **Alternating Backgrounds**:
  - Even rows: `bg-slate-200` (light blue)
  - Odd rows: `bg-white`

### Total Column (Last Column)
- **Header**: `bg-amber-900/30 text-amber-50`
- **Values**: `font-bold text-red-700`
- **Background**: `bg-white` (consistent white, NO alternating rows)
- **Red text color distinguishes totals while maintaining readability**

## Typography Scale

### Headers
```
Table Header: text-xs font-bold uppercase tracking-wider
Category Labels: text-sm font-bold uppercase tracking-wide
Subcategory Labels: text-[11px] font-semibold uppercase tracking-wide
```

### Body Text
```
Main Dishes: text-sm font-bold
Component Dishes: text-sm font-medium
Data Values: text-sm font-medium
Total Values: text-sm font-bold
```

## Borders

### Standard Borders
- **All cells**: `border-r border-b border-gray-300`
- **Cell border thickness**: 1px (default)

### Section Separators
- **Thick separator** (between major sections like Soup → Hot Dishes):
  - Thickness: `border-b-[2px]`
  - Color: `border-b-gray-400`

### No Borders
- **Subcategory cells**: Remove `border-r` to create seamless flow into item column
- **Last column** (Total): Remove `border-r`

## Table Structure

### Standard Table Setup
```tsx
<table className="w-full text-sm table-fixed border-separate" style={{borderSpacing: '0 0'}}>
```

### Column Groups (for 3 locations + total)
```tsx
<colgroup>
  <col style={{width: '10%'}} />  {/* Category */}
  <col style={{width: '22%'}} />  {/* Item - Main Production */}
  {locations.map(location => (
    <col key={location.id} style={{width: `${68 / (locations.length + 1)}%`}} />
  ))}
  <col style={{width: `${68 / (locations.length + 1)}%`}} />  {/* Total */}
</colgroup>
```

### Header Row
```tsx
<thead className="bg-[#4A7DB5]">
  <tr>
    <th className="px-3 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
      Category
    </th>
    <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
      Item
    </th>
    {/* Location headers - text-center */}
    <th className="px-3 py-4 text-center text-xs font-bold text-amber-50 uppercase tracking-wider bg-amber-900/30">
      Total
    </th>
  </tr>
</thead>
```

**Important**: No spacer row between header and body! Data rows start immediately after header.

## Row Patterns

### Main Category Row (e.g., "Soup", "Hot Dishes")
```tsx
<td rowSpan={soupRows.length} className={`px-3 py-2.5 text-sm font-bold text-slate-700 uppercase tracking-wide text-left border-r border-gray-300 bg-slate-100 align-top`}>
  Soup
</td>
```
**Important**: No `borderClass` on category cells - only `border-r border-gray-300` (no horizontal borders inside the category column)

### Subcategory Row (e.g., "Toppings", "Carbs")
```tsx
<td rowSpan={filtered.length} className={`px-3 py-2 text-[11px] font-semibold text-blue-600 uppercase tracking-wide text-left border-r border-gray-300 ${categoryBorder} bg-white align-top`}>
  Toppings
</td>
```
**Important**: Left-aligned with `text-left`, and `categoryBorder` adds thick bottom border at section end

### Item Cell (Main Dishes - Bold)
```tsx
<td className={`px-5 py-2.5 text-sm font-bold text-gray-900 border-r ${borderClass} ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
  {row.dish.name}
</td>
```

### Item Cell (Components - Medium)
```tsx
<td className={`px-8 py-2 text-sm border-r ${borderClass} font-medium text-gray-900 ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
  {row.dish.name}
</td>
```

### Data Cell
```tsx
<td className={`px-3 py-2.5 text-sm text-center text-gray-700 font-medium border-r ${borderClass} ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
  {value || '-'}
</td>
```

### Total Cell
```tsx
<td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 ${borderClass} bg-white`}>
  {total}
</td>
```
**Important**: Total column always has `bg-white` - NO alternating background pattern

## Alternating Row Logic

```tsx
let rowCounter = 0;

// For each main dish row
rowCounter++;
const isEven = rowCounter % 2 === 0;

// Apply backgrounds based on isEven:
// - Item column: isEven ? 'bg-gray-200' : 'bg-white'
// - Data columns: isEven ? 'bg-slate-200' : 'bg-white'
```

**Critical**: Counter increments continuously across main dishes AND component dishes to maintain pattern.

## Section Separators

### Thick Border Logic
```tsx
// For last row of a section (if no components follow)
const borderClass = isLastSoup && hasNoComponents
  ? 'border-b-[2px] border-b-gray-400'
  : 'border-b border-gray-300';

// For last component row in a section
const borderClass = isLastRow && addThickBorder
  ? 'border-b-[2px] border-b-gray-400'
  : 'border-b border-gray-300';
```

## Spacing & Padding

### Cell Padding
```
Category cells: px-3 py-2.5
Item cells (main): px-5 py-2.5
Item cells (components): px-8 py-2  (extra left padding for indent)
Data cells: px-3 py-2.5
Header cells: px-3 py-4 (or px-5 py-4 for Item header)
```

### Indentation Pattern
- **Main dishes**: `px-5` (standard padding)
- **Components**: `px-8` (extra left padding creates visual indent)

## Table Container

### Wrapper
```tsx
<div className="border border-slate-700 rounded-lg overflow-hidden shadow-sm">
  <div className="overflow-x-auto">
    <table>...</table>
  </div>
</div>
```

## Complete Example: Category + Rowspan Pattern

```tsx
{/* SOUP SECTION */}
{soupRows.map((row, idx) => {
  rowCounter++;
  const isEven = rowCounter % 2 === 0;
  const isLastSoup = idx === soupRows.length - 1;
  const hasNoComponents = soupComponents.length === 0;
  const borderClass = isLastSoup && hasNoComponents
    ? 'border-b-[2px] border-b-gray-400'
    : 'border-b border-gray-300';

  return (
    <tr key={idx} className={borderClass}>
      {/* Category cell with rowspan - only on first row */}
      {idx === 0 && (
        <td rowSpan={soupRows.length} className={`px-3 py-2.5 text-sm font-bold text-slate-700 uppercase tracking-wide text-left border-r border-gray-300 bg-slate-100 align-top`}>
          Soup
        </td>
      )}

      {/* Item cell */}
      <td className={`px-5 py-2.5 text-sm font-bold text-gray-900 border-r ${borderClass} ${isEven ? 'bg-gray-200' : 'bg-white'}`}>
        {row.dish.name}
      </td>

      {/* Data cells */}
      {locations.map(location => (
        <td key={location.id} className={`px-3 py-2.5 text-sm text-center text-gray-700 font-medium border-r ${borderClass} ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
          {calculateValue(location.id)}
        </td>
      ))}

      {/* Total cell */}
      <td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 ${borderClass} bg-white`}>
        {calculateTotal()}
      </td>
    </tr>
  );
})}

{/* SUBCATEGORY SECTION (e.g., Toppings) */}
{renderComponentSection(soupComponents, 'topping', 'Toppings', rowCounter, true)}
```

## Visual Hierarchy Summary

1. **Category labels** (Soup, Hot Dishes): Bold, centered, gray background
2. **Subcategory labels** (Toppings, Carbs): Smaller, blue, right-aligned, white background
3. **Main dishes**: Bold, dark gray text
4. **Component dishes**: Medium weight, indented with extra left padding
5. **Data values**: Medium weight, centered
6. **Totals**: Bold, centered
7. **Alternating rows**: Subtle light blue/white pattern for easy scanning
8. **Section separators**: Slightly thicker gray border

## Key Design Principles

✅ **No spacer rows** - Header flows directly into data
✅ **Consistent alternating pattern** - Counter increments continuously
✅ **Visual grouping** - Rowspan for categories, indentation for subcategories
✅ **Clean borders** - Removed unnecessary borders where sections flow together
✅ **Readable hierarchy** - Font weights and sizes create clear information layers
✅ **Excel-like grid** - Complete border framework for easy data parsing
✅ **Subtle colors** - Light blues and grays don't distract from data

## Tabs and Action Buttons Layout

### Structure
The tabs and action buttons are placed in a single flex row. Tabs float cleanly above the content with color-coded active states:

```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex gap-6">
    {/* Tab buttons */}
  </div>
  <div className="flex gap-3">
    {/* Action buttons */}
  </div>
</div>
```

### Tab Styling (Floating Design)
```tsx
<button
  onClick={() => setActiveTab('main')}
  className={`text-sm font-semibold transition-all ${
    activeTab === 'main'
      ? 'text-[#4A7DB5]'
      : 'text-gray-400 hover:text-gray-600'
  }`}
>
  Main Production
</button>
```

**Tab Colors**:
- Main Production: `text-[#4A7DB5]` (blue)
- Main MEP: `text-[#D97706]` (orange)
- Salad Bar: `text-[#0F766E]` (teal)
- Inactive: `text-gray-400 hover:text-gray-600`

### Action Button Styling
```tsx
{/* Primary action button */}
<button
  className="px-5 py-2 text-sm bg-slate-200 text-[#1D1D1F] hover:bg-slate-300 transition-colors rounded-lg font-semibold"
>
  Change Date
</button>

{/* Secondary action button */}
<button
  className="px-5 py-2 text-sm bg-white border border-slate-300 text-[#1D1D1F] hover:bg-slate-50 transition-colors rounded-lg font-semibold"
>
  Print
</button>
```

**Key Points**:
- Tabs are text-only with color changes (no borders or backgrounds)
- `gap-6` between tab buttons for clear separation
- Action buttons use `py-2` with standard padding
- `items-center` on flex container for vertical alignment
- `justify-between` pushes tabs left and buttons right
- Top spacing: `mt-24` from header to date heading (96px)

---

## Application to Other Sheets

When applying this design to other data tables:

1. Start with the table container wrapper
2. Set up column groups with appropriate widths
3. Create header row (no spacer after!)
4. Implement alternating row counter
5. Use category column with rowspan where appropriate
6. Apply item column styling (bold for main items, medium for sub-items)
7. Use data cell pattern for numeric/value columns
8. Add thick borders between major sections
9. Test responsive behavior with overflow-x-auto

This design system ensures consistency across all production and data sheets in the application.

---

## Locked Design Decisions (Final)

These settings are finalized and should not be changed without careful consideration:

### Layout
- **Page top margin**: `mt-24` (96px between header and content)
- **Tab spacing**: `gap-6` between floating tab labels
- **Content margin**: `mb-4` between tabs and table
- **MEP tab layout**: Heading and tabs wrapped in `max-w-3xl mx-auto` container to align with centered table
- **Action buttons**: Visible on ALL tabs (Main Production, Main MEP, Salad Bar)

### Column Structure
- **Category column**: 10% width, left-aligned labels, only right vertical border (NO horizontal borders inside)
- **Item column**: 22% width (Main Production) - reduced to give more space to data columns
- **Data columns**: Remaining 68% split between location columns and total
- **Total column**: White background (no alternating), red text (`text-red-700`)

### Category/Subcategory Styling
- **Main categories** (Soup, Hot Dishes): Left-aligned, gray background, no horizontal borders
- **Subcategories** (Toppings, Carbs): Left-aligned, blue text, thick bottom border at section end only

### Tab Design
- **Style**: Floating text labels (no borders, no background shapes)
- **Active colors**: Blue (#4A7DB5), Orange (#D97706), Teal (#0F766E)
- **Inactive**: Light gray (#9CA3AF) with hover state

### Border Pattern
- **Standard borders**: `border-gray-300` (1px)
- **Section separators**: `border-b-[2px] border-b-gray-400` (2px thick)
- **Category column**: Only right vertical border, extends through all rows in section

### Color Coding
- **Headers**: Blue (`bg-[#4A7DB5]`)
- **Category cells**: Slate gray (`bg-slate-100`)
- **Subcategory text**: Blue (`text-blue-600`)
- **Total values**: Red (`text-red-700`)
- **Alternating rows**: Gray-200 / White (Item column), Slate-200 / White (Data columns)

---

## Implementation Lock (Critical)

### Page Structure
```tsx
<main className="max-w-7xl mx-auto px-8 lg:px-12 py-8">
  <div className={activeTab === 'mep' ? 'max-w-3xl mx-auto' : ''}>
    {/* Date Heading */}
    <div className="mt-24 mb-6">
      <h2 className="text-2xl font-extralight text-gray-800 tracking-wide">
        Production for {format(selectedDate!, 'EEEE, MMMM d, yyyy')}
      </h2>
    </div>

    {/* Tabs and Actions */}
    <div className="flex items-center justify-between mb-4">
      <div className="flex gap-6">
        {/* Tab buttons */}
      </div>
      <div className="flex gap-3">
        {/* Action buttons - visible on ALL tabs */}
        <button className="px-5 py-2 text-sm bg-slate-200 text-[#1D1D1F] hover:bg-slate-300 transition-colors rounded-lg font-semibold">
          Change Date
        </button>
        <button className="px-5 py-2 text-sm bg-white border border-slate-300 text-[#1D1D1F] hover:bg-slate-50 transition-colors rounded-lg font-semibold">
          Print
        </button>
      </div>
    </div>
  </div>

  {/* Table content for each tab */}
</main>
```

### Critical Rules
1. **Never remove the conditional wrapper** `className={activeTab === 'mep' ? 'max-w-3xl mx-auto' : ''}` - this ensures heading/tabs align with MEP table
2. **Action buttons must appear on all tabs** - do not conditionally hide them
3. **Category column borders**: ONLY `border-r border-gray-300` - NO horizontal borders inside category cells
4. **Total column background**: ALWAYS `bg-white` - never alternating
5. **Tab colors are fixed**: Blue (#4A7DB5), Orange (#D97706), Teal (#0F766E)
6. **Column widths Main Production**: 10% category, 22% item, 68% data columns (split evenly)
7. **Top margin**: `mt-24` (96px) - tested and finalized
8. **Subcategory alignment**: `text-left` (NOT right-aligned)

### Table Widths
- **Main Production & Salad Bar**: Full width with overflow-x-auto
- **Main MEP**: `max-w-3xl mx-auto` centered with action buttons

### DO NOT CHANGE
- Border patterns (1px standard, 2px for section separators)
- Alternating row logic and counter
- Color scheme for headers, categories, subcategories
- Font sizes and weights
- Padding and spacing values
- Tab label text and colors
- Column width ratios (10% category, 22% item, 68% data for Main Production)

---

## Print Layout System

All three production sheets are optimized to print on exactly ONE A4 page with appropriate orientation and maximized content size for readability.

### Print Settings by Tab

#### Main Production
- **Page Size**: A4 Landscape
- **Margins**: 8mm all sides
- **Font Size**: 8px body text, 7px headers
- **Padding**: Reduced to 2-3px
- **Target**: Fit wide table with multiple location columns

#### Main MEP
- **Page Size**: A4 Portrait
- **Margins**: 10mm all sides
- **Font Size**: 9px body text, 8px headers
- **Padding**: Reduced to 3-4px
- **Target**: Fit narrow table with better vertical readability

#### Salad Bar
- **Page Size**: A4 Landscape
- **Margins**: 8mm all sides
- **Font Size**: 8px body text, 7px headers
- **Padding**: Reduced to 2-3px
- **Checkbox Size**: 12px × 12px
- **Target**: Fit wide table with checkboxes and totals

### Print CSS Implementation

```css
@media print {
  /* Hide navigation and buttons */
  nav, button, .no-print {
    display: none !important;
  }

  /* Apply page orientation per tab */
  .print-main {
    page: main-production;
  }

  @page main-production {
    size: A4 landscape;
    margin: 8mm;
  }

  .print-mep {
    page: mep;
  }

  @page mep {
    size: A4 portrait;
    margin: 10mm;
  }

  .print-salad_bar {
    page: salad-bar;
  }

  @page salad-bar {
    size: A4 landscape;
    margin: 8mm;
  }

  /* Prevent page breaks */
  table, tr, td, th {
    page-break-inside: avoid !important;
  }

  /* Scale content to fit */
  main {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  h2 {
    font-size: 14px !important;
    margin-top: 0 !important;
    margin-bottom: 8px !important;
  }
}
```

### Critical Print Requirements
1. **Single page only** - Content MUST fit on one A4 page, never overflow to second page
2. **Orientation locked** - Main Production and Salad Bar use landscape, MEP uses portrait
3. **Maximum readability** - Font sizes optimized for each orientation to balance legibility and space
4. **No UI elements** - Navigation, buttons, and decorative elements hidden in print
5. **Page class required** - Main element must have `print-${activeTab}` class for orientation rules to apply

### Print Testing Checklist
- [ ] All three tabs print on exactly one page
- [ ] Correct orientation applied (landscape vs portrait)
- [ ] No content cut off or overflowing
- [ ] Font sizes are readable when printed
- [ ] Checkboxes visible and appropriately sized (Salad Bar)
- [ ] Totals row visible at bottom (Salad Bar)
- [ ] No navigation or buttons visible in print
- [ ] Page margins appropriate (8-10mm)

---
