import { flushSync } from "react-dom"
import type { Screen } from "../types"

/**
 * Profundidad de cada pantalla. Ir a una más profunda es "entrar" (desliza desde
 * la derecha), a una menos profunda es "volver" y entre iguales es cambiar de
 * pestaña (fundido). La app del banco es el nivel 0: el módulo vive "dentro".
 */
export const LEVEL: Record<Screen, number> = {
  "bank-home": 0,
  activation: 1,
  dashboard: 1,
  movements: 1,
  goals: 1,
  notifications: 1,
  simulator: 2,
  "goal-detail": 2,
  "create-goal": 2,
  settings: 2,
  calculation: 3,
  "edit-goal": 3,
  "settings-income": 3,
  "settings-fixed": 3,
  "settings-saving": 3,
  "settings-categories": 3,
}

export type Direction = "push" | "pop" | "fade" | "none"

export function directionBetween(from: Screen, to: Screen): Direction {
  if (LEVEL[to] > LEVEL[from]) return "push"
  if (LEVEL[to] < LEVEL[from]) return "pop"
  return "fade"
}

/** Nuevo historial: si ya estaba, se vuelve a ella; si no, se apila sobre su nivel. */
export function nextStack(stack: Screen[], to: Screen) {
  const index = stack.lastIndexOf(to)
  if (index >= 0) return stack.slice(0, index + 1)
  return [...stack.filter((item) => LEVEL[item] < LEVEL[to]), to]
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Cambia de pantalla dentro de una View Transition (Safari 18+, Chrome). Si el
 * navegador no la soporta o el usuario pide menos movimiento, cambia sin más.
 */
export function withTransition(direction: Direction, update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => {
      finished: Promise<void>
      ready: Promise<void>
      updateCallbackDone: Promise<void>
    }
  }
  if (direction === "none") {
    // Tras el gesto de volver, la pantalla ya ha salido: cambio inmediato.
    flushSync(update)
    return
  }
  if (!doc.startViewTransition || prefersReducedMotion()) {
    update()
    return
  }
  const root = document.documentElement
  root.dataset.nav = direction
  const transition = doc.startViewTransition(() => flushSync(update))
  // Si se encadenan dos cambios, el navegador salta la animación anterior:
  // no es un error, el cambio de pantalla se aplica igual.
  transition.ready.catch(() => {})
  transition.updateCallbackDone.catch(() => {})
  transition.finished.catch(() => {}).finally(() => {
    if (root.dataset.nav === direction) delete root.dataset.nav
  })
}
