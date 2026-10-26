import { createContext, useContext } from "react"
import { HOSTS, type Host } from "./hosts"

export const HostContext = createContext<Host>(HOSTS.neutro)

export function useHost() {
  return useContext(HostContext)
}
