import { useEffect, useMemo, useState } from "react"
import type { Goal, IconName, Plan, RecurringCharge, Transaction } from "../types"
import { computeBudget, detectIncome, detectRecurring, monthlyMargin } from "../lib/finance"
import { formatCurrency, parseAmount, roundCents } from "../lib/format"
import { withTransition } from "../lib/navigation"
import { useHost } from "../theme/HostContext"
import Icon from "../components/Icon"
import ChargeRow from "../components/ChargeRow"
import MoneyBreakdown from "../components/MoneyBreakdown"
import { Button, IconButton, Text } from "../components/ui"
import { DateField, Field, focusFirstError } from "../components/fields"

type Step = "intro" | "analyzing" | "detected" | "saving" | "reveal"

const ANALYSIS = [
  "Buscando tus ingresos",
  "Detectando pagos que se repiten",
  "Ordenando tu gasto del día a día",
]

const GOAL_IDEAS: { name: string; icon: IconName }[] = [
  { name: "Un viaje", icon: "plane" },
  { name: "Un portátil", icon: "laptop" },
  { name: "Colchón para imprevistos", icon: "shield" },
]

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(active ? 0 : target)
  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 1100)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, active])
  return value
}

function StepHeader({
  step,
  total,
  onBack,
}: {
  step: number
  total: number
  onBack: () => void
}) {
  return (
    <div className="activation-header">
      <IconButton name="back" label="Volver" onClick={onBack} />
      <span className="activation-step">
        Paso {step} de {total}
      </span>
      <span className="topbar-space" />
    </div>
  )
}

export default function Activation({
  transactions,
  today,
  balance,
  userName,
  initialPlan,
  hasGoals,
  onExit,
  onFinish,
}: {
  transactions: Transaction[]
  today: Date
  balance: number
  userName: string
  initialPlan: Plan | null
  hasGoals: boolean
  onExit: () => void
  onFinish: (plan: Plan, goal: Omit<Goal, "id"> | null) => void
}) {
  const host = useHost()
  const detectedIncome = useMemo(() => detectIncome(transactions, today), [transactions, today])
  const [step, setStep] = useState<Step>("intro")
  const ORDER: Step[] = ["intro", "analyzing", "detected", "saving", "reveal"]
  const goStep = (next: Step) =>
    withTransition(ORDER.indexOf(next) > ORDER.indexOf(step) ? "push" : "pop", () => setStep(next))
  const [income, setIncome] = useState(initialPlan?.income ?? detectedIncome.amount)
  const [incomeText, setIncomeText] = useState(formatCurrency(income))
  const [editingIncome, setEditingIncome] = useState(detectedIncome.variable)
  const [charges, setCharges] = useState<RecurringCharge[]>(
    () => initialPlan?.charges ?? detectRecurring(transactions, today),
  )
  const margin = monthlyMargin({ income, charges })
  const [saving, setSaving] = useState(
    () => initialPlan?.monthlySaving ?? Math.min(margin, Math.round((income * 0.1) / 10) * 10),
  )
  const [addingGoal, setAddingGoal] = useState(false)
  const [goalName, setGoalName] = useState("")
  const [goalIcon, setGoalIcon] = useState<IconName>("target")
  const [goalAmount, setGoalAmount] = useState("")
  const [goalDate, setGoalDate] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    document.querySelector(".screen")?.scrollTo({ top: 0 })
  }, [step])

  // Análisis de la cuenta: tres pasos que se van completando antes de mostrar
  // lo detectado. Con «reducir movimiento» se acorta.
  const [analysisStep, setAnalysisStep] = useState(0)
  useEffect(() => {
    if (step !== "analyzing") return
    setAnalysisStep(0)
    const pace = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 150 : 520
    const timers = ANALYSIS.map((_, index) =>
      window.setTimeout(() => setAnalysisStep(index + 1), pace * (index + 1)),
    )
    timers.push(
      window.setTimeout(() => withTransition("fade", () => setStep("detected")), pace * (ANALYSIS.length + 1)),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [step])

  const plan: Plan = {
    income,
    incomeVariable: detectedIncome.variable,
    incomeDay: detectedIncome.sources[0]?.day,
    charges,
    monthlySaving: Math.min(saving, Math.max(0, margin)),
  }
  const budget = computeBudget(transactions, plan, today, balance)
  const shown = useCountUp(budget.available, step === "reveal")
  const fixedTotal = charges
    .filter((charge) => charge.confirmed)
    .reduce((total, charge) => total + charge.amount, 0)

  const confirmIncome = () => {
    const parsed = parseAmount(incomeText)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setErrors({ income: "Introduce una cantidad válida." })
      focusFirstError()
      return false
    }
    setIncome(roundCents(parsed))
    setErrors({})
    return true
  }

  const toSaving = () => {
    if (editingIncome && !confirmIncome()) return
    setSaving((value) => Math.min(value, Math.max(0, monthlyMargin({ income, charges }))))
    goStep("saving")
  }

  const toReveal = () => {
    if (addingGoal) {
      const next: Record<string, string> = {}
      const amount = parseAmount(goalAmount)
      if (!goalName.trim()) next.goalName = "Escribe qué quieres conseguir."
      if (!Number.isFinite(amount) || amount <= 0) next.goalAmount = "Introduce una cantidad válida."
      if (!goalDate) next.goalDate = "Elige una fecha."
      setErrors(next)
      if (Object.keys(next).length) {
        focusFirstError()
        return
      }
    }
    goStep("reveal")
  }

  const finish = () => {
    const goal = addingGoal
      ? {
          name: goalName.trim(),
          target: parseAmount(goalAmount),
          saved: 0,
          date: goalDate,
          icon: goalIcon,
        }
      : null
    onFinish(plan, goal)
  }

  if (step === "intro")
    return (
      <main className="screen screen-full activation">
        <div className="page activation-page">
          <div className="activation-header">
            <button className="host-back" onClick={onExit} type="button">
              <Icon name="back" size={18} />
              <span>{host.name}</span>
            </button>
          </div>
          <div className="activation-intro">
            <Text className="eyebrow">PocketWise</Text>
            <Text className="h1 serif-display">
              Hola, {userName}. Vamos a ver cuánto tienes disponible de verdad.
            </Text>
            <Text className="body-large muted">
              Tu banco te enseña tu saldo. Nosotros te enseñamos lo que queda libre
              después de tus pagos fijos y de lo que quieres ahorrar.
            </Text>
          </div>
          <div className="intro-figure" aria-hidden="true">
            <div className="intro-row">
              <span>Saldo en cuenta</span>
              <span className="num">{formatCurrency(balance, { round: true })}</span>
            </div>
            <div className="intro-bar">
              <span className="seg fijos" />
              <span className="seg ahorro" />
              <span className="seg gastado" />
              <span className="seg disponible" />
            </div>
            <div className="intro-row strong">
              <span>Dinero disponible real</span>
              <span>¿?</span>
            </div>
          </div>
          <div className="push-bottom activation-actions">
            <Button onClick={() => goStep("analyzing")}>Empezar</Button>
            <Text className="caption muted centered">
              Usaremos los movimientos de tus últimos 3 meses. No movemos dinero ni
              compartimos tus datos fuera de {host.name}.
            </Text>
          </div>
        </div>
      </main>
    )

  if (step === "analyzing")
    return (
      <main className="screen screen-full activation">
        <div className="page activation-page analyzing" role="status" aria-live="polite">
          <div className="analyzing-mark" aria-hidden="true">
            <span className="seg fijos" />
            <span className="seg ahorro" />
            <span className="seg gastado" />
            <span className="seg disponible" />
          </div>
          <Text className="h2">Analizando tus últimos 3 meses</Text>
          <ul className="analysis-steps">
            {ANALYSIS.map((label, index) => (
              <li key={label} className={analysisStep > index ? "done" : analysisStep === index ? "active" : ""}>
                <span className="analysis-check" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </main>
    )

  if (step === "detected")
    return (
      <main className="screen screen-full activation">
        <div className="page activation-page">
          <StepHeader step={1} total={2} onBack={() => goStep("intro")} />
          <div className="setup-heading">
            <Text className="h1">Esto es lo que vemos en tu cuenta</Text>
            <Text className="body muted">
              Revisa que esté bien. Con esto calculamos tu dinero disponible real.
            </Text>
          </div>

          <section className="activation-section">
            <Text className="section-label" as="h2">
              Lo que entra cada mes
            </Text>
            {detectedIncome.variable ? (
              <div className="detected-note">
                <Icon name="info" size={20} />
                <Text className="small">
                  Tus ingresos cambian de un mes a otro (entre{" "}
                  {formatCurrency(detectedIncome.range[0], { round: true })} y{" "}
                  {formatCurrency(detectedIncome.range[1], { round: true })}). Usaremos la
                  media de los últimos 3 meses. Puedes ajustarla.
                </Text>
              </div>
            ) : (
              <div className="income-sources">
                {detectedIncome.sources.map((source) => (
                  <div className="charge-row on is-static" key={source.concept}>
                    <span className="charge-icon income">
                      <Icon name="salary" size={20} />
                    </span>
                    <span className="charge-info">
                      <span className="body-medium">{source.concept}</span>
                      <span className="caption muted">Día {source.day} · los últimos 3 meses</span>
                    </span>
                    <span className="charge-amount num">{formatCurrency(source.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {editingIncome ? (
              <Field
                label="Ingresos al mes"
                value={incomeText}
                onChange={(value) => {
                  setIncomeText(value)
                  setErrors({})
                }}
                onBlur={confirmIncome}
                name="income"
                inputMode="decimal"
                error={errors.income}
              />
            ) : (
              <Button variant="tertiary" onClick={() => setEditingIncome(true)}>
                ¿No es correcto? Cambiar importe
              </Button>
            )}
          </section>

          <section className="activation-section">
            <div className="section-label-row">
              <Text className="section-label" as="h2">
                Pagos que se repiten
              </Text>
              <Text className="small-medium num">{formatCurrency(fixedTotal)}/mes</Text>
            </div>
            <Text className="small muted">
              Marca los que son gastos fijos. Los apartamos antes de calcular tu disponible.
            </Text>
            <div className="charge-list">
              {charges.map((charge) => (
                <ChargeRow
                  key={charge.id}
                  charge={charge}
                  onToggle={() =>
                    setCharges((items) =>
                      items.map((item) =>
                        item.id === charge.id ? { ...item, confirmed: !item.confirmed } : item,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </section>

          <div className="push-bottom">
            <Button onClick={toSaving}>Confirmar</Button>
          </div>
        </div>
      </main>
    )

  if (step === "saving") {
    const suggestions = [0.05, 0.1, 0.2]
      .map((share) => Math.round((income * share) / 10) * 10)
      .filter((value, index, list) => value <= margin && list.indexOf(value) === index)
    return (
      <main className="screen screen-full activation">
        <div className="page activation-page">
          <StepHeader step={2} total={2} onBack={() => goStep("detected")} />
          <div className="setup-heading">
            <Text className="h1">¿Cuánto quieres apartar cada mes?</Text>
            <Text className="body muted">
              Lo descontamos antes de calcular tu disponible, para que ahorrar no
              dependa de lo que sobre a fin de mes.
            </Text>
          </div>

          <div className="saving-picker">
            <label className="saving-amount num" htmlFor="saving-range">
              {formatCurrency(plan.monthlySaving, { round: true })}
              <span className="saving-unit">al mes</span>
            </label>
            <input
              id="saving-range"
              type="range"
              min={0}
              max={Math.max(0, Math.floor(margin / 10) * 10)}
              step={10}
              value={plan.monthlySaving}
              onChange={(event) => setSaving(Number(event.target.value))}
            />
            <div className="chip-row">
              {suggestions.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip ${plan.monthlySaving === value ? "active" : ""}`}
                  onClick={() => setSaving(value)}
                >
                  {formatCurrency(value)}
                </button>
              ))}
            </div>
            <Text className="small muted">
              Te quedarían {formatCurrency(Math.max(0, margin - plan.monthlySaving), { round: true })}{" "}
              al mes para tu día a día, después de tus gastos fijos.
            </Text>
          </div>

          {!hasGoals && (
            <section className="activation-section">
              {addingGoal ? (
                <>
                  <div className="section-label-row">
                    <Text className="section-label" as="h2">
                      Tu primer objetivo
                    </Text>
                    <Button variant="tertiary" onClick={() => setAddingGoal(false)}>
                      Quitar
                    </Button>
                  </div>
                  <div className="chip-row">
                    {GOAL_IDEAS.map((idea) => (
                      <button
                        key={idea.name}
                        type="button"
                        className={`chip ${goalName === idea.name ? "active" : ""}`}
                        onClick={() => {
                          setGoalName(idea.name)
                          setGoalIcon(idea.icon)
                        }}
                      >
                        {idea.name}
                      </button>
                    ))}
                  </div>
                  <div className="form-stack">
                    <Field
                      label="¿Qué quieres conseguir?"
                      value={goalName}
                      onChange={setGoalName}
                      placeholder="Viaje a Italia"
                      name="goal-name"
                      error={errors.goalName}
                    />
                    <Field
                      label="¿Cuánto necesitas?"
                      value={goalAmount}
                      onChange={setGoalAmount}
                      placeholder="1.200 €"
                      name="goal-amount"
                      inputMode="decimal"
                      error={errors.goalAmount}
                    />
                    <DateField
                      label="¿Para cuándo?"
                      value={goalDate}
                      onChange={setGoalDate}
                      name="goal-date"
                      error={errors.goalDate}
                    />
                  </div>
                </>
              ) : (
                <button className="add-goal-row" type="button" onClick={() => setAddingGoal(true)}>
                  <span className="charge-icon">
                    <Icon name="target" size={20} />
                  </span>
                  <span className="charge-info">
                    <span className="body-medium">Añadir un objetivo</span>
                    <span className="caption muted">Opcional. Puedes hacerlo más tarde.</span>
                  </span>
                  <Icon name="plus" size={20} />
                </button>
              )}
            </section>
          )}

          <div className="push-bottom">
            <Button onClick={toReveal}>Calcular mi disponible</Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="screen screen-full activation reveal">
      <div className="page activation-page">
        <div className="reveal-hero">
          <Text className="eyebrow">Tu dinero disponible real</Text>
          <Text className="reveal-amount num" as="h1">
            {formatCurrency(Math.round(shown))}
          </Text>
          <Text className="body muted">
            Saldo en cuenta: {formatCurrency(budget.accountBalance, { round: true })}
          </Text>
        </div>
        <MoneyBreakdown budget={budget} />
        <Text className="body reveal-pace">
          {budget.available > 0
            ? `Quedan ${budget.daysLeft} días de mes: unos ${formatCurrency(budget.weeklyPace, { round: true })} por semana.`
            : "Este mes ya has usado tu margen. Lo que gastes a partir de ahora saldría de tu ahorro."}
        </Text>
        <div className="push-bottom">
          <Button onClick={finish}>Ir a PocketWise</Button>
        </div>
      </div>
    </main>
  )
}
