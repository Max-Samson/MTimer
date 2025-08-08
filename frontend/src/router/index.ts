import { createRouter, createWebHistory } from 'vue-router'
import { mainLayoutRoutes } from './layouts'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    ...mainLayoutRoutes
  ]
})

export default router
