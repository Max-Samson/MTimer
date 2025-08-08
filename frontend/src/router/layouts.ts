import { RouteRecordRaw } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

// 定义使用MainLayout布局的路由
export const mainLayoutRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'timer',
        component: () => import('../views/TimerView.vue')
      },
      {
        path: '/todo',
        name: 'todo',
        component: () => import('../views/TodoView.vue')
      },
      {
        path: '/statistics',
        name: 'statistics',
        component: () => import('../views/StatisticsView.vue')
      },
      {
        path: '/settings',
        name: 'settings',
        component: () => import('../views/SettingsView.vue')
      },
      {
        path: '/ai-assistant',
        name: 'ai-assistant',
        component: () => import('../views/AIAssistantView.vue')
      }
    ]
  }
]
