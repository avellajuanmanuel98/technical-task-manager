import { ref } from 'vue'
import * as usersApi from '../api/users'
import * as laborTypesApi from '../api/laborTypes'
import type { LaborType, User } from '../types'

// Catálogos de referencia (técnicos activos, tipos de labor activos).
// Se cargan una sola vez y se reutilizan entre vistas (formularios, filtros).
const technicians = ref<User[]>([])
const laborTypes = ref<LaborType[]>([])
let loaded = false

export function useCatalogs() {
  async function load(force = false) {
    if (loaded && !force) return
    const [tecs, labores] = await Promise.all([
      usersApi.listUsers({ role: 'TECNICO', active: true }),
      laborTypesApi.listLaborTypes({ active: true }),
    ])
    technicians.value = tecs
    laborTypes.value = labores
    loaded = true
  }

  return { technicians, laborTypes, load }
}
