import { Component, type ReactNode } from "react"

/**
 * Si algo falla al pintar una pantalla, en lugar de quedarse en blanco se
 * muestra un mensaje tranquilo con una salida. Borrar los datos de la demo
 * resuelve los fallos por un estado guardado incompatible.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error("PocketWise:", error)
  }

  restart = (clean: boolean) => {
    if (clean) {
      try {
        window.localStorage.removeItem("pocketwise-demo-v1")
        window.localStorage.removeItem("pocketwise-nav-v1")
      } catch {
        // Sin almacenamiento: basta con recargar.
      }
    }
    window.location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="app-stage">
        <div className="device">
          <main className="screen screen-full">
            <div className="page error-page">
              <p className="eyebrow">PocketWise</p>
              <h1 className="h1">Algo no ha ido bien</h1>
              <p className="body muted">
                No hemos podido mostrar esta pantalla. Tu dinero y tus movimientos no se han
                tocado.
              </p>
              <div className="push-bottom error-actions">
                <button className="button button-primary" type="button" onClick={() => this.restart(false)}>
                  <span>Volver a intentarlo</span>
                </button>
                <button className="button button-tertiary" type="button" onClick={() => this.restart(true)}>
                  <span>Empezar la demo desde cero</span>
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }
}
