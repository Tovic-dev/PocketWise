import { useCallback, useEffect, useRef, useState } from "react"
import type { Category, Transaction } from "../types"
import { useApp } from "../state/AppContext"
import { CATEGORIES } from "../data/categories"
import {
  monthRange,
  monthlyVariable,
  spendingInsights,
  totalsByCategory,
  variableExpenses,
} from "../lib/finance"
import { capitalize, formatCurrency, formatRelativeDay, monthName } from "../lib/format"
import AppShell from "../components/AppShell"
import BigAmount from "../components/BigAmount"
import CategoryBento, { bentoItems, type BentoItem } from "../components/CategoryBento"
import BottomSheet from "../components/BottomSheet"
import Icon from "../components/Icon"
import MonthBars from "../components/MonthBars"
import MovementRow from "../components/MovementRow"
import SectionHeader from "../components/SectionHeader"
import { Button, IconButton, Text } from "../components/ui"

const HISTORY = 6
const LABELS = Object.fromEntries(
  Object.entries(CATEGORIES).map(([key, value]) => [key, value.label]),
) as Record<Category, string>
const EXPENSE_CATEGORIES = (Object.keys(CATEGORIES) as Category[]).filter(
  (category) => category !== "ingresos",
)
const money = (value: number) => formatCurrency(value, { round: true })

/** La categorización automática falla a veces: el usuario puede corregirla. */
function CategorySheet({
  movement,
  onClose,
  onSave,
}: {
  movement: Transaction
  onClose: () => void
  onSave: (category: Category, wholeConcept: boolean) => void
}) {
  const [category, setCategory] = useState(movement.category)
  const [wholeConcept, setWholeConcept] = useState(true)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const options = movement.amount > 0 ? (["ingresos"] as Category[]) : EXPENSE_CATEGORIES

  const closeSheet = useRef<() => void>(onClose)
  const bindClose = useCallback((close: () => void) => {
    closeSheet.current = close
  }, [])

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <BottomSheet labelledBy="category-title" onClose={onClose} closeRef={bindClose}>
        <h2 id="category-title" className="sheet-title" tabIndex={-1} ref={titleRef}>
          ¿En qué categoría va {movement.concept}?
        </h2>
        <div className="category-options" role="radiogroup" aria-label="Categoría">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={category === option}
              className={`category-option ${category === option ? "active" : ""}`}
              onClick={() => setCategory(option)}
            >
              <Icon name={CATEGORIES[option].icon} size={18} />
              {CATEGORIES[option].label}
            </button>
          ))}
        </div>
        <label className="toggle-line">
          <input
            type="checkbox"
            checked={wholeConcept}
            onChange={(event) => setWholeConcept(event.target.checked)}
          />
          <span>Aplicar a todos los movimientos de {movement.concept}</span>
        </label>
        <div className="sheet-actions">
          <Button
            onClick={() => {
              onSave(category, wholeConcept)
              closeSheet.current()
            }}
          >
            Guardar
          </Button>
          <Button variant="tertiary" onClick={() => closeSheet.current()}>
            Cancelar
          </Button>
        </div>
    </BottomSheet>
  )
}

/**
 * Gastos: movimientos y análisis en una sola pestaña. Orden: mes → en qué se va
 * (bento) → cómo evoluciona (barras) → frases → movimientos por día.
 */
export default function Spending() {
  const { go, transactions, plan, today, notify, recategorize } = useApp()
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState<BentoItem | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const closeEditor = useCallback(() => setEditing(null), [])

  const range = monthRange(today, offset)
  const previousMonth = monthName(new Date(range.date.getFullYear(), range.date.getMonth() - 1, 1))
  const months = monthlyVariable(transactions, plan, today, HISTORY)
  const variable = variableExpenses(transactions, plan, range.from, range.to)
  const variableTotal = variable.reduce((sum, item) => sum - item.amount, 0)
  const inMonth = transactions.filter((item) => item.date >= range.from && item.date <= range.to)
  const fixedTotal =
    inMonth.filter((item) => item.amount < 0).reduce((sum, item) => sum - item.amount, 0) -
    variableTotal
  const items = bentoItems(totalsByCategory(variable))
  const insights = spendingInsights(
    transactions,
    plan,
    range,
    LABELS,
    money,
    range.current ? `a estas alturas de ${previousMonth}` : `en ${previousMonth}`,
  )

  const visible = filter
    ? variable.filter((item) => filter.categories.includes(item.category))
    : inMonth
  const days = new Map<string, Transaction[]>()
  visible.forEach((item) => days.set(item.date, [...(days.get(item.date) ?? []), item]))

  const changeMonth = (next: number) => {
    setOffset(next)
    setFilter(null)
  }
  const label = capitalize(monthName(range.date))

  return (
    <AppShell screen="movements" go={go}>
      <div className="page spending">
        <header className="spending-header">
          <Text className="h1">Gastos</Text>
          <div className="month-switch">
            <IconButton
              name="back"
              label="Mes anterior"
              onClick={() => offset > -(HISTORY - 1) && changeMonth(offset - 1)}
            />
            <span className="month-switch-label" aria-live="polite">
              {label}
              {range.current && <span className="muted"> · en curso</span>}
            </span>
            <span className={`month-next ${offset === 0 ? "disabled" : ""}`}>
              <IconButton
                name="arrow"
                label="Mes siguiente"
                onClick={() => offset < 0 && changeMonth(offset + 1)}
              />
            </span>
          </div>
        </header>

        <section className="spending-summary">
          <Text className="eyebrow" as="p">
            Tu día a día {range.current ? "este mes" : `en ${monthName(range.date)}`}
          </Text>
          <BigAmount value={Math.round(variableTotal)} className="spending-amount" memory="spent" />
          <p className="home-footnote">
            Además, {money(fixedTotal)} en gastos fijos (alquiler, recibos, suscripciones).
          </p>
        </section>

        <section className="home-block">
          <SectionHeader title="En qué se va" />
          {items.length ? (
            <>
              <CategoryBento items={items} selected={filter?.key ?? null} onSelect={setFilter} />
              <p className="home-footnote">Toca un bloque para ver solo sus movimientos.</p>
            </>
          ) : (
            <p className="home-footnote">Este mes todavía no hay gastos del día a día.</p>
          )}
        </section>

        <section className="home-block">
          <SectionHeader title="Cómo evoluciona" />
          <MonthBars months={months} selected={range.key} onSelect={changeMonth} />
          <p className="home-footnote">
            Gasto del día a día por mes. La barra rayada es {monthName(today)}, que va por el día{" "}
            {today.getDate()}.
          </p>
        </section>

        {insights.length > 0 && (
          <section className="home-block">
            <SectionHeader title="Lo que vemos" />
            <ul className="insight-list">
              {insights.map((sentence) => (
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="home-block">
          <SectionHeader title="Movimientos">
            {filter && (
              <button className="filter-chip" type="button" onClick={() => setFilter(null)}>
                {filter.label}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Quitar filtro</span>
              </button>
            )}
          </SectionHeader>
          {[...days.entries()].map(([date, list]) => {
            const spent = list.filter((item) => item.amount < 0).reduce((sum, item) => sum - item.amount, 0)
            return (
              <div className="day-group" key={date}>
                <div className="day-header">
                  <span>{capitalize(formatRelativeDay(date, today))}</span>
                  {spent > 0 && <span className="num">{formatCurrency(-spent)}</span>}
                </div>
                {list.map((movement) => (
                  <MovementRow
                    key={movement.id}
                    movement={movement}
                    showDate={false}
                    onClick={() => setEditing(movement)}
                  />
                ))}
              </div>
            )
          })}
          <p className="home-footnote">Toca un movimiento para cambiar su categoría.</p>
        </section>
      </div>

      {editing && (
        <CategorySheet
          movement={editing}
          onClose={closeEditor}
          onSave={(category, wholeConcept) => {
            recategorize(editing, category, wholeConcept)
            notify(
              "Categoría cambiada",
              `${editing.concept} · ${CATEGORIES[category].label}${wholeConcept ? " (todos)" : ""}`,
            )
          }}
        />
      )}
    </AppShell>
  )
}
