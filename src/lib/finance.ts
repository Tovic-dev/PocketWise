import type {
  Category,
  Goal,
  IncomeEstimate,
  Plan,
  RecurringCharge,
  Transaction,
} from "../types"
import { parseISODate, roundCents, toISODate } from "./format"

const TOLERANCE = 0.03
const DAYS_PER_MONTH = 30.44

function monthKey(value: string) {
  return value.slice(0, 7)
}

/** Los tres meses completos anteriores al mes en curso. */
function completeMonths(today: Date) {
  return [3, 2, 1].map((back) =>
    toISODate(new Date(today.getFullYear(), today.getMonth() - back, 1, 12)).slice(0, 7),
  )
}

function similar(amounts: number[]) {
  const reference = amounts[amounts.length - 1]
  return amounts.every(
    (amount) => Math.abs(amount - reference) <= Math.abs(reference) * TOLERANCE,
  )
}

/** Agrupa por concepto los movimientos de los meses completos. */
function groupByConcept(transactions: Transaction[], today: Date, sign: 1 | -1) {
  const months = completeMonths(today)
  const groups = new Map<string, Transaction[]>()
  transactions
    .filter((item) => Math.sign(item.amount) === sign && months.includes(monthKey(item.date)))
    .forEach((item) => groups.set(item.concept, [...(groups.get(item.concept) ?? []), item]))
  return { months, groups }
}

/**
 * Un pago es recurrente si aparece una sola vez al mes, en al menos dos de los
 * tres últimos meses completos, siempre por el mismo importe (±3 %).
 * Los de categoría "otros" (bizums, transferencias) se proponen sin marcar:
 * puede que se repitan, pero solo el usuario sabe si son un gasto fijo.
 */
export function detectRecurring(transactions: Transaction[], today: Date): RecurringCharge[] {
  const { groups } = groupByConcept(transactions, today, -1)
  const charges: RecurringCharge[] = []
  groups.forEach((items, concept) => {
    const perMonth = new Set(items.map((item) => monthKey(item.date)))
    if (perMonth.size !== items.length || perMonth.size < 2) return
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date))
    if (!similar(sorted.map((item) => item.amount))) return
    const latest = sorted[sorted.length - 1]
    charges.push({
      id: concept,
      concept,
      amount: Math.abs(latest.amount),
      day: parseISODate(latest.date).getDate(),
      category: latest.category,
      confirmed: latest.category !== "otros",
    })
  })
  return charges.sort((a, b) => Number(b.confirmed) - Number(a.confirmed) || b.amount - a.amount)
}

/**
 * Si todo lo que entra cada mes viene de fuentes estables, el ingreso es su
 * suma. Si no, es variable y usamos la media de los tres meses completos.
 */
export function detectIncome(transactions: Transaction[], today: Date): IncomeEstimate {
  const { months, groups } = groupByConcept(transactions, today, 1)
  const totals = months.map((month) =>
    transactions
      .filter((item) => item.amount > 0 && monthKey(item.date) === month)
      .reduce((total, item) => total + item.amount, 0),
  )
  const average = totals.reduce((total, value) => total + value, 0) / months.length
  const range: [number, number] = [Math.min(...totals), Math.max(...totals)]

  const sources: IncomeEstimate["sources"] = []
  groups.forEach((items, concept) => {
    const perMonth = new Set(items.map((item) => monthKey(item.date)))
    if (perMonth.size !== months.length || items.length !== months.length) return
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date))
    if (!similar(sorted.map((item) => item.amount))) return
    const latest = sorted[sorted.length - 1]
    sources.push({ concept, amount: latest.amount, day: parseISODate(latest.date).getDate() })
  })

  const stable = sources.reduce((total, source) => total + source.amount, 0)
  if (stable > 0 && stable >= average * 0.9) {
    return { amount: roundCents(stable), variable: false, sources, range }
  }
  return { amount: Math.round(average), variable: true, sources: [], range }
}

export type Budget = {
  income: number
  fixedTotal: number
  fixedCharged: number
  fixedPending: RecurringCharge[]
  saving: number
  variableSpent: number
  /** Dinero disponible real: ingresos − gastos fijos − ahorro − gastos variables del mes. */
  available: number
  accountBalance: number
  daysLeft: number
  weeklyPace: number
  monthStart: string
}

export function computeBudget(
  transactions: Transaction[],
  plan: Plan,
  today: Date,
  balance: number,
): Budget {
  const monthStart = toISODate(new Date(today.getFullYear(), today.getMonth(), 1, 12))
  const todayISO = toISODate(today)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 12)
  const fixed = plan.charges.filter((charge) => charge.confirmed)
  const fixedConcepts = new Set(fixed.map((charge) => charge.concept))

  const thisMonth = transactions.filter(
    (item) => item.date >= monthStart && item.date <= todayISO,
  )
  const expenses = thisMonth.filter((item) => item.amount < 0)
  const fixedCharged = expenses
    .filter((item) => fixedConcepts.has(item.concept))
    .reduce((total, item) => total - item.amount, 0)
  const variableSpent = expenses
    .filter((item) => !fixedConcepts.has(item.concept))
    .reduce((total, item) => total - item.amount, 0)
  const chargedConcepts = new Set(expenses.map((item) => item.concept))
  const fixedPending = fixed
    .filter((charge) => !chargedConcepts.has(charge.concept))
    .sort((a, b) => a.day - b.day)

  const fixedTotal = fixed.reduce((total, charge) => total + charge.amount, 0)
  const available = plan.income - fixedTotal - plan.monthlySaving - variableSpent
  const daysLeft = monthEnd.getDate() - today.getDate() + 1

  return {
    income: roundCents(plan.income),
    fixedTotal: roundCents(fixedTotal),
    fixedCharged: roundCents(fixedCharged),
    fixedPending,
    saving: roundCents(plan.monthlySaving),
    variableSpent: roundCents(variableSpent),
    available: roundCents(available),
    accountBalance: balance,
    daysLeft,
    weeklyPace: roundCents((Math.max(0, available) / daysLeft) * 7),
    monthStart,
  }
}

/** Margen que queda al mes antes de apartar ahorro: ingresos − gastos fijos. */
export function monthlyMargin(plan: Pick<Plan, "income" | "charges">) {
  return roundCents(
    plan.income -
      plan.charges
        .filter((charge) => charge.confirmed)
        .reduce((total, charge) => total + charge.amount, 0),
  )
}

export function spendingByCategory(transactions: Transaction[], from: string, to: string) {
  const totals = new Map<Category, number>()
  transactions
    .filter((item) => item.amount < 0 && item.date >= from && item.date <= to)
    .forEach((item) =>
      totals.set(item.category, (totals.get(item.category) ?? 0) - item.amount),
    )
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total: roundCents(total) }))
    .sort((a, b) => b.total - a.total)
}

/** Compara lo gastado en una categoría con el mismo tramo del mes anterior. */
export function categoryChange(transactions: Transaction[], today: Date, category: Category) {
  const from = toISODate(new Date(today.getFullYear(), today.getMonth(), 1, 12))
  const to = toISODate(today)
  const previousFrom = toISODate(new Date(today.getFullYear(), today.getMonth() - 1, 1, 12))
  const previousTo = toISODate(
    new Date(today.getFullYear(), today.getMonth() - 1, today.getDate(), 12),
  )
  const sum = (start: string, end: string) =>
    transactions
      .filter(
        (item) =>
          item.category === category && item.amount < 0 && item.date >= start && item.date <= end,
      )
      .reduce((total, item) => total - item.amount, 0)
  const current = sum(from, to)
  const previous = sum(previousFrom, previousTo)
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

export type GoalPlan = {
  remaining: number
  monthsLeft: number
  /** Lo que haría falta apartar al mes para llegar en la fecha. */
  needed: number
  /** La parte del ahorro mensual del usuario que va a este objetivo. */
  contribution: number
  projectedDate: string | null
  status: "completado" | "en-fecha" | "retrasado" | "sin-ahorro"
}

/**
 * Reparte el ahorro mensual entre los objetivos en proporción a lo que cada uno
 * necesita para llegar a tiempo, y proyecta cuándo se alcanzará cada uno.
 */
export function planGoals(goals: Goal[], monthlySaving: number, today: Date) {
  const base = goals.map((goal) => {
    const remaining = Math.max(0, goal.target - goal.saved)
    const days = (parseISODate(goal.date).getTime() - today.getTime()) / 86_400_000
    const monthsLeft = Math.max(1, days / DAYS_PER_MONTH)
    return { goal, remaining, monthsLeft, needed: remaining / monthsLeft }
  })
  const totalNeeded = base.reduce((total, item) => total + item.needed, 0)

  const plans = new Map<number, GoalPlan>()
  base.forEach(({ goal, remaining, monthsLeft, needed }) => {
    const contribution = totalNeeded ? (monthlySaving * needed) / totalNeeded : 0
    let projectedDate: string | null = null
    let status: GoalPlan["status"] = "sin-ahorro"
    if (remaining === 0) status = "completado"
    else if (contribution > 0) {
      const projected = new Date(
        today.getTime() + (remaining / contribution) * DAYS_PER_MONTH * 86_400_000,
      )
      projectedDate = toISODate(projected)
      status = projectedDate <= goal.date ? "en-fecha" : "retrasado"
    }
    plans.set(goal.id, {
      remaining,
      monthsLeft,
      needed: roundCents(needed),
      contribution: roundCents(contribution),
      projectedDate,
      status,
    })
  })
  return plans
}

export type SimulationResult = {
  amount: number
  availableAfter: number
  weeklyPaceAfter: number
  status: "holgado" | "ajustado" | "comprometido"
  /** Parte de la compra que no cabe en el disponible y saldría del ahorro. */
  shortfall: number
  goalDelayDays: number
}

/**
 * El disponible ya descuenta el ahorro del mes. Por eso una compra que cabe en
 * el disponible no retrasa ningún objetivo: solo lo retrasa la parte que lo
 * supera, porque esa parte saldría del dinero apartado para ahorrar.
 */
export function simulatePurchase(
  budget: Budget,
  amount: number,
  goalPlan?: GoalPlan,
): SimulationResult {
  const availableAfter = roundCents(budget.available - amount)
  const shortfall = roundCents(Math.max(0, amount - Math.max(0, budget.available)))
  const dailyContribution = goalPlan ? goalPlan.contribution / DAYS_PER_MONTH : 0
  const goalDelayDays = shortfall && dailyContribution ? Math.ceil(shortfall / dailyContribution) : 0
  const share = budget.available > 0 ? amount / budget.available : Infinity
  const status = availableAfter < 0 ? "comprometido" : share > 0.5 ? "ajustado" : "holgado"
  return {
    amount,
    availableAfter,
    weeklyPaceAfter: roundCents((Math.max(0, availableAfter) / budget.daysLeft) * 7),
    status,
    shortfall,
    goalDelayDays,
  }
}

/** Fecha de la próxima nómina, si los ingresos son estables y conocemos el día. */
export function nextIncomeDate(plan: Plan, today: Date) {
  if (plan.incomeVariable || !plan.incomeDay) return null
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), plan.incomeDay, 12)
  const next =
    thisMonth > today
      ? thisMonth
      : new Date(today.getFullYear(), today.getMonth() + 1, plan.incomeDay, 12)
  return toISODate(next)
}

const INSIGHT_CATEGORIES: Category[] = ["ocio", "restaurantes", "compras", "comida", "transporte"]

/**
 * El aviso del momento: la categoría de gasto que más ha cambiado respecto al
 * mismo tramo del mes anterior. Solo se muestra si el cambio es relevante.
 */
export function topInsight(transactions: Transaction[], today: Date) {
  const from = toISODate(new Date(today.getFullYear(), today.getMonth(), 1, 12))
  const spent = new Map(
    spendingByCategory(transactions, from, toISODate(today)).map((item) => [item.category, item.total]),
  )
  let best: { category: Category; change: number } | null = null
  INSIGHT_CATEGORIES.forEach((category) => {
    if ((spent.get(category) ?? 0) < 20) return
    const change = categoryChange(transactions, today, category)
    if (change === null || Math.abs(change) < 15) return
    if (!best || Math.abs(change) > Math.abs(best.change)) best = { category, change }
  })
  return best as { category: Category; change: number } | null
}

export type Alternative = { title: string; detail: string }

/**
 * Alternativas que informan sin juzgar: cuándo no afectaría al ahorro y hasta
 * qué importe la compra sería holgada o cabría en el disponible.
 */
export function purchaseAlternatives(
  budget: Budget,
  result: SimulationResult,
  nextIncome: string | null,
  formatMoney: (value: number) => string,
  formatDay: (value: string) => string,
) {
  const alternatives: Alternative[] = []
  if (result.status === "holgado") return alternatives
  alternatives.push({
    title: nextIncome ? `Esperar al ${formatDay(nextIncome)}` : "Esperar a tus próximos ingresos",
    detail:
      result.status === "comprometido"
        ? "Saldría del dinero del mes que viene y no tocaría lo que tienes ahorrado."
        : "Este mes conservarías tu margen y la compra saldría del mes que viene.",
  })
  if (result.status === "comprometido" && budget.available > 0)
    alternatives.push({
      title: `Gastar hasta ${formatMoney(Math.round(budget.available))}`,
      detail: "Es lo que te cabe este mes sin tocar tu ahorro.",
    })
  const comfortable = Math.floor((budget.available * 0.5) / 10) * 10
  if (comfortable > 0)
    alternatives.push({
      title: `Una opción de hasta ${formatMoney(comfortable)}`,
      detail: "Con ese importe seguirías con margen holgado el resto del mes.",
    })
  return alternatives
}

export type MonthRange = {
  key: string
  date: Date
  from: string
  to: string
  /** Mismo tramo del mes anterior, para comparar de forma justa. */
  prevFrom: string
  prevTo: string
  current: boolean
}

/** Mes a `offset` meses de hoy (0 = este mes, en curso hasta hoy). */
export function monthRange(today: Date, offset: number): MonthRange {
  const date = new Date(today.getFullYear(), today.getMonth() + offset, 1, 12)
  const current = offset === 0
  const end = current ? today : new Date(date.getFullYear(), date.getMonth() + 1, 0, 12)
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1, 12)
  const prevEnd = current
    ? new Date(prev.getFullYear(), prev.getMonth(), today.getDate(), 12)
    : new Date(prev.getFullYear(), prev.getMonth() + 1, 0, 12)
  return {
    key: toISODate(date).slice(0, 7),
    date,
    from: toISODate(date),
    to: toISODate(end),
    prevFrom: toISODate(prev),
    prevTo: toISODate(prevEnd),
    current,
  }
}

/** Gasto del día a día: todo lo que sale de la cuenta menos los pagos fijos confirmados. */
export function variableExpenses(transactions: Transaction[], plan: Plan, from: string, to: string) {
  const fixed = new Set(plan.charges.filter((charge) => charge.confirmed).map((charge) => charge.concept))
  return transactions.filter(
    (item) => item.amount < 0 && item.date >= from && item.date <= to && !fixed.has(item.concept),
  )
}

export function totalsByCategory(expenses: Transaction[]) {
  const totals = new Map<Category, number>()
  expenses.forEach((item) => totals.set(item.category, (totals.get(item.category) ?? 0) - item.amount))
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total: roundCents(total) }))
    .sort((a, b) => b.total - a.total)
}

const sumSpent = (items: Transaction[]) => roundCents(items.reduce((total, item) => total - item.amount, 0))

/** Gasto del día a día de los últimos `count` meses, del más antiguo al actual. */
export function monthlyVariable(transactions: Transaction[], plan: Plan, today: Date, count = 6) {
  return Array.from({ length: count }, (_, index) => {
    const range = monthRange(today, index - count + 1)
    return { range, total: sumSpent(variableExpenses(transactions, plan, range.from, range.to)) }
  })
}

/**
 * Frases cortas sobre el mes elegido, sin gráficos ni juicios: el cambio más
 * llamativo por categoría, los pequeños gastos que se acumulan y el más grande.
 */
export function spendingInsights(
  transactions: Transaction[],
  plan: Plan,
  range: MonthRange,
  labels: Record<Category, string>,
  formatMoney: (value: number) => string,
  previousLabel: string,
) {
  const insights: string[] = []
  const current = variableExpenses(transactions, plan, range.from, range.to)
  const previous = totalsByCategory(variableExpenses(transactions, plan, range.prevFrom, range.prevTo))
  const before = new Map(previous.map((item) => [item.category, item.total]))

  let change: { category: Category; percent: number } | null = null
  totalsByCategory(current).forEach(({ category, total }) => {
    const old = before.get(category)
    if (!old || total < 20) return
    const percent = Math.round(((total - old) / old) * 100)
    if (Math.abs(percent) < 15) return
    if (!change || Math.abs(percent) > Math.abs(change.percent)) change = { category, percent }
  })
  const found = change as { category: Category; percent: number } | null
  if (found)
    insights.push(
      `${labels[found.category]}: un ${Math.abs(found.percent)} % ${found.percent > 0 ? "más" : "menos"} que ${previousLabel}.`,
    )

  const small = current.filter((item) => item.amount > -15)
  if (small.length >= 4)
    insights.push(
      `${small.length} gastos de menos de 15 € suman ${formatMoney(sumSpent(small))}. Los pequeños también cuentan.`,
    )

  const biggest = [...current].sort((a, b) => a.amount - b.amount)[0]
  if (biggest) insights.push(`Tu gasto más grande: ${biggest.concept}, ${formatMoney(-biggest.amount)}.`)
  return insights
}

export type GoalDisplay = "completado" | "casi" | "retrasado" | "activo" | "sin-ahorro"

/** Los cuatro estados visuales del design system, más "sin ahorro". */
export function goalDisplay(goal: Goal, plan?: GoalPlan): GoalDisplay {
  if (goal.saved >= goal.target) return "completado"
  if (goal.saved / goal.target >= 0.9) return "casi"
  if (plan?.status === "retrasado") return "retrasado"
  if (plan?.status === "sin-ahorro") return "sin-ahorro"
  return "activo"
}

/**
 * Carácter educativo: cuánto antes llegarías apartando `extra` € más al mes.
 * Devuelve los días que se adelanta, o la fecha si ahora no apartas nada.
 */
export function speedUp(plan: GoalPlan, extra: number, today: Date) {
  if (plan.remaining === 0) return null
  const faster = plan.contribution + extra
  const arrival = new Date(today.getTime() + (plan.remaining / faster) * DAYS_PER_MONTH * 86_400_000)
  if (plan.contribution <= 0) return { days: null, date: toISODate(arrival) }
  const now = (plan.remaining / plan.contribution) * DAYS_PER_MONTH
  return { days: Math.round(now - (plan.remaining / faster) * DAYS_PER_MONTH), date: toISODate(arrival) }
}
