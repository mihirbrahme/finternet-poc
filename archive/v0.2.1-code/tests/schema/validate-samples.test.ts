import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const root = process.cwd();

function readJson<T extends JsonValue>(path: string): T {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const schemaPaths = [
  "schemas/participant.schema.json",
  "schemas/material.schema.json",
  "schemas/evidence.schema.json",
  "schemas/evidence-manifest.schema.json",
  "schemas/recovery-asset.schema.json",
  "schemas/attestation.schema.json",
  "schemas/claim.schema.json",
  "schemas/settlement.schema.json"
];

for (const schemaPath of schemaPaths) {
  ajv.addSchema(readJson(schemaPath));
}

function validate(schemaId: string, sampleName: string, data: JsonValue): void {
  const validator = ajv.getSchema(schemaId);
  assert.ok(validator, `Missing schema: ${schemaId}`);

  const valid = validator(data);
  assert.ok(
    valid,
    `${sampleName} failed validation:\n${ajv.errorsText(validator.errors, { separator: "\n" })}`
  );
}

const participants = readJson<JsonValue[]>("samples/aamhi-demo/participants.json");
for (const participant of participants) {
  validate("https://finternet-poc.local/schemas/participant.schema.json", "participant", participant);
}

const materials = readJson<JsonValue[]>("samples/aamhi-demo/materials.json");
for (const material of materials) {
  validate("https://finternet-poc.local/schemas/material.schema.json", "material", material);
}

const recoveryAsset = readJson("samples/aamhi-demo/recovery-asset.json");
validate("https://finternet-poc.local/schemas/recovery-asset.schema.json", "recovery asset", recoveryAsset);

const evidenceManifest = readJson("samples/aamhi-demo/evidence-manifest.json");
validate(
  "https://finternet-poc.local/schemas/evidence-manifest.schema.json",
  "evidence manifest",
  evidenceManifest
);

const obpReadyClaim = readJson<{ [key: string]: JsonValue }>("samples/aamhi-demo/obp-ready-claim.json");
validate("https://finternet-poc.local/schemas/claim.schema.json", "OBP-ready claim", obpReadyClaim);

assert.equal(obpReadyClaim.type, "OBP_READY_RECOVERY_CLAIM");
assert.equal((obpReadyClaim.claimBasis as { [key: string]: JsonValue }).isOfficialCredit, false);

console.log("Schema validation passed for Aamhi golden samples.");
