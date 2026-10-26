import type { Transaction } from "../types"
import { CATEGORIES } from "../data/categories"
import { DEMO_TODAY } from "../data/bankData"
import { formatRelativeDay, formatSigned } from "../lib/format"
import Icon from "./Icon"

export default function MovementRow({
  movement,
  showDate = true,
  onClick,
}: {
  movement: Transaction
  showDate?: boolean
  onClick?: () => void
}) {
  const category = CATEGORIES[movement.category]
  const income = movement.amount > 0
  const content = (
    <>
      <span className={`category-icon ${income ? "income" : ""}`}>
        <Icon name={category.icon} size={20} />
      </span>
      <span className="movement-info">
        <span className="body-medium">{movement.concept}</span>
        <span className="caption muted">
          {category.label}
          {showDate && ` · ${formatRelativeDay(movement.date, DEMO_TODAY)}`}
        </span>
      </span>
      <span className={`amount num ${income ? "positive" : "negative"}`}>
        {formatSigned(movement.amount)}
      </span>
    </>
  )
  if (!onClick) return <div className="movement-row">{content}</div>
  return (
    <button
      className="movement-row"
      type="button"
      onClick={onClick}
      aria-label={`${movement.concept}, ${formatSigned(movement.amount)}, ${category.label}. Cambiar categoría`}
    >
      {content}
    </button>
  )
}
