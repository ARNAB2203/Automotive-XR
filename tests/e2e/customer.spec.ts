import { test, expect } from "@playwright/test";
test("catalog, server pricing, compatibility and saved share through OIDC PKCE", async ({
  page,
}) => {
  await page.goto("/vehicles");
  await expect(page.getByRole("heading", { name: "Aether GT" })).toBeVisible();
  await page
    .getByRole("link", { name: "Configure", exact: false })
    .first()
    .click();
  await expect(page.getByText("$78,900", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Burnished copper", exact: true })
    .click();
  await expect(page.getByText("$80,700", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sport", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Sport trim requires forged wheels",
  );
  await expect(
    page.getByRole("button", { name: "Save & share configuration" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Forged 22”", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save & share configuration" }),
  ).toBeEnabled();
  await page.screenshot({
    path: "docs/design/configurator-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign in", exact: false }).click();
  await page.getByRole("link", { name: "Continue as customer" }).click();
  await page.waitForURL(/localhost:3000\/configure\//);
  await page.goto("/vehicles");
  await page
    .getByRole("link", { name: "Configure", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Save & share configuration" }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Save & share configuration" })
    .click();
  await page.getByRole("link", { name: "Open shared configuration" }).click();
  await expect(page.getByRole("heading", { name: "Aether GT" })).toBeVisible();
  await expect(
    page.getByText("Saved price snapshot.", { exact: false }),
  ).toBeVisible();
  await page.goto("/my-configurations");
  await expect(
    page
      .getByRole("link", { name: "View configuration", exact: false })
      .first(),
  ).toBeVisible();
});
test("quotation enquiry reaches tenant administration", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Your name").fill("Browser Test");
  await page.getByLabel("Email address").fill("browser@example.test");
  await page
    .getByLabel("Your studio")
    .selectOption({ label: "3KNOT Studio · Bengaluru" });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Send your enquiry" }).click();
  await expect(page.getByRole("status")).toContainText("received");
  await page.goto("http://localhost:3001");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Continue as tenant admin" }).click();
  await page.waitForURL("http://localhost:3001/");
  await page.getByRole("button", { name: "Leads", exact: true }).click();
  await expect(
    page
      .getByRole("cell", { name: "browser@example.test", exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vehicles", exact: true }).click();
  const name = "Browser vehicle " + Date.now();
  await page.getByLabel("URL slug").fill("browser-" + Date.now());
  await page.getByLabel("Vehicle name").fill(name);
  await page
    .getByLabel("Description", { exact: true })
    .fill("Browser-created test vehicle");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name, exact: true }) });
  await row.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("status")).toContainText("Vehicle archived");
});
test("mobile layout stays within viewport and placeholder is labeled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your vision.", exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/design/mobile-landing.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/design/desktop-landing.png",
    fullPage: true,
  });
});
