# Production Sheet Design System

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
- **Alignment**: `text-center`

### Subcategories (Right-aligned in Category Column)
- **Background**: `bg-white`
- **Text**: `text-blue-600`
- **Font**: `text-[11px] font-semibold uppercase tracking-wide`
- **Alignment**: `text-right`
- **No right border** (removed `border-r` for seamless flow)

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
- **Same alternating pattern as data columns**
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
  <col style={{width: '12%'}} />  {/* Category */}
  <col style={{width: '28%'}} />  {/* Item */}
  {locations.map(location => (
    <col key={location.id} style={{width: `${60 / (locations.length + 1)}%`}} />
  ))}
  <col style={{width: `${60 / (locations.length + 1)}%`}} />  {/* Total */}
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
<td rowSpan={soupRows.length} className={`px-3 py-2.5 text-sm font-bold text-slate-700 uppercase tracking-wide text-center border-r ${borderClass} bg-slate-100 align-top`}>
  Soup
</td>
```

### Subcategory Row (e.g., "Toppings", "Carbs")
```tsx
<td rowSpan={filtered.length} className={`px-3 py-2 text-[11px] font-semibold text-blue-600 uppercase tracking-wide text-right ${borderClass} bg-white align-top`}>
  Toppings
</td>
```

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
<td className={`px-3 py-2.5 text-sm text-center font-bold text-red-700 ${borderClass} ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
  {total}
</td>
```

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
        <td rowSpan={soupRows.length} className={`px-3 py-2.5 text-sm font-bold text-slate-700 uppercase tracking-wide text-center border-r ${borderClass} bg-slate-100 align-top`}>
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
      <td className={`px-3 py-2.5 text-sm text-center font-bold text-gray-900 ${borderClass} ${isEven ? 'bg-slate-200' : 'bg-white'}`}>
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
The tabs and action buttons are placed in a single flex row with bottom alignment:

```tsx
<div className="mb-6 flex items-end justify-between border-b border-gray-200">
  <div className="flex gap-2">
    {/* Tab buttons */}
  </div>
  <div className="flex gap-3 pb-3">
    {/* Action buttons */}
  </div>
</div>
```

### Tab Styling
```tsx
<button
  onClick={() => setActiveTab('main')}
  className={`px-6 py-3 text-sm font-semibold transition-all ${
    activeTab === 'main'
      ? 'text-[#4A7DB5] border-b-2 border-[#4A7DB5]'
      : 'text-gray-500 hover:text-gray-700'
  }`}
>
  Main Production
</button>
```

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
- Tabs use `py-3` padding
- Action buttons use `py-2` with `pb-3` on container to align bottom edges with tab text
- `items-end` on flex container ensures bottom alignment
- `justify-between` pushes tabs left and buttons right

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
