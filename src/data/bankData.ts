import type { Category, Goal, Transaction } from "../types"
import { toISODate } from "../lib/format"

// PocketWise es un módulo: los movimientos los entrega el banco anfitrión.
// Para el prototipo simulamos esa fuente con un historial fijo y una fecha
// fija, así las cifras coinciden siempre con las capturas de la memoria.
export const DEMO_TODAY = new Date(2026, 9, 14, 12)
export const DEMO_USER_NAME = "Mikel"

export type DemoProfile = "estable" | "irregular"

export const DEMO_PROFILES: Record<
  DemoProfile,
  { label: string; description: string }
> = {
  estable: {
    label: "Nómina fija",
    description: "Pablo: cobra lo mismo cada mes",
  },
  irregular: {
    label: "Ingresos irregulares",
    description: "Paula: clases, trabajos puntuales y ayuda familiar",
  },
}

type Rule = { concept: string; amount: number; day: number; category: Category }

const FIXED: Record<DemoProfile, Rule[]> = {
  estable: [
    { concept: "Alquiler habitación", amount: 400, day: 2, category: "vivienda" },
    { concept: "Abono transporte", amount: 50, day: 3, category: "transporte" },
    { concept: "Spotify", amount: 10.99, day: 18, category: "suscripciones" },
    { concept: "Digi móvil", amount: 15, day: 20, category: "suscripciones" },
    { concept: "Gimnasio Altafit", amount: 29.9, day: 22, category: "salud" },
  ],
  irregular: [
    { concept: "Abono joven", amount: 20, day: 3, category: "transporte" },
    { concept: "Spotify", amount: 10.99, day: 18, category: "suscripciones" },
    { concept: "Digi móvil", amount: 15, day: 20, category: "suscripciones" },
  ],
}

// Bizum mensual que no es un gasto fijo claro: el usuario decide en la activación.
const SHARED: Rule = { concept: "Bizum a Ane", amount: 20, day: 10, category: "otros" }

const INCOME: Record<DemoProfile, Rule[][]> = {
  estable: [0, 1, 2, 3, 4, 5].map(() => [
    { concept: "Nómina · Estudio Kreativa", amount: 1200, day: 1, category: "ingresos" },
  ]),
  irregular: [
    [
      { concept: "Clases particulares", amount: 200, day: 5, category: "ingresos" },
      { concept: "Bar El Puerto", amount: 380, day: 28, category: "ingresos" },
    ],
    [
      { concept: "Transferencia familia", amount: 150, day: 15, category: "ingresos" },
      { concept: "Bar El Puerto", amount: 400, day: 28, category: "ingresos" },
    ],
    [
      { concept: "Clases particulares", amount: 180, day: 5, category: "ingresos" },
      { concept: "Bar El Puerto", amount: 360, day: 28, category: "ingresos" },
    ],
    [
      { concept: "Transferencia familia", amount: 180, day: 15, category: "ingresos" },
      { concept: "Bar El Puerto", amount: 430, day: 28, category: "ingresos" },
    ],
    [
      { concept: "Clases particulares", amount: 240, day: 6, category: "ingresos" },
      { concept: "Transferencia familia", amount: 150, day: 15, category: "ingresos" },
      { concept: "Bar El Puerto", amount: 300, day: 28, category: "ingresos" },
    ],
    [{ concept: "Clases particulares", amount: 220, day: 6, category: "ingresos" }],
  ],
}

const VARIABLE: Rule[] = [
  { concept: "Mercadona", amount: 34.2, day: 4, category: "comida" },
  { concept: "Bar La Viña", amount: 12.5, day: 5, category: "restaurantes" },
  { concept: "Cines Yelmo", amount: 9.9, day: 6, category: "ocio" },
  { concept: "Zara", amount: 29.95, day: 7, category: "compras" },
  { concept: "Glovo", amount: 18.2, day: 9, category: "restaurantes" },
  { concept: "Lidl", amount: 21.35, day: 10, category: "comida" },
  { concept: "Dice · concierto", amount: 25, day: 11, category: "ocio" },
  { concept: "Cafetería campus", amount: 3.8, day: 12, category: "restaurantes" },
  { concept: "Farmacia", amount: 7.6, day: 12, category: "salud" },
  { concept: "Bolt", amount: 8.4, day: 13, category: "transporte" },
  { concept: "Cervecería Olimpia", amount: 16, day: 13, category: "ocio" },
  { concept: "Mercadona", amount: 18.7, day: 14, category: "comida" },
  { concept: "Amazon", amount: 24.99, day: 16, category: "compras" },
  { concept: "Burger King", amount: 11.4, day: 17, category: "restaurantes" },
  { concept: "Mercadona", amount: 41.3, day: 19, category: "comida" },
  { concept: "Steam", amount: 14.99, day: 21, category: "ocio" },
  { concept: "Bar La Viña", amount: 22, day: 23, category: "restaurantes" },
  { concept: "Primark", amount: 18, day: 24, category: "compras" },
  { concept: "Lidl", amount: 27.8, day: 26, category: "comida" },
  { concept: "Sala Apolo", amount: 15, day: 27, category: "ocio" },
  { concept: "Glovo", amount: 21.5, day: 28, category: "restaurantes" },
  { concept: "Renfe", amount: 12.6, day: 29, category: "transporte" },
]

// Variación por mes para que el historial no sea idéntico. En septiembre el
// ocio fue menor: así aparece el insight "+25 % en ocio" de la investigación.
const MONTH_FACTOR = [1.04, 0.97, 0.92, 1.08, 1, 1]
const LEISURE_FACTOR = [0.9, 1.15, 1, 1.1, 0.8, 1]
const MONTHS = MONTH_FACTOR.length

const OPENING_BALANCE: Record<DemoProfile, number> = {
  estable: 0,
  irregular: 150,
}

const round = (value: number) => Math.round(value * 100) / 100

export function buildTransactions(profile: DemoProfile): Transaction[] {
  const transactions: Transaction[] = []
  const firstMonth = DEMO_TODAY.getMonth() - (MONTHS - 1)

  for (let index = 0; index < MONTHS; index++) {
    const month = firstMonth + index
    const isCurrent = index === MONTHS - 1
    const push = (rule: Rule, sign: 1 | -1, amount = rule.amount) => {
      if (isCurrent && rule.day > DEMO_TODAY.getDate()) return
      const date = new Date(DEMO_TODAY.getFullYear(), month, rule.day, 12)
      transactions.push({
        id: `${toISODate(date)}-${rule.concept}`,
        date: toISODate(date),
        concept: rule.concept,
        amount: sign * round(amount),
        category: rule.category,
      })
    }

    INCOME[profile][index].forEach((rule) => push(rule, 1))
    FIXED[profile].forEach((rule) => push(rule, -1))
    if (index >= MONTHS - 3) push(SHARED, -1)
    VARIABLE.forEach((rule) => {
      const factor =
        MONTH_FACTOR[index] * (rule.category === "ocio" ? LEISURE_FACTOR[index] : 1)
      push(rule, -1, isCurrent ? rule.amount : rule.amount * factor)
    })
  }

  return transactions.sort((a, b) => b.date.localeCompare(a.date))
}

export function accountBalance(profile: DemoProfile, transactions: Transaction[]) {
  return round(
    transactions.reduce((total, item) => total + item.amount, OPENING_BALANCE[profile]),
  )
}

/** Objetivos de ejemplo para entrar directamente con la demo completa. */
export const SAMPLE_GOALS: Goal[] = [
  {
    id: 1,
    name: "Viaje a Italia",
    target: 1200,
    saved: 650,
    date: "2027-06-15",
    icon: "plane",
    tone: "terracotta",
  },
  {
    id: 2,
    name: "Nuevo portátil",
    target: 1500,
    saved: 350,
    date: "2027-11-30",
    icon: "laptop",
    tone: "slate",
  },
]
