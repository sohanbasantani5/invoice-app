import { expect, test, type Page } from "@playwright/test";
import { PDFParse } from "pdf-parse";
import fs from "node:fs";

// Needs migrations applied and an onboarded test account:
//   E2E_EMAIL=...  E2E_PASSWORD=...  npm run test:e2e
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page).toHaveURL(/\/dashboard/);
}

const squash = (s: string) => s.replace(/\s+/g, "");

test.describe("invoice flow", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run against a real Supabase project");
  test.describe.configure({ mode: "serial" });

  const client = `E2E Client ${Date.now()}`;

  test("create → preview → save → PDF matches preview", async ({ page }) => {
    await signIn(page);
    await page.goto("/invoices/new");
    await page.locator("#buyer-name:visible").fill(client);
    await page.locator("#line-0-name:visible").fill("Podcast edit");
    await page.locator("#line-0-rate:visible").fill("4000");
    await expect(page.locator(".invoice-paper")).toContainText("4,000.00");
    await page.getByRole("button", { name: "Save", exact: true }).first().click();
    await expect(page.getByText(/^Saved [A-Za-z0-9-]+\/\S+/).first()).toBeVisible();
    await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}\/edit$/);

    const paper = await page.locator(".invoice-paper").innerText();
    const number = (await page.locator("#invoice_number:visible").inputValue()).trim();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Download/ }).first().click(),
    ]);
    const file = await download.path();
    const text = (await new PDFParse({ data: fs.readFileSync(file) }).getText()).text;
    for (const s of [number, client, "Podcast edit"]) {
      expect(text).toContain(s);
      expect(paper).toContain(s);
    }
    const total = paper.match(/Total\s+(₹[\d,]+\.\d{2})/)?.[1];
    expect(total).toBeTruthy();
    expect(text).toContain(total!);
    const words = paper.match(/Indian Rupees[^\n]+Only/)?.[0];
    expect(squash(text)).toContain(squash(words!));
  });

  test("second invoice: typing P suggests Podcast edit and fills the line", async ({ page }) => {
    await signIn(page);
    await page.goto("/invoices/new");
    await page.locator("#line-0-name:visible").click();
    await page.keyboard.type("P");
    await expect(page.getByRole("option", { name: /Podcast edit/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#line-0-rate:visible")).toHaveValue("4000");
  });

  test("list → view → status control → edit → email → duplicate", async ({ page, context }) => {
    await signIn(page);
    await page.goto("/invoices");
    await page.getByRole("link", { name: new RegExp(client) }).first().click(); // draft → editor
    await page.getByRole("link", { name: "Back to invoice" }).click();
    await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/);

    // One status control: Draft → Paid directly records a full payment.
    const status = page.getByRole("radiogroup", { name: "Invoice status" });
    await status.getByRole("radio", { name: "Paid" }).click();
    await page.getByRole("button", { name: "Mark as paid" }).click();
    await expect(page.getByText(/is now paid/)).toBeVisible();
    await expect(status.getByRole("radio", { name: "Paid" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("heading", { name: "Payments" })).toBeVisible();

    // Away from Paid asks first, then removes the payment.
    page.once("dialog", (d) => void d.accept());
    await status.getByRole("radio", { name: "Sent" }).click();
    await expect(page.getByText(/is now sent/)).toBeVisible();
    await expect(page.getByText("Balance due").first()).toBeVisible();

    // Edit keeps the number and shows the calm note for sent invoices.
    await page.getByRole("link", { name: "Edit", exact: true }).click();
    await expect(page.getByText("This invoice was already sent.")).toBeVisible();
    const number = await page.locator("#invoice_number:visible").inputValue();
    await page.locator("#line-0-rate:visible").fill("5000");
    await page.getByRole("button", { name: "Save", exact: true }).first().click();
    await expect(page.getByText(/^Saved [A-Za-z0-9-]+\/\S+/).first()).toBeVisible();
    expect(await page.locator("#invoice_number:visible").inputValue()).toBe(number);
    await expect(page.locator(".invoice-paper")).toContainText("5,000.00");

    // Email: Gmail compose opens in a new tab with everything URL-encoded.
    await context.route("https://mail.google.com/**", (r) => r.fulfill({ body: "gmail" }));
    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /^Email/ }).first().click(),
    ]);
    await popup.waitForURL(/mail\.google\.com\/mail\/\?view=cm/);
    const u = new URL(popup.url());
    expect(u.searchParams.get("su")).toContain(number); // wording depends on the saved template (email.spec.ts covers it)
    expect(u.searchParams.get("body")).toContain(number);
    await expect(page.getByText(/Drag it into the Gmail window/)).toBeVisible();
    await popup.close();

    await page.goto(page.url().replace(/\/edit$/, ""));
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page).toHaveURL(/\/invoices\/new\?from=/);
    await expect(page.locator("#buyer-name:visible")).toHaveValue(client);
  });
});
