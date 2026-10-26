import type { RecurringCharge } from "../types"
import { CATEGORIES } from "../data/categories"
import { formatCurrency } from "../lib/format"
import Icon from "./Icon"

export default function ChargeRow({
  charge,
  onToggle,
}: {
  charge: RecurringCharge
  onToggle: () => void
}) {
  const category = CATEGORIES[charge.category]
  return (
    <label className={`charge-row ${charge.confirmed ? "on" : ""}`}>
      <span className="charge-icon">
        <Icon name={category.icon} size={20} />
      </span>
      <span className="charge-info">
        <span className="body-medium">{charge.concept}</span>
        <span className="caption muted">
          Día {charge.day} de cada mes
          {charge.category === "otros" && " · ¿es un pago fijo?"}
        </span>
      </span>
      <span className="charge-amount num">{formatCurrency(charge.amount)}</span>
      <input type="checkbox" checked={charge.confirmed} onChange={onToggle} />
      <span className="check-box" aria-hidden="true">
        <Icon name="check" size={16} />
      </span>
    </label>
  )
}
