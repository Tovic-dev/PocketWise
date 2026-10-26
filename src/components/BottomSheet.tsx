import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { prefersReducedMotion } from "../lib/navigation"

const CLOSE_MS = 260

/**
 * Hoja inferior al estilo iOS: se cierra arrastrándola hacia abajo, tocando
 * fuera o con Escape, y siempre sale con animación. Si el arrastre no basta,
 * vuelve a su sitio.
 */
export default function BottomSheet({
  labelledBy,
  onClose,
  children,
  closeRef,
}: {
  labelledBy: string
  onClose: () => void
  children: ReactNode
  /** Permite a la pantalla cerrar la hoja con la misma animación. */
  closeRef?: (close: () => void) => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)
  const drag = useRef({ active: false, startY: 0, lastY: 0, lastTime: 0, velocity: 0 })

  const close = useCallback(() => {
    if (prefersReducedMotion()) return onClose()
    setClosing(true)
    window.setTimeout(onClose, CLOSE_MS)
  }, [onClose])

  useEffect(() => {
    closeRef?.(close)
  }, [close, closeRef])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [close])

  const onPointerDown = (event: React.PointerEvent) => {
    const sheet = sheetRef.current
    if (!sheet || sheet.scrollTop > 0) return
    if ((event.target as HTMLElement).closest("button, input, a, label, select")) return
    drag.current = { active: true, startY: event.clientY, lastY: event.clientY, lastTime: event.timeStamp, velocity: 0 }
    sheet.classList.add("dragging")
    sheet.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const sheet = sheetRef.current
    const state = drag.current
    if (!sheet || !state.active) return
    const dy = event.clientY - state.startY
    state.velocity = (event.clientY - state.lastY) / Math.max(1, event.timeStamp - state.lastTime)
    state.lastY = event.clientY
    state.lastTime = event.timeStamp
    // Hacia arriba ofrece resistencia; hacia abajo sigue al dedo.
    const offset = dy < 0 ? dy / 6 : dy
    sheet.style.transform = `translateY(${offset}px)`
  }

  const onPointerUp = () => {
    const sheet = sheetRef.current
    const state = drag.current
    if (!sheet || !state.active) return
    state.active = false
    sheet.classList.remove("dragging")
    const dy = state.lastY - state.startY
    if (dy > sheet.offsetHeight * 0.25 || state.velocity > 0.6) {
      sheet.classList.add("settling")
      sheet.style.transform = "translateY(100%)"
      window.setTimeout(onClose, 300)
      return
    }
    sheet.classList.add("settling")
    sheet.style.transform = ""
    window.setTimeout(() => sheet.classList.remove("settling"), 320)
  }

  return (
    <div className={`sheet-backdrop ${closing ? "closing" : ""}`} onClick={close}>
      <div
        ref={sheetRef}
        className={`sheet ${closing ? "closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="sheet-handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}
