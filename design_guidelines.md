# AR Model Sharing Application - Design Guidelines

## Design Approach

**Selected Framework**: Material Design principles adapted for productivity with AR/3D visualization focus
**Rationale**: This application is utility-focused with complex data displays, 3D model management, and analytics. Material Design provides excellent patterns for data-dense interfaces while maintaining visual clarity.

**Key Design Principles**:
- Clarity over decoration: Every element serves a functional purpose
- Responsive hierarchy: Guide users through complex workflows effortlessly
- Immersive 3D focus: Let model previews take center stage
- Mobile-first AR experience: Streamlined interface for AR viewing

---

## Typography System

**Font Families** (Google Fonts via CDN):
- Primary: Inter (headings, UI elements, data displays)
- Secondary: JetBrains Mono (file names, technical data, URLs)

**Type Scale**:
- Hero/Page Titles: text-4xl font-bold (Dashboard headers)
- Section Headers: text-2xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Small/Meta: text-sm font-normal
- Captions: text-xs font-medium (labels, timestamps)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Tight spacing: p-2, gap-2 (compact lists, badges)
- Standard spacing: p-4, gap-4 (cards, form fields)
- Section spacing: p-8, gap-8 (page sections, major components)
- Page margins: p-12 or p-16 (outer containers)

**Grid System**:
- Dashboard layout: Sidebar (w-64) + Main content area (flex-1)
- Stat cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Model gallery: grid-cols-1 md:grid-cols-2 xl:grid-cols-3
- Share manager: Full-width table/list layout

---

## Page-Specific Layouts

### Login Page
Clean, centered authentication with minimal distractions:
- Centered card (max-w-md) with generous padding (p-8)
- Logo/brand at top (mb-8)
- Form fields stacked vertically (space-y-4)
- Primary CTA button full width
- Social auth button (Google) below with divider
- No hero image - focus on quick authentication

### Dashboard (Authenticated Layout)
Left sidebar navigation with main content area:

**Sidebar (fixed, w-64)**:
- Logo/brand at top (p-6)
- Navigation items stacked (space-y-2, p-4)
- Active state with subtle background indicator
- User profile section at bottom (p-4, border-t)

**Main Content Area (flex-1)**:
- Top header bar (h-16): breadcrumbs, user info, sign out
- Content wrapper (p-8 max-w-7xl mx-auto)

**Dashboard Stats Section**:
- Four stat cards in grid (grid-cols-4, gap-6)
- Each card: p-6, rounded-xl, shadow-sm
- Large number (text-3xl font-bold), label below (text-sm)
- Small trend indicator (text-xs with icon)

**Models Section**:
- Header with "My Models" title + "Upload New" button
- Grid of model cards (grid-cols-3, gap-6)
- Each card: aspect-square preview area, title, metadata below
- Actions menu (3-dot icon, top-right)

**Recent Activity Timeline**:
- Vertical timeline with dot indicators
- Event items: icon, description, timestamp (space-y-4)

### Upload Page
Focus on the upload experience:
- Page title (mb-8)
- Large drag-and-drop zone (min-h-96, border-2 border-dashed, rounded-xl)
- Center-aligned icon, heading, helper text
- File input button as fallback
- Progress bar below zone when uploading (h-2, rounded-full)
- Validation status section (mt-8): badge-style pills for each check
- Preview area appears after upload: 3D viewer (h-96) + metadata sidebar

### Share Manager Page
Table-focused layout for managing links:
- Page header with filters/search (mb-6)
- Responsive table (overflow-x-auto)
- Columns: QR thumbnail, Model name, Link, Created, Expires, Status, Actions
- QR thumbnail: small square (w-12 h-12)
- Status badges: compact pills (px-2 py-1, text-xs, rounded-full)
- Actions: icon buttons in row (extend, revoke, copy, download)
- Empty state: centered message with CTA

### Analytics Page
Dashboard-style metrics and charts:
- Four metric cards at top (similar to dashboard stats)
- Chart section (mt-8): Recharts area/line chart (h-96)
- Chart legend and period selector (tabs: 7d, 30d, 90d)
- Recent events table below (mt-8)

### AR Viewer (Mobile-First)
Immersive, minimal interface:
- Full viewport 3D viewer (h-screen)
- Floating header bar (absolute top, backdrop-blur, p-4): back button, model name
- AR mode toggle button (absolute bottom, center, mb-8): large, prominent
- Loading overlay: centered spinner with progress percentage
- Toast notifications for QR detection (top-center, slide-in)

---

## Component Library

### Navigation
- **Sidebar Nav Items**: py-3 px-4, rounded-lg, hover state, icon + text (gap-3)
- **Breadcrumbs**: text-sm, slash separators, last item font-medium

### Forms & Inputs
- **Text Inputs**: h-10, px-4, rounded-lg, border, focus ring
- **File Upload Zone**: min-h-64, border-2 dashed, rounded-xl, hover lift effect
- **Buttons**: 
  - Primary: px-6 py-3, rounded-lg, font-medium
  - Secondary: similar with border variant
  - Icon buttons: p-2, rounded-lg
- **Progress Bar**: h-2, rounded-full, overflow-hidden with animated fill

### Data Display
- **Stat Cards**: p-6, rounded-xl, shadow-sm
  - Large metric number (text-3xl)
  - Label below (text-sm)
  - Optional icon (top-right, absolute)
- **Model Cards**: 
  - Preview container (aspect-square, rounded-lg, overflow-hidden)
  - Content section below (p-4)
  - Title (text-lg font-medium, truncate)
  - Metadata row (text-sm, flex justify-between)
- **Status Badges**: px-2.5 py-0.5, text-xs font-medium, rounded-full
- **Tables**: 
  - Header row (font-medium, text-sm)
  - Body rows (text-sm, border-b)
  - Cell padding (px-4 py-3)

### Modal/Dialog
- **Share Modal**: max-w-2xl, rounded-xl, p-6
- **Tab Navigation**: border-b, active underline indicator
- **Tab Panels**: pt-6, min-h-64

### 3D Viewer Component
- Container: rounded-xl overflow-hidden
- model-viewer element: w-full, aspect ratio controlled by parent
- Loading state: absolute overlay with spinner
- Controls strip (optional): absolute bottom, backdrop-blur bar

### QR Code Display
- **QR Preview**: p-4, rounded-lg, border, background pattern
- **Customization Panel**: grid of color pickers (grid-cols-2, gap-4)
- **Download Button**: full-width below preview

### Charts
- **Chart Container**: p-6, rounded-xl, shadow-sm
- **Recharts**: ResponsiveContainer with h-80
- **Legend**: text-sm, flex items-center, gap-4

### Toast Notifications
- Position: top-center
- Slide-in animation
- Icon + message + dismiss button
- Types: success, error, info (distinct visual treatment)

---

## Accessibility & Interaction

- Focus states: Visible ring on all interactive elements
- Keyboard navigation: Tab order follows visual hierarchy
- ARIA labels: All icon-only buttons have descriptive labels
- Form validation: Inline error messages below fields (text-sm, mt-1)
- Loading states: Skeleton screens for data fetching, spinners for actions
- Empty states: Centered icon, heading, description, CTA button

---

## Responsive Behavior

**Breakpoints** (Tailwind defaults):
- Mobile: base (< 640px) - Single column, stack all cards
- Tablet: md (768px+) - 2-column grids, show sidebar
- Desktop: lg (1024px+) - Multi-column layouts, expanded sidebar
- Wide: xl (1280px+) - Maximum content density

**Mobile Adaptations**:
- Sidebar becomes bottom nav or hamburger menu
- Stats grid: 2x2 instead of 4 columns
- Model cards: Single column stack
- Tables: Horizontal scroll or card-based alternative
- AR viewer: Full-screen takeover

---

## Images

**No large hero images** for this application. Focus is on functional UI and 3D model previews.

**3D Model Thumbnails/Previews**: Generated from model-viewer or uploaded by users, displayed in model cards and share manager.

---

## Animation Guidelines

Minimal, purposeful animations only:
- Page transitions: None (instant)
- Button interactions: Native browser states
- Loading spinners: Standard rotation
- Toast notifications: Slide-in from top (200ms)
- Modal open/close: Fade + scale (150ms)
- **Avoid**: Scroll-triggered animations, parallax, excessive micro-interactions