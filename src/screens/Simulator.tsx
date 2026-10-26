import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useApp } from "../state/AppContext"
import {
  nextIncomeDate,
  purchaseAlternatives,
  simulatePurchase,
  type SimulationResult,
} from "../lib/finance"
import { formatCurrency, parseAmount, parseISODate } from "../lib/format"
import AppShell from "../components/AppShell"
import BigAmount from "../components/BigAmount"
import BottomSheet from "../components/BottomSheet"
import Icon from "../components/Icon"
import { Button, IconButton, Text } from "../components/ui"
import type { IconName } from "../types"

const QUICK_AMOUNTS = [20, 50, 100, 150]
const CATEGORY_OPTIONS = ["Compras", "Ocio", "Comer fuera", "Transporte", "Otros"]

const STATUS: Record<
  SimulationResult["status"],
  { title: string; icon: IconName; copy: string }
> = {
  holgado: {
    title: "Holgado",
    icon: "check",
    copy: "Te seguiría quedando margen para el resto del mes.",
  },
  ajustado: {
    title: "Ajustado",
    icon: "info",
    copy: "Cabe, pero usaría más de la mitad de lo que te queda este mes.",
  },
  comprometido: {
    title: "Comprometido",
    icon: "info",
    copy: "No cabe en tu disponible: una parte saldría de lo que apartas para ahorrar.",
  },
}

const dayFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" })
const formatDay = (value: string) => dayFormat.format(parseISODate(value))
const money = (value: number) => formatCurrency(value, { round: true })

/** Cuánto del disponible se come la compra y, si no cabe, cuánto saldría del ahorro. */
function ImpactBar({ available, result }: { available: number; result: SimulationResult }) {
  const base = Math.max(0, available)
  const scale = Math.max(base, result.amount) || 1
  const used = Math.min(result.amount, base)
  const left = Math.max(0, base - result.amount)
  const parts = [
    { key: "compra", label: "Esta compra", value: used },
    { key: "queda", label: "Te queda", value: left },
    { key: "ahorro", label: "De tu ahorro", value: result.shortfall },
  ].filter((part) => part.value > 0)
  return (
    <figure className="impact-bar">
      <div className="impact-track" aria-hidden="true">
        {parts.map((part) => (
          <span
            key={part.key}
            className={`impact-part ${part.key}`}
            style={{ flexGrow: part.value / scale }}
          />
        ))}
      </div>
      <figcaption className="impact-legend">
        {parts.map((part) => (
          <span key={part.key}>
            <span className={`impact-dot ${part.key}`} />
            {part.label} <strong className="num">{money(part.value)}</strong>
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

export default function Simulator() {
  const { go, simulation, setSimulation, budget, plan, mainGoal, goalPlans, today } = useApp()
  const [open, setOpen] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [error, setError] = useState("")
  const amountId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)

  const amount = parseAmount(simulation.amount)
  const valid = Number.isFinite(amount) && amount > 0
  const goalPlan = mainGoal ? goalPlans.get(mainGoal.id) : undefined
  const result = simulatePurchase(budget, valid ? amount : 0, goalPlan)
  const status = STATUS[result.status]
  const nextIncome = nextIncomeDate(plan, today)
  const alternatives = purchaseAlternatives(budget, result, nextIncome, money, formatDay)

  const closeSheet = useRef<() => void>(() => setOpen(false))
  const onSheetClose = useCallback(() => setOpen(false), [])
  const bindClose = useCallback((close: () => void) => {
    closeSheet.current = close
  }, [])

  useEffect(() => {
    if (open) titleRef.current?.focus()
  }, [open])

  const check = () => {
    if (!simulation.amount.trim()) return setError("Escribe cuánto cuesta.")
    if (!valid) return setError("Introduce una cantidad válida.")
    setShowAlternatives(false)
    setOpen(true)
  }

  const setAmount = (value: string) => {
    setSimulation({ ...simulation, amount: value })
    setError("")
  }

  const headline =
    result.status === "comprometido"
      ? `Te faltarían ${money(result.shortfall)} este mes.`
      : `Te quedarían ${money(result.availableAfter)} para ${budget.daysLeft} días.`

  return (
    <AppShell screen="simulator" go={go} noNav hostBar={false}>
      <div className="page simulator">
        <div className="simulator-top">
          <IconButton name="back" label="Volver" onClick={() => go("dashboard")} />
        </div>
        <Text className="h1">¿Me lo puedo permitir?</Text>
        <p className="simulator-context">
          Tienes <strong className="num">{money(budget.available)}</strong> disponibles y quedan{" "}
          {budget.daysLeft} días de mes.
        </p>

        <div className="amount-field">
          <label className="field-label" htmlFor={amountId}>
            ¿Cuánto cuesta?
          </label>
          <div className={`amount-input ${error ? "has-error" : ""}`}>
            <input
              id={amountId}
              value={simulation.amount}
              onChange={(event) => setAmount(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && check()}
              inputMode="decimal"
              placeholder="0"
              autoComplete="off"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${amountId}-error` : undefined}
            />
            <span aria-hidden="true">€</span>
          </div>
          {error && (
            <span className="error-text" id={`${amountId}-error`}>
              {error}
            </span>
          )}
          <div className="chip-row">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                className={`chip ${amount === value ? "active" : ""}`}
                onClick={() => setAmount(String(value))}
              >
                {value} €
              </button>
            ))}
          </div>
        </div>

        <div className="simulator-optional">
          <label className="field-label" htmlFor={`${amountId}-item`}>
            ¿Qué es? <span className="muted">Opcional</span>
          </label>
          <span className="input-wrap">
            <input
              id={`${amountId}-item`}
              value={simulation.item}
              onChange={(event) => setSimulation({ ...simulation, item: event.target.value })}
              placeholder="Zapatillas, un concierto, una cena…"
            />
          </span>
          <div className="chip-row" role="radiogroup" aria-label="Categoría">
            {CATEGORY_OPTIONS.map((category) => (
              <button
                key={category}
                type="button"
                role="radio"
                aria-checked={simulation.category === category}
                className={`chip ${simulation.category === category ? "active" : ""}`}
                onClick={() => setSimulation({ ...simulation, category })}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="push-bottom simulator-actions">
          <Button onClick={check}>Comprobar</Button>
          <Text className="caption muted centered">
            Es solo una simulación: no se mueve dinero. Tú decides.
          </Text>
        </div>
      </div>

      {open && (
        <BottomSheet labelledBy="sheet-title" onClose={onSheetClose} closeRef={bindClose}>
            <div className="sheet-head">
              <span className={`status-pill ${result.status}`}>
                <Icon name={status.icon} size={16} />
                {status.title}
              </span>
              <span className="sheet-item">
                {simulation.item.trim() || simulation.category} · {formatCurrency(amount)}
              </span>
            </div>
            <h2 id="sheet-title" className="sheet-title" tabIndex={-1} ref={titleRef}>
              {headline}
            </h2>
            <p className="sheet-copy">{status.copy}</p>

            <div className="sheet-change">
              <div>
                <span className="eyebrow">Disponible ahora</span>
                <BigAmount value={Math.round(budget.available)} className="sheet-amount" />
              </div>
              <Icon name="arrow" size={22} />
              <div>
                <span className="eyebrow">Después</span>
                <BigAmount
                  value={Math.round(result.availableAfter)}
                  className={`sheet-amount ${result.availableAfter < 0 ? "negative" : ""}`}
                />
              </div>
            </div>

            <ImpactBar available={budget.available} result={result} />

            <dl className="sheet-facts">
              <div>
                <dt>Ritmo semanal</dt>
                <dd className="num">
                  {money(budget.weeklyPace)} → {money(result.weeklyPaceAfter)}
                </dd>
              </div>
              {mainGoal && (
                <div>
                  <dt>{mainGoal.name}</dt>
                  <dd>
                    {result.goalDelayDays
                      ? `Se retrasaría unos ${result.goalDelayDays} días`
                      : "No se retrasa"}
                  </dd>
                </div>
              )}
            </dl>

            {showAlternatives && (
              <ul className="alternatives">
                {alternatives.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="sheet-actions">
              <Button onClick={() => go("dashboard")}>Entendido</Button>
              {alternatives.length > 0 && (
                <Button variant="secondary" onClick={() => setShowAlternatives((value) => !value)}>
                  {showAlternatives ? "Ocultar alternativas" : "Ver alternativas"}
                </Button>
              )}
              <Button variant="tertiary" onClick={() => closeSheet.current()}>
                Probar otro importe
              </Button>
            </div>
        </BottomSheet>
      )}
    </AppShell>
  )
}
