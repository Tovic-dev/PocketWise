import { useApp } from "../state/AppContext"
import { CATEGORIES } from "../data/categories"
import { topInsight } from "../lib/finance"
import { capitalize, formatCurrency, formatDate, monthName } from "../lib/format"
import AppShell from "../components/AppShell"
import BigAmount from "../components/BigAmount"
import { goalProgress } from "../components/GoalCard"
import Icon from "../components/Icon"
import MoneyBreakdown from "../components/MoneyBreakdown"
import MovementRow from "../components/MovementRow"
import SectionHeader from "../components/SectionHeader"
import { IconButton, Progress, Text } from "../components/ui"

const GOAL_STATUS = {
  completado: "Ya lo tienes reunido",
  "en-fecha": "Al ritmo actual llegas a tiempo",
  retrasado: "Al ritmo actual llegarías más tarde",
  "sin-ahorro": "Ahora no apartas dinero para este objetivo",
}

/**
 * Inicio, en el orden acordado: disponible real → reparto del mes → un aviso →
 * objetivo principal → próximos cargos → últimos movimientos.
 */
export default function Dashboard() {
  const { go, userName, budget, transactions, mainGoal, goalPlans, today, selectGoal } = useApp()
  const insight = topInsight(transactions, today)
  const previousMonth = monthName(new Date(today.getFullYear(), today.getMonth() - 1, 1))
  const goalPlan = mainGoal ? goalPlans.get(mainGoal.id) : undefined
  const upcoming = budget.fixedPending.slice(0, 3)
  const monthShort = new Intl.DateTimeFormat("es-ES", { month: "short" })
    .format(today)
    .replace(".", "")

  return (
    <AppShell screen="dashboard" go={go}>
      <div className="page home">
        <header className="home-header">
          <div>
            <Text className="eyebrow">{capitalize(monthName(today))}</Text>
            <Text className="h3" as="h1">
              Hola, {userName}
            </Text>
          </div>
          <IconButton name="settings" label="Ajustes" onClick={() => go("settings")} />
        </header>

        <section className="home-hero" aria-labelledby="available-label">
          <Text className="eyebrow" as="p">
            <span id="available-label">Dinero disponible real</span>
          </Text>
          <BigAmount value={budget.available} className="home-amount" memory="available" />
          <div className="home-hero-meta">
            <span>Saldo en cuenta {formatCurrency(budget.accountBalance, { round: true })}</span>
            <button className="text-link" onClick={() => go("calculation")} type="button">
              ¿De dónde sale?
            </button>
          </div>
        </section>

        <section className="home-block">
          <MoneyBreakdown budget={budget} compact />
          <p className="home-pace">
            {budget.available > 0 ? (
              <>
                Quedan <strong>{budget.daysLeft} días</strong> de mes: unos{" "}
                <strong className="num">{formatCurrency(budget.weeklyPace, { round: true })}</strong>{" "}
                por semana.
              </>
            ) : (
              "Este mes ya has usado tu margen. Lo que gastes ahora saldría de tu ahorro."
            )}
          </p>
        </section>

        {insight && (
          <button className="home-insight" onClick={() => go("movements")} type="button">
            <span className="home-insight-icon">
              <Icon name={CATEGORIES[insight.category].icon} size={20} />
            </span>
            <span className="home-insight-text">
              Llevas un {Math.abs(insight.change)} % {insight.change > 0 ? "más" : "menos"} en{" "}
              {CATEGORIES[insight.category].label.toLowerCase()} que a estas alturas de{" "}
              {previousMonth}.
            </span>
            <Icon name="arrow" size={18} />
          </button>
        )}

        <section className="home-block">
          <SectionHeader
            title="Tu objetivo"
            action={mainGoal ? "Todos" : undefined}
            onAction={() => go("goals")}
          />
          {mainGoal ? (
            <button
              className="home-goal"
              type="button"
              onClick={() => {
                selectGoal(mainGoal.id)
                go("goal-detail")
              }}
            >
              <span className="home-goal-top">
                <span className="home-goal-name">{mainGoal.name}</span>
                <span className="home-goal-pct num">{goalProgress(mainGoal)} %</span>
              </span>
              <Progress
                value={goalProgress(mainGoal)}
                tone={goalPlan?.status === "retrasado" ? "warning" : "primary"}
              />
              <span className="home-goal-meta">
                <span className="num">
                  {formatCurrency(mainGoal.saved, { round: true })} de{" "}
                  {formatCurrency(mainGoal.target, { round: true })}
                </span>
                {goalPlan && <span>{GOAL_STATUS[goalPlan.status]}</span>}
              </span>
            </button>
          ) : (
            <button className="home-empty" type="button" onClick={() => go("create-goal")}>
              <span>
                <strong>Ponle nombre a tu ahorro.</strong> Con un objetivo sabrás si una
                compra lo retrasa.
              </span>
              <Icon name="plus" size={20} />
            </button>
          )}
        </section>

        {upcoming.length > 0 && (
          <section className="home-block">
            <SectionHeader title="Próximos cargos" />
            <ul className="upcoming">
              {upcoming.map((charge) => (
                <li key={charge.id} className="upcoming-row">
                  <span className="upcoming-date">
                    <span className="upcoming-day num">{charge.day}</span>
                    <span className="upcoming-month">{monthShort}</span>
                  </span>
                  <span className="upcoming-name">{charge.concept}</span>
                  <span className="upcoming-amount num">{formatCurrency(-charge.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="home-footnote">Ya están descontados de tu dinero disponible.</p>
          </section>
        )}

        <section className="home-block">
          <SectionHeader title="Últimos movimientos" action="Ver todos" onAction={() => go("movements")} />
          <div className="movement-card">
            {transactions.slice(0, 3).map((movement) => (
              <MovementRow key={movement.id} movement={movement} />
            ))}
          </div>
          <p className="home-footnote">
            Actualizado con tu cuenta · {formatDate(transactions[0]?.date ?? "")}
          </p>
        </section>
      </div>
    </AppShell>
  )
}
