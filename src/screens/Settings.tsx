import { useState, type ReactNode } from "react"
import { useApp } from "../state/AppContext"
import { monthlyMargin } from "../lib/finance"
import { formatCurrency, parseAmount, roundCents } from "../lib/format"
import AppShell from "../components/AppShell"
import ChargeRow from "../components/ChargeRow"
import MoneyBreakdown from "../components/MoneyBreakdown"
import PageHeader from "../components/PageHeader"
import SectionHeader from "../components/SectionHeader"
import Icon from "../components/Icon"
import { Button, Text } from "../components/ui"
import { Field, focusFirstError } from "../components/fields"

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="home-block">
      <SectionHeader title={title} />
      <div className="setting-list">{children}</div>
    </section>
  )
}

function InfoRow({
  label,
  value,
  onClick,
}: {
  icon?: string
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button className="setting-row" type="button" onClick={onClick}>
      <span className="setting-label">{label}</span>
      {value && <span className="setting-value num">{value}</span>}
      <Icon name="arrow" size={18} />
    </button>
  )
}

export function Settings() {
  const { go, plan } = useApp()
  const fixed = plan.charges.filter((charge) => charge.confirmed)
  return (
    <AppShell screen="settings" go={go} noNav>
      <div className="page settings">
        <PageHeader title="Ajustes" back={() => go("dashboard")} />
        <Section title="Tu cálculo">
          <InfoRow
            icon="salary"
            label="Ingresos al mes"
            value={formatCurrency(plan.income, { round: true })}
            onClick={() => go("settings-income")}
          />
          <InfoRow
            icon="repeat"
            label="Pagos fijos"
            value={`${fixed.length} ${fixed.length === 1 ? "pago" : "pagos"} · ${formatCurrency(
              fixed.reduce((total, charge) => total + charge.amount, 0),
              { round: true },
            )}`}
            onClick={() => go("settings-fixed")}
          />
          <InfoRow
            icon="target"
            label="Ahorro mensual"
            value={formatCurrency(plan.monthlySaving, { round: true })}
            onClick={() => go("settings-saving")}
          />
          <InfoRow icon="info" label="Cómo calculamos tu disponible" onClick={() => go("calculation")} />
        </Section>
        <Section title="Preferencias">
          <InfoRow icon="categories" label="Categorías" onClick={() => go("settings-categories")} />
          <InfoRow icon="bell" label="Avisos" onClick={() => go("notifications")} />
        </Section>
        <Section title="Tu cuenta">
          <p className="home-footnote setting-note">
            Tus datos personales, tu seguridad y tu privacidad se gestionan desde la app
            de tu banco.
          </p>
          <InfoRow icon="repeat" label="Repetir la configuración inicial" onClick={() => go("activation")} />
        </Section>
      </div>
    </AppShell>
  )
}

export function IncomeSettings() {
  const { go, plan, setPlan, notify } = useApp()
  const [value, setValue] = useState(formatCurrency(plan.income))
  const [error, setError] = useState("")
  const save = () => {
    const parsed = parseAmount(value)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Introduce una cantidad válida.")
      focusFirstError()
      return
    }
    setPlan({ ...plan, income: roundCents(parsed) })
    notify("Ingresos actualizados", `${formatCurrency(parsed)} al mes`)
    go("settings")
  }
  return (
    <AppShell screen="settings-income" go={go} noNav>
      <div className="page settings">
        <PageHeader title="Ingresos" back={() => go("settings")} />
        <Text className="body muted settings-intro">
          {plan.incomeVariable
            ? "Tus ingresos cambian cada mes. Usamos la media de los últimos 3 meses, pero puedes ajustarla."
            : "Lo hemos detectado a partir de tu nómina. Cámbialo si no es correcto."}
        </Text>
        <Field
          label="Ingresos al mes"
          value={value}
          onChange={(next) => {
            setValue(next)
            setError("")
          }}
          name="income"
          inputMode="decimal"
          error={error}
        />
        <div className="push-bottom">
          <Button onClick={save}>Guardar</Button>
        </div>
      </div>
    </AppShell>
  )
}

export function FixedSettings() {
  const { go, plan, setPlan } = useApp()
  return (
    <AppShell screen="settings-fixed" go={go} noNav>
      <div className="page settings">
        <PageHeader title="Pagos fijos" back={() => go("settings")} />
        <Text className="body muted settings-intro">
          Son los pagos que se repiten cada mes en tu cuenta. Los marcados se apartan antes de
          calcular tu disponible.
        </Text>
        <div className="charge-list">
          {plan.charges.map((charge) => (
            <ChargeRow
              key={charge.id}
              charge={charge}
              onToggle={() =>
                setPlan({
                  ...plan,
                  charges: plan.charges.map((item) =>
                    item.id === charge.id ? { ...item, confirmed: !item.confirmed } : item,
                  ),
                })
              }
            />
          ))}
        </div>
      </div>
    </AppShell>
  )
}

export function SavingSettings() {
  const { go, plan, setPlan, notify } = useApp()
  const margin = monthlyMargin(plan)
  const [saving, setSaving] = useState(Math.min(plan.monthlySaving, margin))
  return (
    <AppShell screen="settings-saving" go={go} noNav>
      <div className="page settings">
        <PageHeader title="Ahorro mensual" back={() => go("settings")} />
        <div className="saving-picker">
          <label className="saving-amount num" htmlFor="saving-setting">
            {formatCurrency(saving, { round: true })}
            <span className="saving-unit">al mes</span>
          </label>
          <input
            id="saving-setting"
            type="range"
            min={0}
            max={Math.max(0, Math.floor(margin / 10) * 10)}
            step={10}
            value={saving}
            onChange={(event) => setSaving(Number(event.target.value))}
          />
          <Text className="small muted">
            Te quedarían {formatCurrency(Math.max(0, margin - saving), { round: true })} al mes
            para tu día a día, después de tus gastos fijos.
          </Text>
        </div>
        <div className="push-bottom">
          <Button
            onClick={() => {
              setPlan({ ...plan, monthlySaving: saving })
              notify("Ahorro actualizado", `${formatCurrency(saving)} al mes`)
              go("settings")
            }}
          >
            Guardar
          </Button>
        </div>
      </div>
    </AppShell>
  )
}

export function CategorySettings() {
  const { go, notify } = useApp()
  const [categories, setCategories] = useState([
    { name: "Supermercado", active: true },
    { name: "Comer fuera", active: true },
    { name: "Transporte", active: true },
    { name: "Ocio", active: true },
    { name: "Compras", active: true },
  ])
  return (
    <AppShell screen="settings-categories" go={go} noNav>
      <div className="page settings">
        <PageHeader title="Categorías" back={() => go("settings")} />
        <Text className="body muted settings-intro">
          Elige las categorías que quieres ver en tus análisis.
        </Text>
        <div className="card settings-list">
          {categories.map((category, index) => (
            <label className="toggle-row" key={category.name}>
              <span>{category.name}</span>
              <input
                type="checkbox"
                checked={category.active}
                onChange={() =>
                  setCategories((items) =>
                    items.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, active: !item.active } : item,
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
        <div className="push-bottom">
          <Button
            onClick={() => {
              notify("Categorías guardadas", "Tus preferencias están al día.")
              go("settings")
            }}
          >
            Guardar categorías
          </Button>
        </div>
      </div>
    </AppShell>
  )
}

/** Transparencia: la fórmula del disponible, con los números del usuario. */
export function Calculation() {
  const { go, budget } = useApp()
  const lines = [
    { label: "Ingresos del mes", value: budget.income, sign: "" },
    { label: "Gastos fijos", value: budget.fixedTotal, sign: "−" },
    { label: "Ahorro que apartas", value: budget.saving, sign: "−" },
    { label: "Lo que ya has gastado", value: budget.variableSpent, sign: "−" },
  ]
  return (
    <AppShell screen="calculation" go={go} noNav>
      <div className="page settings">
        <PageHeader title="¿De dónde sale?" back={() => go("dashboard")} />
        <div className="formula card">
          {lines.map((line) => (
            <div className="formula-row" key={line.label}>
              <span>{line.label}</span>
              <span className="num">
                {line.sign}
                {formatCurrency(line.value)}
              </span>
            </div>
          ))}
          <div className="formula-row total">
            <span>Dinero disponible real</span>
            <span className="num">{formatCurrency(budget.available)}</span>
          </div>
        </div>
        <MoneyBreakdown budget={budget} />
        <div className="info-banner">
          <Text className="small">
            Tu saldo en cuenta ({formatCurrency(budget.accountBalance, { round: true })}) no es lo
            mismo: puede incluir dinero de meses anteriores, pagos fijos que aún no se han cobrado
            y lo que quieres ahorrar. El disponible real solo cuenta lo que este mes te queda libre.
          </Text>
        </div>
      </div>
    </AppShell>
  )
}
