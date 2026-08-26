import "dotenv/config";

import { expect, test } from "@playwright/test";

test("public catalog is available without authentication", async ({ page }) => {
  await page.goto("/catalogo");

  await expect(page.getByRole("heading", { name: "Encontre o mix certo para sua loja." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Área do cliente" })).toHaveAttribute("href", "/login?callbackUrl=/catalogo");
  await expect(page.getByText("Nenhum produto encontrado")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("catalog controls adapt to the viewport", async ({ page, isMobile }) => {
  await page.goto("/catalogo");

  const filterButton = page.getByRole("button", { name: /^Filtros/ });
  if (isMobile) {
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    await expect(page.getByRole("heading", { name: "Filtrar catálogo" })).toBeVisible();
  } else {
    await expect(filterButton).toBeHidden();
    await expect(page.getByLabel("Coleção")).toBeVisible();
  }
});

test("super admin can access catalog management", async ({ page }) => {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  test.skip(!email || !password, "Admin credentials are not configured.");

  await page.goto("/login?callbackUrl=/admin/produtos/familias");
  await page.getByLabel("E-mail").fill(email!);
  await page.getByLabel("Senha").fill(password!);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/admin\/produtos\/familias$/);
  await expect(page.getByRole("heading", { name: "Famílias" })).toBeVisible();
  await expect(page.getByText(/^\d+ famílias$/)).toBeVisible();

  await page.getByRole("link", { name: "Abrir" }).first().click();
  await expect(page.getByRole("heading", { name: "Apresentação da família" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar família" })).toBeVisible();

  await page.getByRole("link", { name: "Coleções" }).click();
  await expect(page.getByRole("heading", { name: "Coleções" })).toBeVisible();
  await expect(page.getByText("Colchas e edredons", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Editar" }).first().click();
  await expect(page.getByRole("button", { name: "Selecionar capa" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Salvar coleção" })).toBeVisible();

  await page.getByRole("link", { name: "Tabela" }).click();
  await expect(page.getByRole("heading", { name: "Tabela comercial" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Validar arquivo" })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "tabela-teste.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("referencia,preco_comercial,custo\n01901607001-7.1426,123.45,80.00\n"),
  });
  await page.getByRole("button", { name: "Validar arquivo" }).click();
  await expect(page.getByText("Arquivo validado. Nenhum dado foi alterado.")).toBeVisible();
});
