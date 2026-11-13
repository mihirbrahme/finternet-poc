/**
 * Walkthrough video: narrate (offline Windows voice) → drive the running app with Playwright while capturing
 * sharp frames via the Chrome screencast → assemble MP4 + SRT with ffmpeg.
 *
 *   node tools/walkthrough/record.mjs [--voice Heera|Ravi] [--rate 1.05] [--only-audio]
 *
 * Needs the demo server on http://127.0.0.1:4300 (pnpm demo), ffmpeg on PATH or in WinGet Links, Windows (for the voice).
 */
import { chromium } from "@playwright/test";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { beats, spoken } from "./script.mjs";
import { installOverlay, overlayCss, slides } from "./overlay.mjs";

const here = import.meta.dirname;
const root = resolve(here, "../..");
const out = resolve(root, ".vartul/video");
const arg = (f, d) => (process.argv.includes(f) ? process.argv[process.argv.indexOf(f) + 1] : d);
const voice = arg("--voice", "Heera");
const rate = arg("--rate", "1.05");
const BASE = "http://127.0.0.1:4300";
const tool = (name) => {
  const linked = join(homedir(), "AppData/Local/Microsoft/WinGet/Links", `${name}.exe`);
  return existsSync(linked) ? linked : name;
};

// ------------------------------------------------------------------ 1. narration
mkdirSync(join(out, "audio"), { recursive: true });
writeFileSync(join(out, "narration.json"), JSON.stringify(beats.map((b) => ({ id: b.id, text: spoken(b.say) }))), "utf8");
console.log(`Synthesising ${beats.length} passages with ${voice}…`);
execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(here, "tts.ps1"), "-Json", join(out, "narration.json"), "-OutDir", join(out, "audio"), "-Voice", voice, "-Rate", rate], { stdio: "ignore" });
const wavSeconds = (id) => {
  const b = readFileSync(join(out, "audio", `${id}.wav`));
  let p = 12;
  while (p < b.length) {
    const tag = b.toString("ascii", p, p + 4);
    const size = b.readUInt32LE(p + 4);
    if (tag === "data") return size / b.readUInt32LE(28);
    p += 8 + size;
  }
  throw new Error(`No data chunk in ${id}.wav`);
};
const durations = Object.fromEntries(beats.map((b) => [b.id, wavSeconds(b.id)]));
const spoken_s = Object.values(durations).reduce((s, d) => s + d, 0);
console.log(`Narration: ${(spoken_s / 60).toFixed(1)} min`);
if (process.argv.includes("--only-audio")) process.exit(0);

// ------------------------------------------------------------------ 2. recording
const rec = process.argv.includes("--assemble") ? JSON.parse(readFileSync(join(out, "timeline.json"), "utf8")) : await record();
const { t0, end, frames, timeline } = rec;

async function record() {
rmSync(join(out, "frames"), { recursive: true, force: true });
mkdirSync(join(out, "frames"), { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.2 });
const page = await context.newPage();
page.on("pageerror", (e) => console.log("page error:", String(e)));
await page.goto(`${BASE}/network`);
await page.evaluate(() => localStorage.setItem("vartul.presenter", "0"));
await page.goto(`${BASE}/network`);
await page.waitForLoadState("networkidle");
await page.addStyleTag({ content: overlayCss });
await page.evaluate(installOverlay);
await page.evaluate(() => document.fonts.ready);

const h = {
  page,
  wait: (ms) => page.waitForTimeout(ms),
  async settle(ms = 500) {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(ms);
  },
  async go(path) {
    await page.evaluate((p) => {
      history.pushState(null, "", p);
      dispatchEvent(new PopStateEvent("popstate"));
    }, path);
    await h.settle(700);
  },
  async surface(n) {
    return (await (await fetch(`${BASE}/api/scenes/scene-${String(n).padStart(2, "0")}`)).json()).surface;
  },
  async openPresenter() {
    const b = page.getByRole("button", { name: "Presenter", exact: true });
    if (await b.count()) await b.click();
    await page.locator(".presenter").waitFor();
    await h.settle(400);
  },
  async scene(n) {
    await page.locator(".p-scene", { hasText: new RegExp(`^${n}$`) }).click();
    await page.waitForFunction((n) => document.querySelector(".p-scene.active")?.textContent === String(n), n, { timeout: 90_000 });
    await h.settle(600);
  },
  async run(n = 1, gap = 700) {
    for (let i = 0; i < n; i++) {
      const done = await page.locator(".p-step.done").count();
      await page.locator(".p-step.next button", { hasText: "Run" }).click();
      await page.waitForFunction((k) => document.querySelectorAll(".p-step.done").length > k || document.querySelector(".p-step-result.error"), done, { timeout: 120_000 });
      if (await page.locator(".p-step-result.error").count()) throw new Error(`Step failed: ${await page.locator(".p-step-result.error").first().textContent()}`);
      await page.waitForTimeout(gap);
    }
    await page.waitForLoadState("networkidle").catch(() => {});
  },
  card: (title) => page.locator("section.card", { has: page.locator("h3", { hasText: title }) }).first(),
  async content(top) {
    await page.evaluate((t) => document.querySelector(".content")?.scrollTo({ top: t, behavior: "smooth" }), top);
    await page.waitForTimeout(700);
  },
  async show(locator, ring = true) {
    await locator.waitFor({ timeout: 30_000 });
    await locator.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
    await page.waitForTimeout(900);
    if (ring) await h.ring(locator);
  },
  async ring(locator) {
    const box = await locator.boundingBox();
    if (!box) return;
    await page.evaluate((b) => {
      const s = document.getElementById("v-spot");
      const pad = 6;
      const top = Math.max(60, b.y - pad);
      Object.assign(s.style, { left: `${b.x - pad}px`, top: `${top}px`, width: `${b.width + pad * 2}px`, height: `${Math.min(b.height + pad * 2, innerHeight - top - 10)}px` });
      s.classList.add("on");
    }, box);
  },
  spot: (locator, delay = 0) => page.waitForTimeout(delay).then(() => h.show(locator, true)),
  unspot: () => page.evaluate(() => document.getElementById("v-spot")?.classList.remove("on")),
  async cap(c) {
    await page.evaluate((c) => {
      const el = document.getElementById("v-lower");
      if (!c) return el.classList.remove("on");
      const same = el.classList.contains("on") && el.querySelector(".t").textContent === c.t;
      if (same) return;
      el.classList.remove("on");
      setTimeout(() => {
        el.querySelector(".e").textContent = c.e;
        el.querySelector(".t").textContent = c.t;
        el.querySelector(".s").textContent = c.s ?? "";
        el.classList.add("on");
      }, el.querySelector(".t").textContent ? 350 : 0);
    }, c ?? null);
  },
  async slide(name) {
    await page.evaluate((html) => {
      const s = document.getElementById("v-slide");
      s.innerHTML = html;
      s.classList.add("on");
    }, slides[name]);
    await page.waitForTimeout(250);
  },
  async reveal(upto, every) {
    for (;;) {
      const shown = await page.evaluate(() => document.querySelectorAll("#v-slide .r.on").length);
      if (shown >= upto) return;
      await page.evaluate(() => document.querySelector("#v-slide .r:not(.on)")?.classList.add("on"));
      if (every) await page.waitForTimeout(every);
      else await page.waitForTimeout(500);
    }
  },
  async hideSlide() {
    await page.evaluate(() => document.getElementById("v-slide").classList.remove("on"));
    await page.waitForTimeout(650);
  },
};

const cdp = await context.newCDPSession(page);
const frames = [];
let writing = Promise.resolve();
cdp.on("Page.screencastFrame", (f) => {
  const i = frames.length;
  frames.push(f.metadata.timestamp);
  const data = Buffer.from(f.data, "base64");
  writing = writing.then(() => writeFileSync(join(out, "frames", `${String(i).padStart(6, "0")}.jpg`), data));
  cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
});

await h.slide("title");
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
await page.waitForTimeout(800);
const t0 = Date.now() / 1000;
// Keep the picture "alive" so the screencast emits frames during static holds.
await page.evaluate(() => {
  const d = document.createElement("div");
  d.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:99999;pointer-events:none";
  document.body.appendChild(d);
  let on = false;
  setInterval(() => { on = !on; d.style.background = on ? "rgba(0,0,0,.01)" : "rgba(0,0,0,.02)"; }, 100);
});

const timeline = [];
for (const b of beats) {
  if (b.pre) await b.pre(h);
  if (b.slide) await h.slide(b.slide);
  if (b.cap !== undefined) await h.cap(b.cap);
  else if (b.slide) await h.cap(null);
  const start = Date.now() / 1000;
  timeline.push({ id: b.id, start: start - t0, duration: durations[b.id], say: b.say });
  const work = (async () => {
    if (b.reveal) await h.reveal(b.reveal, b.revealEvery);
    if (b.act) await b.act(h);
  })();
  await Promise.all([work, page.waitForTimeout(durations[b.id] * 1000)]);
  await page.waitForTimeout(b.tail ?? 550);
  console.log(`${b.id}  ${(start - t0).toFixed(1)} s`);
}
const end = Date.now() / 1000 - t0;
await cdp.send("Page.stopScreencast");
await writing;
await browser.close();
writeFileSync(join(out, "timeline.json"), JSON.stringify({ t0, end, frames, timeline }, null, 2));
return { t0, end, frames, timeline };
}

// ------------------------------------------------------------------ 3. assembly
const ff = tool("ffmpeg");
const list = [];
const usable = frames.map((t, i) => ({ t: t - t0, i })).filter((f) => f.t >= -0.5);
for (let k = 0; k < usable.length; k++) {
  const next = k + 1 < usable.length ? usable[k + 1].t : end;
  const d = Math.max(0.001, next - Math.max(0, usable[k].t));
  list.push(`file 'frames/${String(usable[k].i).padStart(6, "0")}.jpg'`, `duration ${d.toFixed(4)}`);
}
list.push(`file 'frames/${String(usable.at(-1).i).padStart(6, "0")}.jpg'`);
writeFileSync(join(out, "frames.txt"), list.join("\n"));

const inputs = timeline.flatMap((b) => ["-i", join(out, "audio", `${b.id}.wav`)]);
const mix = timeline.map((b, k) => `[${k}:a]adelay=${Math.round(b.start * 1000)}:all=1[a${k}]`).join(";") + ";" + timeline.map((_, k) => `[a${k}]`).join("") + `amix=inputs=${timeline.length}:normalize=0,apad,atrim=0:${end.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11[out]`;
writeFileSync(join(out, "mix.txt"), mix);
run(ff, ["-y", "-v", "error", ...inputs, "-/filter_complex", join(out, "mix.txt"), "-map", "[out]", "-ar", "48000", join(out, "narration.wav")]);
run(ff, ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", join(out, "frames.txt"), "-i", join(out, "narration.wav"), "-vf", "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-t", end.toFixed(3), join(out, "Vartul_Walkthrough.mp4")], out);

// Subtitles: each passage split into sentences, timed by length.
const srt = [];
const stamp = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
for (const b of timeline) {
  const sentences = b.say.replace(/\[pause\]/g, "").split(/(?<=[.?!:])\s+/).map((s) => s.trim()).filter(Boolean);
  const total = sentences.reduce((s, x) => s + x.length, 0);
  let at = b.start;
  for (const s of sentences) {
    const d = (s.length / total) * b.duration;
    srt.push(`${srt.length + 1}\n${stamp(at)} --> ${stamp(at + d)}\n${s}\n`);
    at += d;
  }
}
writeFileSync(join(out, "Vartul_Walkthrough.en.srt"), srt.join("\n"), "utf8");
console.log(`\nDone: ${join(out, "Vartul_Walkthrough.mp4")} (${(end / 60).toFixed(1)} min) and .en.srt`);

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) throw new Error(`${cmd} failed`);
}
