import type { ReactNode } from "react"
import Icon from "./Icon"

/** Encabezado editorial: filete fino arriba, título y una acción opcional. */
export default function SectionHeader({
  title,
  action,
  onAction,
  children,
}: {
  title: string
  action?: string
  onAction?: () => void
  children?: ReactNode
}) {
  return (
    <div className="section-header">
      <h2 className="section-label">{title}</h2>
      {children}
      {action && onAction && (
        <button className="text-link" onClick={onAction} type="button">
          {action} <Icon name="arrow" size={16} />
        </button>
      )}
    </div>
  )
}
