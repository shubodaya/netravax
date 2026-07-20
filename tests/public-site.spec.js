import { expect, test } from "@playwright/test";

const viewports = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 1000 },
  { width: 1920, height: 1080 }
];

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  expect(errors).toEqual([]);
});

test("homepage has company content, SEO and app links", async ({ page }) => {
  await expect(page).toHaveTitle(/Netravax Technologies/);
  await expect(page.getByRole("heading", { name: /Engineering secure/ })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://netravax.shubodaya.dev/");
  const appLinks = page.locator('a[href="https://app.netravax.shubodaya.dev/"]');
  await expect(appLinks).toHaveCount(3);
  await expect(page.locator("#heroNetwork")).toBeVisible();
});

test("hero 3D network canvas renders nonblank pixels", async ({ page }) => {
  await page.waitForTimeout(500); // dynamic-imported three.js module needs a beat to init
  const hasPaint = await page.locator("#heroNetwork").evaluate((canvas) => {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return false;
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] || pixels[index + 1] || pixels[index + 2] || pixels[index + 3]) return true;
    }
    return false;
  });
  expect(hasPaint).toBe(true);
});

test("contact form validates required fields", async ({ page }) => {
  await page.getByRole("button", { name: "Request a consultation" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await page.locator("#name").fill("Shubodaya Kumar");
  await page.locator("#email").fill("not-an-email");
  await page.locator("#service").selectOption({ label: "Cybersecurity" });
  await page.locator("#summary").fill("Need an authorised assessment of a small application and firewall policy.");
  await page.locator("#contactMethod").selectOption({ label: "Email" });
  await page.locator("#consent").check();
  await page.getByRole("button", { name: "Request a consultation" }).click();
  await expect(page.getByText("Enter a valid work email.")).toBeVisible();
});

for (const viewport of viewports) {
  test(`layout has no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.getByRole("heading", { name: /Engineering secure/ })).toBeVisible();
    await page.screenshot({ path: `test-results/home-${viewport.width}.png`, fullPage: true });
  });
}

test("reduced motion mode keeps page usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Engineering secure/ })).toBeVisible();
  const motionRule = await page.evaluate(() =>
    Array.from(document.styleSheets).some((sheet) =>
      Array.from(sheet.cssRules || []).some((rule) => String(rule.cssText).includes("prefers-reduced-motion"))
    )
  );
  expect(motionRule).toBe(true);
});
