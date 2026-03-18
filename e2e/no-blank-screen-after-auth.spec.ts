import { test, expect } from "../playwright-fixture";

test("carrega Dashboard sem tela branca", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("carrega Pets sem tela branca", async ({ page }) => {
  await page.goto("/pets");
  await expect(page.getByRole("heading", { name: "Pets" })).toBeVisible();
});

test("carrega Agenda sem tela branca", async ({ page }) => {
  await page.goto("/agenda");
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
});

test("carrega Financeiro sem tela branca", async ({ page }) => {
  await page.goto("/financeiro");
  await expect(page.getByRole("heading", { name: "Financeiro" })).toBeVisible();
});

test("carrega Contatos sem tela branca", async ({ page }) => {
  await page.goto("/clientes");
  await expect(page.getByRole("heading", { name: "Contatos" })).toBeVisible();
});

test("carrega Integrações em Configurações sem tela branca", async ({ page }) => {
  await page.goto("/configuracoes");
  await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();
  await page.getByRole("tab", { name: /Integrações/ }).click();
  await expect(page.getByText("Outras Integrações")).toBeVisible();
});
