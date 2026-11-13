const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const zero = (value) => !value || /^0x0+$/.test(value);
const number = (value) => Number(value || 0).toLocaleString("en-IN");
const short = (value) =>
  value ? `${value.slice(0, 10)}…${value.slice(-6)}` : "Not yet recorded";
const names = {
  sponsor: "Sponsor",
  aamhi: "Aamhi team",
  facility: "Receiving facility",
  verifier: "Independent verifier",
};
const story = {
  name: "Raigad coastal recovery programme",
  sponsor: "Horizon Foundation",
  facility: "Raigad receiving centre",
  verifier: "Independent recovery verifier",
  period: "Recovery programme cycle",
  routes: ["Village collection route", "Coastal aggregation route"],
};
let state,
  busy = false,
  view = "overview",
  activeMilestone = 1,
  pendingChapter;
let guided = true;
function dinr(value) {
  const n = BigInt(value || "0");
  const base = 10n ** 18n;
  const fraction = (n % base).toString().padStart(18, "0").replace(/0+$/, "");
  return `${(n / base).toLocaleString("en-IN")}${fraction ? "." + fraction : ""}`;
}
function chainEvents(tx) {
  return tx.events || [];
}
function txTitle(tx) {
  const settled = chainEvents(tx).some((event) => event.name === "Released");
  return settled
    ? tx.action.startsWith("verify")
      ? "Outcome verified · payment released automatically"
      : "Joint agreement completed · payment settled automatically"
    : {
        "issue local eligibility": "Participant eligibility recorded",
        "mint sandbox balance": "Programme treasury allocation",
        "propose sample milestone terms": "Milestone terms proposed",
      }[tx.action] || tx.action;
}

const drafts = new Map();
const titles = {
  overview: [
    "Good intentions. Visible outcomes.",
    "Follow the funding. Understand the work. See the proof.",
  ],
  workspace: [
    "The right task. The right participant.",
    "Move a milestone forward, with clear responsibilities at every step.",
  ],
  evidence: [
    "Confidence begins with evidence.",
    "See what was submitted, who confirmed it, and what was accepted.",
  ],
  report: [
    "A clear account of what you supported.",
    "Funding, verified outcomes and the decisions that connect them.",
  ],
  proof: [
    "The infrastructure behind the confidence.",
    "Follow commitments, attestations and automatic settlement on the shared ledger.",
  ],
};

async function api(path, body, role = $("#role").value) {
  const response = await fetch(
    path,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "content-type": "application/json", "x-demo-role": role },
          body: JSON.stringify(body),
        },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function message(text, error = false) {
  $("#message").textContent = text;
  $("#message").className = error ? "error" : busy ? "working" : "";
}
async function run(
  action,
  success = "Confirmed. Programme records are up to date.",
) {
  if (busy) return;
  const previousTransaction = state?.audit.at(-1)?.hash;
  captureDrafts();
  busy = true;
  render();
  message("Recording the decision and waiting for ledger confirmation…");
  try {
    await action();
    state = await api("/api/state");
    const settled = state.audit
      .at(-1)
      ?.events?.find((event) => event.name === "Released");
    message(
      settled &&
        state.audit.at(-1)?.hash !== previousTransaction &&
        success === "Confirmed. Programme records are up to date."
        ? `Confirmed. Payment settled automatically: ${dinr(settled.values.paid)} dINR to Aamhi${BigInt(settled.values.refunded || "0") > 0n ? `; ${dinr(settled.values.refunded)} dINR refunded` : ""}.`
        : success,
    );
  } catch (error) {
    message(error.message, true);
  } finally {
    busy = false;
    $("#message").classList.remove("working");
    render();
  }
}
function captureDrafts() {
  $$("[data-field]").forEach((input) =>
    drafts.set(
      `${input.closest("[data-milestone]")?.dataset.milestone || activeMilestone}:${input.dataset.field}`,
      input.value,
    ),
  );
}
function fieldValue(name, fallback) {
  return drafts.get(`${activeMilestone}:${name}`) ?? fallback;
}
function navigate(next) {
  captureDrafts();
  view = next;
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function setRole(role) {
  $("#role").value = role;
  render();
}
function actionButton(action, label, extra = "") {
  return `<button data-action="${action}" ${extra} ${busy ? "disabled" : ""}>${label}</button>`;
}
function status(m) {
  if (m.closed)
    return {
      label:
        Number(m.paidDinr) > 0 ? "Paid & recorded" : "Cancelled & refunded",
      tone: Number(m.paidDinr) > 0 ? "" : "gray",
    };
  if (m.disputed || (m.verified && m.verifiedKg < m.targetKg))
    return { label: "Joint review needed", tone: "amber" };
  if (m.verified) return { label: "Verified · ready to release", tone: "" };
  if (m.receivedKg) return { label: "Awaiting verification", tone: "blue" };
  if (!zero(m.evidenceHash))
    return { label: "Awaiting facility receipt", tone: "blue" };
  if (m.funded) return { label: "Funding secured", tone: "" };
  if (m.termsAccepted) return { label: "Terms accepted", tone: "blue" };
  return { label: "Ready to begin", tone: "gray" };
}
function pill(label, tone = "") {
  return `<span class="pill ${tone}">${esc(label)}</span>`;
}
function totals() {
  return {
    budget: state.milestones.reduce((s, m) => s + Number(m.budgetDinr), 0),
    funded: state.milestones.reduce(
      (s, m) => s + (m.funded ? Number(m.budgetDinr) : 0),
      0,
    ),
    paid: state.milestones.reduce((s, m) => s + Number(m.paidDinr), 0),
    refunded: state.milestones.reduce((s, m) => s + Number(m.refundedDinr), 0),
    target: state.milestones.reduce((s, m) => s + m.targetKg, 0),
    verified: state.milestones.reduce((s, m) => s + m.verifiedKg, 0),
    closed: state.milestones.filter((m) => m.closed).length,
  };
}
function nextStep(m) {
  if (!state.discovery)
    return {
      role: "sponsor",
      action: "discover",
      label: "Discover a recovery programme",
      title: "Begin with a shared purpose.",
      text: "Find Aamhi’s programme through the discovery interface. Understand the work before committing funding.",
    };
  if (!state.selected)
    return {
      role: "sponsor",
      action: "select",
      label: "Initiate sponsorship agreement",
      title: "Turn intent into an agreement.",
      text: "Select the programme offering and review the preset purpose, evidence requirements and funding conditions.",
    };
  if (!m.termsAccepted)
    return {
      role: "aamhi",
      action: "accept",
      label: "Accept programme terms",
      title: "Agree on what success means.",
      text: "Aamhi accepts the exact milestone terms before funding. The first outcome is collection and confirmed facility receipt.",
    };
  if (!m.funded)
    return {
      role: "sponsor",
      action: "fund",
      label: "Fund milestone escrow",
      title: "Secure the funding upfront.",
      text: "Deposit 10,000 dINR. The funds remain held until the agreed verification and approval conditions are satisfied.",
    };
  if (m.closed)
    return {
      role: "sponsor",
      action: "report",
      label: "Read the sponsor report",
      title: "A visible outcome. A traceable payment.",
      text: "Inspect the actual accepted quantity, funding released and evidence behind this milestone.",
    };
  if (m.disputed && zero(m.exceptionHash))
    return {
      role: "aamhi",
      action: "propose",
      label: "Propose exception",
      title: "Agree a practical way forward.",
      text: "A dispute holds this milestone only. Propose an explicit financial resolution for review by both parties.",
    };
  if (zero(m.evidenceHash))
    return {
      role: "aamhi",
      action: "evidence",
      label: "Submit recovery evidence",
      title: "Make the work visible.",
      text: "Attach the collection context and supporting records. The evidence package is linked to this milestone.",
    };
  if (!m.receivedKg)
    return {
      role: "facility",
      action: "receipt",
      label: "Confirm facility receipt",
      title: "Confirm what reached the facility.",
      text: "The receiving facility records the measured quantity against the same evidence package. Receipt does not imply recycling.",
    };
  if (!m.verified && !m.disputed)
    return {
      role: "verifier",
      action: "verify",
      label: "Verify eligible outcome",
      title: "Establish what the evidence supports.",
      text: "Review the collection and receipt records. Record the eligible quantity without exceeding the facility-confirmed quantity.",
    };
  if ((m.disputed || m.verifiedKg < m.targetKg) && zero(m.exceptionHash))
    return {
      role: "aamhi",
      action: "propose",
      label: "Propose exception",
      title: "Real work needs room for judgment.",
      text: `The verifier accepted ${m.verifiedKg} kg against a ${m.targetKg} kg target. Aamhi and the sponsor can agree a payment exception without changing that outcome.`,
    };
  if (!zero(m.exceptionHash) && !m.sponsorApproved)
    return {
      role: "sponsor",
      action: "approve",
      label: "Approve this exact exception",
      title: "Review the proposed exception.",
      text: "Check the actual outcome, reason and proposed payment. Sponsor approval is one of two required decisions.",
    };
  if (!zero(m.exceptionHash) && !m.aamhiApproved)
    return {
      role: "aamhi",
      action: "approve",
      label: "Approve this exact exception",
      title: "Confirm the mutual agreement.",
      text: "Aamhi approves the same proposal. A changed proposal clears earlier approvals; both parties must agree again.",
    };
  return {
    role: "verifier",
    action: "refresh",
    label: "Refresh settlement status",
    title: "Payment follows the agreement.",
    text: "The contract settles automatically when the qualifying attestation or final required approval is confirmed. No administrator authorises a second release.",
  };
}
function programmeNext() {
  const m = state.milestones.find((m) => !m.closed) || state.milestones[1];
  return { m, step: nextStep(m) };
}
function goNext() {
  const { m, step } = programmeNext();
  activeMilestone = m.id;
  if (step.action === "report") return navigate("report");
  setRole(step.role);
  navigate("workspace");
}
function completion(m) {
  return [
    m.termsAccepted,
    m.funded,
    !zero(m.evidenceHash),
    m.receivedKg > 0,
    m.verified,
    m.closed,
  ];
}

function commitmentCard(m) {
  const s = status(m);
  return `<section class="commitment-card"><div class="commitment-top"><span>◈ ON-CHAIN COMMITMENT</span>${pill(s.label, s.tone)}</div><div class="commitment-identity"><span class="commitment-seal">A<span>↗</span></span><div><h3>Recovery commitment #0${m.id}</h3><p>${esc(state.programmeId)} / MLS-0${m.id}</p></div></div><div class="commitment-values"><div><strong>${m.targetKg}<small> kg</small></strong><span>Recovery target</span></div><div><strong>${number(m.budgetDinr)}<small> dINR</small></strong><span>Funding allocation</span></div></div><p class="commitment-right">Non-transferable programme record · Sponsor funding attribution, not ownership of physical material.</p><div class="hash">Terms fingerprint: ${esc(short(m.termsHash))}</div><button data-view="proof" class="text-button">Inspect this commitment on the ledger →</button></section>`;
}
function ledgerStory(m) {
  const latest = [...state.audit]
    .reverse()
    .find((tx) => tx.action.endsWith("milestone " + m.id));
  const settled = latest?.events?.find((event) => event.name === "Released");
  return `<section class="ledger-story" aria-label="Blockchain activity"><div class="ledger-heading"><span class="live-dot"></span><strong>Shared ledger · milestone 0${m.id}</strong><span class="pill">${m.closed ? "Settlement confirmed" : m.funded ? "Funding locked" : "Commitment recorded"}</span></div><div class="ledger-flow"><div class="${m.termsAccepted ? "complete" : ""}"><span>◈</span><strong>Commitment</strong><small>${m.termsAccepted ? "Terms accepted" : "Terms proposed"}</small></div><b>→</b><div class="${m.funded ? "complete" : ""}"><span class="coin-mini">dINR</span><strong>Programmable funding</strong><small>${m.closed ? number(m.paidDinr) + " dINR paid" : m.funded ? "10,000 dINR held" : "Awaiting deposit"}</small></div><b>→</b><div class="${m.verified ? "complete" : ""}"><span>✓</span><strong>Verified outcome</strong><small>${m.verified ? m.verifiedKg + " kg accepted" : "Evidence → receipt → verification"}</small></div><b>→</b><div class="${m.closed ? "complete" : ""}"><span>↗</span><strong>Automatic settlement</strong><small>${m.closed ? "Payment + attribution recorded" : "Runs when conditions are satisfied"}</small></div></div>${latest ? `<div class="ledger-latest"><span>${esc(txTitle(latest))}</span><button data-tx="${esc(latest.hash)}">Block ${latest.blockNumber} · ${esc(short(latest.hash))} ↗</button></div>` : ""}${settled ? `<div class="settlement-confirmation">✓ <strong>${dinr(settled.values.paid)} dINR released automatically</strong><span>Included in the same transaction as ${latest.action.startsWith("verify") ? "verifier acceptance" : "the final joint approval"}.</span></div>` : ""}</section>`;
}

function overview() {
  const t = totals();
  const { m, step } = programmeNext();
  const pct = Math.min(100, Math.round((t.verified / t.target) * 100));
  return `
  <div class="hero"><div class="hero-copy"><p class="eyebrow">ONE PROGRAMME. A SHARED COMMITMENT.</p><h2>Cleaner communities.<br>Clearer accountability.</h2><p>Support Aamhi’s collection and facility delivery of recovered LDPE. See the evidence and decisions behind every milestone payment.</p><div class="hero-meta"><span>⌖ Raigad, Maharashtra</span><span>◌ LDPE recovery</span></div></div><div class="hero-art"><img src="/programme-art.svg" alt="Illustration of a rural collection team and receiving facility"><span class="art-label">Project Aamhi · Recovery programme</span></div></div>
  <div class="stats"><div class="stat"><div class="stat-label">Programme budget <span class="stat-symbol">◈</span></div><strong>${number(t.budget)} <small>dINR</small></strong><p>Two agreed-purpose milestone allocations</p></div><div class="stat"><div class="stat-label">Funding secured <span class="stat-symbol">↙</span></div><strong>${number(t.funded)} <small>dINR</small></strong><p>${number(state.balances.escrow)} currently held in escrow</p></div><div class="stat accent"><div class="stat-label">Verified recovery <span class="stat-symbol">✓</span></div><strong>${number(t.verified)} <small>kg</small></strong><p>Collection + confirmed facility receipt</p></div><div class="stat"><div class="stat-label">Payments released <span class="stat-symbol">↗</span></div><strong>${number(t.paid)} <small>dINR</small></strong><p>${t.closed} of 2 milestones closed</p></div></div>
  ${ledgerStory(m)}<div class="two-column"><section class="card"><div class="card-header"><h2>Recovery, one milestone at a time.</h2><span class="section-label">${number(t.verified)} / ${number(t.target)} kg target</span></div><div class="progress-track"><svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-label="${pct}% of target verified"><rect width="${pct}" height="6" fill="#8fa975" rx="3"/></svg></div><div class="progress-caption"><span>${pct}% of target verified</span><span>Actual outcome, not a projected impact</span></div>${state.milestones
    .map((item) => {
      const s = status(item);
      return `<div class="milestone-row"><span class="milestone-number">0${item.id}</span><div><h3>${story.routes[item.id - 1]}</h3><p>${item.targetKg} kg target · ${number(item.budgetDinr)} dINR allocation</p><div class="mini-steps" aria-label="Milestone progress">${completion(
        item,
      )
        .map((done) => `<span class="${done ? "done" : ""}"></span>`)
        .join(
          "",
        )}</div></div><div>${pill(s.label, s.tone)}<br><button data-open-milestone="${item.id}">View milestone →</button></div></div>`;
    })
    .join(
      "",
    )}</section><section class="card next-card"><p class="eyebrow">${t.closed === 2 ? "THE OUTCOME" : "YOUR GUIDED NEXT STEP"}</p><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p><button id="guided-next">${step.action === "report" ? "View outcome report" : `Continue as ${names[step.role]} →`}</button><div class="owner">${t.closed === 2 ? "Funding attribution is recorded." : `Milestone ${m.id} · ${names[step.role]} acts next`}</div></section></div>
  <div class="principles"><div class="principle"><span>◎</span><div><strong>Purpose before payment</strong><p>Clear commitments define the work and conditions funding supports.</p></div></div><div class="principle"><span>▤</span><div><strong>Evidence you can inspect</strong><p>Collection, receipt and verification remain linked to the same outcome.</p></div></div><div class="principle"><span>⇄</span><div><strong>Flexibility with accountability</strong><p>Exceptions need mutual agreement. Actual quantities stay accurate.</p></div></div></div>`;
}
function taskFields(m, step) {
  if (step.action === "discover")
    return `<div class="callout"><strong>Open discovery, clear intent</strong><p>The sponsor searches a separate HTTP catalogue for an LDPE recovery programme in Raigad. The offering identifies the provider, material, geography and milestone conditions. Selection links discovery to the funding agreement.</p></div>`;
  if (step.action === "select" || step.action === "accept")
    return `<div class="confirm-summary">${kv("Programme", story.name)}${kv("Milestone target", `${m.targetKg} kg collection + facility receipt`)}${kv("Funding allocation", `${number(m.budgetDinr)} dINR`)}${kv("Payment policy", "Fixed payment after verified acceptance")}${kv("Exceptions", "Sponsor + Aamhi approval")}${kv("Sponsor entitlement", "Funding attribution only")}</div>`;
  if (step.action === "fund")
    return `<div class="callout"><strong>Held funding is not an operating advance.</strong><p>Funding is reserved for this milestone. Operating advances and retained milestone funding are separate arrangements under the programme agreement.</p></div>${kv("Amount to deposit", "10,000 dINR")}${kv("Sponsor available balance", `${number(state.balances.sponsor)} dINR`)}`;
  if (step.action === "evidence")
    return `<label class="field">Collection context<span>Describe the activity and link its collection context to the programme.</span><textarea data-field="note">${esc(fieldValue("note", `LDPE collection on ${story.routes[m.id - 1].toLowerCase()}, Raigad. Collection records and facility documentation attached.`))}</textarea></label><div class="callout"><strong>Collection evidence package</strong><p>The evidence manifest fingerprints the supporting records and binds them to this milestone. The receiving facility and verifier make separate accountable assertions.</p></div>`;
  if (["receipt", "verify"].includes(step.action))
    return `<div class="confirm-summary">${kv("Material", "LDPE")}${kv("Milestone target", `${m.targetKg} kg`)}${m.receivedKg ? kv("Facility-confirmed receipt", `${m.receivedKg} kg`) : ""}</div><label class="field">${step.action === "receipt" ? "Received quantity" : "Verified eligible quantity"} (kg)<span>${step.action === "verify" ? "Eligible quantity cannot exceed the facility-confirmed receipt. Meeting the agreed target automatically releases payment in this transaction." : "Enter the quantity acknowledged by the receiving facility."}</span><input data-field="quantityKg" type="number" min="1" max="1000000" value="${esc(fieldValue("quantityKg", m.id === 1 ? 500 : 450))}"></label>${m.id === 2 ? '<div class="callout amber"><strong>Outcome below the original target</strong><p>450 kg is accepted against a 500 kg target. The programme allows both parties to agree the financial response.</p></div>' : ""}`;
  if (step.action === "propose")
    return `<div class="callout amber"><strong>${m.verifiedKg} kg verified. ${m.targetKg} kg originally targeted.</strong><p>The financial decision can change; the recorded physical outcome must remain accurate. Unrelated milestones continue.</p></div><label class="field">Reason for the proposed exception<textarea data-field="reason">${esc(fieldValue("reason", `The verifier accepted ${m.verifiedKg} kg. Following review of the shortfall and the work performed, we propose retaining the fixed milestone payment. The verified outcome remains ${m.verifiedKg} kg.`))}</textarea></label><label class="field">Proposed payment (dINR)<span>0 cancels/refunds; any unused budget is refunded on settlement.</span><input data-field="paymentDinr" type="number" min="0" max="10000" value="${esc(fieldValue("paymentDinr", 10000))}"></label>`;
  if (step.action === "approve")
    return `<div class="callout amber"><strong>Review before approving · settlement is automatic</strong><p>${esc(m.exception?.reason || "Review the current recorded proposal and its supporting outcome.")}</p></div>${kv("Verified eligible outcome", `${m.verifiedKg} kg`)}${kv("Proposed payment", `${number(m.proposedPaymentDinr)} dINR`)}${kv("Refund on settlement", `${number(Number(m.budgetDinr) - Number(m.proposedPaymentDinr))} dINR`)}${approval("sponsor", m.sponsorApproved)}${approval("aamhi", m.aamhiApproved)}<details class="disclosure"><summary>Exact proposal being approved</summary><p class="hash">${esc(m.exceptionHash)}</p></details>`;
  if (step.action === "release")
    return `${kv("Verified eligible outcome", `${m.verifiedKg} kg`)}${kv("Payment to Aamhi", `${number(m.sponsorApproved && m.aamhiApproved ? m.proposedPaymentDinr : m.budgetDinr)} dINR`)}${kv("Condition", m.sponsorApproved && m.aamhiApproved ? "Verified outcome + both exception approvals" : "Verified outcome meets agreed target")}<div class="callout"><strong>Payment and attribution stay connected.</strong><p>The contract releases the authorised amount and records funding attribution. Neither material ownership nor official credit rights transfer.</p></div>`;
  return `<div class="callout"><strong>This milestone has closed.</strong><p>Payment: ${number(m.paidDinr)} dINR. Refund: ${number(m.refundedDinr)} dINR. Verified eligible quantity: ${m.verifiedKg} kg.</p></div>`;
}
function kv(label, value) {
  return `<div class="key-value"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}
function approval(role, approved) {
  return `<div class="approval-person"><span class="approval-avatar">${role === "sponsor" ? "SP" : "AA"}</span><div><strong>${names[role]}</strong><p>Approval of the exact proposal · both approvals trigger settlement</p></div>${pill(approved ? "Approved" : "Awaiting approval", approved ? "" : "amber")}</div>`;
}
function workspace() {
  const m = state.milestones.find((m) => m.id === activeMilestone);
  const step = nextStep(m);
  const s = status(m);
  const role = $("#role").value;
  const done = completion(m);
  const stages = [
    ["Agree the terms", "A shared purpose and acceptance conditions."],
    ["Secure the funding", "Advance funding held for the milestone."],
    ["Record the work", "Collection context and supporting evidence."],
    ["Confirm facility receipt", "Destination and received quantity."],
    ["Verify the outcome", "Eligible quantity accepted by the verifier."],
    ["Release & record", "Payment follows the agreement."],
  ];
  const index = done.findIndex((v) => !v);
  return `
  <div class="tabs" role="group" aria-label="Select milestone">${state.milestones.map((item) => `<button data-milestone-tab="${item.id}" aria-pressed="${item.id === activeMilestone}" class="${item.id === activeMilestone ? "active" : ""}">0${item.id} · ${story.routes[item.id - 1]}</button>`).join("")}<button id="guide-toggle">${guided ? "Guidance on" : "Guidance off"}</button></div>
  ${ledgerStory(m)}<div class="workspace-grid"><section class="card task-card" data-milestone="${m.id}"><div class="card-header">${pill(s.label, s.tone)}<span class="section-label">MILESTONE 0${m.id}</span></div><p class="eyebrow">${esc(story.routes[m.id - 1].toUpperCase())}</p><h2>${esc(step.title)}</h2><p class="task-context">${esc(step.text)}</p>${taskFields(m, step)}<div class="button-row">${role !== step.role && step.action !== "report" ? `<button data-switch-role="${step.role}">Continue as ${names[step.role]} →</button>` : actionButton(step.action, step.label)}<button class="text-button" data-view="evidence">Review evidence →</button></div>${guided ? `<p class="fine-print muted">${m.closed ? "Read the outcome report or move to the next milestone." : `${names[step.role]} acts next. Each participant acts within its appointed programme responsibility.`}</p>` : ""}<details class="disclosure"><summary>Additional review & dispute controls</summary><p>Use the guided flow for the normal scenario. A dispute pauses this milestone only. Disputed funding remains held for a jointly approved resolution. Supported operations and recovery limits are described under System details.</p>${!m.closed && m.funded && role !== "facility" ? `<label class="field">Dispute reason<textarea data-field="disputeReason">Request review of the evidence or agreed conditions for this milestone.</textarea></label>${actionButton("dispute", "Flag milestone dispute", 'class="secondary"')}` : "<p>No dispute action available for this role or state.</p>"}</details></section>
  <aside>${commitmentCard(m)}<section class="card spaced-top"><div class="card-header"><h2>A clear path to payment</h2><span class="section-label">${done.filter(Boolean).length}/6</span></div><ol class="stage-list">${stages.map(([title, text], i) => `<li class="stage ${done[i] ? "done" : i === index ? "current" : ""}"><span class="marker">${done[i] ? "✓" : i + 1}</span><div><strong>${title}</strong><p>${text}</p></div></li>`).join("")}</ol>${m.verified && m.verifiedKg < m.targetKg ? `<div class="callout amber"><strong>Joint exception review</strong><p>${m.verifiedKg} kg stays the accepted outcome. Both parties decide the payment response.</p></div>` : ""}</section><section class="card spaced-top"><h3>Milestone at a glance</h3>${kv("Target", `${m.targetKg} kg`)}${kv("Received", m.receivedKg ? `${m.receivedKg} kg` : "Awaiting receipt")}${kv("Verified", m.verified ? `${m.verifiedKg} kg` : "Awaiting verification")}${kv("Funding", m.funded ? "Secured in advance" : "Not deposited")}${kv("Paid", `${number(m.paidDinr)} dINR`)}</section></aside></div>`;
}
function evidenceView() {
  const m = state.milestones.find((m) => m.id === activeMilestone);
  return `<div class="tabs">${state.milestones.map((item) => `<button data-evidence-tab="${item.id}" class="${item.id === activeMilestone ? "active" : ""}">Milestone 0${item.id} · ${story.routes[item.id - 1]}</button>`).join("")}</div><div class="narrative-banner"><span>◎</span><div><strong>Evidence supports assertions. Verification establishes acceptance.</strong><p>Hashes detect changes to records; they cannot establish that a physical event is true. Each assertion has an identified source and a linked evidence fingerprint.</p></div></div><div class="evidence-grid"><article class="card evidence-card"><div class="document-cover"><img src="/programme-art.svg" alt="Illustration, not a field photograph"><span class="cover-tag">COLLECTION CONTEXT</span></div><div class="evidence-body"><h3>Collection activity</h3><p>${esc(m.evidence?.collectionNote || "Aamhi will submit collection context and a fingerprinted evidence package.")}</p>${pill(!zero(m.evidenceHash) ? "Package submitted" : "Awaiting submission", zero(m.evidenceHash) ? "gray" : "")}</div></article><article class="card evidence-card"><div class="document-cover"><span class="doc-icon">▤</span><span class="cover-tag">FACILITY ACKNOWLEDGEMENT</span></div><div class="evidence-body"><h3>Receipt & quantity</h3>${kv("Received", m.receivedKg ? `${m.receivedKg} kg` : "Not yet confirmed")}${kv("Facility", story.facility)}<p>Confirmation references the same evidence package. Receipt establishes the delivered quantity; recycling requires a separate processing attestation.</p>${pill(m.receivedKg ? "Confirmed by facility" : "Awaiting facility", m.receivedKg ? "" : "gray")}</div></article><article class="card evidence-card"><div class="document-cover"><span class="doc-icon">✓</span><span class="cover-tag">VERIFIER ASSESSMENT</span></div><div class="evidence-body"><h3>Eligible outcome</h3>${kv("Accepted quantity", m.verified ? `${m.verifiedKg} kg` : "Not yet verified")}${kv("Original target", `${m.targetKg} kg`)}<p>${m.verified && m.verifiedKg < m.targetKg ? "The accepted quantity is below target. Any payment exception requires both parties." : "The verifier confirms what the supporting collection and receipt evidence justifies."}</p>${pill(m.verified ? "Verifier acceptance recorded" : "Awaiting verifier", m.verified ? "" : "gray")}</div></article></div><div class="review-row"><section class="card"><h2>Who stands behind this record?</h2>${kv("Submitted by", "Aamhi recovery team")}${kv("Receipt authority", story.facility)}${kv("Acceptance authority", story.verifier)}${kv("Programme sponsor", story.sponsor)}<p class="fine-print muted">Receipt and verification remain separate responsibilities.</p></section><section class="card"><h2>Evidence integrity</h2><p class="muted">The submitted manifest links the programme, accepted terms, collection context and exact supporting file fingerprints.</p><p class="hash">${esc(zero(m.evidenceHash) ? "No manifest has been submitted yet." : m.evidenceHash)}</p><details class="disclosure"><summary>Inspect manifest and file fingerprints</summary><pre>${esc(JSON.stringify(m.evidence || { status: "Awaiting submission" }, null, 2))}</pre></details><button data-view="proof" class="text-button">Inspect the transaction record →</button></section></div>`;
}
function reportMarkdown() {
  const t = totals();
  return `# Sponsor outcome report\n\nIllustrative local demonstration — not an independently certified or signed report.\n\nProgramme: ${story.name}\nSponsor: ${story.sponsor} (fictional)\nProgramme ID: ${state.programmeId}\nLocal session ID: ${state.sessionId}\nGenerated: ${new Date().toISOString()}\n\n## Funding and outcome\n\n- Planned budget: ${t.budget} dINR\n- Funding deposited: ${t.funded} dINR\n- Payment released: ${t.paid} dINR\n- Funding held: ${state.balances.escrow} dINR\n- Refunded: ${t.refunded} dINR\n- Verified eligible collection and facility receipt: ${t.verified} kg\n\n## Milestones\n\n${state.milestones.map((m) => `### Milestone ${m.id}: ${story.routes[m.id - 1]}\n\n- Target: ${m.targetKg} kg\n- Facility received: ${m.receivedKg} kg\n- Verified eligible: ${m.verifiedKg} kg\n- Payment released: ${m.paidDinr} dINR\n- Refund: ${m.refundedDinr} dINR\n- Status: ${status(m).label}\n- Evidence hash: ${m.evidenceHash}\n- Attribution hash: ${m.attributionHash}\n- Exception: ${m.exception?.reason || "None recorded"}\n- Sponsor approved: ${m.sponsorApproved}\n- Aamhi approved: ${m.aamhiApproved}\n`).join("\n")}\n## Boundaries\n\nThis records funding of verified collection and facility receipt in a synthetic demonstration. It does not prove line-item expenditure, recycling, material ownership, offsets or official credit issuance. Attribution is non-transferable.\n\n## Local transaction references\n\nChain: ${state.chainId}\nEscrow: ${state.contracts.escrow}\nTerms hash: ${state.termsHash}\n\n${state.audit
    .filter((tx) => /milestone/.test(tx.action))
    .map((tx) => `- ${tx.action}: ${tx.hash} (block ${tx.blockNumber})`)
    .join("\n")}\n`;
}
function reportView() {
  const t = totals();
  return `<div class="report-page"><div class="report-toolbar"><span class="section-label">PROGRAMME OUTCOME & FUNDING SUMMARY</span><div class="button-row"><button id="download-report">Download Markdown ↓</button><button id="print-report" class="secondary">Print report</button></div></div><article class="report-sheet"><div class="report-brand"><strong>aamhi<span> / OUTCOME RECORD</span></strong><span>${esc(state.programmeId)}<br>VERIFIED OUTCOME RECORD</span></div><p class="eyebrow spaced-top">FUNDED BY ${esc(story.sponsor.toUpperCase())}</p><h2 class="report-title">A contribution you can trace.<br>An outcome you can explain.</h2><p class="report-lead">${t.verified ? `The programme has recorded ${number(t.verified)} kg of verified eligible LDPE collection and confirmed facility receipt for this programme.` : "The programme is awaiting its first verified recovery outcome. This report shows current progress without asserting work that has not been accepted."}</p><div class="report-metrics"><div><strong>${number(t.verified)} <small>kg</small></strong><span>Verified collection + receipt</span></div><div><strong>${number(t.paid)}</strong><span>dINR paid to Aamhi</span></div><div><strong>${t.closed} / 2</strong><span>Milestones closed</span></div></div><h3>Funding accounted for</h3>${kv("Programme allocation", `${number(t.budget)} dINR`)}${kv("Funding deposited", `${number(t.funded)} dINR`)}${kv("Funding held", `${number(state.balances.escrow)} dINR`)}${kv("Funding refunded", `${number(t.refunded)} dINR`)}<table class="report-table"><thead><tr><th>Recovery milestone</th><th>Target</th><th>Verified</th><th>Paid dINR</th></tr></thead><tbody>${state.milestones.map((m) => `<tr><td>0${m.id} · ${story.routes[m.id - 1]}</td><td>${m.targetKg} kg</td><td>${m.verifiedKg} kg</td><td>${number(m.paidDinr)}</td></tr>`).join("")}</tbody></table><h3>Exceptions, explained</h3>${
    state.milestones.some((m) => m.exception)
      ? state.milestones
          .filter((m) => m.exception)
          .map(
            (m) =>
              `<p><strong>Milestone ${m.id}:</strong> ${esc(m.exception.reason)} ${m.sponsorApproved && m.aamhiApproved ? "Both parties approved the exact proposal." : "Joint approval is not yet complete."} Payment released: ${number(m.paidDinr)} dINR.</p>`,
          )
          .join("")
      : "<p>No exception proposal has been recorded.</p>"
  }<h3>What the sponsor may report</h3><p>${t.paid > 0 ? `Supported the programme’s paid milestones, recording ${number(state.milestones.filter((m) => Number(m.paidDinr) > 0).reduce((s, m) => s + m.verifiedKg, 0))} kg of verified eligible collection and facility receipt.` : "A funding programme is in progress; no paid-outcome attribution is asserted yet."}</p><div class="callout"><strong>Attribution has a defined scope.</strong><p>This report does not establish completed recycling, line-item expenditure, material ownership, offsets or official credits. Each accepted milestone is linked to evidence, appointed verification and its settlement transaction.</p></div><details class="disclosure"><summary>Supporting evidence and attribution references</summary>${state.milestones.map((m) => `<p class="hash">Milestone ${m.id}<br>Evidence: ${esc(m.evidenceHash)}<br>Attribution: ${esc(m.attributionHash)}</p>`).join("")}<p class="hash">Terms: ${esc(state.termsHash)}<br>Chain: ${state.chainId}<br>Escrow: ${esc(state.contracts.escrow)}</p></details></article></div>`;
}
function proofView() {
  const m = state.milestones[activeMilestone - 1];
  const paid = state.audit.filter((tx) =>
    chainEvents(tx).some((event) => event.name === "Released"),
  );
  const cards = [
    {
      label: "Identity & authority",
      title: "The right organisation makes each decision.",
      intro:
        "Funding, delivery, receipt and verification belong to distinct programme participants. Their appointed accounts are enforced by the contract—not inferred from a name on a report.",
      steps: [
        "The sponsor commits funding and approves commercial exceptions.",
        "Aamhi submits evidence; the facility confirms receipt; the verifier accepts the eligible outcome.",
        "Only the appointed accounts can perform their respective actions. An administrator cannot substitute for either party’s exception approval.",
      ],
      fact: "Four distinct appointed participant accounts",
      value: "Accountability follows the actor who made the assertion.",
      detail: JSON.stringify(state.addresses, null, 2),
    },
    {
      label: "Open discovery · Beckn",
      title: "Discover a purpose before committing funds.",
      intro:
        "A provider publishes a programme offering with its geography, material, intended outcome and funding conditions. A sponsor discovers that offering and selects it to begin an agreement.",
      steps: [
        "The consumer retrieves the provider catalogue through a separate HTTP interface.",
        "The offering ID links the discovery result to the selected programme.",
        "Terms are then accepted and enforced through the programme contract; discovery itself does not release funds.",
      ],
      fact: state.selected
        ? "Offering selected and linked to this programme"
        : state.discovery
          ? "Programme offering discovered"
          : "Awaiting programme discovery",
      value:
        "Independent applications can share an agreed offering and transaction reference.",
      detail: JSON.stringify(
        state.discovery || { status: "Not yet discovered" },
        null,
        2,
      ),
    },
    {
      label: "Digital commitments",
      title: "Give the agreement a persistent on-chain identity.",
      intro:
        "Each milestone has an identified, non-transferable commitment record: its target, allocated funding and exact agreed terms. It is a digital representation of the programme obligation, separate from the money used to pay it.",
      steps: [
        "The sponsor proposes the milestone and Aamhi accepts the same terms fingerprint.",
        "The contract fixes the appointed parties, target and budget.",
        "Funding attribution is non-transferable. No physical material title or official environmental credit is created by this record.",
      ],
      fact:
        "Commitment #0" +
        m.id +
        " · " +
        m.targetKg +
        " kg · " +
        number(m.budgetDinr) +
        " dINR",
      value:
        "The agreement remains inspectable throughout fulfilment and settlement.",
      detail: JSON.stringify(
        {
          recordType: "NON_TRANSFERABLE_PROGRAMME_COMMITMENT",
          milestone: m.id,
          termsHash: m.termsHash,
          escrow: state.contracts.escrow,
        },
        null,
        2,
      ),
    },
    {
      label: "Programmable money",
      title: "Funding has rules, not just a destination.",
      intro:
        "dINR is the payment token held by the escrow contract. A deposit moves value from the sponsor’s balance into reserved milestone funding. The contract can then transfer only the amount authorised by its rules.",
      steps: [
        "The sponsor approves and deposits the milestone allocation.",
        "Value stays held until the accepted outcome satisfies the original terms or both parties approve an exact exception.",
        "Settlement transfers payment to Aamhi and refunds any agreed remainder to the sponsor.",
      ],
      fact:
        number(state.balances.escrow) +
        " dINR held · " +
        number(state.balances.aamhi) +
        " dINR paid to Aamhi",
      value:
        "The funding and its permitted release conditions are part of the same shared state.",
      detail: JSON.stringify(
        {
          token: state.token,
          address: state.contracts.dinr,
          balances: state.balances,
        },
        null,
        2,
      ),
    },
    {
      label: "Evidence & attestations",
      title: "Connect physical work to accountable assertions.",
      intro:
        "Evidence remains off-chain; its fingerprint is recorded against the milestone. Facility and verifier transactions reference that same fingerprint, binding their assertions to the package they reviewed.",
      steps: [
        "Aamhi submits the evidence manifest.",
        "The facility confirms the received quantity against that manifest.",
        "The verifier accepts an eligible quantity that cannot exceed confirmed receipt. A shortfall remains the actual outcome even if a full fixed payment is agreed.",
      ],
      fact: m.verified
        ? m.verifiedKg + " kg verified against " + m.receivedKg + " kg received"
        : m.receivedKg
          ? m.receivedKg + " kg received · awaiting verification"
          : "Awaiting linked receipt and verification",
      value:
        "A clear chain of responsibility connects collection records to the accepted outcome.",
      detail: JSON.stringify(
        {
          evidence: m.evidenceHash,
          receivedKg: m.receivedKg,
          verifiedKg: m.verifiedKg,
        },
        null,
        2,
      ),
    },
    {
      label: "Automatic settlement",
      title: "When the final condition is met, payment follows.",
      intro:
        "A qualifying verification transaction also transfers dINR and records attribution. For a shortfall, the second required exception approval performs the same settlement. There is no separate administrator release.",
      steps: [
        "The contract checks the funded milestone, evidence-linked acceptance and any required joint approvals.",
        "Verification or final approval, value transfer and attribution execute atomically in the same transaction.",
        "If a token transfer fails, the entire transaction reverts. The system cannot record successful acceptance or approval while silently losing the required payment.",
      ],
      fact:
        paid.length +
        " automatic settlement" +
        (paid.length === 1 ? "" : "s") +
        " confirmed",
      value: "No additional operator can delay an already-authorised payment.",
      detail: JSON.stringify(
        paid.map((tx) => ({
          transaction: tx.hash,
          events: chainEvents(tx).filter((e) =>
            ["Verified", "ExceptionApproved", "Transfer", "Released"].includes(
              e.name,
            ),
          ),
        })),
        null,
        2,
      ),
    },
  ];
  return `<div class="tabs">${state.milestones.map((item) => `<button data-evidence-tab="${item.id}" class="${item.id === activeMilestone ? "active" : ""}">Commitment #0${item.id}</button>`).join("")}</div>
  <div class="token-showcase"><div class="payment-token-card"><div class="token-card-heading"><span>PAYMENT TOKEN</span>${pill("dINR")}</div><div class="payment-token-identity"><div class="money-token"><span>d</span>INR</div><div><h2>Programmable funding</h2><p>Fungible value · 18 decimals · escrow-controlled release</p></div></div><div class="token-balances">${kv("Sponsor balance", number(state.balances.sponsor) + " dINR")}${kv("Held by escrow", number(state.balances.escrow) + " dINR")}${kv("Aamhi balance", number(state.balances.aamhi) + " dINR")}</div><p class="hash">Token contract: ${esc(state.contracts.dinr)}</p></div>${commitmentCard(m)}</div>
  ${ledgerStory(m)}
  <div class="proof-intro"><p class="eyebrow">HOW THE FINTERNET MODEL WORKS</p><h2>Shared commitments. Trusted assertions. Automatic value movement.</h2><p>Follow how each capability contributes to the programme, then inspect the exact records and events beneath it.</p></div>
  <div class="proof-grid">${cards.map((card, index) => `<section class="card proof-detail"><div class="proof-card-number">0${index + 1}</div>${pill(card.label)}<h3>${card.title}</h3><p>${card.intro}</p><ol>${card.steps.map((step) => `<li>${step}</li>`).join("")}</ol><div class="proof-live-fact"><span class="live-dot"></span>${esc(card.fact)}</div><p class="proof-value"><strong>Why it matters</strong><br>${card.value}</p><details class="disclosure"><summary>Inspect the supporting record</summary><pre>${esc(card.detail)}</pre></details></section>`).join("")}</div>
  <section class="card"><div class="card-header"><h2>What changed on the blockchain?</h2><a href="/api/export" target="_blank" rel="noopener" class="section-label">Inspect programme records ↗</a></div><p>Each receipt below shows the account that submitted the transaction, its confirmed block and the events emitted by the contracts. A settlement receipt contains both the triggering decision and the actual token transfers.</p>${[
    ...state.audit,
  ]
    .reverse()
    .map(
      (tx) =>
        `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(txTitle(tx))}</strong><p>${esc(names[tx.role] || "Network setup")} · block ${tx.blockNumber}</p><div class="event-chips">${chainEvents(
          tx,
        )
          .map(
            (event) =>
              `<span>${esc(event.name)}${event.name === "Transfer" ? " · " + dinr(event.values.value) + " dINR" : event.name === "Released" ? " · " + dinr(event.values.paid) + " dINR paid" : ""}</span>`,
          )
          .join(
            "",
          )}</div><div class="hash">${esc(short(tx.hash))}</div></div><button data-tx="${esc(tx.hash)}">View receipt ↗</button></div>`,
    )
    .join("")}</section>
  <details class="card system-disclosure"><summary>System details, environment and integration status</summary><p>This presentation executes real contracts on a local Ethereum chain with controlled accounts and synthetic evidence. dINR is a sandbox token, not redeemable INR or CBDC. Sponsorship commitments are contract records, not ERC-1155 tokens or official credits. The HTTP discovery adapter illustrates the Beckn interaction boundary; external network compliance is not asserted.</p><p>Future authorised bank/CBDC and permitted stablecoin adapters require provider access, applicable permissions, instrument-specific custody and reconciliation. They are architecture extensions, not connected payment services. Public deployment, production identity and durable evidence storage remain implementation work. Reports generated here are not independently certified or digitally signed.</p><pre>${esc(JSON.stringify({ sessionId: state.sessionId, chain: state.chainId, contracts: state.contracts, accounts: state.addresses, modes: state.modes, terms: state.terms, termsHash: state.termsHash }, null, 2))}</pre></details>`;
}
function render() {
  if (!state) return;
  document.body.dataset.role = $("#role").value;
  $("#role-title").textContent = names[$("#role").value];
  $("#role-purpose").textContent = {
    sponsor: "Commit funding · review outcomes · approve exceptions",
    aamhi: "Deliver recovery · submit evidence · agree exceptions",
    facility: "Acknowledge receipt · confirm material and quantity",
    verifier:
      "Assess evidence · verify outcomes · trigger conditional settlement",
  }[$("#role").value];
  document.body.dataset.view = view;
  $("#page-title").textContent = titles[view][0];
  $("#page-description").textContent = titles[view][1];
  $("#avatar").textContent = {
    sponsor: "SP",
    aamhi: "AA",
    facility: "RF",
    verifier: "IV",
  }[$("#role").value];
  $$(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
    button.setAttribute(
      "aria-current",
      button.dataset.view === view ? "page" : "false",
    );
  });
  $$(".view").forEach((section) => {
    section.hidden = section.id !== `view-${view}`;
  });
  const renderer = {
    overview,
    workspace,
    evidence: evidenceView,
    report: reportView,
    proof: proofView,
  };
  $(`#view-${view}`).innerHTML = renderer[view]();
  $$(
    "button[data-action],button[data-chapter],#guided-next,button[data-switch-role],#confirm-chapter",
  ).forEach((button) => {
    button.disabled = busy;
  });
  $("#role").disabled = busy;
  $("#refresh").disabled = busy;
  $("#present").disabled = busy;
  if (state.presentation && view === "overview") {
    $("#view-overview").insertAdjacentHTML(
      "afterbegin",
      `<div class="narrative-banner"><span>▶</span><div><strong>Prepared chapter: ${esc({ funded: "Funding secured", review: "When reality differs", complete: "The outcome & the proof" }[state.presentation.chapter])}</strong><p>Continue from this programme stage. The ledger records each commitment, attestation and payment.</p></div></div>`,
    );
  }
}

async function perform(action) {
  if (action === "report") return navigate("report");
  if (action === "refresh") return run(async () => {});
  const m = state.milestones.find((m) => m.id === activeMilestone);
  const input = {};
  $$("[data-field]").forEach((field) => {
    input[field.dataset.field] = field.value;
  });
  input.proposalHash = m.exceptionHash;
  if (action === "dispute") input.reason = input.disputeReason;
  await run(async () => {
    if (action === "discover") {
      await api("/api/discover", {});
      return;
    }
    if (action === "select") {
      await api("/api/select", { resourceId: "OFFER-AAMHI-RECOVERY-001" });
      return;
    }
    await api(`/api/milestones/${m.id}/${action}`, input);
  });
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target || target.disabled) return;
  if (target.dataset.view) return navigate(target.dataset.view);
  if (target.dataset.close) return $(`#${target.dataset.close}`).close();
  if (target.id === "guided-next") return goNext();
  if (target.dataset.switchRole) {
    captureDrafts();
    setRole(target.dataset.switchRole);
    return;
  }
  if (target.dataset.openMilestone) {
    activeMilestone = Number(target.dataset.openMilestone);
    const step = nextStep(state.milestones[activeMilestone - 1]);
    setRole(step.role);
    return navigate("workspace");
  }
  if (target.dataset.milestoneTab || target.dataset.evidenceTab) {
    captureDrafts();
    activeMilestone = Number(
      target.dataset.milestoneTab || target.dataset.evidenceTab,
    );
    render();
    return;
  }
  if (target.id === "guide-toggle") {
    guided = !guided;
    render();
    return;
  }
  if (target.id === "present") return $("#presentation-dialog").showModal();
  if (target.dataset.chapter) {
    pendingChapter = target.dataset.chapter;
    $("#presentation-dialog").close();
    $("#confirm-dialog").showModal();
    return;
  }
  if (target.id === "confirm-chapter") {
    $("#confirm-dialog").close();
    const chapter = pendingChapter;
    return run(
      async () => {
        if (chapter === "fresh") await api("/api/presentation/reset", {});
        else await api("/api/presentation/chapter", { chapter });
        drafts.clear();
        activeMilestone = chapter === "review" ? 2 : 1;
        view =
          chapter === "review"
            ? "workspace"
            : chapter === "complete"
              ? "report"
              : "overview";
        $("#role").value = chapter === "review" ? "aamhi" : "sponsor";
      },
      chapter === "fresh"
        ? "Ready. The programme is waiting for its first commitment."
        : "Chapter prepared. Commitments, evidence and settlement records are ready to inspect.",
    );
  }
  if (target.dataset.action) return perform(target.dataset.action);
  if (target.dataset.tx)
    return run(async () => {
      $("#receipt").textContent = JSON.stringify(
        await api(`/api/receipt?hash=${target.dataset.tx}`),
        null,
        2,
      );
      $("#receipt-dialog").showModal();
    });
  if (target.id === "download-report") {
    const blob = new Blob([reportMarkdown()], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "aamhi-sponsor-outcome-report.md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (target.id === "print-report") return window.print();
  if (target.id === "refresh") return run(async () => {});
});
$("#role").addEventListener("change", () => {
  captureDrafts();
  render();
});
api("/api/state")
  .then((value) => {
    state = value;
    render();
    message("Ready. Explore the programme or follow the guided next step.");
  })
  .catch((error) => message(error.message, true));
