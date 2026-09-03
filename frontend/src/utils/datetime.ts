// El backend siempre envía timestamps en UTC (ISO 8601). Estas funciones se
// encargan de la única conversión a hora local, en un solo lugar.

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  return dateFormatter.format(new Date(isoDate))
}

export function formatTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  return timeFormatter.format(new Date(isoDate))
}

export function formatDateTime(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  return dateTimeFormatter.format(new Date(isoDate))
}

// Formato humano: "14 min" / "1 h 20 min". El backend ya entrega el total en
// minutos calculado con timestamps completos (nunca se recalcula en frontend).
export function formatDuration(totalMinutes: number | null | undefined): string {
  if (totalMinutes === null || totalMinutes === undefined) return '—'
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

// Para inputs <input type="date">: yyyy-MM-dd en horario local.
export function toDateInputValue(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
