import { useEffect, useRef, useState, type ReactNode } from "react"
import type { Go, IconName, Screen } from "../types"
import { useHost } from "../theme/HostContext"
import Icon from "./Icon"

const SECTION: Partial<Record<Screen, Screen>> = {
  dashboard: "dashboard",
  movements: "movements",
  goals: "goals",
  "goal-detail": "goals",
  notifications: "notifications",
}

function BottomNav({ screen, go }: { screen: Screen; go: Go }) {
  const active = SECTION[screen]
  const item = (target: Screen, icon: IconName, label: string) => (
    <button
      className={`nav-item ${active === target ? "active" : ""}`}
      onClick={() => {
        // Tocar la pestaña en la que ya estás sube al principio, como en iOS.
        if (screen === target) {
          document.querySelector(".screen")?.scrollTo({ top: 0, behavior: "smooth" })
          return
        }
        go(target)
      }}
      type="button"
      aria-current={active === target ? "page" : undefined}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  )
  return (
    <nav className="bottom-nav" aria-label="Navegación de PocketWise">
      {item("dashboard", "home", "Inicio")}
      {item("movements", "chart", "Gastos")}
      <button
        className={`simulate-nav ${screen.startsWith("simulat") ? "active" : ""}`}
        onClick={() => go("simulator")}
        type="button"
      >
        <Icon name="spark" size={24} />
        <span>¿Me lo puedo permitir?</span>
      </button>
      {item("goals", "target", "Objetivos")}
      {item("notifications", "bell", "Avisos")}
    </nav>
  )
}

/** Barra fina que recuerda que estás dentro de la app de tu banco. */
function HostBar({ go, title }: { go: Go; title: string | null }) {
  const host = useHost()
  return (
    <div className={`host-bar ${title ? "compact" : ""}`}>
      <button className="host-back" onClick={() => go("bank-home")} type="button">
        <Icon name="back" size={18} />
        <span>{host.name}</span>
      </button>
      <span className="host-title" aria-hidden="true">
        {title}
      </span>
      <span className="host-module">PocketWise</span>
    </div>
  )
}

export default function AppShell({
  children,
  screen,
  go,
  noNav = false,
  hostBar = !noNav,
}: {
  children: ReactNode
  screen: Screen
  go: Go
  noNav?: boolean
  hostBar?: boolean
}) {
  const mainRef = useRef<HTMLElement>(null)
  const [compactTitle, setCompactTitle] = useState<string | null>(null)

  useEffect(() => {
    const target = mainRef.current?.querySelector<HTMLElement>("h1")
    if (target) {
      target.tabIndex = -1
      target.focus({ preventScroll: true })
    } else {
      mainRef.current?.focus({ preventScroll: true })
    }
  }, [screen])

  // Título grande estilo iOS: al salir de la vista, pasa a la barra superior.
  useEffect(() => {
    const main = mainRef.current
    const heading = main?.querySelector<HTMLElement>(".page h1")
    setCompactTitle(null)
    if (!main || !heading || !hostBar) return
    const observer = new IntersectionObserver(
      ([entry]) => setCompactTitle(entry.isIntersecting ? null : heading.textContent),
      { root: main, rootMargin: "-48px 0px 0px 0px", threshold: 0 },
    )
    observer.observe(heading)
    return () => observer.disconnect()
  }, [screen, hostBar])

  return (
    <>
      <main ref={mainRef} className={`screen ${noNav ? "screen-full" : ""}`} tabIndex={-1}>
        {hostBar && <HostBar go={go} title={compactTitle} />}
        {children}
      </main>
      {!noNav && <BottomNav screen={screen} go={go} />}
    </>
  )
}
