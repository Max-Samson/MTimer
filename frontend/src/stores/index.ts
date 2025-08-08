import { createPinia } from 'pinia'

// 导出store实例
export const pinia = createPinia()

// 导出所有store
export * from './timerStore'
export * from './todoStore'
export * from './settingsStore'