import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("guided programme, role tasks, accurate exception, outcome report and real receipts", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Ready.");
  await page.screenshot({
    path: "test-results/overview-fresh-desktop.png",
    fullPage: true,
  });
  await page.locator("#guided-next").click();
  async function act(role: string, label: string) {
    await page.locator("#role").selectOption(role);
    const roleNames: Record<string, string> = {
      sponsor: "Sponsor",
      aamhi: "Aamhi team",
      facility: "Receiving facility",
      verifier: "Independent verifier",
    };
    const switchButton = page.getByRole("button", {
      name: `Continue as ${roleNames[role]} →`,
      exact: true,
    });
    if (await switchButton.count()) await switchButton.click();
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Confirmed.");
  }
  await act("sponsor", "Discover a recovery programme");
  await act("sponsor", "Initiate sponsorship agreement");
  for (const milestone of [1, 2]) {
    if (milestone === 2) await page.locator('[data-milestone-tab="2"]').click();
    await act("aamhi", "Accept programme terms");
    await act("sponsor", "Fund milestone escrow");
    await act("aamhi", "Submit recovery evidence");
    await act("facility", "Confirm facility receipt");
    await act("verifier", "Verify eligible outcome");
    if (milestone === 1) {
      const paid = await (await request.get("/api/state")).json();
      expect(paid.milestones[0].closed).toBe(true);
      const verification = paid.audit.at(-1);
      expect(verification.action).toBe("verify milestone 1");
      expect(verification.events.map((e: { name: string }) => e.name)).toEqual(
        expect.arrayContaining(["Verified", "Transfer", "Released"]),
      );
      await expect(
        page.getByRole("button", {
          name: "Release milestone payment",
          exact: true,
        }),
      ).toHaveCount(0);
    }
  }
  const before = await (await request.get("/api/state")).json();
  expect(before.balances).toEqual({
    sponsor: "0.0",
    aamhi: "10000.0",
    escrow: "10000.0",
  });
  expect(
    (
      await request.post("/api/milestones/2/release", {
        headers: { "x-demo-role": "sponsor" },
        data: {},
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/milestones/2/verify", {
        headers: { "x-demo-role": "sponsor" },
        data: { quantityKg: 450 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/milestones/2/dispute", {
        headers: { "x-demo-role": "sponsor", origin: "https://example.com" },
        data: { reason: "test" },
      })
    ).status(),
  ).toBe(403);
  await act("aamhi", "Propose exception");
  await act("sponsor", "Approve this exact exception");
  expect(
    (
      await request.post("/api/milestones/2/approve", {
        headers: { "x-demo-role": "aamhi" },
        data: { proposalHash: "0x" + "11".repeat(32) },
      })
    ).status(),
  ).toBe(400);
  await act("aamhi", "Approve this exact exception");
  const state = await (await request.get("/api/state")).json();
  expect(state.balances).toEqual({
    sponsor: "0.0",
    aamhi: "20000.0",
    escrow: "0.0",
  });
  expect(state.milestones[1].verifiedKg).toBe(450);
  expect(state.audit.at(-1).action).toBe("approve milestone 2");
  expect(
    state.audit.at(-1).events.map((e: { name: string }) => e.name),
  ).toEqual(
    expect.arrayContaining(["ExceptionApproved", "Transfer", "Released"]),
  );
  expect(
    state.audit.some((tx: { action: string }) =>
      tx.action.startsWith("release milestone"),
    ),
  ).toBe(false);
  expect(state.discovery.transport).toBe("HTTP_PROVIDER_TO_CONSUMER");
  await page.locator('.nav-item[data-view="report"]').click();
  await expect(page.locator(".report-metrics")).toContainText("950");
  await expect(page.locator(".report-sheet")).toContainText(
    "Both parties approved",
  );
  const download = page.waitForEvent("download");
  await page.locator("#download-report").click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("aamhi-sponsor-outcome-report.md");
  const report = readFileSync((await file.path())!, "utf8");
  expect(report).toContain("950 kg");
  expect(report).toContain("Verified eligible: 450 kg");
  expect(report).toContain("not an independently certified");
  expect(report).toContain(`Local session ID: ${state.sessionId}`);
  await page.screenshot({
    path: "test-results/outcome-report-desktop.png",
    fullPage: true,
  });
  await page.locator('.nav-item[data-view="proof"]').click();
  await expect(page.locator(".money-token")).toContainText("INR");
  await expect(page.locator("#view-proof .commitment-card")).toContainText(
    "Non-transferable programme record",
  );
  await expect(page.locator(".proof-grid")).toContainText(
    "no separate administrator release",
  );
  await page.screenshot({
    path: "test-results/finternet-proof-desktop.png",
    fullPage: true,
  });
  await page.locator(".timeline-item [data-tx]").first().click();
  await expect(page.locator("#receipt")).toContainText('"status": 1');
  await page
    .getByRole("button", { name: "Close receipt", exact: true })
    .click();
  await page.locator('.nav-item[data-view="overview"]').click();
  await page.screenshot({
    path: "test-results/overview-complete-desktop.png",
    fullPage: true,
  });
  for (const tab of ["overview", "workspace", "evidence", "report", "proof"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(`.nav-item[data-view="${tab}"]`).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/${tab}-mobile.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("participant colours and responsibility labels remain explicit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Ready.");
  const colours = new Set<string>();
  for (const role of ["sponsor", "aamhi", "facility", "verifier"]) {
    await page.locator("#role").selectOption(role);
    await expect(page.locator("body")).toHaveAttribute("data-role", role);
    colours.add(
      await page
        .locator(".topbar")
        .evaluate((el) => getComputedStyle(el).borderTopColor),
    );
    await expect(page.locator("#role-title")).not.toBeEmpty();
    await expect(page.locator("#role-purpose")).not.toBeEmpty();
    await page.screenshot({
      path: `test-results/role-${role}.png`,
      fullPage: true,
    });
  }
  expect(colours.size).toBe(4);
});

test("presentation chapters execute chain state and reset without stale projections", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Ready.");
  async function chapter(name: string) {
    await page.locator("#present").click();
    await page.locator(`[data-chapter="${name}"]`).click();
    await page
      .getByRole("button", { name: "Prepare chapter", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      name === "fresh" ? "Ready." : "Chapter prepared.",
      { timeout: 60000 },
    );
  }
  await chapter("review");
  const review = await (await request.get("/api/state")).json();
  expect(review.balances).toEqual({
    sponsor: "0.0",
    aamhi: "10000.0",
    escrow: "10000.0",
  });
  expect(review.presentation.mode).toBe("EXECUTED_LOCAL_CHAIN_TRANSACTIONS");
  expect(review.milestones[1].verifiedKg).toBe(450);
  await page.screenshot({
    path: "test-results/exception-review-desktop.png",
    fullPage: true,
  });
  await chapter("fresh");
  const fresh = await (await request.get("/api/state")).json();
  expect(fresh.balances.sponsor).toBe("20000.0");
  expect(fresh.selected).toBe(false);
  expect(fresh.milestones[1].verifiedKg).toBe(0);
  expect(fresh.sessionId).not.toBe(review.sessionId);
  await chapter("complete");
  const complete = await (await request.get("/api/state")).json();
  expect(complete.milestones.every((m: { closed: boolean }) => m.closed)).toBe(
    true,
  );
  expect(complete.balances.escrow).toBe("0.0");
  await chapter("funded");
  const funded = await (await request.get("/api/state")).json();
  expect(funded.balances.escrow).toBe("20000.0");
  expect(funded.milestones[0].verifiedKg).toBe(0);
});
