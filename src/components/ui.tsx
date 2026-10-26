import type { ReactNode } from "react"
import type { IconName } from "../types"
import Icon from "./Icon"

export function Text({
  as,
  className = "",
  children,
}: {
  as?: "div" | "span" | "label" | "h1" | "h2" | "h3" | "h4" | "p"
  className?: string
  children: ReactNode
}) {
  const Tag = as ?? (className.split(" ").includes("h1") ? "h1" : "div")
  return <Tag className={className}>{children}</Tag>
}

export function Button({
  children,
  onClick,
  variant = "primary",
  icon,
  type = "button",
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "tertiary" | "danger"
  icon?: IconName
  type?: "button" | "submit"
  disabled?: boolean
}) {
  return (
    <button
      className={`button button-${variant}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {icon && <Icon name={icon} size={20} />}
      <span>{children}</span>
    </button>
  )
}

export function IconButton({
  name,
  label,
  onClick,
  badge = false,
}: {
  name: IconName
  label: string
  onClick?: () => void
  badge?: boolean
}) {
  return (
    <button className="icon-button" onClick={onClick} type="button" aria-label={label}>
      <Icon name={name} />
      {badge && <span className="notification-dot" />}
    </button>
  )
}

export function Progress({
  value,
  tone = "primary",
}: {
  value: number
  tone?: "primary" | "success" | "warning"
}) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={`${value}% completado`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span className={`progress-fill ${tone}`} style={{ width: `${value}%` }} />
    </div>
  )
}

export function TopBar({
  title,
  back,
  right,
}: {
  title: string
  back?: () => void
  right?: ReactNode
}) {
  return (
    <div className="topbar">
      {back ? (
        <IconButton name="back" label="Volver" onClick={back} />
      ) : (
        <span className="topbar-space" />
      )}
      {title ? (
        <Text className="topbar-title" as="h1">
          {title}
        </Text>
      ) : (
        <span className="topbar-title" aria-hidden="true" />
      )}
      {right ?? <span className="topbar-space" />}
    </div>
  )
}

export function InfoRow({
  icon,
  label,
  value,
  onClick,
  tone,
}: {
  icon: IconName
  label: string
  value?: string
  onClick?: () => void
  tone?: string
}) {
  const content = (
    <>
      <span className={`list-icon ${tone ?? ""}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="info-label">{label}</span>
      {value && <span className="info-value">{value}</span>}
      {onClick && <Icon name="arrow" size={18} />}
    </>
  )
  if (!onClick) return <div className="info-row">{content}</div>
  return (
    <button className="info-row" onClick={onClick} type="button">
      {content}
    </button>
  )
}

export function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-line">
      <Text className="small muted">{label}</Text>
      <Text className="body-medium">{value}</Text>
    </div>
  )
}
