/**
 * M8 browser acceptance: every demonstration scene runs end to end through the presenter UI, every
 * role surface renders without errors, and the assistants and public verification work in the browser.
 */
import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
};

/** Figures the demonstration narrative depends on (docs/product/Vartul_Demo_Dataset.md). */
const expectedResults: Record<number, RegExp[]> = {
  3: [/₹21,240 released/, /11 collectors paid ₹8,496/],
  6: [/67\.4 kg/],
  7: [/₹1,85,700/, /₹14,300/],
  8: [/₹16,520/],
  9: [/11 receipts? revoked|revoked 11/i],
};

let scenes: { id: string; number: number; title: string; steps: unknown[] }[] = [];

test.beforeAll(async ({ request }) => {
  scenes = (await (await request.get("/api/scenes")).json()).scenes;
  expect(scenes).toHaveLength(11);
});

for (let n = 1; n <= 11; n++) {
  test(`scene ${n} runs end to end in the presenter`, async ({ page }) => {
    const errors = errorsOf(page);
    const scene = scenes.find((s) => s.number === n)!;
    await page.goto("/network");
    await page.getByRole("button", { name: "Presenter" }).click();
    await page.locator(".p-scene", { hasText: new RegExp(`^${n}$`) }).click();
    await expect(page.locator(".p-scene.active")).toHaveText(String(n), { timeout: 60_000 });
    await page.waitForLoadState("networkidle");

    for (let done = 0; done < scene.steps.length; done++) {
      await page.locator(".p-step.next button", { hasText: "Run" }).click();
      await expect(page.locator(".p-step.done")).toHaveCount(done + 1, { timeout: 90_000 });
      await expect(page.locator(".p-step-result.error")).toHaveCount(0);
    }
    const results = (await page.locator(".p-step-result").allTextContents()).join(" | ");
    for (const re of expectedResults[n] ?? []) expect(results).toMatch(re);

    await page.getByRole("button", { name: "Open the scene's view" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".page h1, .phone").first()).toBeVisible();
    expect(errors, errors.join("\n")).toEqual([]);
  });
}

const surfaces = [
  "/network",
  "/network/explorer",
  "/programmes",
  "/lots",
  "/sponsor",
  "/originator",
  "/field",
  "/verifier",
  "/facility",
  "/panchayat",
  "/verify/FRC-00001",
  "/anomalies",
  "/present",
];

test("every role surface renders", async ({ page, request }) => {
  await request.post("/api/scenes/scene-01/reset", { timeout: 120_000 });
  const errors = errorsOf(page);
  for (const path of surfaces) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".page h1, .phone").first(), path).toBeVisible();
    await expect(page.getByText("Could not load this view"), path).toHaveCount(0);
  }
  expect(errors, errors.join("\n")).toEqual([]);
});

test("public verification checks the signature in the browser", async ({ page }) => {
  await page.goto("/verify/FRC-00001");
  await expect(page.locator(".verdict-word")).toHaveText("Valid");
  await expect(page.getByText("Verified locally with the public key")).toBeVisible({ timeout: 20_000 });
});

test("sponsor assistant drafts a commitment that opens quoted in Discover", async ({ page }) => {
  await page.goto("/sponsor?as=COASTLINE&tab=assistant");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.locator(".assistant-turn")).toHaveCount(1, { timeout: 60_000 });
  await expect(page.locator(".assistant-draft")).toContainText("PRG-MRD-NETS-2027");
  await page.getByRole("button", { name: "Review in Discover" }).click();
  await expect(page.getByRole("button", { name: "Request the exact terms" })).toBeVisible({ timeout: 60_000 });
});

test("explorer shows the simulated public end state", async ({ page }) => {
  await page.goto("/network/explorer");
  await page.getByRole("tab", { name: "Public end state" }).click();
  await expect(page.getByText("Simulated, not deployed")).toBeVisible();
  await expect(page.getByText("Base Sepolia · chain ID 84532")).toBeVisible();
});
