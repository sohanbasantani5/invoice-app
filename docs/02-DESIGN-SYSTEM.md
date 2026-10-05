# 02 — Design System (locked)

## 1. Design direction in one line

**"Quiet paper and ink."** Warm off-white surfaces, near-black ink, one deep pine-green accent, hairline borders, generous whitespace, numbers that line up. It should feel like a well-made stationery brand or a modern bank app: calm, precise, trustworthy. Easy to read above everything else.

### Avoid (these make it look AI-made)
- Purple/violet gradients, neon glows, glassmorphism everywhere, rainbow gradients.
- Emoji in UI, over-rounded "bubble" cards, heavy drop shadows.
- Centered everything; giant hero text inside an app screen.
- Default shadcn look without changing tokens.
- Every element fading in on every render.

## 2. Colour tokens

Define as CSS variables in `globals.css` and map them in Tailwind. Use semantic names in components, never raw hex.

### Light (default)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F7F6F2` | App background (warm paper) |
| `--surface` | `#FFFFFF` | Cards, panels, inputs |
| `--surface-2` | `#F0EEE8` | Subtle fills, table header, hover |
| `--border` | `#E4E1D9` | Hairlines (1px) |
| `--border-strong` | `#CFCAC0` | Input focus outline base, dividers |
| `--ink` | `#17181B` | Primary text |
| `--ink-2` | `#4A4D55` | Secondary text |
| `--ink-3` | `#8A8D94` | Labels, captions, placeholders* |
| `--accent` | `#1F5C4B` | Pine green: primary buttons, links, active states |
| `--accent-hover` | `#174A3C` | |
| `--accent-soft` | `#E3EEE9` | Accent backgrounds, selected rows |
| `--success` | `#2F7D4F` | Paid |
| `--warning` | `#B7791F` | Due soon / recommended field |
| `--danger` | `#B4413A` | Overdue / errors / destructive |
| `--info` | `#3A5F8F` | Sent |

### Dark
| Token | Hex |
|---|---|
| `--bg` | `#111214` |
| `--surface` | `#18191C` |
| `--surface-2` | `#202226` |
| `--border` | `#2A2C31` |
| `--border-strong` | `#3A3D43` |
| `--ink` | `#ECEBE7` |
| `--ink-2` | `#B3B4B8` |
| `--ink-3` | `#7D8087` |
| `--accent` | `#5FB39A` |
| `--accent-hover` | `#78C4AD` |
| `--accent-soft` | `#1B2E28` |

*Placeholders use `--ink-3` at full opacity, which is light but still readable (contrast ≥ 3:1). Do not go lighter.

Status pills: soft tinted background (status colour at ~10% opacity) + status colour text + small dot. Never solid saturated pills.

## 3. Typography

Load with `next/font/google` (self-hosted, no layout shift).

| Role | Font | Notes |
|---|---|---|
| Headings & numbers on dashboard | **Instrument Sans** (500, 600) | Crisp, professional, less overused than Inter |
| Body, forms, tables | **Inter** (400, 500, 600) | Enable `font-feature-settings: "tnum" 1, "cv11" 1` on all numeric cells and totals so digits align |
| Invoice number / codes (optional) | **JetBrains Mono** (400) | GSTIN, PAN, SAC, invoice no. at small size |

### Scale (rem, 16px base)
- Display (page titles): 1.75 / line-height 1.2 / weight 600 / letter-spacing -0.02em
- H2 (section): 1.125 / 1.35 / 600
- H3 (card title, form group): 0.9375 / 1.4 / 600
- Body: 0.9375 / 1.55 / 400
- Small / labels: 0.8125 / 1.4 / 500
- Caption / helper: 0.75 / 1.4 / 400, `--ink-3`

Labels sit **above** inputs, never placeholder-only labels.

## 4. Space, radius, elevation

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72 px. Page padding 24 (mobile 16). Section gap 32.
- Radius: inputs/buttons 8px, cards 12px, modals/sheets 16px, pills full.
- Shadows: almost none. Cards = 1px border. Floating elements (popovers, menus, the preview paper) get one soft shadow: `0 1px 2px rgba(23,24,27,.04), 0 8px 24px rgba(23,24,27,.06)`.
- Max content width 1280px. Editor uses full width.

## 5. Components (behaviour + look)

- **Buttons**: Primary (accent fill, white text), Secondary (surface + border), Ghost (text only), Destructive. Height 36 (sm 32, lg 44). Press state: scale 0.98.
- **Inputs**: 40px tall, 1px `--border`, focus = 2px ring in `--accent` at 30% + border `--accent`. Error = `--danger` border + helper text below. Never red before the user has left the field.
- **Field badges** next to labels (small, `--ink-3`, 11px):
  - `Required` — needed for the document to make sense (e.g. client name, item description, rate).
  - `GST` — required on a GST tax invoice (e.g. client GSTIN for B2B, SAC). Shown in `--warning` only when the invoice is a Tax Invoice and the field is empty.
  - `Optional` — everything else.
- **Placeholder copy**: example values, e.g. `27ABCDE1234F1Z0`, `ABCDE1234F`, `Flat 4, Sample Apartments, Mumbai`. Helper text below explains when it is needed, e.g. "Needed if your client is GST-registered."
- **Combobox** (clients, items): opens on focus/typing, keyboard navigable, highlights matched letters, last option "+ Create "<typed text>"".
- **Tables**: no zebra stripes; hairline row dividers; numeric columns right-aligned with tabular numbers; sticky header on long lists.
- **Toasts**: bottom-right (bottom-center on mobile), short text, undo where possible (e.g. delete line, delete invoice).
- **Empty states**: one simple line illustration or icon (Lucide), one sentence, one button.
- Icons: **Lucide**, 16px/20px, stroke 1.5.

## 6. Layout

- **App shell**: left sidebar (collapsible, 240px → 64px icons) with logo/name, nav (Dashboard, Invoices, Clients, Items, Settings), and a "New invoice" button at top. Mobile: bottom tab bar + floating "New" button.
- **Editor**:
  - Desktop ≥1024px: two columns, form 45% / preview 55%. Both columns scroll independently; the preview is a sticky A4 paper scaled to fit width (CSS `transform: scale()` based on container width, computed with ResizeObserver).
  - Tablet/mobile: single column; segmented control at top "Edit | Preview"; sticky bottom action bar with total amount + "Save" + "Download".
- Form is grouped into collapsible cards in this order: **From** (collapsed by default), **Bill to**, **Invoice details** (number, dates, place of supply, reverse charge), **Items**, **Tax & totals**, **Payment & notes**.

## 7. The invoice template (the paper) — NEW design, not the old purple one

A4 portrait (210 × 297 mm), white paper, ink text, accent used in only 2–3 places. 16mm margins. Base size 9.5pt Inter, numbers tabular.

Top to bottom:

1. **Header row**
   - Left: logo (if any, max 40px tall) + **Business name** (Instrument Sans 16pt 600) + legal name below if different, address, GSTIN/PAN line in mono 8.5pt, email · phone.
   - Right, aligned right: document title in small caps letter-spaced (e.g. `TAX INVOICE` / `BILL OF SUPPLY` / `INVOICE`) in `--accent`, then invoice number large (14pt 600).
2. **Meta strip**: one thin bordered row with 4 cells: Invoice date · Due date · Place of supply (State, code) · Reverse charge (Yes/No — only for Tax Invoice). Labels 7.5pt uppercase `--ink-3`, values 9.5pt.
3. **Bill to / Ship to**: two columns, no coloured boxes. Small uppercase label, client name bold, address, GSTIN, PAN, state & code. "Ship to / Place of delivery" only shown if different.
4. **Items table**: header row with a 1px top and bottom ink rule (no filled colour bar). Columns: `#`, `Description` (with SAC under it in mono 8pt `--ink-3`), `Qty`, `Rate`, `Disc.` (only if any line has discount), `Taxable`, `GST %`, `Amount`. Row dividers hairline. Zero-GST invoices hide the GST % column.
5. **Bottom area**, two columns:
   - Left: **Amount in words** ("Indian Rupees Four Thousand Only"), payment details (bank name, A/C no., IFSC, UPI ID) and the **UPI QR** (24mm) with "Scan to pay ₹4,000".
   - Right: totals stack: Subtotal, Discount, Taxable value, CGST x% / SGST x% (or IGST x%), Round off, **Total** (14pt 600, separated by a 1.5px ink rule), Amount paid, **Balance due** (accent).
   - If TDS is enabled: "Less TDS (x%)" and "Net payable".
6. **Notes & terms** (small, `--ink-2`).
7. **Signature block** bottom-right: "For <Business name>", signature image (optional) or blank space, "Authorised signatory".
8. **Footer** (7.5pt `--ink-3`, centered): "This is a computer-generated invoice." For composition: the mandatory composition line (see 04). For unregistered: "Supplier not registered under GST."

Template options in Settings: accent colour (Pine default, Ink, Navy, Terracotta), show/hide logo, show/hide QR. One template is enough for v1; structure the code so more can be added.

## 8. Motion system

Libraries: **Motion** (`motion` package, `import { motion } from "motion/react"`, formerly Framer Motion), **Lenis** (`lenis` package, `lenis/react`), **GSAP** (only where noted).

Tokens:
- Durations: fast 120ms, base 200ms, slow 320ms, page 400ms.
- Easing: `[0.22, 1, 0.36, 1]` (ease-out-quint) for enters; `[0.4, 0, 1, 1]` for exits. Springs for drag: `{ type: "spring", stiffness: 500, damping: 40 }`.

Where to animate:
- **Page transitions** (Motion): content fades + rises 8px on route change, 400ms. Exit is a quick 150ms fade. Sidebar never animates on navigation.
- **Lists**: stagger 30ms on first load only (max 8 items), never on refetch.
- **Add/remove invoice line**: height + opacity with `AnimatePresence` + `layout`. Reorder with `Reorder.Group`.
- **Totals**: numbers do a short count-up/down (150ms) when they change; no bounce.
- **Preview**: no animation on each keystroke. Only a subtle highlight (accent-soft background fading out over 600ms) on the preview region whose field just changed, debounced 400ms.
- **Modals/sheets**: scale 0.98 → 1 + fade, 200ms. Mobile sheets slide up.
- **Login page**: the one place for a richer moment. A slow GSAP timeline: a stylised invoice paper outline draws in (SVG stroke) and line items appear one by one beside the sign-in form. Under 1.5s total, plays once.
- **Lenis smooth scroll**: on long single-scroll pages (login/marketing, settings, invoice list). **Do not** apply Lenis to the editor's two independent scroll columns, modals, comboboxes or anything with `overflow: auto` inside — use `data-lenis-prevent` there.
- `prefers-reduced-motion: reduce` → disable transforms, keep only opacity at 0–100ms, disable Lenis and GSAP timelines.

## 9. Accessibility & quality

- Contrast AA for all text (placeholders ≥ 3:1). Focus visible on every interactive element.
- Full keyboard use of the editor: Tab order follows visual order, `Enter` in the last item row adds a new row, `Ctrl/Cmd+S` saves, `Ctrl/Cmd+P` downloads PDF.
- Touch targets ≥ 44px on mobile.
- Every icon-only button has `aria-label`.
- Use Indian number formatting everywhere: `₹1,00,000.00` via `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Dates shown as `04 Oct 2026` in the app and on the invoice (unambiguous), stored as ISO dates.
