export const UPDATE_EVENT = "pocketwise:update"

/**
 * Registra el service worker (solo en producción) y avisa a la app cuando hay
 * una versión nueva esperando, para mostrar «Nueva versión · Actualizar».
 */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js")
      const announce = (worker: ServiceWorker | null) => {
        if (worker && navigator.serviceWorker.controller)
          window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: worker }))
      }
      announce(registration.waiting)
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") announce(worker)
        })
      })
      let reloading = false
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return
        reloading = true
        window.location.reload()
      })
      // Comprobar actualizaciones al volver a la app.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {})
      })
    } catch {
      // Sin service worker la app funciona igual, solo que no sin conexión.
    }
  })
}

export function applyUpdate(worker: ServiceWorker) {
  worker.postMessage({ type: "SKIP_WAITING" })
}
