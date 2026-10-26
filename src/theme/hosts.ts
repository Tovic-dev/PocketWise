import type { CSSProperties } from "react"

// PocketWise es un módulo sin marca. Su identidad vive en la tipografía, el
// fondo papel y el tono; el color de acento lo pone el banco que lo integra.
// Estos tres bancos son ficticios y solo sirven para demostrarlo.
export type HostId = "neutro" | "faro" | "brisa"

export type Host = {
  id: HostId
  name: string
  accent: string
  accentPressed: string
  accentSoft: string
  onAccent: string
}

export const HOSTS: Record<HostId, Host> = {
  neutro: {
    id: "neutro",
    name: "Tu banco",
    accent: "#2f6b4f",
    accentPressed: "#24543e",
    accentSoft: "#dfe9e1",
    onAccent: "#f6f3ec",
  },
  faro: {
    id: "faro",
    name: "Banco Faro",
    accent: "#c4332b",
    accentPressed: "#a52922",
    accentSoft: "#f6e0dc",
    onAccent: "#ffffff",
  },
  brisa: {
    id: "brisa",
    name: "Banca Brisa",
    accent: "#1f4b8f",
    accentPressed: "#173a70",
    accentSoft: "#dde5f2",
    onAccent: "#ffffff",
  },
}

export function hostStyle(host: Host) {
  return {
    "--host-accent": host.accent,
    "--host-accent-pressed": host.accentPressed,
    "--host-accent-soft": host.accentSoft,
    "--host-on-accent": host.onAccent,
  } as CSSProperties
}
