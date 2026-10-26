# PocketWise

**Tu dinero disponible real, dentro de la app de tu banco.**

PocketWise es un módulo móvil sin marca (*white-label*) que cualquier banco puede integrar en su propia aplicación. No te dice cuánto dinero tienes, sino cuánto puedes usar de verdad este mes: lo que queda después de tus pagos fijos y de lo que quieres ahorrar. Y antes de comprar algo, responde a la pregunta que se hace todo el mundo: **«¿me lo puedo permitir?»**.

Proyecto académico de diseño de producto digital y experiencia de usuario, pensado para jóvenes de 18 a 30 años.

> Prototipo funcional con datos de demostración. No se conecta a ningún banco real ni mueve dinero.

## Qué hace

- **Dinero disponible real.** Una sola fórmula para toda la app: *ingresos del mes − gastos fijos − ahorro mensual − gasto del día a día*. Con un enlace «¿De dónde sale?» que la desglosa con tus números.
- **Activación en un minuto.** Lee tus últimos tres meses, detecta la nómina y los pagos que se repiten, y tú solo confirmas. Funciona también con ingresos irregulares.
- **¿Me lo puedo permitir?** Escribe un importe y verás el disponible antes y después, tu ritmo semanal, si retrasaría tu objetivo y alternativas. Tres estados: *Holgado*, *Ajustado* y *Comprometido*.
- **Gastos.** En qué se va el dinero del día a día (bento por categoría), cómo evoluciona en seis meses, frases sencillas sobre tus hábitos y la opción de corregir la categoría de cualquier movimiento.
- **Objetivos.** Portadas de color, reparto automático del ahorro entre objetivos, fecha proyectada y el efecto de apartar un poco más.
- **Avisos.** Próximos cargos, ideas sobre tu gasto, logros y resumen mensual. Sin tono de alarma.

## Cómo se siente

- Transiciones entre pantallas al estilo iOS (View Transitions) y **deslizar desde el borde para volver**.
- Carga inicial con esqueletos que reproducen cada pantalla.
- Cifras que cuentan hasta su nuevo valor, gráficos que crecen al aparecer y hojas inferiores que se cierran arrastrando.
- Títulos grandes que pasan a la barra superior al hacer scroll, y cada pestaña recuerda dónde te quedaste.
- **Modo oscuro** automático y respeto de «reducir movimiento».
- **App instalable (PWA):** icono, pantallas de arranque para iPhone, pantalla completa y uso sin conexión.

## Instalar en el iPhone

1. Abre la web en **Safari**.
2. Pulsa **Compartir** → **Añadir a pantalla de inicio**.
3. Ábrela desde el icono: se verá a pantalla completa, como una app.

En la pantalla del banco simulado, el panel **«Ajustes de la demo»** permite cambiar de banco anfitrión (el color se adapta), elegir el perfil de datos (nómina fija o ingresos irregulares), entrar con datos de ejemplo o empezar desde cero.

## Módulo sin marca

La identidad de PocketWise está en el papel, la tinta y la tipografía (Bricolage Grotesque + Inter). El color de acento lo pone el banco anfitrión, y se usa solo para acciones, nunca para datos, para que la información se lea igual en cualquier banco. Los bancos de la demo son ficticios.

## Desarrollo

Requisitos: Node 22 y pnpm.

```bash
pnpm install
pnpm dev
```

Para generar la versión de producción:

```bash
pnpm build
pnpm preview
```

> Vite no admite el carácter `#` en la ruta del proyecto. Si la carpeta está dentro de una ruta con `#`, cópiala a otra ubicación antes de ejecutarla.

### Estructura

| Carpeta | Contenido |
|---|---|
| `src/lib/finance.ts` | Todos los cálculos: detección de pagos fijos e ingresos, disponible real, objetivos, simulación e insights |
| `src/lib/navigation.ts` | Historial de pantallas y transiciones |
| `src/data/` | Movimientos bancarios simulados (fecha fija: 14 de octubre de 2026) |
| `src/theme/` | Bancos anfitriones y su color de acento |
| `src/screens/` | Una pantalla por archivo |
| `src/components/` | Componentes reutilizables |
| `src/styles/` | Tokens, estilos por área, movimiento y ajustes de plataforma |
| `public/` | Manifest, service worker, iconos y pantallas de arranque |

### Tecnologías

React 19 · TypeScript · Vite · Tailwind CSS 4 (solo la base) · Lucide · Fontsource. Despliegue en Vercel.
