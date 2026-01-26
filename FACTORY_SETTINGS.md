# Factory Settings - Compass Delivery Design System

## Overview
This document contains the **factory settings** (default configuration) for the Compass Delivery design system. These settings serve as:
1. The starting point for all CSS customization
2. A blueprint/template for future similar projects
3. A reference for maintaining design consistency

## Core Principles

### ACSS (Advanced CSS) System
- **ACSS** = Comment-based documentation logging design decisions, locked styles, and relationships
- **LOCKED in ACSS**: Structure, sizing, spacing, borders, radius (NOT editable via CSS)
- **EDITABLE via CSS**: Colors (background, border, text), limited typography (size/weight)

### Design Philosophy
- Site manager can adjust CSS without needing developer assistance
- ACSS maintains structural integrity while allowing visual customization
- All elements classified as: Global, Local, Standalone, or ACSS-locked

## Department Structure

### Three Departments
1. **DK** - Kitchen Management (Dark Kitchen)
2. **LM** - Location Management
3. **RM** - Regional Management

### Color System
- Each department has a **supporting main color** defined in homepage icon
- Supporting color propagates to all section headers (via ACSS LINK)
- DK supporting main color: `#4A7DB5`

## Global Button Styles (Factory Defaults)

### 1. Global "add" Button
**Visual Style**: White button with off-black text and border

**LOCKED (not editable via CSS)**:
- Size: `px-6 py-2.5`
- Weight: `font-medium`
- Border width: `2px`
- Radius: `rounded-lg`

**EDITABLE via CSS**:
- Background color: `white`
- Border color: `slate-300`
- Text color: `slate-900` (off-black)

**Usage**: Any button with "add" in the text (case-insensitive keyword matching)

**Example**: `+ Add New`, `Add Component`, `Add Dish`

**Code Location**: `/app/admin/dishes/page.tsx` line 264-276

---

### 2. Global "edit" Button
**Visual Style**: Small white button with off-black text and border

**LOCKED (not editable via CSS)**:
- Button style: Border with rounded corners
- Size: `px-3 py-1.5 text-xs`
- Text size/weight: Scales with button size

**EDITABLE via CSS**:
- Background color: `white`
- Border color: `slate-300`
- Text color: `slate-900` (off-black)

**Usage**: Any button with "edit" in the text (case-insensitive keyword matching)

**Code Location**: `/app/admin/dishes/page.tsx` line 324-334

---

### 3. Global "delete" Button
**Visual Style**: Small white button with **red text** and off-black border

**LOCKED (not editable via CSS)**:
- Button style: Border with rounded corners
- Size: `px-3 py-1.5 text-xs`
- Text size/weight: Scales with button size

**EDITABLE via CSS**:
- Background color: `white`
- Border color: `slate-300`
- Text color: `red-600` ⚠️ **RED TEXT** (distinguishes delete actions)

**Usage**: Any button with "delete" in the text (case-insensitive keyword matching)

**Code Location**: `/app/admin/dishes/page.tsx` line 335-344

**Important Note**: Remove inline `style={getButtonStyle('Delete')}` to preserve red text color

---

## Global Typography Styles (Factory Defaults)

### Global "section heading"
**Visual Style**: Large semibold text in dark gray

**LOCKED**:
- Margin: `mb-6`
- Alignment context: `items-end` (in parent flex for button alignment)

**EDITABLE via CSS**:
- Text color: `slate-700`
- Text size: `text-apple-title` (22px)
- Text weight: `font-semibold` (600)

**Usage**: Main section headings like "Main Dishes", "Component Library"

**Code Location**: `/app/admin/dishes/page.tsx` lines 257-263, 333-339

---

### Global "info text"
**Visual Style**: Medium gray descriptive text

**LOCKED**:
- Margin: `mb-8`

**EDITABLE via CSS**:
- Text color: `slate-600`
- Text size: `text-apple-subheadline` (15px)
- Text weight: Inherits from text-apple-subheadline default (400)

**Usage**: Descriptive info text like "Showing dishes and components currently in use"

**Code Location**: `/app/admin/dishes/page.tsx` lines 244-252

---

### Global "empty state text"
**Visual Style**: Light gray centered text for empty lists

**LOCKED**:
- Padding: `py-4`
- Alignment: `text-center`

**EDITABLE via CSS**:
- Text color: `slate-400`
- Text size: `text-apple-subheadline` (15px)

**Usage**: Empty state messages like "No dishes in use", "No components in use"

**Code Location**: `/app/admin/dishes/page.tsx` lines 310-316

---

## Global Input Styles (Factory Defaults)

### Global "search input"
**Visual Style**: White input with light border and blue focus state

**LOCKED**:
- Width: `w-full`
- Padding: `px-3 py-2`
- Border width: `border`
- Radius: `rounded-lg`
- Margin: `mb-3`
- Focus ring width: `ring-2`

**EDITABLE via CSS**:
- Background color: `white`
- Border color: `slate-300`
- Text color: Inherits
- Text size: `text-apple-subheadline` (15px)
- Focus border color: `apple-blue` (#0071E3)
- Focus ring color: `apple-blue/20`

**Usage**: Search boxes within lists

**Code Location**: `/app/admin/dishes/page.tsx` lines 298-308

---

## ACSS Components (Reusable Patterns)

### "List Pattern" - Header + Content Box
**Visual Structure**: Two-box layout (colored header + light content area)

**LOCKED (ACSS)**:
- Structure: 2 boxes (header + content)
- Spacing: `space-y-3` (gap between boxes)
- Padding: `px-4 py-3` (header), `p-3` (content)
- Borders: `border-slate-300`
- Radius: `rounded-lg`

**ACSS LINK**:
- Header background color: **Linked to department supporting main color**
- For DK: `#4A7DB5` (set in homepage department icon)
- When homepage icon color changes, ALL list headers in that section update automatically

**EDITABLE via CSS**:
- Header text size/weight (color LOCKED to white)
- List item text color/size/weight

**Usage**: Main Dishes categories, Component Library categories

**Code Location**: `/app/admin/dishes/page.tsx` lines 284-295

---

## Button Classification System

### Keyword Matching Logic
Buttons are classified by **action type** using keyword matching:
- If button text contains "add" → Global "add" button style
- If button text contains "edit" → Global "edit" button style
- If button text contains "delete" → Global "delete" button style

**Implementation**: `/hooks/useDesignSystem.ts` lines 87-109

**How it works**:
1. Case-insensitive contains check (not exact match)
2. Checks `usage` array in button config
3. Returns matching background + text color
4. Falls back to secondary button style if no match

**Example**:
- "Add New" → matches "add" → white bg, off-black text
- "Edit Dish" → matches "edit" → white bg, off-black text
- "Delete Item" → matches "delete" → white bg, **red text**

---

## Color Palette Reference

### Off-Black (Primary Text)
- **Tailwind**: `slate-900`
- **Usage**: Primary text, button text, borders

### Medium Gray (Secondary Text)
- **Tailwind**: `slate-600`
- **Usage**: Info text, descriptions

### Light Gray (Tertiary Text)
- **Tailwind**: `slate-400`
- **Usage**: Empty states, disabled states

### Border Colors
- **Light**: `slate-300`
- **Usage**: Input borders, button borders, card borders

### Background Colors
- **White**: `white`
- **Light Gray**: `slate-50`
- **Usage**: Main bg (white), list content bg (slate-50)

### Accent Colors
- **Blue**: `apple-blue` (#0071E3)
- **Red**: `red-600` (delete actions)
- **Usage**: Focus states (blue), delete text (red)

---

## Typography Scale (Apple-Inspired)

```
Font Stack: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif

Display: 32px / 600 weight / -0.5px letter-spacing
Title Large: 28px / 600 weight
Title: 22px / 600 weight (section headings)
Headline: 17px / 600 weight
Body: 17px / 400 weight
Callout: 16px / 400 weight
Subheadline: 15px / 400 weight (most common)
Footnote: 13px / 400 weight
Caption: 12px / 400 weight
```

---

## File Locations

### Critical Files
1. **Main Work Area**: `/app/admin/dishes/page.tsx` - All button/text documentation
2. **Design System Hook**: `/hooks/useDesignSystem.ts` - Button matching logic
3. **Homepage**: `/app/dark-kitchen/page.tsx` - Department icons with supporting colors
4. **Dashboard**: `/app/dashboard/page.tsx` - Department selection

### Pages to Document (Remaining)
**DK (Kitchen Management)**:
- ✅ Dishes (documented)
- ⏳ Menu Planner
- ⏳ Dish Cards
- ⏳ Production Sheets
- ⏳ Allergen Matrix
- ⏳ Weekly Preview
- ⏳ Recipes (not built yet)

**LM (Location Management)**: All pages
**RM (Regional Management)**: All pages

---

## Current Progress

### Completed Factory Settings Documentation
1. ✅ Global "add" button (white style)
2. ✅ Global "edit" button (white style)
3. ✅ Global "delete" button (white with red text)
4. ✅ Global "section heading" typography
5. ✅ Global "info text" typography
6. ✅ Global "empty state text" typography
7. ✅ Global "search input" style
8. ✅ "List Pattern" ACSS component with linked supporting color

### Next Steps
1. Continue classifying remaining elements on Dishes page
2. Move to Menu Planner page for documentation
3. Continue through all DK pages
4. Document LM and RM sections
5. Create final master template file for future projects

---

## Important Notes

### Design System Goals
- **Site manager can adjust CSS independently** (no developer needed)
- **ACSS protects structure** (sizing, spacing, layout locked)
- **CSS allows visual customization** (colors, typography within constraints)
- **Keyword-based button system** → One change affects all matching buttons globally
- **Linked color system** → Homepage icon color propagates to section headers

### Factory Settings Concept
- All documented CSS settings = "factory settings"
- This is the **starting point** for customization
- Serves as **blueprint** for future similar projects
- Site manager can reset to factory defaults anytime

---

## Last Updated
2026-01-25

## Session Context
This documentation was created during the initial establishment of the design system. All settings represent the "factory defaults" that will be used as the baseline for CSS customization.
