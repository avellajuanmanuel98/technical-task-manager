<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ points: { date: string; count: number }[] }>()

// Rellena los días sin tareas entre el primero y el último punto para que la
// tendencia se vea continua, no solo los días con datos.
const filled = computed(() => {
  if (props.points.length === 0) return []
  const byDate = new Map(props.points.map((p) => [p.date, p.count]))
  const start = new Date(props.points[0].date + 'T00:00:00')
  const end = new Date(props.points[props.points.length - 1].date + 'T00:00:00')
  const days: { date: string; count: number }[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    days.push({ date: key, count: byDate.get(key) ?? 0 })
  }
  return days
})

const max = computed(() => Math.max(1, ...filled.value.map((d) => d.count)))
const width = 640
const height = 160
const barGap = 2

const bars = computed(() => {
  const n = filled.value.length
  if (n === 0) return []
  const barWidth = width / n - barGap
  return filled.value.map((d, i) => ({
    x: i * (width / n),
    width: Math.max(barWidth, 1),
    height: (d.count / max.value) * (height - 20),
    y: height - 20 - (d.count / max.value) * (height - 20),
    date: d.date,
    count: d.count,
  }))
})

function shortLabel(date: string) {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })
}

// Mostrar pocas etiquetas en el eje X para que no se amontonen.
const labelIndexes = computed(() => {
  const n = bars.value.length
  if (n <= 6) return bars.value.map((_, i) => i)
  const step = Math.ceil(n / 6)
  const idxs = []
  for (let i = 0; i < n; i += step) idxs.push(i)
  if (idxs[idxs.length - 1] !== n - 1) idxs.push(n - 1)
  return idxs
})
</script>

<template>
  <div v-if="filled.length === 0" class="py-10 text-center text-sm text-[var(--color-text-muted)]">
    Sin datos para este período
  </div>
  <svg v-else :viewBox="`0 0 ${width} ${height}`" class="w-full" preserveAspectRatio="none" style="height: 160px">
    <g v-for="(bar, i) in bars" :key="bar.date">
      <rect
        :x="bar.x"
        :y="bar.y"
        :width="bar.width"
        :height="Math.max(bar.height, 1)"
        rx="1.5"
        fill="var(--color-brand)"
        :fill-opacity="bar.count === 0 ? 0.15 : 0.85"
      >
        <title>{{ bar.date }}: {{ bar.count }} tarea(s)</title>
      </rect>
      <text
        v-if="labelIndexes.includes(i)"
        :x="bar.x + bar.width / 2"
        :y="height - 4"
        text-anchor="middle"
        font-size="9"
        fill="var(--color-text-muted)"
      >
        {{ shortLabel(bar.date) }}
      </text>
    </g>
  </svg>
</template>
