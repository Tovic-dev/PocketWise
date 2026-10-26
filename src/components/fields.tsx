import { useId } from "react"
import type { IconName } from "../types"
import { formatDate } from "../lib/format"
import Icon from "./Icon"

export function focusFirstError() {
  window.requestAnimationFrame(() => {
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  })
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  icon,
  name,
  autoComplete,
  inputMode,
  readOnly = false,
  onBlur,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  type?: string
  error?: string
  icon?: IconName
  name?: string
  autoComplete?: string
  inputMode?: "text" | "email" | "numeric" | "decimal" | "tel" | "url"
  readOnly?: boolean
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <span className={`input-wrap ${error ? "input-error" : ""}`}>
        {icon && <Icon name={icon} size={20} />}
        <input
          id={id}
          name={name ?? id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          readOnly={readOnly}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </span>
      {error && (
        <span className="error-text" id={errorId}>
          {error}
        </span>
      )}
    </div>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  name,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  name: string
}) {
  const id = useId()
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <span className="input-wrap select-wrap">
        <select
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option value={option} key={option}>
              {option}
            </option>
          ))}
        </select>
        <Icon name="chevron" size={18} />
      </span>
    </div>
  )
}

export function DateField({
  label,
  value,
  onChange,
  name,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  name: string
  error?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <span className={`input-wrap date-wrap ${error ? "input-error" : ""}`}>
        <Icon name="calendar" size={20} />
        <span className="date-display">
          {value ? formatDate(value) : "Selecciona una fecha"}
        </span>
        <Icon name="chevron" size={18} />
        <input
          className="date-native"
          id={id}
          name={name}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </span>
      {error && (
        <span className="error-text" id={errorId}>
          {error}
        </span>
      )}
    </div>
  )
}
