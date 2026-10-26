import type { IconName, Screen } from "../types"
import { useApp } from "../state/AppContext"
import { CATEGORIES } from "../data/categories"
import { goalDisplay, monthRange, topInsight, variableExpenses } from "../lib/finance"
import { formatCurrency, monthName } from "../lib/format"
import AppShell from "../components/AppShell"
import { goalProgress } from "../components/GoalCard"
import Icon from "../components/Icon"
import SectionHeader from "../components/SectionHeader"
import { Text } from "../components/ui"

type Notice = {
  id: string
  icon: IconName
  kind: "cargo" | "idea" | "logro" | "resumen"
  title: string
  body: string
  time: string
  action?: { label: string; screen: Screen }
}

const money = (value: number) => formatCurrency(value, { round: true })

/**
 * Avisos: alertas inteligentes, logros y el resumen mensual de la memoria.
 * Informan y contextualizan; ninguno juzga ni usa un tono de alarma.
 */
export default function Notifications() {
  const { go, transactions, today, budget, mainGoal, goalPlans, plan, selectGoal } = useApp()
  const insight = topInsight(transactions, today)
  const previous = monthRange(today, -1)
  const previousSpent = variableExpenses(transactions, plan, previous.from, previous.to).reduce(
    (sum, item) => sum - item.amount,
    0,
  )
  const previousName = monthName(previous.date)

  const recent: Notice[] = []
  budget.fixedPending
    .filter((charge) => charge.day - today.getDate() <= 7)
    .forEach((charge) =>
      recent.push({
        id: `cargo-${charge.id}`,
        icon: "calendar",
        kind: "cargo",
        title: `${charge.concept} el día ${charge.day}`,
        body: `Se cobrarán ${formatCurrency(charge.amount)}. Ya está descontado de tu dinero disponible.`,
        time: charge.day - today.getDate() <= 1 ? "Mañana" : `En ${charge.day - today.getDate()} días`,
      }),
    )
  if (insight)
    recent.push({
      id: "idea",
      icon: CATEGORIES[insight.category].icon,
      kind: "idea",
      title: "Una idea para ti",
      body: `Llevas un ${Math.abs(insight.change)} % ${insight.change > 0 ? "más" : "menos"} en ${CATEGORIES[
        insight.category
      ].label.toLowerCase()} que a estas alturas de ${previousName}.`,
      time: "Hace 2 h",
      action: { label: "Ver gastos", screen: "movements" },
    })

  const earlier: Notice[] = []
  if (mainGoal) {
    const status = goalDisplay(mainGoal, goalPlans.get(mainGoal.id))
    earlier.push({
      id: "logro",
      icon: status === "completado" ? "check" : "target",
      kind: "logro",
      title: status === "completado" ? "¡Objetivo conseguido!" : `Ya tienes el ${goalProgress(mainGoal)} %`,
      body:
        status === "completado"
          ? `Ya tienes el dinero reunido para ${mainGoal.name}.`
          : `${mainGoal.name} avanza: llevas ${money(mainGoal.saved)} de ${money(mainGoal.target)}.`,
      time: "Ayer",
      action: { label: "Ver objetivo", screen: "goal-detail" },
    })
  }
  earlier.push({
    id: "resumen",
    icon: "receipt",
    kind: "resumen",
    title: `Tu resumen de ${previousName}`,
    body: `En tu día a día gastaste ${money(previousSpent)}. Mira en qué se fue y cómo se compara con otros meses.`,
    time: `1 de ${monthName(today)}`,
    action: { label: "Ver resumen", screen: "movements" },
  })

  const renderNotice = (notice: Notice) => (
    <li key={notice.id} className={`notice ${notice.kind}`}>
      <span className="notice-icon">
        <Icon name={notice.icon} size={20} />
      </span>
      <div className="notice-body">
        <div className="notice-head">
          <strong>{notice.title}</strong>
          <span>{notice.time}</span>
        </div>
        <p>{notice.body}</p>
        {notice.action && (
          <button
            className="text-link"
            type="button"
            onClick={() => {
              if (notice.action?.screen === "goal-detail" && mainGoal) selectGoal(mainGoal.id)
              go(notice.action!.screen)
            }}
          >
            {notice.action.label} <Icon name="arrow" size={16} />
          </button>
        )}
      </div>
    </li>
  )

  return (
    <AppShell screen="notifications" go={go}>
      <div className="page notices-page">
        <header className="goals-header">
          <Text className="h1">Avisos</Text>
        </header>
        {recent.length > 0 && (
          <section className="home-block">
            <SectionHeader title="Esta semana" />
            <ul className="notice-list">{recent.map(renderNotice)}</ul>
          </section>
        )}
        <section className="home-block">
          <SectionHeader title="Antes" />
          <ul className="notice-list">{earlier.map(renderNotice)}</ul>
        </section>
        <p className="home-footnote">
          Solo te avisamos de lo que te ayuda a decidir. Puedes ajustar los avisos desde la app de tu
          banco.
        </p>
      </div>
    </AppShell>
  )
}
