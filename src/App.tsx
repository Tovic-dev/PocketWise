import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import type { Category, Goal, Plan, Screen, Simulation, ToastState } from "./types"
import {
  DEMO_TODAY,
  DEMO_USER_NAME,
  SAMPLE_GOALS,
  accountBalance,
  buildTransactions,
  type DemoProfile,
} from "./data/bankData"
import { computeBudget, detectIncome, detectRecurring, planGoals } from "./lib/finance"
import { clearState, loadState, saveState } from "./lib/storage"
import { LEVEL, directionBetween, nextStack, withTransition, type Direction } from "./lib/navigation"
import { useEdgeSwipe } from "./lib/useEdgeSwipe"
import { UPDATE_EVENT, applyUpdate } from "./lib/serviceWorker"
import { HOSTS, hostStyle, type HostId } from "./theme/hosts"
import { HostContext } from "./theme/HostContext"
import { AppContext, type AppData } from "./state/AppContext"
import SkeletonScreen from "./components/SkeletonScreen"
import Toast from "./components/Toast"
import Activation from "./screens/Activation"
import BankHome from "./screens/BankHome"
import Dashboard from "./screens/Dashboard"
import { GoalDetail, GoalForm, Goals } from "./screens/Goals"
import Notifications from "./screens/Notifications"
import {
  Calculation,
  CategorySettings,
  FixedSettings,
  IncomeSettings,
  SavingSettings,
  Settings,
} from "./screens/Settings"
import Simulator from "./screens/Simulator"
import Spending from "./screens/Spending"

type Stored = {
  host: HostId
  profile: DemoProfile
  plan: Plan | null
  goals: Goal[]
  categoryRules: Record<string, Category>
}

const DATA_SCREENS: Screen[] = ["dashboard", "movements", "goals", "notifications"]
const NAV_KEY = "pocketwise-nav-v1"
const SYNC_MS = 900

/** Al reabrir la app se vuelve a la última pantalla, si sigue siendo válida. */
function restoredStack(hasPlan: boolean): Screen[] {
  const saved = loadState<{ stack: Screen[] }>(NAV_KEY).stack
  if (!saved?.length || !saved.every((item) => item in LEVEL)) return ["bank-home"]
  if (!hasPlan && saved.some((item) => LEVEL[item] > 0 && item !== "activation")) return ["bank-home"]
  return saved
}

function defaultPlan(profile: DemoProfile, saving: number): Plan {
  const transactions = buildTransactions(profile)
  const income = detectIncome(transactions, DEMO_TODAY)
  return {
    income: income.amount,
    incomeVariable: income.variable,
    incomeDay: income.sources[0]?.day,
    charges: detectRecurring(transactions, DEMO_TODAY),
    monthlySaving: saving,
  }
}

export default function App() {
  const stored = useMemo(() => loadState<Stored>(), [])
  const [host, setHost] = useState<HostId>(
    stored.host && stored.host in HOSTS ? stored.host : "neutro",
  )
  const [profile, setProfile] = useState<DemoProfile>(stored.profile ?? "estable")
  const [plan, setPlan] = useState<Plan | null>(stored.plan ?? null)
  const [goals, setGoals] = useState<Goal[]>(stored.goals ?? [])
  // Correcciones de categoría del usuario: "id:<movimiento>" o "concept:<comercio>".
  const [categoryRules, setCategoryRules] = useState<Record<string, Category>>(
    stored.categoryRules ?? {},
  )
  const [stack, setStack] = useState<Screen[]>(() => restoredStack(Boolean(stored.plan)))
  const screen = stack[stack.length - 1]
  const scrollMemory = useRef<Partial<Record<Screen, number>>>({})
  const restoreScroll = useRef(false)
  const deviceRef = useRef<HTMLDivElement>(null)
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null)
  const [simulation, setSimulation] = useState<Simulation>({
    item: "",
    amount: "",
    category: "Compras",
  })
  // Una sola "sincronización con el banco" por sesión, al entrar en el módulo.
  const [loading, setLoading] = useState(false)
  const synced = useRef(false)
  const [toast, setToast] = useState<(ToastState & { id: number }) | null>(null)
  const [update, setUpdate] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    document.documentElement.lang = "es"
  }, [])

  useEffect(() => {
    saveState<Stored>({ host, profile, plan, goals, categoryRules })
  }, [host, profile, plan, goals, categoryRules])

  // El service worker avisa cuando hay una versión nueva esperando.
  useEffect(() => {
    const onUpdate = (event: Event) => setUpdate((event as CustomEvent<ServiceWorker>).detail)
    window.addEventListener(UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(UPDATE_EVENT, onUpdate)
  }, [])
  const dismissToast = useCallback(() => setToast(null), [])
  const dismissUpdate = useCallback(() => setUpdate(null), [])

  useEffect(() => {
    saveState({ stack: stack.filter((item) => item !== "activation") }, NAV_KEY)
  }, [stack])

  useEffect(() => {
    if (synced.current || !DATA_SCREENS.includes(screen)) return
    synced.current = true
    setLoading(true)
  }, [screen])

  // El temporizador depende solo de la carga: cambiar de pestaña no lo cancela.
  useEffect(() => {
    if (!loading) return
    const timer = window.setTimeout(() => setLoading(false), SYNC_MS)
    return () => window.clearTimeout(timer)
  }, [loading])

  // Al terminar la carga, el contenido entra con un fundido corto.
  const [entering, setEntering] = useState(false)
  const wasLoading = useRef(false)
  useEffect(() => {
    if (wasLoading.current && !loading) {
      setEntering(true)
      const timer = window.setTimeout(() => setEntering(false), 420)
      wasLoading.current = loading
      return () => window.clearTimeout(timer)
    }
    wasLoading.current = loading
  }, [loading])

  // Cada pantalla recuerda su scroll al volver a ella o cambiar de pestaña.
  useLayoutEffect(() => {
    const element = document.querySelector<HTMLElement>(".screen")
    if (!element) return
    element.scrollTop = restoreScroll.current ? (scrollMemory.current[screen] ?? 0) : 0
  }, [screen, loading])

  const transactions = useMemo(
    () =>
      buildTransactions(profile).map((item) => ({
        ...item,
        category:
          categoryRules[`id:${item.id}`] ?? categoryRules[`concept:${item.concept}`] ?? item.category,
      })),
    [profile, categoryRules],
  )
  const balance = useMemo(() => accountBalance(profile, transactions), [profile, transactions])
  const activePlan = plan ?? defaultPlan(profile, 0)
  const budget = useMemo(
    () => computeBudget(transactions, activePlan, DEMO_TODAY, balance),
    [transactions, activePlan, balance],
  )
  const goalPlans = useMemo(
    () => planGoals(goals, activePlan.monthlySaving, DEMO_TODAY),
    [goals, activePlan.monthlySaving],
  )

  // Destino pedido cuya transición aún no ha terminado: si llega otro toque
  // antes, se navega desde ahí y no desde la pantalla que todavía se ve.
  const pending = useRef<Screen | null>(null)
  useEffect(() => {
    if (pending.current === screen) pending.current = null
  }, [screen])

  const navigate = useCallback(
    (next: Screen, forced?: Direction) => {
      const current = pending.current ?? screen
      if (next === current) return
      pending.current = next
      const element = document.querySelector<HTMLElement>(".screen")
      if (element) scrollMemory.current[current] = element.scrollTop
      const direction = forced ?? directionBetween(current, next)
      restoreScroll.current = direction !== "push"
      withTransition(direction, () => setStack((current) => nextStack(current, next)))
    },
    [screen],
  )
  const go = (next: Screen) => navigate(next)
  const back = useCallback(() => {
    const previous = stack[stack.length - 2]
    if (previous) navigate(previous, "none")
  }, [stack, navigate])

  useEdgeSwipe(deviceRef, LEVEL[screen] >= 2 && !loading, back)

  const app: AppData = {
    go,
    notify: (title, detail) => setToast({ title, detail, id: Date.now() }),
    userName: DEMO_USER_NAME,
    today: DEMO_TODAY,
    transactions,
    plan: activePlan,
    setPlan,
    budget,
    goals,
    setGoals,
    goalPlans,
    mainGoal: goals[0],
    selectedGoal: goals.find((goal) => goal.id === selectedGoalId) ?? goals[0],
    selectGoal: setSelectedGoalId,
    simulation,
    setSimulation,
    recategorize: (movement, category, wholeConcept) =>
      setCategoryRules((rules) => {
        const next = { ...rules }
        if (wholeConcept) {
          Object.keys(next)
            .filter((key) => key.startsWith("id:") && key.endsWith(`-${movement.concept}`))
            .forEach((key) => delete next[key])
          next[`concept:${movement.concept}`] = category
        } else next[`id:${movement.id}`] = category
        return next
      }),
  }

  const resetDemo = (nextProfile = profile) => {
    clearState()
    setProfile(nextProfile)
    setPlan(null)
    setGoals([])
    setCategoryRules({})
    setSelectedGoalId(null)
  }

  const render = (): ReactNode => {
    if (screen === "bank-home")
      return (
        <BankHome
          userName={DEMO_USER_NAME}
          balance={balance}
          budget={plan ? budget : null}
          recent={transactions.slice(0, 3)}
          profile={profile}
          onOpen={() => go(plan ? "dashboard" : "activation")}
          onHostChange={setHost}
          onProfileChange={(next) => resetDemo(next)}
          onDemoFull={() => {
            setPlan(defaultPlan(profile, profile === "estable" ? 160 : 60))
            setGoals(SAMPLE_GOALS)
            go("dashboard")
          }}
          onReset={() => resetDemo()}
        />
      )
    if (screen === "activation" || !plan)
      return (
        <Activation
          key={profile}
          transactions={transactions}
          today={DEMO_TODAY}
          balance={balance}
          userName={DEMO_USER_NAME}
          initialPlan={plan}
          hasGoals={goals.length > 0}
          onExit={() => go("bank-home")}
          onFinish={(nextPlan, goal) => {
            setPlan(nextPlan)
            if (goal) setGoals((items) => [...items, { ...goal, id: Date.now() }])
            go("dashboard")
          }}
        />
      )
    if (loading || (!synced.current && DATA_SCREENS.includes(screen)))
      return <SkeletonScreen screen={screen} go={go} />

    const screens: Partial<Record<Screen, () => ReactNode>> = {
      dashboard: () => <Dashboard />,
      movements: () => <Spending />,
      simulator: () => <Simulator />,
      goals: () => <Goals />,
      "goal-detail": () => (goals.length ? <GoalDetail /> : <Goals />),
      "create-goal": () => <GoalForm mode="create" />,
      "edit-goal": () => <GoalForm mode="edit" />,
      notifications: () => <Notifications />,
      settings: () => <Settings />,
      "settings-income": () => <IncomeSettings />,
      "settings-fixed": () => <FixedSettings />,
      "settings-saving": () => <SavingSettings />,
      "settings-categories": () => <CategorySettings />,
      calculation: () => <Calculation />,
    }
    return (screens[screen] ?? screens.dashboard!)()
  }

  return (
    <HostContext.Provider value={HOSTS[host]}>
      <AppContext.Provider value={app}>
        <div className="app-stage">
          <div
            className="device"
            ref={deviceRef}
            style={hostStyle(HOSTS[host])}
            data-entering={entering ? "" : undefined}
          >
            <div className="swipe-shade" aria-hidden="true" />
            {render()}
            {update ? (
              <Toast
                key="update"
                icon="spark"
                title="Nueva versión disponible"
                detail="Actualiza para ver los últimos cambios."
                action={{ label: "Actualizar", run: () => applyUpdate(update) }}
                onDone={dismissUpdate}
              />
            ) : (
              toast && (
                <Toast key={toast.id} title={toast.title} detail={toast.detail} onDone={dismissToast} />
              )
            )}
          </div>
        </div>
      </AppContext.Provider>
    </HostContext.Provider>
  )
}
