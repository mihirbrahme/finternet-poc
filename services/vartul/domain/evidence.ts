import { getBytes, verifyMessage, type Wallet } from "ethers";
import { materials, type Material } from "../dataset/murud.js";
import { fingerprint, sha256, rng } from "../lib/util.js";
import type { CollectionRecord } from "./store.js";

/**
 * Illustrative evidence photo: a deterministic SVG of a sack of sorted material. No real people
 * or places are photographed; the image exists so its fingerprint can be anchored and compared.
 */
export function evidencePhoto(seed: string, material: Material): string {
  const r = rng(parseInt(seed.slice(2, 10), 16));
  const colour = materials[material].colour;
  const blobs = Array.from({ length: 14 }, () => {
    const x = r.int(40, 280);
    const y = r.int(70, 200);
    const rx = r.int(10, 34);
    const ry = r.int(6, 20);
    const o = (0.25 + r.next() * 0.5).toFixed(2);
    return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${colour}" opacity="${o}" transform="rotate(${r.int(-40, 40)} ${x} ${y})"/>`;
  }).join("");
  const sand = r.int(0, 1) ? "#e7dcc3" : "#d8cfb8";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" role="img" aria-label="Illustrative evidence image"><rect width="320" height="240" fill="${sand}"/><path d="M40 210 Q60 60 160 50 Q260 60 280 210 Z" fill="#f4f1ea" stroke="#9c8f74" stroke-width="3"/>${blobs}<rect x="0" y="214" width="320" height="26" fill="#000" opacity=".55"/><text x="10" y="232" font-family="monospace" font-size="11" fill="#fff">${materials[material].label} · illustrative · ${seed.slice(2, 10)}</text></svg>`;
}

export const photoHash = (seed: string, material: Material) => sha256(evidencePhoto(seed, material));

export function recordFingerprint(r: Omit<CollectionRecord, "fingerprint" | "deviceSignature" | "supervisorSignature" | "syncedAt" | "lot">) {
  return fingerprint({
    id: r.id,
    saathi: r.saathi,
    village: r.village,
    route: r.route,
    material: r.material,
    grams: r.grams,
    capturedAt: r.capturedAt,
    lat: r.lat,
    lng: r.lng,
    photoHash: r.photoHash,
    scale: r.scale,
  });
}

export async function signRecord(device: Wallet, fp: string) {
  return device.signMessage(getBytes(fp));
}

export function verifyRecordSignature(r: CollectionRecord, expectedAddress: string) {
  try {
    return verifyMessage(getBytes(r.fingerprint), r.deviceSignature).toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function haversineMetres(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
