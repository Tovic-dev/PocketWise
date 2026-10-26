import type { Transaction } from "../types"
import type { Budget } from "../lib/finance"
import { DEMO_PROFILES, type DemoProfile } from "../data/bankData"
import { formatCurrency } from "../lib/format"
import { HOSTS, type HostId } from "../theme/hosts"
import { useHost } from "../theme/HostContext"
import Icon from "../components/Icon"
import MovementRow from "../components/MovementRow"

/**
 * Simulación de la app del banco anfitrión. No forma parte de PocketWise:
 * sirve para enseñar dónde vive el módulo y cómo se entra en él.
 */
export default function BankHome({
  userName,
  balance,
  budget,
  recent,
  profile,
  onOpen,
  onHostChange,
  onProfileChange,
  onDemoFull,
  onReset,
}: {
  userName: string
  balance: number
  budget: Budget | null
  recent: Transaction[]
  profile: DemoProfile
  onOpen: () => void
  onHostChange: (id: HostId) => void
  onProfileChange: (profile: DemoProfile) => void
  onDemoFull: () => void
  onReset: () => void
}) {
  const host = useHost()
  return (
    <>
      <main className="screen bank" tabIndex={-1}>
        <header className="bank-header">
          <span className="bank-logo">{host.name.slice(0, 1)}</span>
          <div>
            <p className="bank-hello">Hola, {userName}</p>
            <p className="bank-name">{host.name}</p>
          </div>
          <span className="bank-avatar" aria-hidden="true">
            <Icon name="user" size={20} />
          </span>
        </header>

        <section className="bank-account">
          <p className="bank-label">Cuenta nómina ·· 4821</p>
          <p className="bank-balance num">{formatCurrency(balance)}</p>
          <p className="bank-label">Saldo disponible</p>
          <div className="bank-actions" aria-hidden="true">
            {[
              { icon: "transfer" as const, label: "Transferir" },
              { icon: "card" as const, label: "Tarjetas" },
              { icon: "receipt" as const, label: "Recibos" },
            ].map((action) => (
              <span key={action.label} className="bank-action">
                <Icon name={action.icon} size={20} />
                {action.label}
              </span>
            ))}
          </div>
        </section>

        <button className="module-entry" onClick={onOpen} type="button">
          <span className="module-entry-tag">PocketWise</span>
          {budget ? (
            <>
              <span className="module-entry-label">Dinero disponible real</span>
              <span className="module-entry-amount num">
                {formatCurrency(budget.available, { round: true })}
              </span>
              <span className="module-entry-copy">
                De tus {formatCurrency(balance, { round: true })} en cuenta, después de fijos y
                ahorro.
              </span>
            </>
          ) : (
            <>
              <span className="module-entry-title">
                ¿Cuánto tienes disponible de verdad?
              </span>
              <span className="module-entry-copy">
                Descúbrelo en un minuto con los movimientos de tu cuenta.
              </span>
            </>
          )}
          <span className="module-entry-cta">
            {budget ? "Abrir" : "Descubrir"} <Icon name="arrow" size={16} />
          </span>
        </button>

        <section className="bank-section">
          <h2 className="bank-section-title">Últimos movimientos</h2>
          <div className="bank-list">
            {recent.map((movement) => (
              <MovementRow key={movement.id} movement={movement} />
            ))}
          </div>
        </section>

        <details className="demo-panel">
          <summary>Ajustes de la demo</summary>
          <div className="demo-group">
            <span className="demo-label">Banco anfitrión</span>
            <div className="chip-row">
              {Object.values(HOSTS).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chip ${item.id === host.id ? "active" : ""}`}
                  onClick={() => onHostChange(item.id)}
                >
                  <span className="swatch" style={{ background: item.accent }} />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <div className="demo-group">
            <span className="demo-label">Datos del usuario</span>
            <div className="chip-row">
              {(Object.keys(DEMO_PROFILES) as DemoProfile[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`chip ${id === profile ? "active" : ""}`}
                  onClick={() => onProfileChange(id)}
                >
                  {DEMO_PROFILES[id].label}
                </button>
              ))}
            </div>
            <span className="demo-hint">{DEMO_PROFILES[profile].description}</span>
          </div>
          <div className="demo-group demo-buttons">
            <button type="button" className="chip" onClick={onDemoFull}>
              Entrar con datos de ejemplo
            </button>
            <button type="button" className="chip" onClick={onReset}>
              Empezar desde cero
            </button>
          </div>
        </details>
      </main>
      <nav className="bank-nav" aria-hidden="true">
        {[
          { icon: "home" as const, label: "Inicio" },
          { icon: "wallet" as const, label: "Cuentas" },
          { icon: "transfer" as const, label: "Bizum" },
          { icon: "user" as const, label: "Perfil" },
        ].map((item, index) => (
          <span key={item.label} className={`bank-nav-item ${index === 0 ? "active" : ""}`}>
            <Icon name={item.icon} size={22} />
            {item.label}
          </span>
        ))}
      </nav>
    </>
  )
}
