# Apple Design System - Compass Delivery

## Overview
This document defines the Apple-inspired design system used across the Compass Delivery application, with Micro-blue (#0078D4) as the primary accent color.

---

## Color Palette

### Primary Colors
```
Primary Blue (Micro-blue):  #0078D4
Primary Blue Hover:         #106EBE
```

### Text Colors
```
Off-Black (Primary):        #1D1D1F
Medium Gray (Secondary):    #6E6E73
Light Gray (Tertiary):      #86868B
```

### Border Colors
```
Standard Border:            #D2D2D7
Ultra Light Border:         #E8E8ED
```

### Background Colors
```
White:                      #FFFFFF
Subtle Gray (sections):     #F5F5F7
Ultra Light Gray:           #E8E8ED
Light Background:           #FAFAFA
```

### Accent Colors
```
Success Green:              #34C759
Error Red:                  #FF3B30
Warning Orange:             #FF9500
Blue Tint (backgrounds):    #E8F4FF (for #0078D4 at 10% opacity)
Blue Highlight:             #0078D4/5 (5% opacity for subtle highlights)
```

---

## Typography System

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
```

### Font Sizes & Weights
```
Display:        32px / 600 weight / -0.5px letter-spacing
Title Large:    28px / 600 weight
Title:          22px / 600 weight
Headline:       17px / 600 weight
Body:           17px / 400 weight
Callout:        16px / 400 weight
Subheadline:    15px / 400 weight
Footnote:       13px / 400 weight
Caption:        12px / 400 weight
```

### Tailwind Classes
```
text-[32px] font-semibold         // Display
text-[28px] font-semibold         // Title Large
text-[22px] font-semibold         // Title
text-[17px] font-semibold         // Headline
text-[17px]                       // Body
text-[16px]                       // Callout
text-[15px]                       // Subheadline (most common body text)
text-[13px]                       // Footnote (helper text, captions)
text-[12px]                       // Caption
```

---

## Component Patterns

### Buttons

#### Primary Button
```tsx
className="px-6 py-3 text-[15px] font-medium text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-sm transition-colors disabled:opacity-40"
```

#### Secondary Button (with border)
```tsx
className="px-6 py-3 text-[15px] font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E8E8ED] border border-[#D2D2D7] rounded-sm transition-colors"
```

#### Tertiary Button (text only)
```tsx
className="px-4 py-2 text-[15px] font-medium text-[#0078D4] hover:text-[#106EBE] transition-colors"
```

#### Danger/Delete Button
```tsx
className="px-4 py-2 text-[15px] font-medium text-[#FF3B30] border border-[#FF3B30] hover:bg-red-50 rounded-sm transition-colors"
```

### Form Inputs

#### Text Input / Select
```tsx
className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 outline-none transition-all"
```

#### Textarea
```tsx
className="w-full px-4 py-3 border border-[#D2D2D7] rounded-sm text-[15px] focus:border-[#0078D4] focus:ring-2 focus:ring-[#0078D4]/20 outline-none transition-all resize-none"
```

#### Checkbox
```tsx
className="w-5 h-5 text-[#0078D4] border-[#D2D2D7] rounded focus:ring-[#0078D4]/20"
```

#### Label
```tsx
className="block text-[13px] font-medium text-[#86868B] mb-2"
```

### Tables

#### Table Header
```tsx
className="bg-[#0078D4]"

// Header cell
className="px-4 py-3 text-left text-[15px] font-semibold text-white"
```

#### Table Rows
```tsx
// Striped pattern - even rows
className="bg-[#F5F5F7]"  // or bg-white for odd

// Hover state
className="hover:bg-[#F5F5F7]"
```

#### Table Borders
```tsx
// Cell borders
className="border border-[#D2D2D7]"

// Table container
className="border border-[#D2D2D7] rounded-sm overflow-hidden shadow-sm"
```

### Tabs

#### Tab Navigation
```tsx
// Container
className="flex gap-1 border-b border-[#D2D2D7]"

// Active tab
className="px-6 py-3 text-[15px] font-medium text-[#0078D4] border-b-2 border-[#0078D4] transition-colors"

// Inactive tab
className="px-6 py-3 text-[15px] font-medium text-[#86868B] hover:text-[#1D1D1F] transition-colors"
```

### Cards

#### Standard Card
```tsx
className="bg-white border border-[#E8E8ED] rounded-xl shadow-sm p-6"
```

#### Section Header
```tsx
className="bg-[#FAFAFA] px-6 py-4 border-b border-[#E8E8ED]"
```

### Modals

#### Modal Backdrop
```tsx
className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
```

#### Modal Container
```tsx
className="bg-white rounded-2xl shadow-2xl border border-[#E8E8ED] max-w-2xl w-full"
```

#### Modal Header
```tsx
className="px-6 py-4 border-b border-[#E8E8ED]"
```

### Empty States
```tsx
className="p-12 text-center text-[#86868B] text-[15px]"
```

### Loading States
```tsx
// Spinner container
className="min-h-screen flex items-center justify-center bg-white"

// Spinner
className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0078D4]"
```

---

## Spacing System

Use multiples of 4px:
```
4px   (1 in Tailwind)
8px   (2)
12px  (3)
16px  (4)
20px  (5)
24px  (6)
32px  (8)
40px  (10)
48px  (12)
64px  (16)
80px  (20)
```

---

## Border Radius

```
rounded-sm:     2px  (subtle, almost square)
rounded-lg:     8px  (inputs, buttons)
rounded-xl:     12px (cards)
rounded-2xl:    16px (modals)
rounded-full:   9999px (badges, pills)
```

---

## Shadows

```
shadow-sm:      0 1px 2px rgba(0,0,0,0.04)
shadow:         0 1px 3px rgba(0,0,0,0.1)
shadow-lg:      0 10px 15px rgba(0,0,0,0.08)
shadow-2xl:     0 20px 25px rgba(0,0,0,0.1)
```

---

## Animation & Transitions

```tsx
// Standard transition
className="transition-colors"

// Smooth transition
className="transition-all"

// Opacity fade
className="transition-opacity duration-200"

// Group hover patterns
className="opacity-0 group-hover:opacity-100 transition-opacity"
```

---

## Design Principles

### 1. **Minimalism**
- Clean, uncluttered interfaces
- Generous whitespace
- Only essential elements visible

### 2. **Typography Hierarchy**
- Clear size/weight differentiation
- Consistent font sizes across similar elements
- System fonts for native feel

### 3. **Subtle Color Palette**
- Neutrals (grays) dominate
- ONE primary accent color (#0078D4)
- Semantic colors for success/error/warning only

### 4. **Refined Interactions**
- Smooth transitions (200-300ms)
- Understated hover states
- Focus states with ring, not harsh outlines

### 5. **Visual Depth**
- Minimal shadows
- Rely on borders and spacing
- Light borders (#D2D2D7, #E8E8ED)

### 6. **Consistency**
- Every element follows same language
- Predictable patterns
- Reusable components

---

## Common Patterns by Page Type

### Dashboard Pages
```tsx
// Page container
<div className="min-h-screen bg-white">

// Section title
<h2 className="text-[22px] font-semibold text-[#1D1D1F] mb-6">

// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Form Pages
```tsx
// Form container
<div className="max-w-4xl mx-auto p-8">

// Form section
<div className="space-y-4">
  <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">

// Submit button
<button className="px-6 py-3 text-[15px] font-medium text-white bg-[#0078D4] hover:bg-[#106EBE] rounded-sm">
```

### Table Pages
```tsx
// Table container
<div className="border border-[#D2D2D7] rounded-sm overflow-hidden shadow-sm">

// Table
<table className="w-full border-separate" style={{borderSpacing: '0 0'}}>

// Header
<thead className="bg-[#0078D4]">
  <th className="px-4 py-3 text-left text-[15px] font-semibold text-white">
```

---

## Migration from Old Colors

### Color Replacements
```
OLD                 →  NEW
gray-50             →  #FFFFFF (white) or #F5F5F7
gray-100            →  #F5F5F7
gray-200            →  #E8E8ED or #F5F5F7 (striped rows)
gray-300            →  #D2D2D7 (borders)
gray-400            →  #D2D2D7
gray-500            →  #86868B (tertiary text)
gray-600            →  #6E6E73 (secondary text)
gray-700            →  #6E6E73
gray-800            →  #1D1D1F (primary text)
gray-900            →  #1D1D1F

slate-100           →  #F5F5F7
slate-200           →  #E8E8ED
slate-700           →  #6E6E73 or #1D1D1F

blue-600            →  #0078D4
blue-700            →  #0078D4
blue-800            →  #0078D4
blue-900            →  #0078D4

indigo-600          →  #0078D4

#0071E3 (old Apple) →  #0078D4 (Micro-blue)
#0077ED (old hover) →  #106EBE
#4A7DB5 (old table) →  #0078D4
```

---

## Pages Completed

✅ **Kitchen Dashboard** - Apple design applied
✅ **Kitchen Dishes** - Apple design applied
✅ **Kitchen Recipes** - Apple design applied
✅ **Menu Planner** - Apple design applied (original template)
✅ **Dish Command Palette** - Apple design applied
✅ **Main Dish Form** - Apple design applied
🔄 **Kitchen Production** - In progress (Changes #1-11 complete)

---

## Next Steps

1. Complete Production page color migration
2. Apply to Week Overview page
3. Apply to Allergens Matrix page
4. Apply to Admin pages (if needed)
5. Create reusable component library (optional)

---

## Tailwind Config Extensions (Optional)

```typescript
// tailwind.config.ts
extend: {
  colors: {
    'apple-gray1': '#1D1D1F',
    'apple-gray2': '#6E6E73',
    'apple-gray3': '#86868B',
    'apple-gray4': '#D2D2D7',
    'apple-gray5': '#E8E8ED',
    'apple-gray6': '#F5F5F7',
    'apple-gray7': '#FAFAFA',
    'apple-blue': '#0078D4',
    'apple-blue-hover': '#106EBE',
  },
  fontSize: {
    'apple-display': ['32px', { lineHeight: '1.125', fontWeight: '600' }],
    'apple-title-lg': ['28px', { lineHeight: '1.15', fontWeight: '600' }],
    'apple-title': ['22px', { lineHeight: '1.2', fontWeight: '600' }],
    'apple-headline': ['17px', { lineHeight: '1.3', fontWeight: '600' }],
    'apple-body': ['17px', { lineHeight: '1.4', fontWeight: '400' }],
    'apple-subheadline': ['15px', { lineHeight: '1.35', fontWeight: '400' }],
    'apple-footnote': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
    'apple-caption': ['12px', { lineHeight: '1.35', fontWeight: '400' }],
  }
}
```

---

## Notes

- **Primary accent color**: #0078D4 (Micro-blue) used consistently for:
  - Primary buttons
  - Active states
  - Links
  - Focus rings
  - Table headers
  - Icons and accents

- **Border philosophy**: Use subtle borders (#D2D2D7, #E8E8ED) instead of heavy shadows

- **rounded-sm**: Our standard for "almost square" corners (2px radius)

- **Hover states**: Always subtle - slight color shift, no dramatic changes

- **Focus rings**: Always `focus:ring-2 focus:ring-[#0078D4]/20` with `outline-none`

- **Consistent spacing**: Padding should be predictable (px-4 py-3 for inputs, px-6 py-3 for buttons)

---

**Last Updated**: 2026-02-02
**Primary Color**: #0078D4 (Micro-blue)
**Design Philosophy**: Apple-inspired minimalism with Microsoft accessibility colors
