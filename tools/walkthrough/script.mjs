/**
 * The walkthrough: one beat = one narrated passage, its topic caption, and what happens on screen while it plays.
 * `say` is both the voiceover and the subtitle text. `pre` runs before the narration starts (scene resets);
 * `act` runs while it plays. A beat lasts as long as the longer of the two.
 */
const ch = (n, title) => `${n} · ${title}`;

export const beats = [
  // ------------------------------------------------------------------ introduction
  { id: "i01", slide: "title", reveal: 3,
    say: "This is Vartul, by Suma: a proof of recovery network for waste that is collected, sorted and recycled on India's coast. [pause] In the next few minutes you will see the problem it solves, the open digital infrastructure it is built on, and a walkthrough of the working product." },
  { id: "i02", slide: "problem", reveal: 3, revealEvery: 3800,
    say: "Today, money for waste recovery runs on trust that is hard to check. A sponsor funds a clean-up and receives a report. The same kilograms can be reported to two funders. The collectors, the safai saathis who do the hardest work, are paid late, or never see the funding at all. And nobody outside can verify any of it." },
  { id: "i03", slide: "promise", reveal: 3, revealEvery: 2600,
    say: "Vartul makes three promises. Every rupee is linked to a verified kilogram. Every kilogram is linked to the person who collected it. And every impact claim is made only once." },
  { id: "i04", slide: "standards", reveal: 1,
    say: "To keep those promises, Vartul combines three pieces of open digital public infrastructure. [pause] First, Finternet ideas. Recovered material becomes a tokenised asset on a shared ledger, and money moves by programmable settlement: it is released only when agreed conditions are met." },
  { id: "i05", reveal: 2,
    say: "Second, the Beckn protocol: an open network, so sponsors and recyclers can discover programmes and lots from any provider, with every message signed, and no closed marketplace in the middle." },
  { id: "i06", reveal: 3,
    say: "Third, W3C Verifiable Credentials and decentralised identifiers, so that certificates, roles and workers' records can be checked by anyone, without having to trust Vartul." },
  { id: "i07", slide: "flow", reveal: 6, revealEvery: 2300,
    say: "Here is the journey of a bag. A collector records it on a phone. A recovery centre bales it into a lot. A recycler's weighbridge confirms what arrived. An independent verifier samples the records. Then, in one transaction, the collectors, the NGO and the verifier are paid, and the sponsor receives an exclusive claim, with a certificate anyone can verify." },
  { id: "i08", act: async (h) => { await h.hideSlide(); await h.openPresenter(); await h.scene(1); },
    cap: { e: "The demonstration", t: "A real ledger, with simulated externals", s: "Six months of Project Aamhi's work in Murud taluka, Raigad" },
    say: "Everything you are about to see runs for real on a ledger, seeded with six months of activity in Project Aamhi's villages in Murud taluka, Raigad. Banks, payments, identity checks and other organisations are simulated, and labelled as such. The presenter panel on the right steps through eleven short scenes." },

  // ------------------------------------------------------------------ 1
  { id: "s01a", cap: { e: ch(1, "The network at a glance"), t: "Verified, not reported", s: "Every figure is derived from ledger events" },
    act: async (h) => { await h.spot(h.page.locator(".stat").first(), 400); },
    say: "This is the network at a glance. More than fifty thousand kilograms of verified recovery across the Raigad coast. Every figure on this page is derived from events on the ledger, not typed into a report." },
  { id: "s01b", cap: { e: ch(1, "The network at a glance"), t: "Programmable settlement", s: "Splits are fixed in signed terms and executed by the escrow contract" },
    act: async (h) => { await h.spot(h.page.locator(".stat").nth(2)); await h.wait(2600); await h.spot(h.page.locator(".stat").nth(3)); await h.wait(2600); await h.spot(h.card("Where the released money went")); },
    say: "Thirty-nine percent of released funds reached collectors directly, computed from settlement events. And there are zero over-claimed lots: no kilogram has been sold as impact twice." },

  // ------------------------------------------------------------------ 2
  { id: "s02a", pre: async (h) => { await h.unspot(); await h.scene(2); await h.go("/sponsor?as=COASTLINE"); },
    cap: { e: ch(2, "A sponsor discovers and commits"), t: "An AI assistant, within limits", s: "Reads the registry and the network; can only draft" },
    act: async (h) => { await h.wait(1200); await h.page.getByRole("tab", { name: "Assistant" }).click(); await h.wait(1500); await h.page.getByRole("button", { name: "Ask", exact: true }).click(); await h.page.locator(".assistant-turn").first().waitFor({ timeout: 60000 }); await h.wait(600); await h.show(h.page.locator(".assistant-turn").first(), false); },
    say: "A new sponsor, the Coastline Giving Circle, wants to fund coastal recovery with three lakh rupees, and wants at least a third to reach collectors. Its coordinator asks the sponsor assistant." },
  { id: "s02b", cap: { e: ch(2, "A sponsor discovers and commits"), t: "AI drafts, people decide", s: "No keys, no authority over money" },
    act: async (h) => { await h.spot(h.page.locator(".assistant-draft").first()); },
    say: "The assistant searched the open network and ranked programmes on their ledger track record, not on what providers say about themselves. It drafted a commitment, but it holds no keys. It cannot sign or fund. A person decides." },
  { id: "s02c", cap: { e: ch(2, "A sponsor discovers and commits"), t: "Beckn: open discovery", s: "search · select · init · confirm, every message signed" },
    act: async (h) => { await h.unspot(); await h.run(3, 1800); },
    say: "The commitment itself runs over Beckn. The sponsor's app broadcasts a signed search through the network gateway to every registered NGO. It selects Aamhi's fishing nets programme, receives a quote, and then the exact terms." },
  { id: "s02d", cap: { e: ch(2, "A sponsor discovers and commits"), t: "Finternet: programmable escrow", s: "Funds are held against the signed terms, released only for verified outcomes" },
    act: async (h) => { await h.run(1); await h.go("/programmes/PRG-MRD-NETS-2027"); await h.wait(800); await h.spot(h.page.locator(".stat").first()); },
    say: "On confirmation, three lakh rupees move into a programme escrow on the ledger, locked to the fingerprint of the terms both parties signed. The money is held, not paid." },

  // ------------------------------------------------------------------ 3
  { id: "s03a", pre: async (h) => { await h.unspot(); await h.scene(3); await h.go("/field?saathi=SS-MRD-0017"); },
    cap: { e: ch(3, "Follow one bag"), t: "Signed at the source", s: "Pseudonymous on the ledger; no personal data" },
    act: async (h) => { await h.wait(1500); await h.run(1); await h.page.locator(".phone").getByText("My bags", { exact: true }).click(); await h.wait(500); await h.spot(h.page.locator(".phone")); },
    say: "Now, follow one bag. Sunanda, a safai saathi, records twelve point four kilograms of plastic film on the Korlai shore. The weight, a fingerprint of the photo, the location and the time are signed with a key on her phone. Her name never reaches the ledger." },
  { id: "s03b", cap: { e: ch(3, "Follow one bag"), t: "Finternet: a tokenised asset", s: "One recovery lot is one token, measured in grams" },
    act: async (h) => { await h.unspot(); await h.run(1); await h.go("/lots/VRL-MRD-2026-0042"); await h.wait(900); await h.spot(h.card("Mass balance")); },
    say: "At the Kashid recovery centre, her bag joins more than two hundred records in a baled lot. The ledger checks the mass balance before it mints the lot as a tokenised asset, measured in grams, anchored to the fingerprint of every record." },
  { id: "s03c", cap: { e: ch(3, "Follow one bag"), t: "A proof chain of attestations", s: "Each step is signed by the party responsible for it" },
    act: async (h) => { await h.run(3, 900); await h.spot(h.card("Proof chain")); },
    say: "The lot is dispatched to Talvan Polymers, whose weighbridge confirms eleven hundred and ninety-six kilograms. An independent verifier, Nirikshan Assurance, samples the records and accepts eleven hundred and eighty. Each step is a signed attestation on the ledger." },
  { id: "s03d", cap: { e: ch(3, "Follow one bag"), t: "Atomic settlement", s: "Payouts, fees and the sponsor's claim in one transaction" },
    act: async (h) => { await h.unspot(); await h.run(2, 900); await h.wait(600); await h.spot(h.card("Rights in this lot")); },
    say: "After a challenge window, anyone can trigger settlement. In a single transaction, twenty-one thousand two hundred and forty rupees are released: eight thousand four hundred and ninety-six to eleven collectors, the rest to Aamhi and the verifier, and an exclusive claim to the sponsor, Tidewell Foods." },

  // ------------------------------------------------------------------ 4
  { id: "s04a", pre: async (h) => { await h.unspot(); await h.scene(4); await h.go("/field?saathi=SS-MRD-0017"); },
    cap: { e: ch(4, "Sunanda gets paid"), t: "Benefit transfer to the last mile", s: "Paid on verification, with references she can show" },
    act: async (h) => { await h.wait(1200); await h.page.locator(".phone").getByText("Earnings", { exact: true }).click(); await h.wait(500); await h.spot(h.page.locator(".phone")); },
    say: "On Sunanda's phone, she sees what she earned for verified kilograms, with payout references she can show." },
  { id: "s04b", cap: { e: ch(4, "Sunanda gets paid"), t: "A work record she owns", s: "A W3C credential, issued only at her request" },
    act: async (h) => { await h.run(1); await h.wait(500); await h.spot(h.page.locator(".p-step-result").last()); },
    say: "She can also export her work history as a verifiable credential: proof of work that she owns, and can take to a bank or a government scheme." },

  // ------------------------------------------------------------------ 5
  { id: "s05a", pre: async (h) => { await h.unspot(); await h.scene(5); await h.go(await h.surface(5)); },
    cap: { e: ch(5, "A stranger scans the certificate"), t: "W3C Verifiable Credentials", s: "Signature, revocation list and ledger, checked by anyone" },
    act: async (h) => { await h.wait(1500); await h.spot(h.card("Checks")); },
    say: "Now a stranger scans the sponsor's certificate. It is a W3C Verifiable Credential. The page checks the issuer's signature, the published revocation list, and the live claim on the ledger. Then it checks the signature again inside the browser, using the issuer's public decentralised identifier document." },
  { id: "s05b", cap: { e: ch(5, "A stranger scans the certificate"), t: "Trust without trusting Vartul", s: "Open standards, no account needed" },
    act: async (h) => { await h.spot(h.page.locator(".verdict").first()); },
    say: "No account, and no need to trust Vartul. Just open standards." },

  // ------------------------------------------------------------------ 6
  { id: "s06a", pre: async (h) => { await h.unspot(); await h.scene(6); await h.go("/anomalies"); },
    cap: { e: ch(6, "Fraud caught"), t: "The anomaly engine flags; people decide", s: "Weight outlier · duplicate photo · off-route location" },
    act: async (h) => { await h.run(2, 900); await h.go("/anomalies"); await h.wait(900); await h.spot(h.card("Flagged records")); },
    say: "What happens when someone games the system? A collector reports a forty-six kilogram trip against a usual nine, reuses another collector's photo, and records a location two kilometres off route. The anomaly engine flags all three. It flags; people decide." },
  { id: "s06b", cap: { e: ch(6, "Fraud caught"), t: "The verifier assistant drafts the exclusion", s: "67.4 kg proposed; the verifier reviews and signs" },
    act: async (h) => { await h.unspot(); await h.go("/verifier?as=NIRIKSHAN"); await h.wait(1200); await h.page.getByRole("button", { name: "Ask", exact: true }).click(); await h.page.locator(".assistant-draft").first().waitFor({ timeout: 60000 }); await h.spot(h.page.locator(".assistant-draft").first()); await h.wait(2500); await h.unspot(); await h.run(2, 900); },
    say: "The verifier assistant summarises the proof chain and drafts an exclusion of the flagged records: sixty-seven point four kilograms. The verifier reviews it, and signs. At settlement, every other collector is paid normally. The flagged grams are not." },

  // ------------------------------------------------------------------ 7
  { id: "s07a", pre: async (h) => { await h.unspot(); await h.scene(7); await h.go("/programmes/PRG-MRD-BEACH-2026"); },
    cap: { e: ch(7, "When reality differs"), t: "Policy-bound escrow", s: "Fixed-on-target: below target, nothing pays" },
    act: async (h) => { await h.wait(1200); await h.spot(h.page.locator(".stat").first()); },
    say: "Reality does not always match the plan. Monsoon access closed two routes, and this programme verified about nine thousand three hundred kilograms against a ten thousand kilogram target. Under its fixed-on-target terms, nothing pays." },
  { id: "s07b", cap: { e: ch(7, "When reality differs"), t: "A joint, exact-proposal exception", s: "No administrator can release funds alone" },
    act: async (h) => { await h.unspot(); await h.run(1); await h.wait(700); await h.spot(h.page.locator("section.card", { has: h.page.locator("h3", { hasText: "Proposed exception" }) }).first()); await h.wait(3000); await h.unspot(); await h.run(2, 1500); await h.content(0); await h.wait(500); await h.spot(h.page.locator(".stat").first()); },
    say: "Aamhi proposes a pro-rata settlement. The proposal is fingerprinted with the terms, the evidence and the quantities, and both sponsors must approve that exact proposal. On the final approval, settlement executes automatically: one lakh, eighty-five thousand, seven hundred rupees paid, and fourteen thousand three hundred refunded. The recorded quantity never changes." },

  // ------------------------------------------------------------------ 8
  { id: "s08a", pre: async (h) => { await h.unspot(); await h.scene(8); await h.go("/lots/VRL-MRD-2026-0042"); },
    cap: { e: ch(8, "Unbundled rights"), t: "Beckn and delivery versus payment", s: "Material and money change hands in one transaction" },
    act: async (h) => { await h.wait(800); await h.run(2, 1200); await h.spot(h.card("Rights in this lot")); },
    say: "Once the recycler buys the material, who owns what? Talvan discovers verified lots over Beckn, and buys this one by delivery versus payment: the material and sixteen thousand five hundred and twenty rupees change hands in a single transaction." },
  { id: "s08b", cap: { e: ch(8, "Unbundled rights"), t: "Exclusive, compatible claims", s: "One physical lot, separately governed rights" },
    act: async (h) => { await h.run(1); await h.wait(500); await h.spot(h.card("Rights in this lot")); },
    say: "The sponsor keeps its funded recovery claim. The recycler receives a separate, disclosed supply claim. One physical lot, separately governed rights, and no double counting." },

  // ------------------------------------------------------------------ 9
  { id: "s09a", pre: async (h) => { await h.unspot(); await h.scene(9); },
    cap: { e: ch(9, "Revocation cascade"), t: "Trust stays live", s: "Revoking evidence flips everything that depended on it" },
    act: async (h) => { await h.run(1); await h.wait(600); const href = await h.page.locator(".p-step-result a", { hasText: "Lot" }).last().getAttribute("href"); if (href) await h.go(href); await h.wait(900); await h.spot(h.card("Proof chain")); },
    say: "What if we learn later that something was false? The network revokes a recycler's October weighbridge receipts. Eleven receipts are revoked. Every lot that depended on them moves to review, and sixteen claims become contested, automatically." },
  { id: "s09b", cap: { e: ch(9, "Revocation cascade"), t: "Certificates update for everyone", s: "A contested claim shows as contested to anyone who checks" },
    act: async (h) => { await h.unspot(); await h.content(0); await h.wait(400); await h.spot(h.page.locator(".page-head, .page > header, .page h1").first()); },
    say: "Certificates that relied on those receipts now show as contested to anyone who checks them. Trust is not a one-time stamp. It stays live." },

  // ------------------------------------------------------------------ 10
  { id: "s10a", pre: async (h) => { await h.unspot(); await h.scene(10); await h.go("/panchayat/NDG"); },
    cap: { e: ch(10, "The Panchayat view"), t: "Local governance on the ledger", s: "Aggregate data only; the Panchayat co-signs" },
    act: async (h) => { await h.wait(1200); await h.run(1); await h.wait(600); await h.spot(h.card("Collection points")); },
    say: "The Gram Panchayat is a partner, not a bystander. Nandgaon's view shows its village's recovery and payouts in aggregate, with no personal data, and the Panchayat co-signs new collection points on the ledger. Marathi is a product requirement, and is shown here as coming soon." },

  // ------------------------------------------------------------------ 11
  { id: "s11a", pre: async (h) => { await h.unspot(); await h.scene(11); await h.go("/network/explorer"); },
    cap: { e: ch(11, "Under the hood"), t: "The Finternet view", s: "Token managers, transactions and signed network messages" },
    act: async (h) => { await h.wait(1200); await h.spot(h.page.locator(".grid.g4").first()); await h.wait(4000); await h.unspot(); await h.page.getByRole("tab", { name: /Network messages/ }).click(); },
    say: "Under the hood, the ledger explorer shows the token managers: recovery lots, claims, escrow and sandbox money. It lists every transaction behind each scene with its decoded events, alongside the signed Beckn messages." },
  { id: "s11b", cap: { e: ch(11, "Under the hood"), t: "Ready for a public test network", s: "Deployment simulated, not executed" },
    act: async (h) => { await h.page.getByRole("tab", { name: "Public end state" }).click(); await h.wait(500); await h.show(h.page.getByText("Simulated, not deployed").first(), false); },
    say: "The same contracts are ready for a public test network. Here the deployment is simulated, showing where each contract would live, so public verifiability can be demonstrated without managing a funded public wallet." },

  // ------------------------------------------------------------------ close
  { id: "c01", slide: "outro", reveal: 3, revealEvery: 4200,
    say: "So, what is real today: the contracts, settlement, claims, credentials, the Beckn network and the anomaly engine. What is simulated: banks, payments, identity checks and field hardware. [pause] The path to a pilot is clear: one taluka, one NGO, two sponsors, and three months, with audited contracts and real custody." },
  { id: "c02", slide: "end", reveal: 3, revealEvery: 1900, tail: 1500,
    say: "Vartul, by Suma. Every rupee linked to a verified kilogram. Every kilogram linked to its collector. Every claim made only once." },
];

/** Spoken-form fixes for the Windows voice. Subtitles keep the written form. */
export function spoken(text) {
  return text
    .replace(/\bBeckn\b/g, "Beckon")
    .replace(/\bW3C\b/g, "W 3 C")
    .replace(/\bAamhi's\b/g, "Aamhee's")
    .replace(/\bAamhi\b/g, "Aamhee")
    .replace(/\bNGO\b/g, "N G O")
    .replace(/\bVartul\b/g, "Vartul");
}
