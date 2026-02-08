# Apple Design System (ADS)

This document defines the design system for the Compass Delivery application, inspired by Apple's minimal, clean aesthetic.

## Core Principles
- **Minimalism**: Clean, uncluttered interfaces with generous whitespace
- **Consistency**: Every element follows the same design language across all pages
- **Subtle Color Palette**: Neutrals with strategic accent colors
- **Refined Interactions**: Smooth transitions, understated hover states
- **Typography Hierarchy**: Clear size and weight differentiation

---

## Border Radius Standards

Use these values consistently across the application:

| Radius | Usage | Tailwind Class | Use Cases |
|--------|-------|----------------|-----------|
| **2px** | Buttons, Form Inputs, Tables | `rounded-sm` | All buttons, text inputs, select dropdowns, textareas, table containers |
| **16px** | Modal Dialogs | `rounded-2xl` | Modal/dialog containers, large overlay panels |
| **Full** | Badges, Avatars | `rounded-full` | Status badges, pills, avatar images, icon buttons |

**Examples from codebase:**
- Buttons & Inputs: Majority use `rounded-sm` (orders, dishes, settings, catering, etc.)
- Tables: 313 uses of `rounded-sm`
- Modals: 18 uses of `rounded-2xl`
- Badges: 90 uses of `rounded-full`

---

## Color Palette

### Text Colors
```css
Primary Text:   #1D1D1F  /* Near black - headings, body text */
Secondary Text: #6E6E73  /* Medium gray - supporting text */
Tertiary Text:  #86868B  /* Light gray - labels, captions, placeholders */
```

### Background Colors
```css
White:         #FFFFFF  /* Pure white - cards, modals, main backgrounds */
Subtle Gray:   #FAFAFA  /* Table headers, subtle sections */
Light Gray:    #F5F5F7  /* Hover states, inactive backgrounds */
```

### Border Colors
```css
Light Border:      #D2D2D7  /* Standard borders, inputs */
Ultra Light:       #E8E8ED  /* Subtle dividers, table borders */
```

### Accent Colors
```css
Primary Blue:      #0071E3  /* Primary buttons, links, focus states */
Blue Hover:        #0077ED  /* Button hover states */
Success Green:     #34C759  /* Success messages, confirmations */
Error Red:         #FF3B30  /* Error messages, destructive actions */
Warning Orange:    #FF9500  /* Warnings, alerts */
```

### Legacy Colors (phase out when possible)
```css
Teal:             #0D9488  /* Old primary color - being replaced by #0071E3 */
```

---

## Typography Scale

**Font Stack:**
```css
-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif
```

| Size | Weight | Usage | Tailwind Classes | Example Use Cases |
|------|--------|-------|------------------|-------------------|
| 32px | 600 | Display | `text-[32px] font-semibold` | Page headers (rare) |
| 28px | 600 | Title Large | `text-[28px] font-semibold` | Main page titles, modal headers |
| 22px | 600 | Title | `text-[22px] font-semibold` | Section headers |
| 17px | 600 | Headline | `text-[17px] font-semibold` | Subsection headers, emphasized text |
| 17px | 400 | Body | `text-[17px]` | Standard body text |
| 15px | 600 | Subheadline Bold | `text-[15px] font-semibold` | Buttons, form labels (when bold) |
| 15px | 500 | Subheadline Medium | `text-[15px] font-medium` | Table text, card content |
| 15px | 400 | Subheadline | `text-[15px]` | Standard UI text, inputs |
| 13px | 600 | Footnote Bold | `text-[13px] font-semibold` | Table headers (uppercase), small labels |
| 13px | 500 | Footnote Medium | `text-[13px] font-medium` | Helper text, secondary labels |
| 13px | 400 | Footnote | `text-[13px]` | Captions, footnotes |
| 12px | 500 | Caption | `text-[12px] font-medium` | Tiny labels, metadata |

---

## Spacing System

Use consistent multiples of 4px:
```
4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px
```

Tailwind equivalents:
```
1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px),
8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px)
```

---

## Component Patterns

### Buttons

**Primary Button:**
```tsx
<button className="px-6 py-2.5 bg-[#0071E3] text-white text-[15px] font-semibold rounded-sm hover:bg-[#0077ED] transition-colors">
  Button Text
</button>
```

**Secondary Button:**
```tsx
<button className="px-6 py-2.5 border border-[#D2D2D7] text-[#1D1D1F] text-[15px] font-semibold rounded-sm hover:bg-[#F5F5F7] transition-colors">
  Button Text
</button>
```

**Danger Button:**
```tsx
<button className="px-6 py-2.5 bg-[#FF3B30] text-white text-[15px] font-semibold rounded-sm hover:bg-[#FF453A] transition-colors">
  Delete
</button>
```

### Form Inputs

**Text Input (standard):**
```tsx
<input
  type="text"
  className="px-4 py-2.5 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
/>
```

**Select Dropdown:**
```tsx
<select className="px-4 py-2.5 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all">
  <option>Option 1</option>
</select>
```

**Textarea:**
```tsx
<textarea
  rows={3}
  className="px-4 py-2.5 border border-[#D2D2D7] rounded-sm text-[15px] text-[#1D1D1F] bg-white focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all resize-none"
/>
```

**Checkbox:**
```tsx
<input
  type="checkbox"
  className="w-5 h-5 text-[#0071E3] border-[#D2D2D7] rounded focus:ring-[#0071E3]/20"
/>
```

### Tables

**Table Container:**
```tsx
<div className="bg-white rounded-sm border border-[#E8E8ED] shadow-sm overflow-x-auto">
  <table className="min-w-full divide-y divide-[#E8E8ED]">
    <thead className="bg-[#FAFAFA]">
      <tr>
        <th className="px-6 py-4 text-left text-[13px] font-semibold text-[#86868B] uppercase tracking-wide">
          Header
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-[#E8E8ED]">
      <tr>
        <td className="px-6 py-4 text-[15px] text-[#1D1D1F]">
          Cell content
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Cards

**Standard Card:**
```tsx
<div className="bg-white rounded-sm border border-[#E8E8ED] shadow-sm p-6">
  <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-3">Card Title</h3>
  <p className="text-[15px] text-[#6E6E73]">Card content</p>
</div>
```

### Modals/Dialogs

**Modal Container:**
```tsx
<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
  <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
    <h2 className="text-[28px] font-semibold text-[#1D1D1F] mb-6">Modal Title</h2>
    {/* Modal content */}
  </div>
</div>
```

### Badges

**Status Badge:**
```tsx
<span className="px-3 py-1 text-[12px] font-medium bg-[#0071E3] text-white rounded-full">
  Active
</span>
```

---

## Shadows

Use sparingly - prefer borders and spacing for visual hierarchy:

```css
sm:  shadow-sm     /* 0 1px 2px rgba(0,0,0,0.04) - subtle cards */
md:  shadow-md     /* 0 4px 6px rgba(0,0,0,0.07) - elevated cards */
lg:  shadow-lg     /* 0 10px 15px rgba(0,0,0,0.08) - popovers */
xl:  shadow-xl     /* 0 20px 25px rgba(0,0,0,0.1) - modals */
2xl: shadow-2xl    /* 0 25px 50px rgba(0,0,0,0.15) - top-level dialogs */
```

---

## Transitions

Use consistent transition timing:

```css
transition-colors  /* For color changes (buttons, links) */
transition-all     /* For multiple property changes (inputs on focus) */
```

Default duration: 150ms (Tailwind default)

---

## Common Mistakes to Avoid

1. ❌ **Don't use `rounded-md` (4px) or `rounded-lg` (8px)** - they're not part of our system
   - ✅ Use `rounded-sm` for buttons, inputs, and tables
   - ✅ Use `rounded-2xl` only for modals
   - ✅ Use `rounded-full` only for badges

2. ❌ **Don't use teal (#0D9488)** for new components
   - ✅ Use blue (#0071E3) as the primary accent

3. ❌ **Don't mix font sizes arbitrarily**
   - ✅ Stick to the typography scale: 12px, 13px, 15px, 17px, 22px, 28px, 32px

4. ❌ **Don't use harsh shadows everywhere**
   - ✅ Use subtle borders (border-[#E8E8ED]) for separation
   - ✅ Reserve shadows for elevated elements (modals, popovers)

5. ❌ **Don't forget focus states on interactive elements**
   - ✅ Always add `focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20` to inputs
   - ✅ Use `focus:outline-none focus:ring-2 focus:ring-[#0071E3]` for custom focusable elements

---

## Implementation Checklist

When applying ADS to a new page:

- [ ] Remove any `rounded-md` or `rounded-lg` - replace with `rounded-sm` for buttons/inputs/tables
- [ ] Use `rounded-2xl` only for modals, `rounded-full` only for badges
- [ ] Replace teal (#0D9488) with blue (#0071E3)
- [ ] Verify text colors: #1D1D1F (primary), #6E6E73 (secondary), #86868B (tertiary)
- [ ] Check font sizes against typography scale
- [ ] Ensure consistent spacing (multiples of 4px)
- [ ] Add proper focus states to all interactive elements
- [ ] Use subtle borders (#E8E8ED) instead of heavy shadows where possible
- [ ] Test hover states have smooth transitions

---

## Reference Pages

These pages have correct ADS implementation:

- `app/home/page.tsx` - Location cards, buttons
- `app/management/dashboard/page.tsx` - Large cards with rounded-2xl
- `app/admin/menus/page.tsx` - Menu planner with proper typography
- `app/symphony/banqueting/catalog/page.tsx` - Tables with rounded-sm

---

**Last Updated:** 2026-02-08
**Version:** 1.0
