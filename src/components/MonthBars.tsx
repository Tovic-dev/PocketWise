import type { CSSProperties } from "react"
import type { MonthRange } from "../lib/finance"
import { formatCurrency } from "../lib/format"

const shortMonth = new Intl.DateTimeFormat("es-ES", { month: "short" })

/** Evolución del gasto del día a día: una sola serie, una barra por mes. */
export default function MonthBars({
  months,
  selected,
  onSelect,
}: {
  months: { range: MonthRange; total: number }[]
  selected: string
  onSelect: (offset: number) => void
}) {
  const max = Math.max(...months.map((month) => month.total), 1)
  const average =
    months.filter((month) => !month.range.current).reduce((sum, month) => sum + month.total, 0) /
    Math.max(1, months.filter((month) => !month.range.current).length)

  return (
    <div className="month-bars">
      <div className="month-bars-plot">
        <span
          className="month-bars-average"
          style={{ "--ratio": average / max } as CSSProperties}
          aria-hidden="true"
        >
          <span>Media {formatCurrency(average, { round: true })}</span>
        </span>
        {months.map((month, index) => {
          const active = month.range.key === selected
          const label = shortMonth.format(month.range.date).replace(".", "")
          return (
            <button
              key={month.range.key}
              type="button"
              className={`month-bar ${active ? "active" : ""} ${month.range.current ? "current" : ""}`}
              onClick={() => onSelect(index - months.length + 1)}
              aria-pressed={active}
              aria-label={`${label}: ${formatCurrency(month.total, { round: true })}${
                month.range.current ? ", mes en curso" : ""
              }`}
            >
              <span
                className="month-bar-fill"
                style={{ "--ratio": month.total / max } as CSSProperties}
              />
              {active && (
                <span
                  className="month-bar-value num"
                  style={{ "--ratio": month.total / max } as CSSProperties}
                >
                  {formatCurrency(month.total, { round: true })}
                </span>
              )}
              <span className="month-bar-label">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
