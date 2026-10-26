import type { Budget } from "../lib/finance"
import { formatCurrency } from "../lib/format"

/**
 * El "punto ciego" de la investigación hecho gráfico: de lo que entra en el mes,
 * cuánto se va en fijos, cuánto se aparta, cuánto ya se ha gastado y cuánto queda.
 * La versión compacta (Inicio) pone la leyenda en línea; la completa, en filas.
 */
export default function MoneyBreakdown({
  budget,
  compact = false,
}: {
  budget: Budget
  compact?: boolean
}) {
  const segments = [
    { key: "fijos", label: "Fijos", long: "Gastos fijos", value: budget.fixedTotal },
    { key: "ahorro", label: "Ahorro", long: "Ahorro del mes", value: budget.saving },
    { key: "gastado", label: "Gastado", long: "Ya gastado", value: budget.variableSpent },
    {
      key: "disponible",
      label: "Disponible",
      long: "Disponible real",
      value: Math.max(0, budget.available),
    },
  ]
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1

  return (
    <figure className={`breakdown ${compact ? "compact" : ""}`}>
      <figcaption className="breakdown-caption">
        Así se reparten tus {formatCurrency(budget.income, { round: true })} de este mes
      </figcaption>
      <div className="breakdown-bar" aria-hidden="true">
        {segments.map((item) =>
          item.value > 0 ? (
            <span
              key={item.key}
              className={`breakdown-segment ${item.key}`}
              style={{ flexGrow: item.value / total }}
            />
          ) : null,
        )}
      </div>
      <dl className="breakdown-legend">
        {segments.map((item) => (
          <div key={item.key} className="breakdown-row">
            <dt>
              <span className={`breakdown-dot ${item.key}`} />
              {compact ? item.label : item.long}
            </dt>
            <dd className="num">{formatCurrency(item.value, { round: true })}</dd>
          </div>
        ))}
      </dl>
      {budget.available < 0 && (
        <p className="breakdown-note">
          Este mes llevas {formatCurrency(-budget.available, { round: true })} por encima de
          lo que tenías disponible. Se reajusta cuando entren tus próximos ingresos.
        </p>
      )}
    </figure>
  )
}
