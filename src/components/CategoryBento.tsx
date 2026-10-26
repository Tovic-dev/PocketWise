import type { Category } from "../types"
import { CATEGORIES } from "../data/categories"
import { formatCurrency } from "../lib/format"

export type BentoItem = {
  key: string
  label: string
  total: number
  tone: string
  categories: Category[]
}

type Rect = BentoItem & { x: number; y: number; w: number; h: number }

// Tamaño de referencia del bento: solo sirve para decidir hacia dónde partir.
const W = 342
const H = 236
const MAX_TILES = 6

/** Agrupa en "Resto" lo que no cabe para que cada bloque se pueda leer. */
export function bentoItems(totals: { category: Category; total: number }[]): BentoItem[] {
  const items = totals.map(({ category, total }) => ({
    key: category,
    label: CATEGORIES[category].label,
    total,
    tone: CATEGORIES[category].tone,
    categories: [category],
  }))
  if (items.length <= MAX_TILES) return items
  const kept = items.slice(0, MAX_TILES - 1)
  const rest = items.slice(MAX_TILES - 1)
  return [
    ...kept,
    {
      key: "resto",
      label: "Resto",
      total: rest.reduce((sum, item) => sum + item.total, 0),
      tone: "stone",
      categories: rest.flatMap((item) => item.categories),
    },
  ]
}

/**
 * Treemap por bisección: parte la lista en dos mitades de peso parecido y
 * divide el rectángulo por su lado largo. El área de cada bloque es
 * proporcional a lo gastado.
 */
function layout(items: BentoItem[], x: number, y: number, w: number, h: number, out: Rect[]) {
  if (!items.length) return
  if (items.length === 1) {
    out.push({ ...items[0], x, y, w, h })
    return
  }
  const total = items.reduce((sum, item) => sum + item.total, 0)
  let cut = 1
  let running = 0
  let best = Infinity
  items.forEach((item, index) => {
    if (index === items.length - 1) return
    running += item.total
    const gap = Math.abs(running - total / 2)
    if (gap < best) {
      best = gap
      cut = index + 1
    }
  })
  const first = items.slice(0, cut)
  const ratio = first.reduce((sum, item) => sum + item.total, 0) / total
  if (w >= h) {
    layout(first, x, y, w * ratio, h, out)
    layout(items.slice(cut), x + w * ratio, y, w * (1 - ratio), h, out)
  } else {
    layout(first, x, y, w, h * ratio, out)
    layout(items.slice(cut), x, y + h * ratio, w, h * (1 - ratio), out)
  }
}

export default function CategoryBento({
  items,
  selected,
  onSelect,
}: {
  items: BentoItem[]
  selected: string | null
  onSelect: (item: BentoItem | null) => void
}) {
  const total = items.reduce((sum, item) => sum + item.total, 0) || 1
  const rects: Rect[] = []
  layout(items, 0, 0, W, H, rects)

  return (
    <div className="bento" role="group" aria-label="Gasto del día a día por categoría">
      {rects.map((rect) => {
        const share = Math.round((rect.total / total) * 100)
        const size = rect.w >= 120 && rect.h >= 96 ? "large" : rect.w >= 78 && rect.h >= 62 ? "medium" : "small"
        const amount = formatCurrency(rect.total, { round: true })
        return (
          <button
            key={rect.key}
            type="button"
            className={`bento-tile tone-${rect.tone} ${size} ${
              selected && selected !== rect.key ? "dimmed" : ""
            } ${selected === rect.key ? "selected" : ""}`}
            style={{
              left: `${(rect.x / W) * 100}%`,
              top: `${(rect.y / H) * 100}%`,
              width: `${(rect.w / W) * 100}%`,
              height: `${(rect.h / H) * 100}%`,
            }}
            aria-pressed={selected === rect.key}
            aria-label={`${rect.label}: ${amount}, ${share} %`}
            onClick={() => onSelect(selected === rect.key ? null : rect)}
          >
            <span className="bento-label">{rect.label}</span>
            {size !== "small" && <span className="bento-amount num">{amount}</span>}
            <span className="bento-share num">{share} %</span>
          </button>
        )
      })}
    </div>
  )
}
