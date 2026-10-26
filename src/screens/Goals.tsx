import { useState } from "react"
import type { Goal, IconName } from "../types"
import { useApp } from "../state/AppContext"
import { computeBudget, goalDisplay, monthlyMargin, planGoals, speedUp } from "../lib/finance"
import { formatCurrency, formatDate, parseAmount, parseISODate } from "../lib/format"
import AppShell from "../components/AppShell"
import BigAmount from "../components/BigAmount"
import GoalCard, { GOAL_STATUS_COPY, GOAL_TONES, goalProgress } from "../components/GoalCard"
import Icon from "../components/Icon"
import SectionHeader from "../components/SectionHeader"
import { Button, IconButton, Text } from "../components/ui"
import { DateField, Field, focusFirstError } from "../components/fields"

const money = (value: number) => formatCurrency(value, { round: true })
const GOAL_ICONS: IconName[] = ["plane", "laptop", "shield", "home", "heart", "game", "card", "target"]
const EXTRA = 20
const TONE_NAMES: Record<string, string> = {
  terracotta: "Teja",
  slate: "Pizarra",
  olive: "Oliva",
  plum: "Ciruela",
  sand: "Arena",
  rose: "Rosa",
}
const ICON_NAMES: Partial<Record<IconName, string>> = {
  plane: "Viaje",
  laptop: "Tecnología",
  shield: "Imprevistos",
  home: "Casa",
  heart: "Salud",
  game: "Ocio",
  card: "Compras",
  target: "Otro",
}

function duration(days: number) {
  if (days >= 45) return `unos ${Math.round(days / 30.44)} meses`
  if (days >= 14) return `unas ${Math.round(days / 7)} semanas`
  return `${days} días`
}

export function Goals() {
  const { go, goals, goalPlans, selectGoal, plan } = useApp()
  const saved = goals.reduce((sum, goal) => sum + goal.saved, 0)
  return (
    <AppShell screen="goals" go={go}>
      <div className="page goals">
        <header className="goals-header">
          <Text className="h1">Objetivos</Text>
          <IconButton name="plus" label="Nuevo objetivo" onClick={() => go("create-goal")} />
        </header>
        {goals.length > 0 && (
          <section className="goals-summary">
            <Text className="eyebrow" as="p">
              Llevas ahorrado
            </Text>
            <BigAmount value={Math.round(saved)} className="goals-amount" memory="saved" />
            <p className="home-footnote">
              Para {goals.length} {goals.length === 1 ? "objetivo" : "objetivos"} · apartas{" "}
              {money(plan.monthlySaving)} al mes y lo repartimos según lo que necesita cada uno.
            </p>
          </section>
        )}
        <div className="goal-list">
          {goals.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              index={index}
              plan={goalPlans.get(goal.id)}
              onClick={() => {
                selectGoal(goal.id)
                go("goal-detail")
              }}
            />
          ))}
          <button className="goal-new" type="button" onClick={() => go("create-goal")}>
            <Icon name="plus" size={22} />
            <span>
              <strong>{goals.length ? "Nuevo objetivo" : "Crea tu primer objetivo"}</strong>
              <span>Ponle nombre, cantidad y fecha. Te decimos cuánto apartar al mes.</span>
            </span>
          </button>
        </div>
      </div>
    </AppShell>
  )
}

export function GoalDetail() {
  const { go, selectedGoal: goal, goals, goalPlans, today } = useApp()
  if (!goal) return null
  const plan = goalPlans.get(goal.id)
  const progress = goalProgress(goal)
  const status = goalDisplay(goal, plan)
  const tone = goal.tone ?? GOAL_TONES[goals.indexOf(goal) % GOAL_TONES.length]
  const faster = plan ? speedUp(plan, EXTRA, today) : null

  return (
    <AppShell screen="goal-detail" go={go} noNav hostBar={false}>
      <div className={`goal-hero-cover tone-${tone}`}>
        <div className="goal-hero-bar">
          <IconButton name="back" label="Volver" onClick={() => go("goals")} />
          <IconButton name="edit" label="Editar objetivo" onClick={() => go("edit-goal")} />
        </div>
        <span className="goal-cover-icon large">
          <Icon name={goal.icon} size={28} />
        </span>
        <Text className="h1">{goal.name}</Text>
        <div className="goal-hero-numbers">
          <span className="goal-hero-pct num">{progress} %</span>
          <span className="num">
            {money(goal.saved)} de {money(goal.target)}
          </span>
        </div>
        <span className="goal-cover-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
      </div>

      <div className="page goal-detail">
        <p className={`goal-status ${status}`}>
          {status === "completado" && <Icon name="check" size={18} />}
          {GOAL_STATUS_COPY[status]}
          {plan?.projectedDate && status !== "completado" && (
            <span>Llegarías el {formatDate(plan.projectedDate)}.</span>
          )}
        </p>

        <section className="home-block">
          <SectionHeader title="Las cuentas" />
          <dl className="facts">
            <div>
              <dt>Te faltan</dt>
              <dd className="num">{money(Math.max(0, goal.target - goal.saved))}</dd>
            </div>
            <div>
              <dt>Fecha objetivo</dt>
              <dd>{formatDate(goal.date)}</dd>
            </div>
            {plan && plan.remaining > 0 && (
              <>
                <div>
                  <dt>Para llegar a tiempo</dt>
                  <dd className="num">{money(plan.needed)}/mes</dd>
                </div>
                <div>
                  <dt>Le dedicas ahora</dt>
                  <dd className="num">{money(plan.contribution)}/mes</dd>
                </div>
              </>
            )}
          </dl>
        </section>

        {faster && (
          <aside className="goal-tip">
            <Icon name="spark" size={20} />
            <p>
              {faster.days === null
                ? `Si le dedicas ${EXTRA} € al mes, llegarías el ${formatDate(faster.date)}.`
                : `Si apartas ${EXTRA} € más al mes, llegarías ${duration(faster.days)} antes, el ${formatDate(faster.date)}.`}
            </p>
          </aside>
        )}

        <p className="home-footnote">
          Tu ahorro mensual se reparte entre tus objetivos según lo que necesita cada uno para
          llegar a tiempo. Puedes cambiarlo en Ajustes.
        </p>
      </div>
    </AppShell>
  )
}

export function GoalForm({ mode }: { mode: "create" | "edit" }) {
  const { go, selectedGoal, goals, setGoals, notify, selectGoal, plan, setPlan, transactions, today, budget } =
    useApp()
  const initial = mode === "edit" ? selectedGoal : undefined
  const [name, setName] = useState(initial?.name ?? "")
  const [amount, setAmount] = useState(initial ? formatCurrency(initial.target) : "")
  const [date, setDate] = useState(initial?.date ?? "")
  const [icon, setIcon] = useState<IconName>(initial?.icon ?? "target")
  const [tone, setTone] = useState(initial?.tone ?? GOAL_TONES[goals.length % GOAL_TONES.length])
  const [raiseSaving, setRaiseSaving] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const target = parseAmount(amount)
  const validAmount = Number.isFinite(target) && target > 0
  const months = date
    ? Math.max(1, (parseISODate(date).getTime() - today.getTime()) / 86_400_000 / 30.44)
    : 0
  const needed = validAmount && months ? Math.ceil(target / months) : 0
  const margin = monthlyMargin(plan)
  const raised = Math.min(plan.monthlySaving + needed, Math.max(0, margin))
  const budgetAfter = computeBudget(
    transactions,
    { ...plan, monthlySaving: raised },
    today,
    budget.accountBalance,
  )
  const draft: Goal = { id: -1, name, target: validAmount ? target : 0, saved: 0, date, icon, tone }
  const othersDelayed = needed
    ? [...planGoals([...goals, draft], plan.monthlySaving, today).entries()].filter(
        ([id, item]) => id !== -1 && item.status === "retrasado",
      ).length
    : 0

  const submit = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = "Escribe el nombre del objetivo."
    if (!amount.trim()) next.amount = "Introduce una cantidad."
    else if (!validAmount) next.amount = "Introduce una cantidad válida."
    if (!date.trim()) next.date = "Introduce una fecha."
    setErrors(next)
    if (Object.keys(next).length) {
      focusFirstError()
      return
    }
    if (initial) {
      setGoals((items) =>
        items.map((item) =>
          item.id === initial.id ? { ...item, name: name.trim(), target, date, icon, tone } : item,
        ),
      )
      notify("Objetivo actualizado", `${name.trim()} · ${formatCurrency(target)}`)
      go("goal-detail")
      return
    }
    const created: Goal = { ...draft, id: Date.now(), name: name.trim() }
    setGoals((items) => [...items, created])
    if (raiseSaving && needed) setPlan({ ...plan, monthlySaving: raised })
    selectGoal(created.id)
    notify("Objetivo creado", `${created.name} · ${formatCurrency(created.target)}`)
    go("goals")
  }

  const remove = () => {
    if (!initial) return
    setGoals((items) => items.filter((item) => item.id !== initial.id))
    notify("Objetivo eliminado", initial.name)
    go("goals")
  }

  return (
    <AppShell screen={mode === "edit" ? "edit-goal" : "create-goal"} go={go} noNav hostBar={false}>
      <div className="page goal-form">
        <div className="simulator-top">
          <IconButton
            name="back"
            label="Volver"
            onClick={() => go(mode === "edit" ? "goal-detail" : "goals")}
          />
        </div>
        <Text className="h1">{mode === "edit" ? "Editar objetivo" : "Nuevo objetivo"}</Text>

        <div className={`goal-preview tone-${tone}`} aria-hidden="true">
          <span className="goal-cover-icon">
            <Icon name={icon} size={22} />
          </span>
          <span className="goal-cover-name">{name.trim() || "Tu objetivo"}</span>
          <span className="goal-cover-amounts num">
            {validAmount ? money(target) : "0 €"}
            {date && ` · ${formatDate(date)}`}
          </span>
        </div>

        <div className="form-stack">
          <Field
            label="¿Qué quieres conseguir?"
            value={name}
            onChange={setName}
            placeholder="Viaje a Italia"
            name="goal-name"
            error={errors.name}
          />
          <Field
            label="¿Cuánto necesitas?"
            value={amount}
            onChange={setAmount}
            placeholder="1.200 €"
            name="goal-amount"
            inputMode="decimal"
            error={errors.amount}
          />
          <DateField label="¿Para cuándo?" value={date} onChange={setDate} name="goal-date" error={errors.date} />
          <fieldset className="cover-picker">
            <legend className="field-label">Portada</legend>
            <div className="cover-row" role="radiogroup" aria-label="Color">
              {GOAL_TONES.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={tone === item}
                  aria-label={TONE_NAMES[item]}
                  className={`cover-swatch tone-${item} ${tone === item ? "active" : ""}`}
                  onClick={() => setTone(item)}
                />
              ))}
            </div>
            <div className="cover-row" role="radiogroup" aria-label="Icono">
              {GOAL_ICONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="radio"
                  aria-checked={icon === item}
                  aria-label={ICON_NAMES[item]}
                  className={`cover-icon ${icon === item ? "active" : ""}`}
                  onClick={() => setIcon(item)}
                >
                  <Icon name={item} size={20} />
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {mode === "create" && needed > 0 && (
          <section className="goal-impact">
            <SectionHeader title="Cómo afecta a tu mes" />
            <p className="small">
              Para llegar a tiempo necesitas apartar unos <strong>{money(needed)} al mes</strong>.
            </p>
            <div className="impact-choices" role="radiogroup" aria-label="De dónde sale el ahorro">
              <button
                type="button"
                role="radio"
                aria-checked={raiseSaving}
                className={`impact-choice ${raiseSaving ? "active" : ""}`}
                onClick={() => setRaiseSaving(true)}
              >
                <strong>Apartar {money(raised - plan.monthlySaving)} más al mes</strong>
                <span>
                  Tu dinero disponible real pasaría de {money(budget.available)} a{" "}
                  {money(budgetAfter.available)}.
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={!raiseSaving}
                className={`impact-choice ${!raiseSaving ? "active" : ""}`}
                onClick={() => setRaiseSaving(false)}
              >
                <strong>Mantener mi ahorro en {money(plan.monthlySaving)}</strong>
                <span>
                  Tu disponible no cambia, pero el ahorro se repartiría entre más objetivos
                  {othersDelayed > 0
                    ? ` y ${othersDelayed === 1 ? "otro objetivo iría" : `${othersDelayed} objetivos irían`} con retraso.`
                    : "."}
                </span>
              </button>
            </div>
          </section>
        )}

        <div className="push-bottom goal-form-actions">
          <Button onClick={submit}>{mode === "edit" ? "Guardar cambios" : "Crear objetivo"}</Button>
          {mode === "edit" &&
            (confirmDelete ? (
              <div className="delete-confirm">
                <p className="small">¿Seguro? Se borra el objetivo, pero no se mueve dinero.</p>
                <Button variant="danger" onClick={remove}>
                  Sí, eliminar
                </Button>
                <Button variant="tertiary" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button variant="tertiary" onClick={() => setConfirmDelete(true)}>
                Eliminar objetivo
              </Button>
            ))}
        </div>
      </div>
    </AppShell>
  )
}
