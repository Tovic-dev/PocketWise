import { useEffect, useRef, useState } from "react"
import { formatCurrency } from "../lib/format"
import { prefersReducedMotion } from "../lib/navigation"

// Último valor mostrado de cada cifra con `memory`: al volver a una pantalla no
// se repite la animación, pero si el valor ha cambiado, cuenta hasta el nuevo.
const shown = new Map<string, number>()

function useCountTo(target: number, memory?: string) {
  const last = useRef(memory ? (shown.get(memory) ?? 0) : target)
  const [value, setValue] = useState(last.current)
  const frame = useRef(0)

  useEffect(() => {
    if (!memory) return setValue(target)
    const start = last.current
    const finish = () => {
      last.current = target
      shown.set(memory, target)
    }
    if (start === target || prefersReducedMotion()) {
      finish()
      return setValue(target)
    }
    const began = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / 900)
      setValue(start + (target - start) * (1 - Math.pow(1 - progress, 3)))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
      else finish()
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame.current)
      // Si la pantalla se cierra a medias, la próxima vez ya parte del valor final.
      shown.set(memory, target)
    }
  }, [target, memory])

  return value
}

/** Cifra protagonista: los euros grandes y los céntimos pequeños, como en prensa. */
export default function BigAmount({
  value,
  className = "",
  as: Tag = "p",
  memory,
}: {
  value: number
  className?: string
  as?: "p" | "h1" | "h2"
  /** Clave para animar la cifra cuando cambia (por ejemplo, "available"). */
  memory?: string
}) {
  const animated = useCountTo(value, memory)
  const settled = Math.abs(animated - value) < 0.005
  const text = formatCurrency(settled ? value : Number.isInteger(value) ? Math.round(animated) : animated)
  const [whole, rest] = text.includes(",") ? text.split(",") : [text.replace(" €", ""), null]
  return (
    <Tag className={`big-amount num ${className}`}>
      <span className="sr-only">{formatCurrency(value)}</span>
      <span aria-hidden="true">{whole}</span>
      <span className="big-amount-tail" aria-hidden="true">
        {rest ? `,${rest}` : " €"}
      </span>
    </Tag>
  )
}
