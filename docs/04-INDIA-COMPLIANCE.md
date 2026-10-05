# 04 — India Invoice Compliance & Field Spec

> Source of truth for legal fields, GST logic and every form field.
> Based on Section 31 CGST Act + Rule 46 CGST Rules 2017 and the GST rate structure in force since 22 Sep 2025 ("GST 2.0"). This is product logic, not legal advice; the app should show a small "Check with your CA for special cases" link in the compliance panel.

## 1. Guiding principle

The app **knows** what a legally complete invoice needs and **shows** it, but **never forces** it. The user can always save and download. Missing items appear in the compliance checklist with a short reason.

## 2. Which document type?

Decided by `lib/invoice/doc-type.ts` from the seller's GST status (overridable per invoice in "Invoice details"):

| Seller GST status | Document title | Tax charged | Footer line |
|---|---|---|---|
| Not registered | **INVOICE** | None (all GST fields hidden, rate locked to 0) | "Supplier not registered under GST." |
| Regular | **TAX INVOICE** | CGST+SGST or IGST per line | "This is a computer-generated invoice." |
| Composition | **BILL OF SUPPLY** | None | "Composition taxable person, not eligible to collect tax on supplies." |
| Regular, all lines exempt/nil | **BILL OF SUPPLY** (suggest, don't force) | None | — |
| Any, refund/adjustment | **CREDIT NOTE** (Phase 5) | Mirrors original | References original invoice no. & date |

If an unregistered user tries to pick a GST rate above 0, show an inline note: "You can only charge GST after registering. Add your GSTIN in Settings to enable tax." (Rate stays 0.)

## 3. Mandatory particulars on a Tax Invoice (Rule 46) → where each lives

| # | Particular | App field | Notes |
|---|---|---|---|
| a | Supplier name, address, GSTIN | Profile → snapshot `seller` | |
| b | Consecutive serial number ≤ 16 chars, unique per financial year; letters, digits, `-` and `/` only | `invoice_number` | Auto `PREFIX/2026-27/001` |
| c | Date of issue | `issue_date` | |
| d | Recipient name, address, GSTIN (if registered) | `buyer` | |
| e | For **unregistered** recipient with taxable value **> ₹50,000**: name, address, delivery address, **state name & code** | `buyer` | Checklist flags it only above ₹50,000 |
| f | HSN (goods) / SAC (services) | line `sac_hsn` | Checklist: recommended for B2B |
| g | Description | line `name` + `description` | |
| h | Quantity + unit (goods) | line `quantity`, `unit` | Services can stay "1 nos" |
| i | Total value | calc | |
| j | Taxable value after discount | calc | |
| k | Rate of tax (CGST/SGST/IGST/cess) | line `gst_rate` | |
| l | Amount of tax per head | calc | |
| m | Place of supply with state name | `place_of_supply_code` | Inter-state → IGST |
| n | Delivery address if different from place of supply | `ship_to` | Optional, shown only if filled |
| o | Whether tax is payable on reverse charge | `reverse_charge` | Always printed on Tax Invoice ("No" by default) |
| p | Signature or digital signature of supplier / authorised rep | signature block | Image optional; "Authorised signatory" line always shown |

E-invoicing (IRN + QR from the government portal) applies only when aggregate turnover exceeds ₹5 crore. Out of scope; do not show it.

## 4. GST rates (dropdown per line)

Default options (in this order):
- **0% (Nil / Exempt)**
- **5%**
- **18%** ← default for services when seller is Regular
- **40%**

Under "More rates": 0.25%, 3% (niche goods). Do **not** show 12% or 28% (abolished from 22 Sep 2025).
Keep rates in `lib/india/gst-rates.ts` as data so they can be updated without code changes elsewhere.

Each option label shows the split, e.g. `18% (9% CGST + 9% SGST)` when intra-state, `18% IGST` when inter-state.

## 5. Intra vs inter-state

- Supplier state = `seller.state_code` (from profile; if seller has a GSTIN, derive from its first 2 digits).
- Place of supply default = client's state code; editable.
- `supplier state == place of supply` → CGST + SGST (half each). Otherwise → IGST.
- Client outside India → place of supply `96 – Other Countries`, tax = IGST at 0% with label "Export of services under LUT" (if user ticks "LUT filed") — Phase 5.

## 6. Validation rules (soft)

| Field | Rule | Message |
|---|---|---|
| GSTIN | `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$` (auto-uppercase, strip spaces) | "This doesn't look like a valid GSTIN (15 characters)." |
| GSTIN → auto-fill | chars 1–2 = state code, chars 3–12 = PAN | Auto-fill state and PAN if empty |
| GSTIN checksum | Implement the standard mod-36 checksum on the 15th char; mismatch = warning only | "Check digit doesn't match — please re-check." |
| PAN | `^[A-Z]{5}[0-9]{4}[A-Z]$` | "PAN is 10 characters, like ABCDE1234F." |
| PIN code | `^[1-9][0-9]{5}$` | |
| IFSC | `^[A-Z]{4}0[A-Z0-9]{6}$` | |
| UPI ID | `^[\w.\-]{2,256}@[a-zA-Z]{2,64}$` | |
| Invoice number | ≤16 chars, `^[A-Za-z0-9/\-]+$`, unique per user | Unique = hard error (only hard error besides empty item rate math) |
| Due date | ≥ issue date | warning |

Validation timing: on blur, never while typing. Format-invalid optional fields are warnings (amber), not errors.

## 7. Compliance checklist logic (`lib/invoice/compliance.ts`)

Returns `{ field, label, reason, severity: 'recommended' | 'required_for_gst' }[]`.

- Always recommended: client name, at least one item, seller address, issue date.
- Tax Invoice adds (`required_for_gst`): seller GSTIN, SAC/HSN on each line, place of supply, client GSTIN **if** client is marked "GST-registered business".
- Unregistered client + taxable > ₹50,000: client address and state.
- Recommended: client PAN when the client may deduct TDS (business clients), bank or UPI details, due date.

UI: badge in the editor action bar → "All set ✓" (green) or "3 to review" (amber). Never red.

## 8. Field-by-field form spec

Badge legend: **R** = Required (for a sensible document), **G** = needed on a GST Tax Invoice, **O** = Optional.

### Business profile (Onboarding + Settings)
| Field | Badge | Placeholder | Helper |
|---|---|---|---|
| Business / trade name | R | `Sample Business` | Shown at the top of every invoice |
| Legal name | O | `Sample Owner` | If different from business name |
| Email | O | `you@email.com` | |
| Phone | O | `+91 98765 43210` | |
| Address line 1 | R | `Flat 4, Sample Apartments` | |
| Address line 2 | O | `Station Road` | |
| City | R | `Mumbai` | |
| State | R | dropdown | Sets your GST state code |
| PIN code | O | `421503` | |
| GST status | R | Not registered / Regular / Composition | Decides document type |
| GSTIN | G | `27ABCDE1234F1Z0` | Only if GST-registered |
| PAN | O | `ABCDE1234F` | Clients often need it to deduct TDS |
| Logo | O | upload PNG/SVG ≤ 1 MB | |
| Signature | O | upload PNG (transparent) | |
| Bank name / A/C name / A/C no. / IFSC | O | `HDFC Bank` / `Sample Owner` / `50100XXXXXXXX` / `HDFC0001234` | Shown in the payment block |
| UPI ID | O | `name@okhdfcbank` | Adds a scan-to-pay QR |
| Invoice prefix | O | `SB` | Numbers look like SB/2026-27/001 |
| Default due days | O | `7` | |
| Default notes / terms | O | `Thank you for your business.` / `Payment due within 7 days.` | |

### Bill to (client)
| Field | Badge | Placeholder | Helper |
|---|---|---|---|
| Client / company name | R | `Sample Client` | |
| Client type | O | Individual / GST-registered business / Unregistered business / Overseas | Drives checklist rules |
| Contact person | O | `Alex` | |
| Email / phone | O | | |
| Address | O (R above ₹50k unregistered) | `Office 12, Andheri East` | |
| City / State / PIN | O | dropdown for state | State sets place of supply |
| Country | O | `India` | |
| GSTIN | G (if GST-registered business) | `27ABCDE1234F1Z0` | Needed so your client can claim GST credit |
| PAN | O | `ABCDE1234F` | |
| Save client for next time | — | checkbox, on | |

### Invoice details
| Field | Badge | Default |
|---|---|---|
| Document type | R | auto (§2) |
| Invoice number | R | auto next number |
| Issue date | R | today |
| Due date | O | issue date + default due days (quick chips: On receipt, 7, 15, 30 days) |
| Place of supply | G | client's state |
| Reverse charge | G (Tax Invoice only) | No |
| PO / reference no. | O | — |

### Line items
| Field | Badge | Placeholder |
|---|---|---|
| Item / service | R | `Podcast edit` (autocomplete from library) |
| Description | O | `Episode 12 – 45 min, colour + sound` |
| SAC / HSN | G | `999613` (with a small search of presets) |
| Qty | R | `1` |
| Unit | O | `nos` (options: nos, hrs, days, videos, reels, pcs, project) |
| Rate (₹) | R | `4,000` |
| Discount (₹) | O | `0` |
| GST % | G | per §4 |

### Payment & notes
Show bank details (toggle), show UPI QR (toggle), show signature (toggle), notes, terms, TDS toggle + rate (label editable; Indian income-tax section numbers changed under the new Income-tax Act from April 2026, so do **not** hard-code a section number — default label "TDS").

## 9. SAC presets (`lib/india/sac-presets.ts`)

Shown as suggestions in the SAC field (user can type any code):

| Code | Description | Typical GST |
|---|---|---|
| 999613 | Audiovisual post-production (video editing, colour, sound, VFX, subtitling) | 18% |
| 999612 | Video / film / programme production | 18% |
| 998383 | Photography & videography | 18% |
| 998391 | Specialty design services (incl. graphic design) | 18% |
| 998361 | Advertising services | 18% |
| 998314 | IT design & development (websites, apps) | 18% |
| 998399 | Other professional, technical & business services | 18% |
| 998596 | Event management | 18% |

Mark the list as "suggestions — confirm with your CA".

## 10. Indian states & GST codes (`lib/india/states.ts`)

01 Jammu & Kashmir · 02 Himachal Pradesh · 03 Punjab · 04 Chandigarh · 05 Uttarakhand · 06 Haryana · 07 Delhi · 08 Rajasthan · 09 Uttar Pradesh · 10 Bihar · 11 Sikkim · 12 Arunachal Pradesh · 13 Nagaland · 14 Manipur · 15 Mizoram · 16 Tripura · 17 Meghalaya · 18 Assam · 19 West Bengal · 20 Jharkhand · 21 Odisha · 22 Chhattisgarh · 23 Madhya Pradesh · 24 Gujarat · 26 Dadra & Nagar Haveli and Daman & Diu · 27 Maharashtra · 29 Karnataka · 30 Goa · 31 Lakshadweep · 32 Kerala · 33 Tamil Nadu · 34 Puducherry · 35 Andaman & Nicobar Islands · 36 Telangana · 37 Andhra Pradesh · 38 Ladakh · 97 Other Territory · 96 Other Countries (export)

Default state for new profiles: **27 Maharashtra**.

## 11. Amount in words

Indian numbering: "Indian Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty and Sixty Paise Only". Support up to 99,99,99,99,999. Unit-test 0, 1, 15, 100, 1,000, 1,00,000, 1,00,00,000 and paise.

## 12. Record keeping

- Never hard-delete a **sent/paid** invoice; offer **Cancel** (keeps number, shows "CANCELLED" watermark). Drafts can be deleted.
- Invoice number gaps are allowed for cancelled/deleted drafts; never reuse a number in the same FY.
- Numbering restarts each financial year (1 April).
- Data export (CSV) includes all GST columns needed for GSTR-1: invoice no., date, client GSTIN, place of supply, taxable value, rate, CGST, SGST, IGST, total.
