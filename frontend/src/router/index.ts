import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      redirect: () => {
        const auth = useAuthStore()
        return auth.isAdmin ? '/dashboard' : '/my-tasks'
      },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('../views/tasks/TasksListView.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/tasks/:id',
      name: 'task-detail',
      component: () => import('../views/tasks/TaskDetailView.vue'),
      props: (route) => ({ id: Number(route.params.id) }),
    },
    {
      path: '/my-tasks',
      name: 'my-tasks',
      component: () => import('../views/tasks/MyTasksView.vue'),
      meta: { roles: ['TECNICO'] },
    },
    {
      path: '/admin/labor-types',
      name: 'labor-types',
      component: () => import('../views/admin/LaborTypesView.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/import',
      name: 'import',
      component: () => import('../views/admin/ImportView.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/admin/technicians',
      name: 'technicians',
      component: () => import('../views/admin/TechniciansView.vue'),
      meta: { roles: ['ADMIN'] },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) {
      return auth.isAdmin ? '/dashboard' : '/my-tasks'
    }
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const allowedRoles = to.meta.roles as string[] | undefined
  if (allowedRoles && !allowedRoles.includes(auth.user?.role ?? '')) {
    return auth.isAdmin ? '/dashboard' : '/my-tasks'
  }

  return true
})

export default router
