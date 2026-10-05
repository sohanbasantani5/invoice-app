# 01 — Product Spec

## 1. Goal

A calm, fast, professional invoicing tool for one Indian freelancer (video editing, graphic design and similar services). Personal first, but built cleanly enough to open to other users later (multi-user via `user_id` + RLS from day one).

**Success = creating a correct, beautiful invoice takes under 60 seconds for a repeat client.**

## 2. The user

- A solo freelancer, often **not GST-registered** today, may register later.
- Bills individuals, agencies, NGOs and brands, mostly within Maharashtra (state code 27), sometimes other states, occasionally clients abroad.
- Works on laptop and phone. Wants things that look designed, not "AI-generated".

## 3. Core user flows

### Flow A — First time
1. Land on `/` → if not signed in, show the **Sign-in page** (email + password, magic link, and "Continue with Google" if configured).
2. After first sign-in → **Onboarding** (3 short steps, can skip and finish later from Settings):
   - Step 1 **Business**: Business / trade name, your legal name, email, phone, logo (optional).
   - Step 2 **Address & tax**: address, city, state (dropdown with GST state code auto-filled), PIN, GST status (Not registered / Regular / Composition), GSTIN (if registered), PAN.
   - Step 3 **Payments & defaults**: bank details, UPI ID (generates a UPI QR on invoices), default payment terms (e.g. 7 days), default notes, invoice number prefix.
3. Land on **Dashboard**.

### Flow B — Create an invoice (main flow)
1. Dashboard → big **"New invoice"** button (also `N` keyboard shortcut and in the command menu `Ctrl/Cmd+K`).
2. Opens the **Invoice Editor** (`/invoices/new`): left = form, right = live A4 preview. On mobile: form on top, a sticky "Preview" toggle/tab to see the invoice below or in a sheet.
3. Seller details are pre-filled from the profile (collapsed card "From: Sample Owner · Edit").
4. **Client**: a combobox. Type to search saved clients; pick one to fill all fields; or "+ Add new client" to type details inline. New clients are saved to the client list automatically on invoice save (checkbox "Save client for next time", on by default).
5. **Items**: each line = description, SAC/HSN, qty, unit, rate, discount (optional), GST rate.
   - The description field is a **combobox with autocomplete from saved items**. Typing "P" shows "Podcast edit". Selecting it fills SAC, unit, rate and GST rate. Every new description is saved to the item library on invoice save.
   - Add line / remove line / drag to reorder.
6. **Tax**: per-line GST dropdown (see 04-COMPLIANCE). CGST+SGST or IGST is decided automatically from place of supply.
7. **Totals** update instantly: subtotal, discount, taxable value, CGST/SGST or IGST, round-off (toggle), total, amount in words, optional TDS line ("Amount payable after TDS").
8. **Extras**: notes, terms, bank/UPI block toggle, signature toggle.
9. Actions bar (sticky): **Save draft** (also auto-save every few seconds), **Download PDF**, **Mark as sent**, **More** (duplicate, delete).
10. A small **compliance checklist** badge shows e.g. "3 recommended fields missing". Clicking it lists them and scrolls to each field. It never blocks anything.

### Flow C — Manage
- **Invoices list**: search, filter by status (Draft, Sent, Paid, Overdue, Cancelled), by client, by date range; sort by date/amount; row actions: open, duplicate, download, mark paid, cancel.
- **Mark as paid**: date + method (UPI, bank transfer, cash, other) + reference. Partial payments allowed (shows balance due).
- **Overdue**: computed automatically when due date has passed and status is Sent.
- **Clients**: list, add, edit, see a client's invoices and total billed.
- **Items library**: list, edit, delete saved services (name, SAC, unit, rate, GST).
- **Settings**: Profile (business, address, tax), Payments (bank, UPI), Invoice defaults (prefix, next number preview, terms, notes, round-off default, template accent), Account (email, password, sign out, export all data as CSV/JSON).

## 4. Screens (routes)

| Route | Screen |
|---|---|
| `/login` | Sign-in / sign-up / magic link / forgot password |
| `/onboarding` | 3-step business setup |
| `/dashboard` | Stats + recent invoices + quick actions |
| `/invoices` | Invoice list |
| `/invoices/new` | Editor (new) |
| `/invoices/[id]` | Editor (existing) |
| `/invoices/[id]/print` | Clean print view (fallback PDF path) |
| `/clients`, `/clients/[id]` | Clients |
| `/items` | Saved items library |
| `/settings` | Settings tabs |

Unauthenticated users hitting any app route are redirected to `/login`. Signed-in users without a profile go to `/onboarding`.

## 5. Dashboard content

- 4 stat cards: **Invoiced this FY**, **Received**, **Outstanding**, **Overdue** (count + amount). Indian FY = 1 April to 31 March.
- Small bar chart: billed per month for the current FY.
- Recent invoices (last 6) with status pills.
- Quick actions: New invoice, Add client.
- Friendly empty states with a single clear call to action.

## 6. Extra features (include — they make it "complete")

- **Duplicate invoice** (new number, today's date, same lines).
- **Command menu** (`Ctrl/Cmd+K`): new invoice, go to client, search invoice by number.
- **Invoice numbering**: per Indian financial year, e.g. `SB/2026-27/001`. Prefix editable. Auto-increments, unique per user, max 16 characters (legal limit). Manual override allowed with duplicate check.
- **Document types**: Tax Invoice, Bill of Supply, Invoice (unregistered), plus **Credit Note** later. Chosen automatically from GST status, can be overridden.
- **Currency**: INR default; for export clients allow USD/EUR/GBP display with "Export of services" label (Phase 5).
- **UPI QR** on the invoice from the UPI ID + amount (`upi://pay?pa=...&pn=...&am=...&cu=INR&tn=<invoice no>`).
- **Share**: copy a summary text for WhatsApp/email with amount, due date and UPI ID.
- **Data export**: CSV of invoices for the accountant.
- **Dark mode** for the app UI (the invoice paper is always white).

## 7. Out of scope (for now)

Email sending from the app, recurring invoices, payment gateway, e-invoicing (IRN; only needed above ₹5 crore turnover), multi-business per account, team members. Design the schema so these can be added later.
