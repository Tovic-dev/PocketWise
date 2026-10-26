const KEY = "pocketwise-demo-v1"

// El estado de la demo vive solo en este navegador. Si el almacenamiento no
// está disponible (modo privado, vista previa), la app funciona igual sin él.
export function loadState<T>(key = KEY): Partial<T> {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Partial<T>) : {}
  } catch {
    return {}
  }
}

export function saveState<T>(state: T, key = KEY) {
  try {
    window.localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // Sin almacenamiento: se pierde al recargar, nada más.
  }
}

export function clearState() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nada que borrar.
  }
}
