import type { Goal } from "../types"
import { goalDisplay, type GoalPlan } from "../lib/finance"
import { formatCurrency } from "../lib/format"
import Icon from "./Icon"

export function goalProgress(goal: Goal) {
  return Math.min(100, Math.round((goal.saved / goal.target) * 100))
}

export const GOAL_STATUS_COPY = {
  completado: "Ya lo tienes reunido",
  casi: "Te queda muy poco",
  retrasado: "Al ritmo actual llegarías más tarde",
  activo: "Al ritmo actual llegas a tiempo",
  "sin-ahorro": "Ahora no apartas dinero para este objetivo",
}

const GOAL_BADGE = {
  completado: "Conseguido",
  casi: "Casi",
  retrasado: "Retrasado",
  activo: "En fecha",
  "sin-ahorro": "Sin ahorro",
}

export const GOAL_TONES = ["terracotta", "slate", "olive", "plum", "sand", "rose"]

/** Tarjeta-portada: el color y el icono del objetivo hacen el ahorro tangible. */
export default function GoalCard({
  goal,
  plan,
  index = 0,
  onClick,
}: {
  goal: Goal
  plan?: GoalPlan
  index?: number
  onClick: () => void
}) {
  const progress = goalProgress(goal)
  const status = goalDisplay(goal, plan)
  const tone = goal.tone ?? GOAL_TONES[index % GOAL_TONES.length]
  return (
    <button className={`goal-cover tone-${tone}`} onClick={onClick} type="button">
      <span className="goal-cover-top">
        <span className="goal-cover-icon">
          <Icon name={goal.icon} size={22} />
        </span>
        <span className={`goal-badge ${status}`}>
          {status === "completado" && <Icon name="check" size={14} />}
          {GOAL_BADGE[status]}
        </span>
      </span>
      <span className="goal-cover-name">{goal.name}</span>
      <span className="goal-cover-row">
        <span className="goal-cover-pct num">{progress} %</span>
        <span className="goal-cover-amounts num">
          {formatCurrency(goal.saved, { round: true })} de {formatCurrency(goal.target, { round: true })}
        </span>
      </span>
      <span className="goal-cover-track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </span>
      {plan && plan.contribution > 0 && status !== "completado" && (
        <span className="goal-cover-meta">
          Le dedicas {formatCurrency(plan.contribution, { round: true })} al mes
        </span>
      )}
    </button>
  )
}
