import { useEffect, type RefObject } from "react"
import { prefersReducedMotion } from "./navigation"

const EDGE = 20
const EASE = "cubic-bezier(.2, .8, .2, 1)"

/**
 * Deslizar desde el borde izquierdo para volver, como en iOS. Una web app
 * instalada no tiene botón atrás del navegador, así que este gesto lo suple.
 * Mueve la pantalla con el dedo; al soltar, vuelve si se ha arrastrado más de
 * un tercio o con un gesto rápido, y si no, recoloca la pantalla.
 */
export function useEdgeSwipe(
  container: RefObject<HTMLElement | null>,
  enabled: boolean,
  onBack: () => void,
) {
  useEffect(() => {
    const root = container.current
    if (!root || !enabled) return

    let startX = 0
    let startY = 0
    let lastX = 0
    let lastTime = 0
    let velocity = 0
    let tracking = false
    let dragging = false
    let target: HTMLElement | null = null
    let shade: HTMLElement | null = null

    const reset = () => {
      tracking = false
      dragging = false
      target = null
      shade = null
    }

    const onDown = (event: PointerEvent) => {
      const box = root.getBoundingClientRect()
      if (event.clientX - box.left > EDGE || event.button > 0) return
      target = root.querySelector<HTMLElement>(".screen")
      shade = root.querySelector<HTMLElement>(".swipe-shade")
      if (!target) return
      tracking = true
      startX = lastX = event.clientX
      startY = event.clientY
      lastTime = event.timeStamp
      velocity = 0
    }

    const onMove = (event: PointerEvent) => {
      if (!tracking || !target) return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (!dragging) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return reset()
        if (dx < 8) return
        dragging = true
        target.style.transition = "none"
        root.classList.add("is-swiping")
      }
      const elapsed = Math.max(1, event.timeStamp - lastTime)
      velocity = (event.clientX - lastX) / elapsed
      lastX = event.clientX
      lastTime = event.timeStamp
      const offset = Math.max(0, dx)
      target.style.transform = `translateX(${offset}px)`
      if (shade) shade.style.opacity = String(Math.max(0, 0.18 * (1 - offset / root.clientWidth)))
      event.preventDefault()
    }

    const onUp = () => {
      if (!tracking) return
      const screen = target
      const overlay = shade
      const wasDragging = dragging
      reset()
      if (!screen || !wasDragging) return
      const width = root.clientWidth
      const offset = lastX - startX
      const complete = offset > width / 3 || velocity > 0.5
      const duration = prefersReducedMotion() ? 0 : 260
      screen.style.transition = `transform ${duration}ms ${EASE}`
      screen.style.transform = complete ? `translateX(${width}px)` : "translateX(0)"
      if (overlay) {
        overlay.style.transition = `opacity ${duration}ms ${EASE}`
        overlay.style.opacity = "0"
      }
      window.setTimeout(() => {
        root.classList.remove("is-swiping")
        // onBack cambia de pantalla de forma síncrona, así que al limpiar los
        // estilos ya se ve la pantalla anterior y no hay parpadeo.
        if (complete) onBack()
        const next = root.querySelector<HTMLElement>(".screen")
        for (const element of [screen, next]) {
          if (!element) continue
          element.style.transition = ""
          element.style.transform = ""
        }
        if (overlay) {
          overlay.style.transition = ""
          overlay.style.opacity = ""
        }
      }, duration)
    }

    root.addEventListener("pointerdown", onDown)
    root.addEventListener("pointermove", onMove, { passive: false })
    root.addEventListener("pointerup", onUp)
    root.addEventListener("pointercancel", onUp)
    return () => {
      root.removeEventListener("pointerdown", onDown)
      root.removeEventListener("pointermove", onMove)
      root.removeEventListener("pointerup", onUp)
      root.removeEventListener("pointercancel", onUp)
    }
  }, [container, enabled, onBack])
}
