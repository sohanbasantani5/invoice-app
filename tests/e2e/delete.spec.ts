import { expect, test, type Page } from "@playwright/test";

// Needs an onboarded test account (E2E_EMAIL / E2E_PASSWORD) and, for the "really gone" checks,
// NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (test-only, never used by the app in the browser).
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Creates a saved draft through the UI. Returns its id and number. */
async function makeDraft(page: Page, client: string) {
  await page.goto("/invoices/new");
  await page.locator("#buyer-name:visible").fill(client);
  await page.locator("#line-0-name:visible").fill("Delete test");
  await page.locator("#line-0-rate:visible").fill("100");
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}\/edit$/);
  await expect(page.getByText(/^Saved [A-Za-z0-9-]+\/\S+/).first()).toBeVisible();
  const id = page.url().match(/invoices\/([0-9a-f-]{36})/)![1];
  const number = (await page.locator("#invoice_number:visible").inputValue()).trim();
  return { id, number };
}

const rest = async (path: string) => {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: SR!, Authorization: `Bearer ${SR}` } });
  return (await r.json()) as unknown[];
};
const row = (page: Page, client: string) => page.getByRole("row", { name: new RegExp(client) });

test.describe("delete invoices", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD");
  test.describe.configure({ mode: "serial" });
  const tag = `Del${Date.now()}`;

  test("draft from a list row: confirm → Undo restores → delete again → gone for good", async ({ page }) => {
    await signIn(page);
    const a = await makeDraft(page, `${tag} A`);
    await page.goto("/invoices");
    await row(page, `${tag} A`).getByRole("button", { name: /Actions for/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).toContainText(`Delete draft ${a.number}?`);
    await expect(page.getByRole("dialog")).toContainText("8 seconds to undo");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden(); // modal: the rows are not reachable until it closes
    await expect(row(page, `${tag} A`)).toHaveCount(0);
    expect(await rest(`invoices?id=eq.${a.id}&select=id`)).toHaveLength(0);

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Restored")).toBeVisible();
    await expect(row(page, `${tag} A`)).toHaveCount(1);
    const back = (await rest(`invoices?id=eq.${a.id}&select=invoice_number`)) as { invoice_number: string }[];
    expect(back[0].invoice_number).toBe(a.number);
    expect(await rest(`invoice_items?invoice_id=eq.${a.id}&select=id`)).toHaveLength(1);

    await row(page, `${tag} A`).getByRole("button", { name: /Actions for/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(row(page, `${tag} A`)).toHaveCount(0);
    await page.waitForTimeout(8500); // undo window over
    await page.reload();
    await expect(row(page, `${tag} A`)).toHaveCount(0);
    expect(await rest(`invoices?id=eq.${a.id}&select=id`)).toHaveLength(0);
  });

  test("bulk: select two drafts → Delete selected", async ({ page }) => {
    await signIn(page);
    const b = await makeDraft(page, `${tag} B`);
    const c = await makeDraft(page, `${tag} C`);
    await page.goto("/invoices");
    await row(page, `${tag} B`).getByRole("checkbox").check();
    await row(page, `${tag} C`).getByRole("checkbox").check();
    await expect(page.getByText("2 selected")).toBeVisible();
    await page.getByRole("button", { name: "Delete selected" }).click();
    await expect(page.getByRole("dialog")).toContainText("Delete 2 drafts?");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(row(page, `${tag} B`)).toHaveCount(0);
    await expect(row(page, `${tag} C`)).toHaveCount(0);
    expect(await rest(`invoices?id=in.(${b.id},${c.id})&select=id`)).toHaveLength(0);
  });

  test("paid invoice from its page: typed number required; payments and PDF go too", async ({ page, context }) => {
    await signIn(page);
    const d = await makeDraft(page, `${tag} D`);
    await page.goto(`/invoices/${d.id}`);
    await page.getByRole("radiogroup", { name: "Invoice status" }).getByRole("radio", { name: "Paid" }).click();
    await page.getByRole("button", { name: "Mark as paid" }).click();
    await expect(page.getByText(/is now paid/)).toBeVisible();
    expect(await rest(`payments?invoice_id=eq.${d.id}&select=id`)).toHaveLength(1);

    // Email makes the stored PDF (normal way, no Gmail connected on the test account).
    await context.route("https://mail.google.com/**", (r) => r.fulfill({ body: "gmail" }));
    const [popup] = await Promise.all([context.waitForEvent("page"), page.getByRole("button", { name: /^Email/ }).first().click()]);
    await popup.waitForURL(/mail\.google\.com/);
    await popup.close();
    const uid = (await rest(`invoices?id=eq.${d.id}&select=user_id`)) as { user_id: string }[];
    const pdfUrl = `${SB}/storage/v1/object/info/invoice-pdfs/${uid[0].user_id}/${d.id}.pdf`;
    const pdfBefore = await fetch(pdfUrl, { headers: { apikey: SR!, Authorization: `Bearer ${SR}` } });
    expect(pdfBefore.status).toBe(200);

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("gap in your invoice number sequence");
    await expect(dialog).toContainText("Cancel");
    const confirm = dialog.getByRole("button", { name: "Delete permanently" });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(`Type ${d.number} to confirm`).fill("wrong");
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(`Type ${d.number} to confirm`).fill(d.number);
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page).toHaveURL(/\/invoices$/);

    expect(await rest(`invoices?id=eq.${d.id}&select=id`)).toHaveLength(0);
    expect(await rest(`payments?invoice_id=eq.${d.id}&select=id`)).toHaveLength(0);
    expect(await rest(`invoice_items?invoice_id=eq.${d.id}&select=id`)).toHaveLength(0);
    const pdfAfter = await fetch(pdfUrl, { headers: { apikey: SR!, Authorization: `Bearer ${SR}` } });
    expect(pdfAfter.status).toBeGreaterThanOrEqual(400);
  });

  test("sent invoice from a list row, and a mixed bulk (needs DELETE typed)", async ({ page }) => {
    await signIn(page);
    const e = await makeDraft(page, `${tag} E`);
    const f = await makeDraft(page, `${tag} F`);
    const g = await makeDraft(page, `${tag} G`);
    // E becomes Cancelled, F becomes Sent
    for (const [inv, to] of [[e, "More"], [f, "Sent"]] as const) {
      await page.goto(`/invoices/${inv.id}`);
      const group = page.getByRole("radiogroup", { name: "Invoice status" });
      if (to === "Sent") await group.getByRole("radio", { name: "Sent" }).click();
      else {
        page.once("dialog", (d) => void d.accept());
        await group.getByRole("button", { name: "More statuses" }).click();
        await page.getByRole("menuitem", { name: "Cancelled" }).click();
      }
      await expect(page.getByText(/is now (sent|cancelled)/)).toBeVisible();
    }
    await page.goto("/invoices");
    // Cancelled invoice: same strong flow, from its row
    await row(page, `${tag} E`).getByRole("button", { name: /Actions for/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByLabel(`Type ${e.number} to confirm`).fill(e.number);
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(row(page, `${tag} E`)).toHaveCount(0);
    expect(await rest(`invoices?id=eq.${e.id}&select=id`)).toHaveLength(0);

    // Mixed bulk: one sent + one draft
    await row(page, `${tag} F`).getByRole("checkbox").check();
    await row(page, `${tag} G`).getByRole("checkbox").check();
    await page.getByRole("button", { name: "Delete selected" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Delete 2 invoices?");
    await dialog.getByLabel("Type DELETE to confirm").fill(f.number);
    await expect(dialog.getByRole("button", { name: "Delete permanently" })).toBeDisabled();
    await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
    await dialog.getByRole("button", { name: "Delete permanently" }).click();
    await expect(dialog).toBeHidden();
    await expect(row(page, `${tag} F`)).toHaveCount(0);
    await expect(row(page, `${tag} G`)).toHaveCount(0);
    expect(await rest(`invoices?id=in.(${f.id},${g.id})&select=id`)).toHaveLength(0);
  });

  test("editor More menu → Delete a draft", async ({ page }) => {
    await signIn(page);
    const h = await makeDraft(page, `${tag} H`);
    await page.getByRole("button", { name: "More actions" }).first().click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/invoices$/);
    expect(await rest(`invoices?id=eq.${h.id}&select=id`)).toHaveLength(0);
  });
});
