import { expect, test } from "@playwright/test";

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/invoices");
  await expect(page).toHaveURL(/\/login\?next=%2Finvoices/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("login shows a friendly error for a bad email", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("whatever1");
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
});

// Full flow: needs migrations applied and Supabase "Confirm email" turned OFF
// (otherwise sign-up waits for the email link). Uses a fresh address each run.
const email = process.env.E2E_NEW_EMAIL; // e.g. e2e+<timestamp>@yourdomain.com
const password = "e2e-Passw0rd!";

test("new account: sign up → onboarding → sign out → sign in → dashboard", async ({ page }) => {
  test.skip(!email, "Set E2E_NEW_EMAIL to run against a real Supabase project");
  await page.goto("/login");
  await page.getByRole("tab", { name: "Sign up" }).click();
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByLabel(/Business \/ trade name/).fill("E2E Studio");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Address line 1").fill("Flat 4, Sample Apartments");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/settings?tab=account");
  await page.getByRole("button", { name: "Sign out" }).last().click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page).toHaveURL(/\/dashboard/);
});
