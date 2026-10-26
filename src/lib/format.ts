export function parseAmount(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/-/g, "")
  if (normalized.includes(",")) {
    return Number(normalized.replace(/\./g, "").replace(",", "."))
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    return Number(normalized.replace(/\./g, ""))
  }
  return Number(normalized)
}

export function roundCents(value: number) {
  return Math.round(value * 100) / 100
}

export function formatCurrency(value: number, { round = false } = {}) {
  const rounded = round ? Math.round(value) : roundCents(value)
  const sign = rounded < 0 ? "−" : ""
  const absolute = Math.abs(rounded)
  const [whole, decimals] = absolute
    .toFixed(Number.isInteger(absolute) ? 0 : 2)
    .split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `${sign}${grouped}${decimals ? `,${decimals}` : ""} €`
}

export function formatSigned(value: number) {
  return value > 0 ? `+${formatCurrency(value)}` : formatCurrency(value)
}

export function toISODate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function parseISODate(value: string) {
  return new Date(`${value}T12:00:00`)
}

export function formatDate(value: string) {
  const date = parseISODate(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

/** "Hoy", "Ayer" o "12 de octubre", relativo al día de la demo. */
export function formatRelativeDay(value: string, today: Date) {
  const date = parseISODate(value)
  const diff = Math.round(
    (new Date(toISODate(today) + "T12:00:00").getTime() - date.getTime()) /
      86_400_000,
  )
  if (diff === 0) return "Hoy"
  if (diff === 1) return "Ayer"
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
  }).format(date)
}

export function monthName(date: Date) {
  return new Intl.DateTimeFormat("es-ES", { month: "long" }).format(date)
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
