import type { ReactNode } from "react"
import { IconButton, Text } from "./ui"

/** Cabecera de pantalla secundaria: botón atrás arriba y título grande debajo. */
export default function PageHeader({
  title,
  back,
  right,
  intro,
}: {
  title: string
  back: () => void
  right?: ReactNode
  intro?: ReactNode
}) {
  return (
    <header className="page-header">
      <div className="simulator-top page-header-bar">
        <IconButton name="back" label="Volver" onClick={back} />
        {right}
      </div>
      <Text className="h1">{title}</Text>
      {intro && <p className="page-header-intro">{intro}</p>}
    </header>
  )
}
