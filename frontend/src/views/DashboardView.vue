<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import * as dashboardApi from '../api/dashboard'
import { extractErrorMessage } from '../api/client'
import { useToast } from '../composables/useToast'
import { formatDuration } from '../utils/datetime'
import type { DashboardStats } from '../types'
import KpiCard from '../components/dashboard/KpiCard.vue'
import BarList from '../components/dashboard/BarList.vue'
import TrendChart from '../components/dashboard/TrendChart.vue'

const toast = useToast()
const stats = ref<DashboardStats | null>(null)
const loading = ref(false)

function defaultDateFrom() {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}

const filters = reactive({
  dateFrom: defaultDateFrom(),
  dateTo: new Date().toISOString().slice(0, 10),
})

async function fetchStats() {
  loading.value = true
  try {
    stats.value = await dashboardApi.getDashboardStats(filters)
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)
watch(() => [filters.dateFrom, filters.dateTo], fetchStats)
</script>

<template>
  <div>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-[var(--color-text)]">Dashboard</h1>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">Vista general de la operación de soporte técnico</p>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <label class="text-[var(--color-text-muted)]">Desde</label>
        <input v-model="filters.dateFrom" type="date" class="field-input" />
        <label class="text-[var(--color-text-muted)]">Hasta</label>
        <input v-model="filters.dateTo" type="date" class="field-input" />
      </div>
    </div>

    <div v-if="loading && !stats" class="py-16 text-center text-[var(--color-text-muted)]">Cargando…</div>

    <template v-else-if="stats">
      <!-- KPIs -->
      <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total tareas" :value="String(stats.totals.total)" tone="brand" />
        <KpiCard label="Pendientes" :value="String(stats.totals.pendiente)" />
        <KpiCard label="En progreso" :value="String(stats.totals.enProgreso)" />
        <KpiCard label="Finalizadas" :value="String(stats.totals.finalizada)" />
        <KpiCard label="Canceladas" :value="String(stats.totals.cancelada)" />
        <KpiCard label="Tiempo promedio" :value="formatDuration(stats.avgAttentionMinutes)" />
      </div>

      <div class="mb-6 card p-5">
        <div class="mb-1 flex items-baseline justify-between">
          <h2 class="text-sm font-semibold text-[var(--color-text)]">Tiempo total trabajado</h2>
          <span class="text-xl font-semibold text-[var(--color-text)]">{{ formatDuration(stats.totalWorkedMinutes) }}</span>
        </div>
        <p class="text-xs text-[var(--color-text-muted)]">Suma del tiempo de todas las tareas finalizadas en el período</p>
      </div>

      <!-- Tendencia -->
      <div class="mb-6 card p-5">
        <h2 class="mb-4 text-sm font-semibold text-[var(--color-text)]">Tareas registradas por día</h2>
        <TrendChart :points="stats.byDay" />
      </div>

      <!-- Distribuciones -->
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="card p-5">
          <h2 class="mb-4 text-sm font-semibold text-[var(--color-text)]">Tareas por técnico</h2>
          <BarList
            :items="
              stats.byTechnician.map((t) => ({
                label: t.technicianName,
                value: t.count,
                sublabel: t.avgMinutes !== null ? `prom. ${formatDuration(t.avgMinutes)}` : undefined,
              }))
            "
          />
        </div>

        <div class="card p-5">
          <h2 class="mb-4 text-sm font-semibold text-[var(--color-text)]">Tareas por tipo de labor</h2>
          <BarList :items="stats.byLaborType.map((l) => ({ label: l.laborTypeName, value: l.count }))" />
        </div>
      </div>
    </template>
  </div>
</template>
