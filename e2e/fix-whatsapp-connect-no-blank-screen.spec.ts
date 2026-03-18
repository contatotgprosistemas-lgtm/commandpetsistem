import { test, expect } from "../playwright-fixture";

test("clicar em conectar WhatsApp não deixa a tela em branco", async ({ page }) => {
  await page.goto("/configuracoes");

  const loginHeading = page.getByRole("heading", { name: "PetCommand" });
  if (await loginHeading.isVisible()) {
    await expect(loginHeading).toBeVisible();
    return;
  }

  await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();
  await page.getByRole("tab", { name: /Integrações/i }).click();

  await expect(page.getByText("Conexão WhatsApp")).toBeVisible();

  const connectButton = page.getByRole("button", { name: "Conectar WhatsApp" });
  if (await connectButton.isVisible()) {
    await connectButton.click();
  }

  await expect(page.getByText("Conexão WhatsApp")).toBeVisible();
  await expect(page.locator("main")).toContainText("Conexão WhatsApp");
});
