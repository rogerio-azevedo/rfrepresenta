import { expect, test } from "@playwright/test";

test("public site exposes the restricted-area entry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Área do cliente" }).first()).toBeVisible();
});

test("protected admin route redirects to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("product management route remains protected", async ({ page }) => {
  await page.goto("/admin/produtos");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin%2Fprodutos/);
});

test("login form remains usable on narrow screens", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});
