import { useCallback, useEffect, useRef, useState } from "react"
import type { IconName } from "../types"
import Icon from "./Icon"

const VISIBLE_MS = 3200
const LEAVE_MS = 220

/**
 * Aviso breve: entra con un pequeño rebote, se va solo, y se puede descartar
 * deslizándolo hacia arriba. Con `action` se queda hasta que el usuario decide.
 */
export default function Toast({
  title,
  detail,
  icon = "check",
  action,
  onDone,
}: {
  title: string
  detail: string
  icon?: IconName
  action?: { label: string; run: () => void }
  onDone: () => void
}) {
  const [leaving, setLeaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const start = useRef<number | null>(null)

  const leave = useCallback(() => {
    setLeaving(true)
    window.setTimeout(onDone, LEAVE_MS)
  }, [onDone])

  useEffect(() => {
    if (action) return
    const timer = window.setTimeout(leave, VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [action, leave])

  return (
    <div
      ref={ref}
      className={`toast ${leaving ? "leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return
        start.current = event.clientY
        ref.current?.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (start.current === null || !ref.current) return
        const dy = Math.min(0, event.clientY - start.current)
        ref.current.style.transform = `translate(-50%, ${dy}px)`
      }}
      onPointerUp={(event) => {
        if (start.current === null || !ref.current) return
        const dy = event.clientY - start.current
        start.current = null
        ref.current.style.transform = ""
        if (dy < -24) leave()
      }}
    >
      <span className={`status-icon ${icon === "check" ? "success" : "info"}`}>
        <Icon name={icon} size={18} />
      </span>
      <div className="toast-text">
        <span className="small-medium">{title}</span>
        <span className="caption muted">{detail}</span>
      </div>
      {action && (
        <button
          className="toast-action"
          type="button"
          onClick={() => {
            action.run()
            leave()
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
