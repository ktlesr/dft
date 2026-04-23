import { expect, test } from "@playwright/test";

/**
 * Happy-path auth smoke:
 *   1. unauthenticated visit to /panel is middleware-redirected to /giris
 *   2. submitting seed admin credentials completes sign-in
 *   3. /panel renders with the authenticated dashboard header
 *
 * Requires the seed admin user (`admin@dft.local` / `Admin!2026Dev`) from
 * `prisma/seed.ts`. Run `pnpm db:seed` once before the suite.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@dft.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin!2026Dev";

test("anonymous access is redirected away from /panel", async ({ page }) => {
  const response = await page.goto("/panel");
  // Either middleware redirected us server-side or Next streamed the redirect;
  // either way we must end up on /giris with a redirect back param.
  await expect(page).toHaveURL(/\/giris/);
  expect(response?.ok()).toBeTruthy();
});

test("credentials login lands on /panel with admin context", async ({ page }) => {
  await page.goto("/giris");

  await expect(page.getByRole("heading", { name: /portala giriş yap/i })).toBeVisible();

  await page.getByLabel("E-posta").fill(ADMIN_EMAIL);
  await page.getByLabel("Şifre", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /^giriş yap$/i }).click();

  await page.waitForURL("**/panel", { timeout: 15_000 });

  // Dashboard greeting renders user's first name
  await expect(page.getByRole("heading", { name: /hoş geldiniz/i })).toBeVisible();

  // Sidebar shows admin-only link
  await expect(page.getByRole("link", { name: /yönetim paneli/i })).toBeVisible();
});

test("bad credentials stay on /giris and surface an error", async ({ page }) => {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(ADMIN_EMAIL);
  await page.getByLabel("Şifre", { exact: true }).fill("definitely-wrong-password");
  await page.getByRole("button", { name: /^giriş yap$/i }).click();

  // React Server Action path keeps the user on /giris; an alert appears.
  await expect(page).toHaveURL(/\/giris/);
  await expect(page.getByRole("alert")).toContainText(/e-posta veya şifre hatalı/i);
});
