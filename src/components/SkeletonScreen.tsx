import type { CSSProperties, ReactNode } from "react"
import type { Go, Screen } from "../types"
import { useHost } from "../theme/HostContext"
import AppShell from "./AppShell"

/** Bloque gris con el tamaño exacto del contenido que va a ocupar. */
function Bone({ w = "100%", h, r, style }: { w?: number | string; h: number; r?: number; style?: CSSProperties }) {
  return <span className="skeleton bone" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

function Rows({ count, avatar = true }: { count: number; avatar?: boolean }) {
  return (
    <div className="bone-rows">
      {Array.from({ length: count }, (_, index) => (
        <div className="bone-row" key={index}>
          {avatar && <Bone w={40} h={40} r={999} />}
          <span className="bone-row-text">
            <Bone w={`${62 - index * 7}%`} h={14} />
            <Bone w="34%" h={11} />
          </span>
          <Bone w={58} h={14} />
        </div>
      ))}
    </div>
  )
}

function Section({ children }: { children: ReactNode }) {
  return (
    <div className="bone-section">
      <span className="bone-rule" />
      <Bone w={120} h={16} />
      {children}
    </div>
  )
}

/**
 * Carga de la primera entrada al módulo («actualizando con tu cuenta»). Cada
 * esqueleto reproduce la maqueta de su pantalla para que no haya saltos.
 */
export default function SkeletonScreen({ screen, go }: { screen: Screen; go: Go }) {
  const host = useHost()
  return (
    <AppShell screen={screen} go={go}>
      <div className="page skeleton-page" role="status" aria-live="polite">
        <span className="sync-line">
          <span className="sync-dot" aria-hidden="true" />
          Actualizando con {host.name}…
        </span>

        {screen === "dashboard" && (
          <>
            <div className="bone-header">
              <span className="bone-stack">
                <Bone w={64} h={12} />
                <Bone w={140} h={22} />
              </span>
              <Bone w={44} h={44} r={999} />
            </div>
            <span className="bone-stack">
              <Bone w={150} h={14} />
              <Bone w={230} h={70} r={14} />
              <Bone w="100%" h={14} />
            </span>
            <span className="bone-stack">
              <Bone w={220} h={13} />
              <Bone h={14} r={4} />
              <Bone w="80%" h={13} />
            </span>
            <Bone h={68} r={16} />
            <Section>
              <Bone w="55%" h={22} />
              <Bone h={8} r={999} />
            </Section>
            <Section>
              <Rows count={3} avatar={false} />
            </Section>
          </>
        )}

        {screen === "movements" && (
          <>
            <Bone w={130} h={32} />
            <Bone h={46} r={999} />
            <span className="bone-stack">
              <Bone w={150} h={13} />
              <Bone w={170} h={56} r={12} />
            </span>
            <Section>
              <div className="bone-bento">
                <Bone h={0} r={14} style={{ gridRow: "span 2", height: "auto" }} />
                <Bone h={0} r={14} style={{ height: "auto" }} />
                <Bone h={0} r={14} style={{ height: "auto" }} />
                <Bone h={0} r={14} style={{ height: "auto" }} />
                <Bone h={0} r={14} style={{ height: "auto" }} />
              </div>
            </Section>
          </>
        )}

        {screen === "goals" && (
          <>
            <Bone w={150} h={32} />
            <span className="bone-stack">
              <Bone w={110} h={13} />
              <Bone w={190} h={52} r={12} />
            </span>
            <Bone h={196} r={22} />
            <Bone h={196} r={22} />
          </>
        )}

        {screen === "notifications" && (
          <>
            <Bone w={110} h={32} />
            <Section>
              <Rows count={3} />
            </Section>
            <Section>
              <Rows count={2} />
            </Section>
          </>
        )}
        <span className="sr-only">Cargando contenido</span>
      </div>
    </AppShell>
  )
}
