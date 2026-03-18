import { test, expect } from "../playwright-fixture";

async function expectPageOrLogin(page: Parameters<typeof test>[0] extends never ? never : any, heading: string) {
  const loginHeading = page.getByRole("heading", { name: "PetCommand" });
  const routeHeading = page.getByRole("heading", { name: heading });
  await expect(loginHeading.or(routeHeading)).toBeVisible();
}

test("Dashboard não fica em branco", async ({ page }) => {
  await page.goto("/");
  await expectPageOrLogin(page, "Dashboard");
});

test("Pets não fica em branco", async ({ page }) => {
  await page.goto("/pets");
  await expectPageOrLogin(page, "Pets");
});

test("Agenda não fica em branco", async ({ page }) => {
  await page.goto("/agenda");
  await expectPageOrLogin(page, "Agenda");
});

test("Financeiro não fica em branco", async ({ page }) => {
  await page.goto("/financeiro");
  await expectPageOrLogin(page, "Financeiro");
});

test("Contatos não fica em branco", async ({ page }) => {
  await page.goto("/clientes");
  await expectPageOrLogin(page, "Contatos");
});

test("Configurações/Integrações não fica em branco", async ({ page }) => {
  await page.goto("/configuracoes");

  const loginHeading = page.getByRole("heading", { name: "PetCommand" });
  if (await loginHeading.isVisible()) {
    await expect(loginHeading).toBeVisible();
    return;
  }

  await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();
  await page.getByRole("tab", { name: /Integrações/ }).click();
  await expect(page.getByText("Outras Integrações")).toBeVisible();
});
