import type { Wallet } from "ethers";
import { participants, saathis, roleBits, type Role, type Participant } from "../dataset/murud.js";
import { idOf, sandboxWallet, DomainError } from "../lib/util.js";

export interface Actor {
  key: string;
  label: string;
  participant: string;
  participantId: string;
  roles: Role[];
  roleMask: bigint;
  wallet: Wallet;
  address: string;
  treasury: boolean;
}

/** Every sandbox actor: organisation accounts and pseudonymous collector accounts. */
export class Actors {
  readonly byKey = new Map<string, Actor>();
  readonly byAddress = new Map<string, Actor>();
  readonly participants = new Map<string, Participant>();

  constructor() {
    for (const p of participants) {
      this.participants.set(p.code, p);
      p.accounts.forEach((a, i) => this.add(a.key, a.label, p.code, a.roles, i === 0));
    }
    for (const s of saathis) this.add(s.id, `Safai saathi ${s.id}`, s.org, ["COLLECTOR"], false);
  }

  private add(key: string, label: string, participant: string, roles: Role[], treasury: boolean) {
    const wallet = sandboxWallet(key);
    const actor: Actor = {
      key,
      label,
      participant,
      participantId: idOf(participant),
      roles,
      roleMask: roles.reduce((m, r) => m | roleBits[r], 0n),
      wallet,
      address: wallet.address,
      treasury,
    };
    this.byKey.set(key, actor);
    this.byAddress.set(wallet.address.toLowerCase(), actor);
  }

  get(key: string): Actor {
    const actor = this.byKey.get(key);
    if (!actor) throw new DomainError(`Unknown actor ${key}`, 404);
    return actor;
  }

  /** The participant's first account, which is its treasury on the ledger. */
  treasury(participant: string): Actor {
    const p = this.participants.get(participant);
    if (!p) throw new DomainError(`Unknown participant ${participant}`, 404);
    return this.get(p.accounts[0].key);
  }

  account(participant: string, role: Role): Actor {
    const p = this.participants.get(participant);
    const a = p?.accounts.find((x) => x.roles.includes(role));
    if (!a) throw new DomainError(`${participant} has no ${role} account`, 404);
    return this.get(a.key);
  }

  byAddr(address: string) {
    return this.byAddress.get(address.toLowerCase());
  }

  participantName(code: string) {
    return this.participants.get(code)?.name ?? code;
  }

  participantByIdHex(id: string) {
    for (const p of this.participants.values()) if (idOf(p.code) === id) return p;
    return undefined;
  }

  get facilitator() {
    return this.get("VARTUL-NET:FACILITATOR");
  }

  get relayer() {
    return this.get("VARTUL-NET:RELAYER");
  }

  get issuer() {
    return this.get("SBX-BANK:ISSUER");
  }
}
