import { Router, send } from "./http.js";
import { Views } from "./views.js";
import type { Runtime } from "../runtime.js";
import { participants, villages, saathis, materials, type Material } from "../dataset/murud.js";
import { evidencePhoto } from "../domain/evidence.js";
import { DomainError } from "../lib/util.js";

const need = <T>(value: T | undefined | null, name: string): T => {
  if (value === undefined || value === null || value === "") throw new DomainError(`${name} is required`);
  return value;
};
const grams = (kgValue: unknown, name: string) => {
  const n = Number(kgValue);
  if (!Number.isFinite(n) || n < 0) throw new DomainError(`${name} must be a non-negative number of kg`);
  return Math.round(n * 1000);
};

/** Core domain API (M2) and public credential endpoints (M3). */
export function coreRoutes(router: Router, rt: Runtime) {
  const v = rt.vartul;
  const views = new Views(v);
  /** Every state change runs through one ledger writer, then projections catch up. */
  const act = <T>(work: () => Promise<T>) =>
    rt.exclusive(async () => {
      const result = await work();
      await v.sync();
      return result;
    });
  const txOut = (sent: { hash: string; blockNumber: number; timestamp: number }) => ({ tx: sent.hash, block: sent.blockNumber, at: sent.timestamp });

  router
    .get("/api/health", async () => ({ ok: true, loaded: rt.current, ...(await views.clock()) }))
    .get("/api/clock", () => views.clock())
    .get("/api/overview", () => views.overview())
    .get("/api/directory", () => ({
      participants: participants.map((p) => ({ code: p.code, name: p.name, short: p.short, kind: p.kind, real: p.real, place: p.place, accounts: p.accounts.map((a) => ({ key: a.key, label: a.label, roles: a.roles })) })),
      villages,
      saathis: saathis.map((s) => ({ id: s.id, org: s.org, villages: s.villages })),
      materials,
    }))
    .get("/api/programmes", () => views.programmes())
    .get("/api/programmes/:code", ({ params }) => views.programme(params.code))
    .get("/api/lots", ({ query }) =>
      views.lots({
        programme: query.get("programme") ?? undefined,
        state: query.get("state") ?? undefined,
        originator: query.get("originator") ?? undefined,
        receiver: query.get("receiver") ?? undefined,
        limit: query.get("limit") ? Number(query.get("limit")) : undefined,
      }))
    .get("/api/lots/:code", ({ params }) => views.lot(params.code))
    .get("/api/lots/:code/proof/:record", ({ params }) => views.recordProof(params.code, params.record))
    .get("/api/records/:id", ({ params }) => views.record(params.id))
    .get("/api/evidence/:id", ({ params, res }) => {
      const r = v.store.records[params.id.replace(/\.svg$/, "")];
      if (!r) throw new DomainError("Unknown record", 404);
      send(res, 200, evidencePhoto(r.photoSeed, r.material), "image/svg+xml");
    })
    .get("/api/claims", ({ query }) => views.claims({ holder: query.get("holder") ?? undefined, type: query.get("type") ?? undefined }))
    .get("/api/participants/:code", ({ params }) => views.participant(params.code))
    .get("/api/saathis/:id", ({ params }) => views.saathi(params.id))
    .get("/api/anomalies", () => views.anomalies())
    .get("/api/verifier/:code/queue", ({ params }) => views.verifierQueue(params.code))
    .get("/api/facility/:code", ({ params }) => views.facility(params.code))
    .get("/api/panchayat/:village", ({ params }) => views.panchayat(params.village))
    .get("/api/ledger/transactions", ({ query }) => views.transactions(Number(query.get("limit") ?? 100), query.get("subject") ?? undefined))
    .get("/api/ledger/transactions/:hash", ({ params }) => views.transaction(params.hash))
    .get("/api/ledger/managers", () => views.tokenManagers())
    .get("/api/ledger/events", ({ query }) => {
      const limit = Number(query.get("limit") ?? 200);
      return v.indexer.events.slice(-limit).reverse();
    })
    .get("/api/payouts", ({ query }) => v.store.payouts.filter((p) => !query.get("saathi") || p.saathi === query.get("saathi")).slice(-500).reverse())
    .get("/api/exceptions", ({ query }) => Object.values(v.store.exceptions).filter((e) => !query.get("programme") || e.programme === query.get("programme")));

  // ----- Field app (simulated device; records are really signed by the collector's key) -----
  router
    .post("/api/field/capture", ({ body }) =>
      act(async () => {
        const material = need(body.material, "material") as Material;
        if (!materials[material]) throw new DomainError(`Unknown material ${material}`);
        const r = await v.captureRecord({
          saathi: need(body.saathi, "saathi"),
          material,
          grams: grams(need(body.kg, "kg"), "kg"),
          village: body.village,
          route: body.route,
          lat: body.lat,
          lng: body.lng,
          photoSeed: body.photoSeed,
          assisted: body.assisted,
        });
        return views.record(r.id);
      }))
    .get("/api/field/available", ({ query }) => v.availableRecords(need(query.get("org"), "org"), (query.get("material") as Material) ?? undefined).map((r) => ({ ...r, flags: (v.anomalies.recordFlags().get(r.id) ?? []).map((f) => f.code) })));

  // ----- Originator and MRC -----
  router
    .post("/api/mrc/mint", ({ body }) =>
      act(async () => {
        const { sent, code } = await v.mintLot({
          code: body.code,
          programme: need(body.programme, "programme"),
          material: need(body.material, "material"),
          recordIds: need(body.records, "records"),
          contaminationGrams: grams(body.contaminationKg ?? 0, "contaminationKg"),
          aggregatedGrams: grams(need(body.aggregatedKg, "aggregatedKg"), "aggregatedKg"),
        });
        return { code, ...txOut(sent) };
      }))
    .post("/api/lots/:code/dispatch", ({ params, body }) => act(async () => txOut(await v.dispatch(params.code, body.receiver))))
    .post("/api/lots/:code/receipt", ({ params, body }) => act(async () => txOut(await v.confirmReceipt(params.code, grams(need(body.kg, "kg"), "kg")))))
    .post("/api/lots/:code/verify", ({ params, body }) =>
      act(async () =>
        txOut(
          await v.verifyLot(params.code, {
            eligibleGrams: grams(need(body.eligibleKg, "eligibleKg"), "eligibleKg"),
            excluded: (body.excluded ?? []).map((e: { saathi: string; kg: number; reason: string }) => ({ saathi: e.saathi, grams: grams(e.kg, "excluded kg"), reason: e.reason })),
            notes: body.notes,
          }),
        )))
    .post("/api/lots/:code/challenge", ({ params, body }) => act(async () => txOut(await v.challengeLot(params.code, need(body.actor, "actor"), need(body.reason, "reason")))))
    .post("/api/lots/:code/resolve", ({ params, body }) => act(async () => txOut(await v.resolveChallenge(params.code, grams(need(body.eligibleKg, "eligibleKg"), "eligibleKg"), body.resolution ?? "Re-verified"))))
    .post("/api/lots/:code/finalize", ({ params }) => act(async () => txOut(await v.finalizeLot(params.code))))
    .post("/api/lots/:code/sell", ({ params, body }) => act(async () => txOut(await v.sellLot(params.code, need(body.buyer, "buyer"), body.priceInr))))
    .post("/api/lots/:code/process", ({ params, body }) => act(async () => txOut(await v.recordProcessing(params.code, grams(need(body.kg, "kg"), "kg")))))
    .post("/api/lots/:code/review", ({ params, body }) => act(async () => txOut(await v.concludeReview(params.code, !!body.void, body.outcome ?? "Review concluded"))))
    .post("/api/attestations/:id/revoke", ({ params, body }) =>
      act(async () => {
        const { sent, affected } = await v.revokeAttestation(params.id, need(body.reason, "reason"));
        return { ...txOut(sent), affected };
      }));

  // ----- Programmes, exceptions, disputes -----
  router
    .post("/api/programmes/:code/exceptions", ({ params, body }) =>
      act(async () => {
        const { sent, hash } = await v.proposeException(params.code, need(body.actor, "actor"), {
          kind: need(body.kind, "kind"),
          amountInr: body.amountInr,
          newDeadline: body.newDeadline,
          reason: need(body.reason, "reason"),
          evidence: body.evidence,
        });
        return { hash, ...txOut(sent) };
      }))
    .post("/api/programmes/:code/exceptions/:hash/approve", ({ params, body }) => act(async () => txOut(await v.approveException(params.code, params.hash, need(body.actor, "actor")))))
    .post("/api/programmes/:code/dispute", ({ params, body }) => act(async () => txOut(await v.dispute(params.code, need(body.actor, "actor"), need(body.reason, "reason")))))
    .post("/api/programmes/:code/award", ({ params, body }) => act(async () => txOut(await v.award(params.code, Number(need(body.amountInr, "amountInr")), need(body.reference, "reference")))))
    .post("/api/panchayat/:code/cosign", ({ params, body }) => act(async () => txOut(await v.panchayatCosign(params.code, need(body.subject, "subject"), need(body.note, "note")))));

  // ----- Sandbox controls (clearly labelled in the UI) -----
  router.post("/api/sandbox/advance", ({ body }) =>
    act(async () => {
      const hours = Number(need(body.hours, "hours"));
      if (!(hours > 0 && hours <= 24 * 90)) throw new DomainError("hours must be between 0 and 2160");
      await v.chain.increaseTime(Math.round(hours * 3600));
      return views.clock();
    }));

  // ----- Credentials and public verification (M3) -----
  router
    .get("/api/credentials", ({ query }) =>
      Object.values(v.store.credentials)
        .filter((c) => (!query.get("type") || c.type === query.get("type")) && (!query.get("subject") || c.subject.endsWith(`:${query.get("subject")!.toLowerCase()}`)))
        .slice(-300)
        .reverse()
        .map(({ jwt, ...rest }) => rest))
    .get("/api/credentials/:id", ({ params }) => {
      const c = v.store.credentials[params.id];
      if (!c) throw new DomainError(`No credential ${params.id}`, 404);
      return c;
    })
    .get("/api/credentials/:id/qr", async ({ params, res }) => {
      if (!v.store.credentials[params.id]) throw new DomainError(`No credential ${params.id}`, 404);
      send(res, 200, await v.credentials.qr(`${v.baseUrl}/verify/${params.id}`), "image/svg+xml");
    })
    .get("/api/verify/:id", ({ params }) => views.verifyCredential(params.id))
    .post("/api/verify", async ({ body }) => {
      const jwt = need(body.jwt, "jwt") as string;
      const result = await v.credentials.verify(jwt.trim());
      return result;
    })
    .post("/api/saathis/:id/work-record", ({ params }) =>
      act(async () => {
        const s = views.saathi(params.id);
        return v.credentials.issue({
          kind: "WorkRecordCredential",
          issuer: s.org,
          issuerName: s.orgName,
          subjectId: `urn:vartul:collector:${s.id}`,
          subject: { collector: s.id, organisation: s.orgName, verifiedKg: s.totals.verifiedKg, incentivesInr: s.totals.paidInr, records: s.totals.records, issuedAtRequestOfHolder: true },
          issuedAt: await v.chain.latestTimestamp(),
          summary: { saathi: s.id, verifiedKg: s.totals.verifiedKg },
        });
      }))
    .get("/credentials/status/1", async ({ res }) => send(res, 200, await v.credentials.statusListCredential(await v.chain.latestTimestamp()), "application/vc+jwt"))
    .get("/issuers/:code/did.json", ({ params }) => {
      const p = participants.find((x) => x.code.toLowerCase() === params.code.toLowerCase());
      if (!p) throw new DomainError("Unknown issuer", 404);
      return v.credentials.didDocument(p.code, p.name);
    })
    .get("/contexts/vartul/v1", () => ({
      "@context": {
        "@version": 1.1,
        vartul: "https://vartul.sandbox/vocab#",
        FundedRecoveryCertificate: "vartul:FundedRecoveryCertificate",
        MaterialSupplyCertificate: "vartul:MaterialSupplyCertificate",
        RecoveryVerificationCredential: "vartul:RecoveryVerificationCredential",
        VartulParticipantCredential: "vartul:VartulParticipantCredential",
        WorkRecordCredential: "vartul:WorkRecordCredential",
      },
    }));

  return { views, act };
}
