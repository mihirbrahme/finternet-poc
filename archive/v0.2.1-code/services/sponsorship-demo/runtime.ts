import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
  Contract,
  ContractFactory,
  JsonRpcProvider,
  parseEther,
  formatEther,
  id,
  type JsonRpcSigner,
  type TransactionResponse,
} from "ethers";

export type Role = "sponsor" | "aamhi" | "facility" | "verifier";
export const roles: Role[] = ["sponsor", "aamhi", "facility", "verifier"];
export const rpcPort = 18545;
export const terms = {
  programmeId: "PRG-AAMHI-001",
  version: 1,
  sponsor: "SPONSOR-DEMO-001",
  originator: "ORG-AAMHI-001",
  material: "PLASTIC-LDPE",
  geography: "Raigad",
  targetKg: 500,
  budgetDinr: 10000,
  paymentPolicy: "FIXED_ON_VERIFIED_ACCEPTANCE",
  threshold: "COLLECTION_AND_FACILITY_RECEIPT",
  exceptions: "SPONSOR_AND_AAMHI_APPROVE_EXACT_PROPOSAL",
  disputes: "MILESTONE_ONLY_HOLD",
  attribution: "FUNDED_OUTCOME_NOT_MATERIAL_OR_CREDIT_OWNERSHIP",
  transferable: false,
  sample: true,
  deadlinePolicy: "NO_AUTOMATIC_REFUND_JOINT_RESOLUTION",
};
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
};
export const hashDocument = (value: unknown) =>
  `0x${createHash("sha256").update(canonical(value)).digest("hex")}`;
export const termsHash = hashDocument(terms);
export interface AuditTransaction {
  action: string;
  role: string;
  hash: string;
  blockNumber: number;
  status: number;
  at: string;
  events: {
    name: string;
    address: string;
    values: Record<string, string | boolean>;
  }[];
}

export class SponsorshipRuntime {
  chain?: ChildProcess;
  readonly provider = new JsonRpcProvider(
    `http://127.0.0.1:${rpcPort}`,
    31337,
    { staticNetwork: true, cacheTimeout: -1 },
  );
  signers = {} as Record<Role, JsonRpcSigner>;
  addresses = {} as Record<Role, string>;
  money!: Contract;
  escrow!: Contract;
  participants!: Contract;
  credentials!: Contract;
  audit: AuditTransaction[] = [];
  evidence: Record<number, Record<string, unknown>> = {};
  exceptions: Record<number, Record<string, unknown>> = {};
  discovery?: unknown;
  selected = false;
  sessionId = randomUUID();
  private baselineSnapshot?: string;
  private baselineAudit: AuditTransaction[] = [];
  presentation: { chapter: string; mode: string; at: string } | null = null;

  async start() {
    this.provider.pollingInterval = 100;
    // Never attach to or reset an existing node. The launcher owns this isolated chain.
    try {
      await fetch(`http://127.0.0.1:${rpcPort}`, {
        signal: AbortSignal.timeout(500),
      });
      throw new Error(
        `Port ${rpcPort} is occupied; stop the conflicting process first.`,
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("occupied"))
        throw error;
    }
    let compiled = spawnSync(
      "forge",
      ["build", "--root", "contracts", "--offline"],
      { encoding: "utf8", timeout: 30000 },
    );
    if (compiled.status !== 0)
      compiled = spawnSync("forge", ["build", "--root", "contracts"], {
        encoding: "utf8",
        timeout: 60000,
      });
    if (compiled.status !== 0)
      throw new Error(
        `Foundry build failed: ${compiled.stderr || compiled.error || compiled.stdout}`,
      );
    this.chain = spawn(
      "anvil",
      [
        "--host",
        "127.0.0.1",
        "--port",
        String(rpcPort),
        "--chain-id",
        "31337",
        "--silent",
      ],
      { stdio: "ignore", windowsHide: true },
    );
    let spawnError: Error | undefined;
    this.chain.on("error", (error) => {
      spawnError = error;
    });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (spawnError) throw spawnError;
      try {
        const response = await fetch(`http://127.0.0.1:${rpcPort}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_chainId",
            params: [],
          }),
        });
        if (
          ((await response.json()) as { result: string }).result === "0x7a69"
        ) {
          ready = true;
          break;
        }
      } catch {
        /* Wait for this process's RPC endpoint. */
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    if (!ready) throw new Error("Anvil did not start within six seconds");
    if (!this.chain.pid || this.chain.exitCode !== null)
      throw new Error("Owned Anvil process exited unexpectedly");
    for (const [index, role] of roles.entries()) {
      this.signers[role] = await this.provider.getSigner(index + 1);
      this.addresses[role] = await this.signers[role].getAddress();
    }
    const admin = await this.provider.getSigner(0);
    this.participants = await this.deploy("ParticipantRegistry", admin, []);
    this.credentials = await this.deploy("CredentialRegistry", admin, [
      await this.participants.getAddress(),
    ]);
    this.money = await this.deploy("DemoINR", admin, [
      await this.credentials.getAddress(),
    ]);
    this.escrow = await this.deploy("SponsorshipEscrow", admin, [
      await this.money.getAddress(),
      ...roles.map((r) => this.addresses[r]),
      id(terms.programmeId),
    ]);
    for (const role of roles) {
      await this.record(
        "register participant",
        "admin",
        await this.participants.registerParticipant(
          id(role),
          this.addresses[role],
        ),
      );
      const roleNumber = { sponsor: 4, aamhi: 1, facility: 3, verifier: 6 }[
        role
      ];
      await this.record(
        "issue local eligibility",
        "admin",
        await this.credentials.setEligibility(
          this.addresses[role],
          roleNumber,
          true,
          Math.floor(Date.now() / 1000) + 365 * 86400,
        ),
      );
    }
    await this.record(
      "authorise escrow holder",
      "admin",
      await this.money.setSystemAccount(await this.escrow.getAddress(), true),
    );
    await this.record(
      "mint sandbox balance",
      "admin",
      await this.money.mint(this.addresses.sponsor, parseEther("20000")),
    );
    for (const milestone of [1, 2]) {
      await this.record(
        "propose sample milestone terms",
        "sponsor",
        await this.as("sponsor").createMilestone(
          milestone,
          termsHash,
          parseEther("10000"),
          500,
        ),
      );
    }
    this.baselineAudit = [...this.audit];
    this.baselineSnapshot = await this.provider.send("evm_snapshot", []);
  }

  async reset() {
    if (!this.chain?.pid || !this.baselineSnapshot)
      throw new Error("No owned local session to reset");
    if (!(await this.provider.send("evm_revert", [this.baselineSnapshot])))
      throw new Error("Local snapshot could not be restored");
    this.baselineSnapshot = await this.provider.send("evm_snapshot", []);
    this.audit = [...this.baselineAudit];
    this.evidence = {};
    this.exceptions = {};
    this.discovery = undefined;
    this.selected = false;
    this.presentation = null;
    this.sessionId = randomUUID();
    await this.exportState();
  }

  async prepareChapter(chapter: string, discovery: unknown) {
    if (!["funded", "review", "complete"].includes(chapter))
      throw new Error("Unknown presentation chapter");
    await this.reset();
    this.discovery = discovery;
    this.selected = true;
    for (const milestone of [1, 2]) {
      await this.action("aamhi", milestone, "accept", {});
      await this.action("sponsor", milestone, "fund", {});
      if (chapter === "funded") continue;
      await this.action("aamhi", milestone, "evidence", {
        note: `Illustrative coastal recovery route, collection batch ${milestone}. Mixed contamination excluded at receipt; supporting sample records attached.`,
      });
      await this.action("facility", milestone, "receipt", {
        quantityKg: milestone === 1 ? 500 : 450,
      });
      await this.action("verifier", milestone, "verify", {
        quantityKg: milestone === 1 ? 500 : 450,
      });
    }
    if (chapter === "complete") {
      await this.action("aamhi", 2, "propose", {
        reason:
          "The facility confirmed 450 kg eligible material. Sponsor and Aamhi agree the fixed milestone payment after reviewing the documented shortfall.",
        paymentDinr: 10000,
      });
      const m = await this.escrow.getMilestone(2);
      await this.action("sponsor", 2, "approve", {
        proposalHash: m.exceptionHash,
      });
      await this.action("aamhi", 2, "approve", {
        proposalHash: m.exceptionHash,
      });
    }
    this.presentation = {
      chapter,
      mode: "EXECUTED_LOCAL_CHAIN_TRANSACTIONS",
      at: new Date().toISOString(),
    };
    await this.exportState();
  }

  async deploy(
    name: string,
    signer: JsonRpcSigner,
    args: unknown[],
  ): Promise<Contract> {
    const artifact = JSON.parse(
      readFileSync(resolve(`contracts/out/${name}.sol/${name}.json`), "utf8"),
    );
    const deployed = await new ContractFactory(
      artifact.abi,
      artifact.bytecode.object,
      signer,
    ).deploy(...args);
    await deployed.waitForDeployment();
    await this.record(
      `deploy ${name}`,
      "admin",
      deployed.deploymentTransaction()!,
    );
    return new Contract(await deployed.getAddress(), artifact.abi, signer);
  }
  as(role: Role) {
    return this.escrow.connect(this.signers[role]) as Contract;
  }
  async record(action: string, role: string, transaction: TransactionResponse) {
    const receipt = await transaction.wait();
    if (!receipt || receipt.status !== 1)
      throw new Error("Transaction not confirmed successfully");
    this.audit.push({
      action,
      role,
      hash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
      at: new Date().toISOString(),
      events: receipt.logs.flatMap((log) => {
        const source = [
          this.escrow,
          this.money,
          this.credentials,
          this.participants,
        ].find(
          (contract) =>
            contract &&
            String(contract.target).toLowerCase() === log.address.toLowerCase(),
        );
        if (!source) return [];
        try {
          const parsed = source.interface.parseLog(log);
          if (!parsed) return [];
          return [
            {
              name: parsed.name,
              address: log.address,
              values: Object.fromEntries(
                parsed.fragment.inputs.map((input, index) => {
                  const value = parsed.args[index];
                  return [
                    input.name || String(index),
                    typeof value === "boolean" ? value : String(value),
                  ];
                }),
              ),
            },
          ];
        } catch {
          return [];
        }
      }),
    });
    return receipt;
  }

  async action(
    role: Role,
    milestone: number,
    action: string,
    input: Record<string, unknown>,
  ) {
    if (![1, 2].includes(milestone)) throw new Error("Unknown milestone");
    const expected: Record<string, Role[]> = {
      accept: ["aamhi"],
      fund: ["sponsor"],
      evidence: ["aamhi"],
      receipt: ["facility"],
      verify: ["verifier"],
      release: ["sponsor", "aamhi", "verifier"],
      dispute: ["sponsor", "aamhi", "verifier"],
      propose: ["sponsor", "aamhi"],
      approve: ["sponsor", "aamhi"],
    };
    if (!expected[action]?.includes(role))
      throw new Error("Role is not authorised for this action");
    const contract = this.as(role);
    const m = await this.escrow.getMilestone(milestone);
    let transaction: TransactionResponse;
    let document: Record<string, unknown> | undefined;
    switch (action) {
      case "accept":
        if (!this.selected)
          throw new Error(
            "Sponsor must discover and initiate the offering first",
          );
        transaction = await contract.acceptTerms(milestone, termsHash);
        break;
      case "fund": {
        const token = this.money.connect(this.signers.sponsor) as Contract;
        await this.record(
          "approve milestone escrow",
          role,
          await token.approve(
            await this.escrow.getAddress(),
            parseEther("10000"),
          ),
        );
        transaction = await contract.fund(milestone);
        break;
      }
      case "evidence": {
        const note = text(input.note, "Collection note");
        document = {
          sample: true,
          programmeId: terms.programmeId,
          milestone,
          termsHash,
          material: terms.material,
          collectionArea: "DEMO-ROUTE-RAIGAD",
          collectionNote: note,
          capturedAt: new Date().toISOString(),
          records: [
            "samples/sponsorship/collection-photo.svg",
            "samples/sponsorship/facility-receipt.json",
          ].map((path) => ({
            path,
            sha256: createHash("sha256")
              .update(readFileSync(path))
              .digest("hex"),
          })),
        };
        transaction = await contract.submitEvidence(
          milestone,
          termsHash,
          hashDocument(document),
        );
        break;
      }
      case "receipt":
        transaction = await contract.confirmReceipt(
          milestone,
          m.evidenceHash,
          quantity(input.quantityKg),
        );
        break;
      case "verify":
        transaction = await contract.verify(
          milestone,
          m.evidenceHash,
          quantity(input.quantityKg),
        );
        break;
      case "release":
        transaction = await contract.release(milestone);
        break;
      case "dispute":
        transaction = await contract.dispute(
          milestone,
          hashDocument({ reason: text(input.reason, "Dispute reason") }),
        );
        break;
      case "propose": {
        const payment = Number(input.paymentDinr);
        if (!Number.isInteger(payment) || payment < 0 || payment > 10000)
          throw new Error("Payment must be an integer from 0 to 10000 dINR");
        document = {
          milestone,
          reason: text(input.reason, "Exception reason"),
          paymentDinr: payment,
          evidenceHash: m.evidenceHash,
          verifiedKg: Number(m.verifiedKg),
          termsHash,
        };
        transaction = await contract.proposeException(
          milestone,
          hashDocument(document),
          parseEther(String(payment)),
        );
        break;
      }
      case "approve": {
        const proposal = text(input.proposalHash, "Proposal hash");
        if (proposal !== m.exceptionHash)
          throw new Error(
            "Proposal changed; refresh and review it before approving",
          );
        transaction = await contract.approveException(milestone, proposal);
        break;
      }
      default:
        throw new Error("Unknown action");
    }
    await this.record(`${action} milestone ${milestone}`, role, transaction);
    if (document && action === "evidence") this.evidence[milestone] = document;
    if (document && action === "propose") this.exceptions[milestone] = document;
    await this.exportState();
  }

  async state() {
    const milestones = [];
    for (const milestone of [1, 2]) {
      const m = await this.escrow.getMilestone(milestone);
      const paid = m.closed
        ? m.sponsorApproved && m.aamhiApproved
          ? m.proposedPayment
          : m.budget
        : 0n;
      milestones.push({
        id: milestone,
        termsHash: m.termsHash,
        targetKg: Number(m.targetKg),
        budgetDinr: formatEther(m.budget),
        paidDinr: formatEther(paid),
        refundedDinr: formatEther(m.closed ? m.budget - paid : 0n),
        funded: m.funded,
        termsAccepted: m.termsAccepted,
        receivedKg: Number(m.receivedKg),
        verifiedKg: Number(m.verifiedKg),
        verified: m.verified,
        disputed: m.disputed,
        closed: m.closed,
        evidenceHash: m.evidenceHash,
        exceptionHash: m.exceptionHash,
        proposedPaymentDinr: formatEther(m.proposedPayment),
        sponsorApproved: m.sponsorApproved,
        aamhiApproved: m.aamhiApproved,
        attributionHash: await this.escrow.attributionHash(milestone),
        evidence: this.evidence[milestone],
        exception: this.exceptions[milestone],
      });
    }
    return {
      programmeId: terms.programmeId,
      token: {
        name: await this.money.name(),
        symbol: await this.money.symbol(),
        decimals: Number(await this.money.decimals()),
        totalSupply: formatEther(await this.money.totalSupply()),
      },
      sessionId: this.sessionId,
      terms,
      termsHash,
      selected: this.selected,
      presentation: this.presentation,
      modes: {
        chain: "LOCAL_EVM_REAL_TRANSACTIONS",
        money: "SANDBOX_DINR",
        discovery: "SANDBOX_ADAPTER",
        identity: "CONTROLLED_LOCAL_ACCOUNTS",
        evidence: "ILLUSTRATIVE_SAMPLE",
        storage: "PROCESS_MEMORY_WITH_EXPORTED_SNAPSHOT",
      },
      chainId: 31337,
      addresses: this.addresses,
      contracts: {
        escrow: await this.escrow.getAddress(),
        dinr: await this.money.getAddress(),
        participants: await this.participants.getAddress(),
        credentials: await this.credentials.getAddress(),
      },
      balances: {
        sponsor: formatEther(
          await this.money.balanceOf(this.addresses.sponsor),
        ),
        aamhi: formatEther(await this.money.balanceOf(this.addresses.aamhi)),
        escrow: formatEther(
          await this.money.balanceOf(await this.escrow.getAddress()),
        ),
      },
      milestones,
      discovery: this.discovery,
      audit: this.audit,
    };
  }
  async exportState() {
    mkdirSync("deployment/local-demo", { recursive: true });
    writeFileSync(
      "deployment/local-demo/session.json",
      JSON.stringify(await this.state(), null, 2),
    );
  }
  stop() {
    this.provider.destroy();
    this.chain?.kill();
  }
}
function text(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    value.trim().length < 3 ||
    value.length > 2000
  )
    throw new Error(`${label} must contain 3–2000 characters`);
  return value.trim();
}
function quantity(value: unknown) {
  const kg = Number(value);
  if (!Number.isSafeInteger(kg) || kg <= 0 || kg > 1000000)
    throw new Error("Quantity must be a positive integer up to 1000000 kg");
  return kg;
}
