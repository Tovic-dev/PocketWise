import { createContext, useContext } from "react"
import type { Budget, GoalPlan } from "../lib/finance"
import type { Category, Go, Goal, Plan, Simulation, Transaction } from "../types"

export type AppData = {
  go: Go
  notify: (title: string, detail: string) => void
  userName: string
  today: Date
  transactions: Transaction[]
  plan: Plan
  setPlan: (plan: Plan) => void
  budget: Budget
  goals: Goal[]
  setGoals: (update: (goals: Goal[]) => Goal[]) => void
  goalPlans: Map<number, GoalPlan>
  mainGoal: Goal | undefined
  selectedGoal: Goal | undefined
  selectGoal: (id: number) => void
  simulation: Simulation
  setSimulation: (simulation: Simulation) => void
  /** Cambia la categoría de un movimiento o de todos los de ese comercio. */
  recategorize: (movement: Transaction, category: Category, wholeConcept: boolean) => void
}

export const AppContext = createContext<AppData | null>(null)

export function useApp() {
  const data = useContext(AppContext)
  if (!data) throw new Error("useApp debe usarse dentro de AppContext")
  return data
}
