import { test, expect, type Locator } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const destination = resolve("docs/demo-walkthrough");
const roleNames: Record<string, string> = {
  sponsor: "Sponsor",
  aamhi: "Aamhi team",
  facility: "Receiving facility",
  verifier: "Independent verifier",
};

test("capture one coherent programme journey and its Finternet proof", async ({
  page,
  request,
  browser,
}) => {
  mkdirSync(resolve(destination, "images"), { recursive: true });
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const stages: { image: string; role: string; state: any }[] = [];
  const snapshots: Record<string, any> = {};
  async function current() {
    return (await request.get("/api/state")).json();
  }
  async function shot(name: string, locator?: Locator) {
    await expect(page.locator("#message")).not.toHaveClass(/working/);
    await page.evaluate("document.fonts.ready");
    const path = resolve(destination, "images", `${name}.png`);
    if (locator) await locator.screenshot({ path, animations: "disabled" });
    else {
      await page.evaluate("window.scrollTo(0, 0)");
      await page.screenshot({ path, fullPage: true, animations: "disabled" });
    }
    stages.push({
      image: `${name}.png`,
      role: await page.locator("#role").inputValue(),
      state: await current(),
    });
  }
  async function role(value: string) {
    await page.locator("#role").selectOption(value);
  }
  async function navigate(view: string) {
    await page.locator(`.nav-item[data-view="${view}"]`).click();
  }
  async function act(actor: string, label: string) {
    await role(actor);
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Confirmed.");
  }

  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Ready.");
  snapshots.initial = await current();
  await shot("01_programme_purpose_and_participants");
  await page.locator("#guided-next").click();
  await act("sponsor", "Discover a recovery programme");
  expect((await current()).discovery.resources).toHaveLength(1);
  await shot("02_sponsor_discovers_aamhi_offering");
  await act("sponsor", "Initiate sponsorship agreement");
  await role("aamhi");
  await shot("03_aamhi_reviews_shared_programme_terms");
  await act("aamhi", "Accept programme terms");
  await role("sponsor");
  await shot("04_terms_accepted_funding_authorised");
  await act("sponsor", "Fund milestone escrow");
  snapshots.fundedFirst = await current();
  expect(snapshots.fundedFirst.balances.escrow).toBe("10000.0");
  expect(snapshots.fundedFirst.balances.aamhi).toBe("0.0");
  await navigate("overview");
  await shot("05_funding_secured_in_programmable_escrow");
  await navigate("workspace");
  await role("aamhi");
  await page
    .locator('[data-field="note"]')
    .fill(
      "Village collection route, Raigad. LDPE collection records and facility documentation are linked to milestone 1 for independent review.",
    );
  await act("aamhi", "Submit recovery evidence");
  await navigate("evidence");
  await shot("06_aamhi_submits_linked_collection_evidence");
  await navigate("workspace");
  await act("facility", "Confirm facility receipt");
  await navigate("evidence");
  await shot("07_facility_confirms_500kg_receipt");
  await navigate("workspace");
  await role("verifier");
  await shot("08_verifier_reviews_eligible_outcome");
  await act("verifier", "Verify eligible outcome");
  snapshots.standardSettlement = await current();
  expect(snapshots.standardSettlement.milestones[0].closed).toBe(true);
  expect(snapshots.standardSettlement.balances.aamhi).toBe("10000.0");
  const normalTx = snapshots.standardSettlement.audit.at(-1);
  expect(normalTx.action).toBe("verify milestone 1");
  expect(normalTx.events.map((event: any) => event.name)).toEqual(
    expect.arrayContaining(["Verified", "Transfer", "Released"]),
  );
  await shot("09_verification_automatically_releases_payment");
  await navigate("proof");
  await page
    .locator(`#view-proof .timeline-item [data-tx="${normalTx.hash}"]`)
    .click();
  await expect(page.locator("#receipt")).toContainText('"status": 1');
  await shot(
    "10_same_transaction_verification_and_settlement_receipt",
    page.locator("#receipt-dialog"),
  );
  await page
    .getByRole("button", { name: "Close receipt", exact: true })
    .click();

  await navigate("workspace");
  await page.locator('[data-milestone-tab="2"]').click();
  await act("aamhi", "Accept programme terms");
  await act("sponsor", "Fund milestone escrow");
  await role("aamhi");
  await page
    .locator('[data-field="note"]')
    .fill(
      "Coastal aggregation route, Raigad. Milestone 2 collection and receipt records support 450 kg eligible recovery against a 500 kg target. The difference is submitted for joint review.",
    );
  await act("aamhi", "Submit recovery evidence");
  await act("facility", "Confirm facility receipt");
  await act("verifier", "Verify eligible outcome");
  snapshots.shortfall = await current();
  expect(snapshots.shortfall.milestones[1].verifiedKg).toBe(450);
  expect(snapshots.shortfall.milestones[1].closed).toBe(false);
  expect(snapshots.shortfall.balances.escrow).toBe("10000.0");
  await role("aamhi");
  await shot("11_450kg_shortfall_enters_joint_review");
  await page
    .locator('[data-field="reason"]')
    .fill(
      "The verifier accepted 450 kg against the 500 kg target. After reviewing the evidence and work performed, retain the agreed fixed payment of 10,000 dINR. Report the actual 450 kg outcome without increasing it to the original target.",
    );
  await act("aamhi", "Propose exception");
  await role("sponsor");
  await shot("12_sponsor_reviews_exact_exception_proposal");
  await act("sponsor", "Approve this exact exception");
  snapshots.oneApproval = await current();
  expect(snapshots.oneApproval.milestones[1].sponsorApproved).toBe(true);
  expect(snapshots.oneApproval.milestones[1].aamhiApproved).toBe(false);
  expect(snapshots.oneApproval.milestones[1].closed).toBe(false);
  await role("aamhi");
  await shot("13_one_approval_does_not_release_funding");
  await act("aamhi", "Approve this exact exception");
  snapshots.final = await current();
  expect(snapshots.final.balances).toEqual({
    sponsor: "0.0",
    aamhi: "20000.0",
    escrow: "0.0",
  });
  expect(snapshots.final.milestones[1].verifiedKg).toBe(450);
  const exceptionTx = snapshots.final.audit.at(-1);
  expect(exceptionTx.events.map((event: any) => event.name)).toEqual(
    expect.arrayContaining(["ExceptionApproved", "Transfer", "Released"]),
  );
  expect(
    snapshots.final.audit.some((tx: any) =>
      tx.action.startsWith("release milestone"),
    ),
  ).toBe(false);
  await shot("14_final_joint_approval_automatically_settles");
  await role("sponsor");
  await navigate("overview");
  await shot("15_programme_outcome_950kg_and_20000_dinr");
  await navigate("report");
  await expect(page.locator(".report-metrics")).toContainText("950");
  await shot(
    "16_sponsor_receives_explainable_outcome_report",
    page.locator(".report-sheet"),
  );
  await navigate("proof");
  await page.locator('#view-proof [data-evidence-tab="2"]').click();
  await shot(
    "17_payment_token_and_recovery_commitment",
    page.locator(".token-showcase"),
  );
  const proofNames = [
    "18_participant_identity_and_authority",
    "19_beckn_discovery_and_agreement_link",
    "20_nontransferable_digital_commitment",
    "21_programmable_money_and_escrow",
    "22_evidence_and_accountable_attestations",
    "23_atomic_automatic_settlement",
  ];
  for (const [index, name] of proofNames.entries())
    await shot(name, page.locator(".proof-grid .proof-detail").nth(index));
  await shot(
    "24_confirmed_settlement_event_flow",
    page.locator("#view-proof .ledger-story"),
  );
  expect(browserErrors).toEqual([]);

  const diagram = await browser.newPage({
    viewport: { width: 1600, height: 850 },
    deviceScaleFactor: 1,
  });
  for (const name of [
    "00_funding_to_verified_outcome",
    "25_beckn_and_blockchain_responsibilities",
  ]) {
    await diagram.setContent(
      "<style>body{margin:0;background:#f5f7f0}</style>" +
        readFileSync(resolve(destination, "images", `${name}.svg`), "utf8"),
    );
    await diagram.screenshot({
      path: resolve(destination, "images", `${name}.png`),
      animations: "disabled",
    });
  }
  await diagram.close();

  const rows = stages.map((stage) => {
    const m1 = stage.state.milestones[0],
      m2 = stage.state.milestones[1];
    return `| ${stage.image} | ${roleNames[stage.role]} | ${stage.state.balances.sponsor} | ${stage.state.balances.escrow} | ${stage.state.balances.aamhi} | ${m1.verifiedKg} / ${m2.verifiedKg} |`;
  });
  const evidence = `<!-- CAPTURE_RECORD_START -->\n## Appendix: capture and transaction evidence\n\nCaptured: ${new Date().toISOString()}. All application screenshots follow one programme session, without loading prepared chapters between stages. The two diagrams are explanatory illustrations, not application screenshots.\n\n- Programme: \`${snapshots.final.programmeId}\`\n- Session: \`${snapshots.final.sessionId}\`\n- Chain ID: \`${snapshots.final.chainId}\`\n- Escrow contract: \`${snapshots.final.contracts.escrow}\`\n- dINR contract: \`${snapshots.final.contracts.dinr}\`\n- Agreed terms fingerprint: \`${snapshots.final.termsHash}\`\n- Standard milestone: verification and settlement in transaction \`${normalTx.hash}\`, block ${normalTx.blockNumber}.\n- Exception milestone: final approval and settlement in transaction \`${exceptionTx.hash}\`, block ${exceptionTx.blockNumber}.\n\n### Financial and outcome state at each screenshot\n\nAll balances below are dINR. The final column shows accepted quantity for milestones 1 / 2 in kg.\n\n| Image | Active participant | Sponsor balance | Held in escrow | Aamhi balance | Verified kg M1 / M2 |\n|---|---|---:|---:|---:|---:|\n${rows.join("\n")}\n\n### Actual settlement events\n\n${[
    normalTx,
    exceptionTx,
  ]
    .map(
      (tx) =>
        `**${tx.action}** — \`${tx.hash}\`\n\n${tx.events
          .filter((event: any) =>
            ["Verified", "ExceptionApproved", "Transfer", "Released"].includes(
              event.name,
            ),
          )
          .map(
            (event: any) =>
              `- \`${event.name}\`: ${Object.entries(event.values)
                .map(([key, value]) => `${key}=\`${value}\``)
                .join(", ")}`,
          )
          .join("\n")}`,
    )
    .join(
      "\n\n",
    )}\n\nToken event amounts use the contract's 18-decimal base units: \`10000000000000000000000\` means 10,000 dINR.\n<!-- CAPTURE_RECORD_END -->`;
  const documentPath = resolve(destination, "DEMO_WALKTHROUGH.md");
  const document = readFileSync(documentPath, "utf8");
  expect(document).toContain("<!-- CAPTURE_RECORD_START -->");
  writeFileSync(
    documentPath,
    document.replace(
      /<!-- CAPTURE_RECORD_START -->[\s\S]*?<!-- CAPTURE_RECORD_END -->/,
      evidence,
    ),
  );
  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    "test-results/walkthrough-capture.json",
    JSON.stringify(
      {
        snapshots,
        stages: stages.map((stage) => ({
          image: stage.image,
          role: stage.role,
        })),
      },
      null,
      2,
    ),
  );
  console.log(
    `Captured ${stages.length} application screenshots and two explanatory diagrams. Assertions confirmed both automatic settlement paths and the 950 kg / 20,000 dINR final outcome.`,
  );
});
