# DESIGN.md - Oh My Img Manager

This document defines the visual design system for Oh My Img Manager. AI agents should read and apply these rules to ensure all generated UI remains visually consistent with the project's identity.

## 1. Visual Theme & Atmosphere
- **Mood**: Friendly, Vibrant, Organized, Clean
- **Design Philosophy**: An accessible and lively interface that makes managing images a breeze. The UI should feel lightweight but capable, inspired by natural landscapes (Sky, Grass, Sun/Sand).
- **Density**: Comfortable spacing with a focus on visual content (images).

## 2. Color Palette & Roles
| Name | Hex | Role |
|------|-----|------|
| **Sky Blue** | `#1089C7` | Primary Accent, CTAs, Active States, Header Backgrounds |
| **Grass Green** | `#78A95A` | Success States, Confirmations, Secondary Actions |
| **Sunflower Yellow**| `#EFD430` | Warning, Highlights, Badges |
| **Surface Light** | `#F8FAFC` | Main Application Background |
| **Surface Card** | `#FFFFFF` | Image Cards, Modals, Dropdowns |
| **Text Primary** | `#0F172A` | Headings, Main Text |
| **Text Secondary** | `#64748B` | Subtitles, Metadata, Muted Text |
| **Border Neutral** | `#E2E8F0` | Dividers, Card Borders |

## 3. Typography Rules
- **Primary Font**: `Inter`, `system-ui`, `sans-serif`
- **Monospace Font**: `JetBrains Mono`, `ui-monospace`

| Type | Size / Weight | Color | Usage |
|------|---------------|-------|-------|
| H1 (Page Title) | 24px, Bold (700) | Text Primary | Main section headers |
| H2 (Section Title)| 18px, Semibold (600)| Text Primary | Group headers |
| Body Text | 14px, Regular (400) | Text Primary | Paragraphs, standard text |
| Metadata | 12px, Regular (400) | Text Secondary | File size, dates, secondary info |

## 4. Component Stylings
- **Buttons**:
  - **Primary**: Background `#1089C7`, Text `#FFFFFF`, Hover `#0E77AD`, rounded-md (6px)
  - **Secondary/Success**: Background `#78A95A`, Text `#FFFFFF`, Hover `#658F4C`
  - **Outline**: Border `#1089C7`, Text `#1089C7`, Hover Background `#F0F9FF`
- **Cards (Image Items)**:
  - Background `#FFFFFF`
  - Border: 1px solid `#E2E8F0`
  - Border Radius: 8px
  - Hover Effect: Subtle lift (box-shadow) and border color change to `#1089C7`
- **Navigation/Tabs**:
  - Active Tab: Bottom border 2px solid `#1089C7`, Text `#1089C7`
  - Inactive Tab: Text `#64748B`, Hover Text `#0F172A`
- **Badges**:
  - Highlight/New: Background `#EFD430`, Text `#0F172A`, small rounded-full

## 5. Layout Principles
- **Grid System**: Masonry or CSS Grid for image galleries (auto-fill, minmax 150px).
- **Spacing Scale**: Base unit is 4px.
  - `xs`: 4px (tight grouping)
  - `sm`: 8px (component padding)
  - `md`: 16px (standard container padding)
  - `lg`: 24px (section spacing)
- **Whitespace**: Keep ample whitespace around image cards so the content breathes.

## 6. Depth & Elevation
- **Level 1 (Cards)**: `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`
- **Level 2 (Dropdowns)**: `box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`
- **Level 3 (Modals)**: `box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)`

## 7. Do's and Don'ts
- **Do**: Use Sky Blue (`#1089C7`) for primary actions and links.
- **Do**: Ensure image thumbnails are the hero of the interface. Keep surrounding UI minimal.
- **Don't**: Overuse Sunflower Yellow (`#EFD430`). Use it only for small accents or badges.
- **Don't**: Use pure black (`#000000`). Stick to Text Primary (`#0F172A`) for better readability.

## 8. Responsive Behavior
- **Breakpoints**:
  - Mobile: `< 640px` (1 column grid)
  - Tablet: `640px - 1024px` (2-3 column grid)
  - Desktop: `> 1024px` (4+ column grid)
- **Touch Targets**: Minimum 44x44px for buttons on mobile.
- **Collapsing**: Sidebar navigation collapses to a bottom tab bar on mobile.

## 9. Agent Prompt Guide
**Color Reference**:
- Primary: `#1089C7`
- Success: `#78A95A`
- Accent: `#EFD430`

**Ready-to-use Prompts**:
- "Build a masonry image gallery using the surface card styling, applying a subtle Level 1 shadow. Use #1089C7 for the primary action button."
- "Create a settings modal with Level 3 elevation, using #0F172A for headings and #64748B for descriptive text."
- "Style a warning badge using the #EFD430 color with dark text for contrast."
