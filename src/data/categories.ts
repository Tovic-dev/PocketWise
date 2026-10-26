import type { Category, IconName } from "../types"

export const CATEGORIES: Record<
  Category,
  { label: string; icon: IconName; tone: string }
> = {
  comida: { label: "Supermercado", icon: "basket", tone: "olive" },
  restaurantes: { label: "Comer fuera", icon: "food", tone: "terracotta" },
  transporte: { label: "Transporte", icon: "train", tone: "slate" },
  ocio: { label: "Ocio", icon: "game", tone: "plum" },
  compras: { label: "Compras", icon: "shopping", tone: "sand" },
  suscripciones: { label: "Suscripciones", icon: "repeat", tone: "slate" },
  vivienda: { label: "Vivienda", icon: "home", tone: "stone" },
  salud: { label: "Salud y deporte", icon: "heart", tone: "rose" },
  otros: { label: "Otros", icon: "transfer", tone: "stone" },
  ingresos: { label: "Ingresos", icon: "salary", tone: "olive" },
}
