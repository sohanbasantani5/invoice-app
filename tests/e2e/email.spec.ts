import { expect, test } from "@playwright/test";

// Needs migration 0002 applied and an onboarded test account (E2E_EMAIL / E2E_PASSWORD).
// Expired-link check also needs SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (test-only, never in the app).
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("email invoice", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD");
  test.describe.configure({ mode: "serial" });

  test("template saves, Email builds a working signed link, bad links are refused", async ({ page, context, request }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Settings → Email: save a custom subject, reload, it persists.
    const subject = `Bill {invoice_no} from {my_name} [${Date.now()}]`;
    await page.goto("/settings?tab=email");
    await page.locator("#email_subject_template:visible").fill(subject);
    await page.getByRole("button", { name: /^Save/ }).click();
    await expect(page.getByText(/Saved|saved/).first()).toBeVisible();
    await page.reload();
    await expect(page.locator("#email_subject_template:visible")).toHaveValue(subject);

    // Open the seeded invoice and click Email.
    await page.goto("/invoices");
    await page.getByRole("link", { name: /Acme/ }).first().click();
    if (/\/edit$/.test(page.url())) await page.getByRole("link", { name: "Back to invoice" }).click();
    await context.route("https://mail.google.com/**", (r) => r.fulfill({ body: "gmail" }));
    const [popup] = await Promise.all([context.waitForEvent("page"), page.getByRole("button", { name: /^Email/ }).first().click()]);
    await popup.waitForURL(/mail\.google\.com\/mail\/\?view=cm/);
    const u = new URL(popup.url());
    expect(u.searchParams.get("authuser")).toBe(email);
    expect(u.searchParams.get("to")).toBe("acme@example.com");
    expect(u.searchParams.get("su")).toMatch(/^Bill TST\/2026-27\/001 from Test Person \[\d+\]$/);
    const body = u.searchParams.get("body")!;
    expect(body).toContain("Hi Acme,");
    expect(body).not.toMatch(/UPI|HDFC|123456|9999999999/); // payment details stay on the invoice
    const link = body.match(/View invoice: (\S+)/)?.[1];
    expect(link, "body has a View invoice link").toBeTruthy();
    expect(link).toContain("/storage/v1/object/sign/invoice-pdfs/");
    expect(new URL(link!).searchParams.get("token")).toBeTruthy();
    await expect(page.getByText(/Drag it into the Gmail window/)).toBeVisible();

    // The link opens the PDF with no login.
    const ok = await request.get(link!);
    expect(ok.status()).toBe(200);
    expect(ok.headers()["content-type"]).toContain("application/pdf");
    expect((await ok.body()).subarray(0, 5).toString()).toBe("%PDF-");

    // Tampered token, no token, and the bare object path are refused.
    const url = new URL(link!);
    const bad = new URL(link!);
    bad.searchParams.set("token", url.searchParams.get("token")!.slice(0, -4) + "AAAA");
    expect((await request.get(bad.toString())).status()).toBeGreaterThanOrEqual(400);
    const none = new URL(link!);
    none.searchParams.delete("token");
    expect((await request.get(none.toString())).status()).toBeGreaterThanOrEqual(400);
    const pub = link!.replace("/object/sign/", "/object/public/").split("?")[0];
    expect((await request.get(pub)).status()).toBeGreaterThanOrEqual(400);

    // Expired link (6-second signed URL minted with the service key, test-only) is refused.
    const sr = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (sr) {
      const base = url.origin;
      const objectPath = decodeURIComponent(url.pathname.split("/object/sign/invoice-pdfs/")[1]);
      const r = await request.post(`${base}/storage/v1/object/sign/invoice-pdfs/${objectPath}`, {
        headers: { apikey: sr, Authorization: `Bearer ${sr}` },
        data: { expiresIn: 6 },
      });
      const short = base + "/storage/v1" + (await r.json()).signedURL;
      expect((await request.get(short)).status()).toBe(200);
      await page.waitForTimeout(7000);
      expect((await request.get(short)).status()).toBeGreaterThanOrEqual(400);
    }
  });
});
