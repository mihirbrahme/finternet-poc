/** Video overlays injected into the running app: full-screen slides, a lower-third topic caption and a highlight ring. */
export const overlayCss = `
#v-root { position: fixed; inset: 0; pointer-events: none; z-index: 9999; font-family: var(--font-sans); }
#v-slide { position: absolute; inset: 0; background: var(--suma-navy-900); color: #fff; opacity: 0; transition: opacity 600ms ease; display: flex; flex-direction: column; padding: 72px 112px; }
#v-slide.on { opacity: 1; }
#v-slide .logo { height: 44px; align-self: flex-start; }
#v-slide .body { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 28px; }
#v-slide .eyebrow { font: 500 15px/1 var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--suma-cyan-300); }
#v-slide h1 { font: 400 64px/1.12 var(--font-display); margin: 0; max-width: 1180px; }
#v-slide h1.huge { font-size: 120px; }
#v-slide .lead { font: 400 26px/1.45 var(--font-sans); color: #d7e3e8; max-width: 1050px; margin: 0; }
#v-slide .r { opacity: 0; transform: translateY(14px); transition: opacity 600ms ease, transform 600ms ease; }
#v-slide .r.on { opacity: 1; transform: none; }
#v-slide .list { display: flex; flex-direction: column; gap: 22px; margin-top: 8px; }
#v-slide .item { display: flex; gap: 22px; align-items: baseline; font: 400 34px/1.3 var(--font-display); }
#v-slide .item b { font: 500 18px/1 var(--font-mono); color: var(--suma-cyan-300); min-width: 44px; }
#v-slide .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 12px; }
#v-slide .col { border-top: 4px solid var(--suma-teal-500); background: rgba(255,255,255,.05); padding: 26px 28px; display: flex; flex-direction: column; gap: 14px; }
#v-slide .col h2 { font: 400 34px/1.15 var(--font-display); margin: 0; }
#v-slide .col .ctag { font: 500 13px/1 var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--suma-cyan-300); }
#v-slide .col ul { margin: 0; padding-left: 20px; font: 400 20px/1.5 var(--font-sans); color: #d7e3e8; }
#v-slide .col .use { font: 400 18px/1.45 var(--font-sans); color: #fff; border-top: 1px solid rgba(255,255,255,.15); padding-top: 12px; }
#v-slide .flow { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-top: 18px; }
#v-slide .node { background: rgba(255,255,255,.06); border-top: 4px solid var(--suma-teal-500); padding: 20px 18px; display: flex; flex-direction: column; gap: 8px; min-height: 190px; }
#v-slide .node .n { font: 500 13px/1 var(--font-mono); color: var(--suma-cyan-300); }
#v-slide .node h3 { font: 400 26px/1.15 var(--font-display); margin: 0; color: #fff; }
#v-slide .node p { font: 400 17px/1.4 var(--font-sans); color: #d7e3e8; margin: 0; }
#v-slide .node .std { margin-top: auto; font: 500 12px/1.3 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--accent-amber); }
#v-slide .two { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
#v-slide .two h2 { font: 400 32px/1.2 var(--font-display); margin: 0 0 14px; }
#v-slide .two ul { margin: 0; padding-left: 22px; font: 400 21px/1.6 var(--font-sans); color: #d7e3e8; }
#v-slide .pilot { border-left: 4px solid var(--accent-amber); padding: 14px 22px; font: 400 24px/1.45 var(--font-sans); background: rgba(255,255,255,.05); }
#v-lower { position: absolute; left: 268px; bottom: 22px; max-width: 640px; background: rgba(7, 26, 43, .95); border-left: 4px solid var(--suma-teal-500); border-radius: 4px; padding: 14px 22px 16px; box-shadow: 0 12px 32px rgba(0,0,0,.28); opacity: 0; transform: translateY(10px); transition: opacity 450ms ease, transform 450ms ease; }
#v-lower.on { opacity: 1; transform: none; }
#v-lower .e { font: 500 12px/1 var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--suma-cyan-300); }
#v-lower .t { font: 400 25px/1.2 var(--font-display); color: #fff; margin-top: 8px; }
#v-lower .s { font: 400 15px/1.45 var(--font-sans); color: #d7e3e8; margin-top: 6px; }
#v-spot { position: absolute; border: 3px solid var(--suma-teal-500); border-radius: 6px; box-shadow: 0 0 0 6px rgba(0, 167, 181, .18), 0 0 40px rgba(0, 167, 181, .35); opacity: 0; transition: opacity 400ms ease, left 500ms ease, top 500ms ease, width 500ms ease, height 500ms ease; }
#v-spot.on { opacity: 1; }
`;

export function installOverlay() {
  if (document.getElementById("v-root")) return;
  const root = document.createElement("div");
  root.id = "v-root";
  root.innerHTML = `<div id="v-spot"></div><div id="v-lower"><div class="e"></div><div class="t"></div><div class="s"></div></div><div id="v-slide"></div>`;
  document.body.appendChild(root);
}

const logo = `<img class="logo" src="/brand/logo-suma-full-reversed.png" alt="Suma">`;

/** Slides used by the introduction and the close. Elements with class "r" are revealed one beat at a time. */
export const slides = {
  title: `${logo}<div class="body"><div class="eyebrow r">Walkthrough · Murud, Raigad · sandbox demonstration</div><h1 class="huge r">Vartul</h1><p class="lead r">A Proof-of-Recovery network for waste collected, sorted and recycled on India's coast.</p></div>`,
  problem: `${logo}<div class="body"><div class="eyebrow">The problem</div><h1>Recovery funding runs on reports nobody can check</h1><div class="list"><div class="item r"><b>01</b>The same kilograms can be reported to two funders</div><div class="item r"><b>02</b>Collectors are paid late, or never see the funding</div><div class="item r"><b>03</b>Outsiders have no way to verify any of it</div></div></div>`,
  promise: `${logo}<div class="body"><div class="eyebrow">The promise</div><div class="list"><div class="item r"><b>₹</b>Every rupee linked to a verified kilogram</div><div class="item r"><b>kg</b>Every kilogram linked to the person who collected it</div><div class="item r"><b>1×</b>Every impact claim made only once</div></div></div>`,
  standards: `${logo}<div class="body"><div class="eyebrow">Built on open digital public infrastructure</div><div class="cols">
    <div class="col r"><span class="ctag">Finternet</span><h2>Tokenised assets, programmable money</h2><ul><li>Recovery lots as tokens on a shared ledger</li><li>Escrow that releases only on verified outcomes</li><li>Settlement in one atomic transaction</li></ul><div class="use">In Vartul: lots, escrow, payouts and exclusive claims</div></div>
    <div class="col r"><span class="ctag">Beckn protocol</span><h2>Open discovery and ordering</h2><ul><li>Any provider can publish; any buyer app can search</li><li>Every message signed and verified</li><li>No closed marketplace in the middle</li></ul><div class="use">In Vartul: sponsors find programmes, recyclers buy lots</div></div>
    <div class="col r"><span class="ctag">W3C VC · DID</span><h2>Credentials anyone can check</h2><ul><li>Signed Verifiable Credentials</li><li>Public keys published as DID documents</li><li>Revocation through status lists</li></ul><div class="use">In Vartul: certificates, roles and workers' records</div></div>
  </div></div>`,
  flow: `${logo}<div class="body"><div class="eyebrow">How it works</div><h1>The journey of a bag</h1><div class="flow">
    <div class="node r"><span class="n">01</span><h3>Collector</h3><p>Weighs, photographs and signs on the phone</p><span class="std">Signed record</span></div>
    <div class="node r"><span class="n">02</span><h3>Recovery centre</h3><p>Bags become a baled lot; mass balance checked</p><span class="std">Tokenised lot</span></div>
    <div class="node r"><span class="n">03</span><h3>Recycler</h3><p>Weighbridge confirms what arrived</p><span class="std">Attestation</span></div>
    <div class="node r"><span class="n">04</span><h3>Verifier</h3><p>Independent sampling sets the eligible kilograms</p><span class="std">Attestation</span></div>
    <div class="node r"><span class="n">05</span><h3>Settlement</h3><p>Collectors, NGO and verifier paid in one transaction</p><span class="std">Programmable escrow</span></div>
    <div class="node r"><span class="n">06</span><h3>Claim</h3><p>Exclusive claim and a certificate anyone can verify</p><span class="std">W3C credential</span></div>
  </div></div>`,
  outro: `${logo}<div class="body"><div class="eyebrow">Where this stands</div><div class="two">
    <div class="r"><h2>Runs for real</h2><ul><li>Contracts, escrow, settlement and claims on a ledger</li><li>Beckn network with signed messages</li><li>W3C credentials, revocation and public verification</li><li>Anomaly engine and AI assistants with limits</li></ul></div>
    <div class="r"><h2>Simulated and labelled</h2><ul><li>Bank escrow and UPI payouts (sandbox token)</li><li>Identity and registration checks</li><li>Field devices, scales and photos</li><li>Organisations other than Project Aamhi</li></ul></div>
  </div><div class="pilot r">Next: a pilot. One taluka, one NGO, two sponsors and three months, with audited contracts and real custody.</div></div>`,
  end: `${logo}<div class="body"><div class="eyebrow">Vartul by Suma</div><div class="list"><div class="item r"><b>₹</b>Every rupee linked to a verified kilogram</div><div class="item r"><b>kg</b>Every kilogram linked to its collector</div><div class="item r"><b>1×</b>Every claim made only once</div></div></div>`,
};
