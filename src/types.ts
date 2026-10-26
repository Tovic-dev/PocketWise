export type Screen =
  | "bank-home"
  | "activation"
  | "dashboard"
  | "movements"
  | "simulator"
  | "goals"
  | "goal-detail"
  | "create-goal"
  | "edit-goal"
  | "notifications"
  | "settings"
  | "settings-income"
  | "settings-fixed"
  | "settings-saving"
  | "settings-categories"
  | "calculation"

export type Go = (screen: Screen) => void

export type IconName =
  | "home"
  | "wallet"
  | "plus"
  | "target"
  | "user"
  | "bell"
  | "arrow"
  | "back"
  | "chevron"
  | "calendar"
  | "chart"
  | "food"
  | "basket"
  | "train"
  | "game"
  | "shopping"
  | "salary"
  | "plane"
  | "laptop"
  | "lock"
  | "mail"
  | "eye"
  | "settings"
  | "help"
  | "shield"
  | "categories"
  | "edit"
  | "trash"
  | "check"
  | "info"
  | "spark"
  | "card"
  | "repeat"
  | "transfer"
  | "heart"
  | "receipt"

export type Category =
  | "comida"
  | "restaurantes"
  | "transporte"
  | "ocio"
  | "compras"
  | "suscripciones"
  | "vivienda"
  | "salud"
  | "otros"
  | "ingresos"

/** Movimiento tal y como lo entrega el banco anfitrión. Importe negativo = gasto. */
export type Transaction = {
  id: string
  date: string
  concept: string
  amount: number
  category: Category
}

/** Pago que se repite cada mes, detectado a partir del historial. */
export type RecurringCharge = {
  id: string
  concept: string
  amount: number
  day: number
  category: Category
  confirmed: boolean
}

export type IncomeEstimate = {
  amount: number
  variable: boolean
  sources: { concept: string; amount: number; day: number }[]
  range: [number, number]
}

export type Plan = {
  income: number
  incomeVariable: boolean
  /** Día del mes en que entra la nómina; solo si los ingresos son estables. */
  incomeDay?: number
  charges: RecurringCharge[]
  monthlySaving: number
}

export type Goal = {
  id: number
  name: string
  target: number
  saved: number
  date: string
  icon: IconName
  /** Color de la portada, de la paleta de categorías (olive, terracotta, slate…). */
  tone?: string
}

export type Simulation = {
  item: string
  amount: string
  category: string
}

export type ToastState = {
  title: string
  detail: string
}
