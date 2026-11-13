import { createContext, useContext, type ReactNode } from "react";
import { useApi } from "./api";

export interface Participant {
  code: string;
  name: string;
  short: string;
  kind: string;
  real: boolean;
  place: string;
  accounts: { key: string; label: string; roles: string[] }[];
}
export interface Village {
  code: string;
  name: string;
  taluka: string;
  households: number;
  panchayat: string;
}
export interface Directory {
  participants: Participant[];
  villages: Village[];
  saathis: { id: string; org: string; villages: string[] }[];
  materials: Record<string, { label: string; family: string; pricePerKg: number; colour: string }>;
}

const Ctx = createContext<Directory | undefined>(undefined);

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const { data } = useApi<Directory>("/api/directory");
  if (!data) return <div className="loading"><span className="spinner" /></div>;
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useDirectory() {
  const d = useContext(Ctx)!;
  return {
    ...d,
    name: (code?: string) => d.participants.find((p) => p.code === code)?.name ?? code ?? "—",
    shortName: (code?: string) => d.participants.find((p) => p.code === code)?.short ?? code ?? "—",
    village: (code: string) => d.villages.find((v) => v.code === code)?.name ?? code.charAt(0) + code.slice(1).toLowerCase(),
    material: (code: string) => d.materials[code]?.label ?? code,
    ofKind: (...kinds: string[]) => d.participants.filter((p) => kinds.includes(p.kind)),
  };
}
